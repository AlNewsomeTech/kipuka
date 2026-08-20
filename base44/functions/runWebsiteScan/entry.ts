import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SCANNER_VERSION = 'acolyte-webscan-1.0.0';
const MAX_BODY_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const MAX_PAGES = 15;
const USER_AGENT = 'ACOLYTE-Website-Security-Scanner/1.0 (+authorized defensive assessment)';
const READ_ONLY_ORG_ROLES = new Set(['Auditor Viewer', 'Executive Viewer', 'Evidence Contributor']);
const AUTHORIZATION_STATEMENT = 'I confirm that this organization owns this website or has written authorization from the owner for non-destructive security scanning.';
const SEVERITY_WEIGHT: Record<string, number> = { Critical: 40, High: 25, Moderate: 10, Low: 3, Informational: 0 };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function cleanText(value: unknown, max = 2000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown scanner error');
}

function stable(value: any): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function ipv4Parts(value: string) {
  const pieces = value.split('.');
  if (pieces.length !== 4 || pieces.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const numbers = pieces.map(Number);
  return numbers.every((part) => part >= 0 && part <= 255) ? numbers : null;
}

function isBlockedIpv4(value: string) {
  const p = ipv4Parts(value);
  if (!p) return false;
  const [a, b, c] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113);
}

function isBlockedIpv6(value: string) {
  const v = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (!v.includes(':')) return false;
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(v)) return true;
  if (v.startsWith('ff')) return true;
  if (v.startsWith('2001:db8:')) return true;
  if (v.startsWith('::ffff:')) {
    const mapped = v.slice(7);
    return Boolean(ipv4Parts(mapped) && isBlockedIpv4(mapped));
  }
  return false;
}

function validateUrlShape(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('The target must be a valid public website URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS targets are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard website ports 80 and 443 are allowed.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Private and local hostnames are not allowed.');
  }
  if (isBlockedIpv4(host) || isBlockedIpv6(host)) throw new Error('Private or reserved network addresses are not allowed.');
  url.hostname = host;
  url.hash = '';
  return url;
}

async function resolvePublicHost(url: URL) {
  const host = url.hostname;
  if (ipv4Parts(host) || host.includes(':')) {
    if (isBlockedIpv4(host) || isBlockedIpv6(host)) throw new Error('The target resolves to a blocked network address.');
    return [host];
  }
  const addresses = new Set<string>();
  const [a, aaaa] = await Promise.all([
    Deno.resolveDns(host, 'A').catch(() => [] as string[]),
    Deno.resolveDns(host, 'AAAA').catch(() => [] as string[]),
  ]);
  [...a, ...aaaa].forEach((address) => addresses.add(String(address)));
  if (!addresses.size) throw new Error('The target hostname did not resolve to a public address.');
  for (const address of addresses) {
    if (isBlockedIpv4(address) || isBlockedIpv6(address)) {
      throw new Error('The target hostname resolves to a private, local, or reserved address.');
    }
  }
  return [...addresses];
}

function equivalentHost(a: string, b: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/^www\./, '');
  return normalize(a) === normalize(b);
}

function safeHeaderSnapshot(headers: Headers) {
  const wanted = [
    'content-type', 'content-length', 'cache-control', 'server',
    'strict-transport-security', 'content-security-policy', 'x-content-type-options',
    'x-frame-options', 'referrer-policy', 'permissions-policy',
    'access-control-allow-origin', 'access-control-allow-credentials',
  ];
  const snapshot: Record<string, string> = {};
  wanted.forEach((name) => {
    const value = headers.get(name);
    if (value) snapshot[name] = cleanText(value, 500);
  });
  const cookieCount = typeof (headers as any).getSetCookie === 'function'
    ? (headers as any).getSetCookie().length
    : (headers.get('set-cookie') ? 1 : 0);
  if (cookieCount) snapshot['set-cookie'] = `${cookieCount} cookie header(s), values redacted`;
  return snapshot;
}

async function readLimited(response: Response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = MAX_BODY_BYTES - total;
    const part = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(part);
    total += part.byteLength;
    if (part.byteLength < value.byteLength) break;
  }
  if (total >= MAX_BODY_BYTES) await reader.cancel().catch(() => {});
  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { merged.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

function linkCandidates(html: string, baseUrl: string) {
  const results = new Set<string>();
  const regex = /\bhref\s*=\s*["']([^"'#]+)["']/gi;
  let match;
  while ((match = regex.exec(html)) && results.size < 100) {
    try {
      const next = new URL(match[1], baseUrl);
      if (!['http:', 'https:'].includes(next.protocol)) continue;
      next.hash = '';
      next.search = '';
      results.add(next.toString());
    } catch {
      // Ignore malformed document links.
    }
  }
  return [...results];
}

function cookieHeaders(headers: Headers) {
  if (typeof (headers as any).getSetCookie === 'function') return (headers as any).getSetCookie() as string[];
  const one = headers.get('set-cookie');
  return one ? [one] : [];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let scan: any = null;
  let target: any = null;
  let caller: any = null;
  const logs: any[] = [];
  let logPreviousHash = '';
  let sequence = 0;

  const addLog = async (level: string, eventType: string, message: string, requestUrl = '', details: any = {}) => {
    const event = {
      sequence: ++sequence,
      event_time: new Date().toISOString(),
      level,
      event_type: cleanText(eventType, 120),
      request_url: cleanText(requestUrl, 1000),
      message: cleanText(message, 2000),
      details,
      previous_hash: logPreviousHash,
    };
    const entryHash = await sha256(logPreviousHash + stable(event));
    logPreviousHash = entryHash;
    logs.push({ ...event, entry_hash: entryHash });
  };

  const persistLogs = async () => {
    if (!scan?.id || !target?.id || !logs.length) return;
    const rows = logs.map((log) => ({
      organization_id: target.organization_id,
      client_id: target.client_id || '',
      project_id: target.project_id,
      target_id: target.id,
      scan_id: scan.id,
      ...log,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      await base44.asServiceRole.entities.WebsiteScanLog.bulkCreate(rows.slice(i, i + 100));
    }
  };

  try {
    caller = await base44.auth.me();
    if (!caller) return jsonError('Unauthorized', 401);
    const appRole = caller._app_role || caller.role;
    if (!['admin', 'technician'].includes(appRole)) {
      return jsonError('Website scans are limited to authorized ACOLYTE operators.', 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'run_scan';

    const isAssignedClient = (clientId: string) => {
      const raw = caller?.assigned_client_ids;
      const tokens = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
      return tokens.map((value: unknown) => String(value || '').trim()).filter(Boolean).includes(clientId);
    };

    const authorizeScope = async (organizationId: string, clientId = '') => {
      if (appRole === 'admin') return null;
      if (clientId && isAssignedClient(clientId)) return null;
      const memberships = await base44.asServiceRole.entities.OrganizationUser
        .filter({ user_email: caller.email, organization_id: organizationId })
        .catch(() => []);
      const active = memberships.filter((membership: any) => membership.status === 'Active');
      if (active.length !== 1) return jsonError('Website target not found.', 404);
      if (READ_ONLY_ORG_ROLES.has(active[0].role)) {
        return jsonError(`Your organization role (${active[0].role}) cannot change or run website scans.`, 403);
      }
      return null;
    };

    if (action === 'create_target') {
      if (!body.project_id || !body.target_name || !body.start_url) {
        return jsonError('project_id, target_name, and start_url are required.', 400);
      }
      if (body.authorization_attested !== true || body.authorization_statement !== AUTHORIZATION_STATEMENT) {
        return jsonError('Recorded client authorization is required before adding a website target.', 400);
      }
      const project = await base44.asServiceRole.entities.Project.get(body.project_id).catch(() => null);
      if (!project?.organization_id) return jsonError('Client project not found.', 404);
      let client = null;
      if (body.client_id) {
        client = await base44.asServiceRole.entities.Client.get(body.client_id).catch(() => null);
        if (!client || client.organization_id !== project.organization_id) {
          return jsonError('Client assignment is invalid.', 409);
        }
      }
      const denied = await authorizeScope(project.organization_id, client?.id || '');
      if (denied) return denied;
      const normalized = validateUrlShape(cleanText(body.start_url, 2000));
      const targetName = cleanText(body.target_name, 160);
      if (targetName.length < 2) return jsonError('Enter a descriptive website name.', 400);
      const profile = body.scan_profile === 'Baseline' ? 'Baseline' : 'Standard';
      const authorizedAt = new Date().toISOString();
      const created = await base44.asServiceRole.entities.WebsiteScanTarget.create({
        organization_id: project.organization_id,
        client_id: client?.id || '',
        project_id: project.id,
        target_name: targetName,
        start_url: normalized.toString(),
        normalized_origin: normalized.origin,
        hostname: normalized.hostname,
        authorization_attested: true,
        authorization_statement: AUTHORIZATION_STATEMENT,
        authorized_by_email: caller.email || '',
        authorized_by_name: caller.full_name || caller.email || '',
        authorized_at: authorizedAt,
        status: 'Active',
        scan_profile: profile,
        max_pages: profile === 'Baseline' ? 1 : Math.min(Math.max(Number(body.max_pages) || 10, 1), MAX_PAGES),
        request_timeout_seconds: Math.min(Math.max(Number(body.request_timeout_seconds) || 12, 5), 20),
        notes: cleanText(body.notes, 2000),
      });
      await base44.asServiceRole.entities.AuditLog.create({
        organization_id: project.organization_id,
        user_email: caller.email || '',
        user_name: caller.full_name || '',
        action_type: 'ACOLYTE Website Target Created',
        target_entity: 'WebsiteScanTarget',
        target_record_id: created.id,
        action_summary: `Authorized website scan target "${created.target_name}" for ${normalized.hostname}.`,
        ip_address: '',
        user_agent: req.headers.get('user-agent') || '',
      });
      return Response.json({ target: created });
    }

    if (action === 'set_target_status') {
      if (!body.target_id || !['Active', 'Paused', 'Archived'].includes(body.status)) {
        return jsonError('A target_id and valid status are required.', 400);
      }
      const existingTarget = await base44.asServiceRole.entities.WebsiteScanTarget.get(body.target_id).catch(() => null);
      if (!existingTarget) return jsonError('Website target not found.', 404);
      const project = await base44.asServiceRole.entities.Project.get(existingTarget.project_id).catch(() => null);
      if (!project || project.organization_id !== existingTarget.organization_id) {
        return jsonError('Website target not found.', 404);
      }
      let client = null;
      if (existingTarget.client_id) {
        client = await base44.asServiceRole.entities.Client.get(existingTarget.client_id).catch(() => null);
        if (!client || client.organization_id !== existingTarget.organization_id) {
          return jsonError('The target client assignment is invalid.', 409);
        }
      }
      const denied = await authorizeScope(existingTarget.organization_id, client?.id || '');
      if (denied) return denied;
      const updated = await base44.asServiceRole.entities.WebsiteScanTarget.update(existingTarget.id, { status: body.status });
      await base44.asServiceRole.entities.AuditLog.create({
        organization_id: existingTarget.organization_id,
        user_email: caller.email || '',
        user_name: caller.full_name || '',
        action_type: 'ACOLYTE Website Target Status Changed',
        target_entity: 'WebsiteScanTarget',
        target_record_id: existingTarget.id,
        action_summary: `Changed website scan target "${existingTarget.target_name}" to ${body.status}.`,
        ip_address: '',
        user_agent: req.headers.get('user-agent') || '',
      });
      return Response.json({ target: updated });
    }

    if (action === 'promote_finding') {
      const finding = await base44.asServiceRole.entities.WebsiteScanFinding.get(body.finding_id).catch(() => null);
      if (!finding) return jsonError('Finding not found.', 404);
      const project = await base44.asServiceRole.entities.Project.get(finding.project_id).catch(() => null);
      if (!project || project.organization_id !== finding.organization_id) return jsonError('Finding scope is invalid.', 409);
      if (finding.client_id) {
        const client = await base44.asServiceRole.entities.Client.get(finding.client_id).catch(() => null);
        if (!client || client.organization_id !== finding.organization_id) return jsonError('Finding scope is invalid.', 409);
      }
      const denied = await authorizeScope(finding.organization_id, finding.client_id || '');
      if (denied) return denied;
      if (finding.cyber_finding_id) {
        const existing = await base44.asServiceRole.entities.CyberFinding.get(finding.cyber_finding_id).catch(() => null);
        if (existing) return Response.json({ finding: existing, already_promoted: true });
      }
      const created = await base44.asServiceRole.entities.CyberFinding.create({
        organization_id: finding.organization_id,
        project_id: finding.project_id,
        finding_title: finding.title,
        finding_category: 'Vulnerability',
        severity: finding.severity,
        finding_status: 'Open',
        description: finding.description,
        affected_systems: finding.affected_url,
        business_impact: 'A weakness in the public website may reduce confidentiality, integrity, availability, or visitor trust depending on exposure and exploitability.',
        recommended_action: finding.recommendation,
        related_control_ids: [],
        related_evidence_ids: [],
        related_poam_ids: [],
        owner: '',
        created_by: caller.email || '',
      });
      await base44.asServiceRole.entities.WebsiteScanFinding.update(finding.id, {
        cyber_finding_id: created.id,
        status: 'Acknowledged',
      });
      await base44.asServiceRole.entities.AuditLog.create({
        organization_id: finding.organization_id,
        user_email: caller.email || '',
        user_name: caller.full_name || '',
        action_type: 'ACOLYTE Website Finding Promoted',
        target_entity: 'CyberFinding',
        target_record_id: created.id,
        action_summary: `Promoted website scanner finding "${finding.title}" to the ACOLYTE findings register.`,
        ip_address: '',
        user_agent: req.headers.get('user-agent') || '',
      }).catch(() => {});
      return Response.json({ finding: created, already_promoted: false });
    }

    if (action !== 'run_scan') return jsonError('Unsupported scanner action.', 400);
    if (!body.target_id) return jsonError('target_id is required.', 400);

    target = await base44.asServiceRole.entities.WebsiteScanTarget.get(body.target_id).catch(() => null);
    if (!target) return jsonError('Website target not found.', 404);
    if (target.status !== 'Active') return jsonError('This website target is not active.', 409);
    if (target.authorization_attested !== true || !target.authorized_at || !target.authorized_by_email) {
      return jsonError('Recorded client authorization is required before scanning.', 409);
    }

    const project = await base44.asServiceRole.entities.Project.get(target.project_id).catch(() => null);
    if (!project || project.organization_id !== target.organization_id) {
      return jsonError('The target is not assigned to a valid client project.', 409);
    }
    if (target.client_id) {
      const client = await base44.asServiceRole.entities.Client.get(target.client_id).catch(() => null);
      if (!client || client.organization_id !== target.organization_id) {
        return jsonError('The target client assignment is invalid.', 409);
      }
    }

    const denied = await authorizeScope(target.organization_id, target.client_id || '');
    if (denied) return denied;

    const requestedUrl = validateUrlShape(target.start_url);
    if (requestedUrl.hostname !== String(target.hostname || '').toLowerCase()) {
      return jsonError('The stored hostname does not match the authorized target URL.', 409);
    }
    const initialAddresses = await resolvePublicHost(requestedUrl);
    const recent = await base44.asServiceRole.entities.WebsiteScan
      .filter({ target_id: target.id }, '-requested_at', 1)
      .catch(() => []);
    if (recent[0]?.status === 'Running') return jsonError('A scan is already running for this target.', 409);
    const recentTime = recent[0]?.requested_at ? new Date(recent[0].requested_at).getTime() : 0;
    if (recentTime && Date.now() - recentTime < 120_000) {
      return jsonError('Wait two minutes before starting another scan of this target.', 429);
    }

    const requestId = crypto.randomUUID();
    const requestedAt = new Date().toISOString();
    scan = await base44.asServiceRole.entities.WebsiteScan.create({
      organization_id: target.organization_id,
      client_id: target.client_id || '',
      project_id: target.project_id,
      target_id: target.id,
      target_name: target.target_name,
      requested_url: requestedUrl.toString(),
      hostname: requestedUrl.hostname,
      status: 'Running',
      scan_profile: target.scan_profile || 'Standard',
      requested_by_email: caller.email || '',
      requested_by_name: caller.full_name || '',
      requested_at: requestedAt,
      started_at: requestedAt,
      pages_scanned: 0,
      requests_made: 0,
      checks_run: 0,
      finding_count: 0,
      scanner_version: SCANNER_VERSION,
      request_id: requestId,
      resolved_addresses: initialAddresses,
      summary: { authorization_attested_at: target.authorized_at, authorization_attested_by: target.authorized_by_email },
    });
    await addLog('Info', 'scan_started', 'Authorized defensive website scan started.', requestedUrl.toString(), {
      request_id: requestId,
      profile: target.scan_profile || 'Standard',
      max_pages: Math.min(Number(target.max_pages) || 10, MAX_PAGES),
      scanner_version: SCANNER_VERSION,
      resolved_addresses: initialAddresses,
    });

    const started = Date.now();
    let requestsMade = 0;
    let checksRun = 0;
    const findings: any[] = [];
    const findingKeys = new Set<string>();
    const discovered = new Set<string>();
    const queued: string[] = [requestedUrl.toString()];
    const visited = new Set<string>();
    const maxPages = target.scan_profile === 'Baseline' ? 1 : Math.min(Math.max(Number(target.max_pages) || 10, 1), MAX_PAGES);
    const timeoutMs = Math.min(Math.max(Number(target.request_timeout_seconds) || 12, 5), 20) * 1000;

    // DNS pinning against rebinding: each hostname is resolved and validated
    // once per scan, and every later resolution of that hostname must return
    // only addresses from the pinned, validated set. It is also checked again
    // immediately AFTER each fetch, and the response is discarded when the
    // records changed — so a rebind to a private or metadata address between
    // validation and connect fails closed instead of being read.
    const pinnedHosts = new Map<string, Set<string>>();
    pinnedHosts.set(requestedUrl.hostname, new Set(initialAddresses));
    const assertPinnedResolution = async (url: URL) => {
      const addresses = await resolvePublicHost(url);
      const pinned = pinnedHosts.get(url.hostname);
      if (!pinned) {
        pinnedHosts.set(url.hostname, new Set(addresses));
        return;
      }
      for (const address of addresses) {
        if (!pinned.has(address)) {
          throw new Error('The target DNS records changed during the scan. The request was blocked to prevent server-side request forgery.');
        }
      }
    };

    const addFinding = async (ruleId: string, title: string, severity: string, category: string, affectedUrl: string, description: string, evidence: string, recommendation: string, metadata: any = {}) => {
      const fingerprint = await sha256(`${target.id}|${ruleId}|${affectedUrl}`);
      if (findingKeys.has(fingerprint)) return;
      findingKeys.add(fingerprint);
      findings.push({
        organization_id: target.organization_id,
        client_id: target.client_id || '',
        project_id: target.project_id,
        target_id: target.id,
        scan_id: scan.id,
        rule_id: ruleId,
        fingerprint,
        title,
        severity,
        category,
        affected_url: affectedUrl,
        description,
        evidence: cleanText(evidence, 4000),
        recommendation,
        status: 'Open',
        detected_at: new Date().toISOString(),
        response_metadata: metadata,
      });
      await addLog(severity === 'Informational' ? 'Info' : 'Warning', 'finding_detected', `${severity}: ${title}`, affectedUrl, { rule_id: ruleId, fingerprint });
    };

    const fetchPage = async (input: string, allowRedirects = true) => {
      let current = validateUrlShape(input);
      if (!equivalentHost(current.hostname, requestedUrl.hostname)) throw new Error('Cross-domain requests are outside the authorized target scope.');
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        await assertPinnedResolution(current);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const requestStarted = Date.now();
        let response: Response;
        try {
          response = await fetch(current.toString(), {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
          });
        } finally {
          clearTimeout(timer);
        }
        requestsMade += 1;
        // Post-connect check: if the hostname now resolves outside the pinned
        // set, the response may have come from a rebound address — discard it.
        try {
          await assertPinnedResolution(current);
        } catch (error) {
          await response.body?.cancel().catch(() => {});
          throw error;
        }
        await addLog('Info', 'http_response', `GET completed with HTTP ${response.status}.`, current.toString(), {
          status: response.status,
          duration_ms: Date.now() - requestStarted,
          response_headers: safeHeaderSnapshot(response.headers),
        });
        if (allowRedirects && [301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) return { response, body: '', url: current };
          const next = validateUrlShape(new URL(location, current).toString());
          if (!equivalentHost(next.hostname, requestedUrl.hostname)) {
            await addFinding('redirect-cross-domain', 'Redirect leaves the authorized website', 'Informational', 'Configuration', current.toString(),
              'The website redirects to a different registrable hostname that was not included in this scan authorization.',
              `Location: ${next.origin}`,
              'Add the destination as a separately authorized target if it should also be scanned.');
            return { response, body: '', url: current };
          }
          if (current.protocol === 'https:' && next.protocol === 'http:') {
            await addFinding('https-downgrade', 'HTTPS redirects to HTTP', 'High', 'Transport Security', current.toString(),
              'The redirect chain downgrades an encrypted connection to plaintext HTTP.',
              `Redirect destination: ${next.toString()}`,
              'Change the redirect to an HTTPS destination and remove all downgrade paths.');
          }
          current = next;
          continue;
        }
        const contentType = response.headers.get('content-type') || '';
        const bodyText = /text|html|xml|json|javascript/i.test(contentType) ? await readLimited(response) : '';
        return { response, body: bodyText, url: current };
      }
      throw new Error('The website exceeded the maximum redirect depth.');
    };

    while (queued.length && visited.size < maxPages) {
      const nextUrl = queued.shift()!;
      if (visited.has(nextUrl)) continue;
      const parsed = validateUrlShape(nextUrl);
      if (!equivalentHost(parsed.hostname, requestedUrl.hostname)) continue;
      visited.add(nextUrl);
      let result;
      try {
        result = await fetchPage(nextUrl);
      } catch (error) {
        await addLog('Error', 'page_failed', cleanText(errorMessage(error)), nextUrl);
        await addFinding('page-unreachable', 'Page could not be scanned', 'Low', 'Configuration', nextUrl,
          'The scanner could not retrieve this in-scope page within the configured timeout.',
          cleanText(errorMessage(error)),
          'Confirm the URL is publicly reachable and permits the ACOLYTE scanner user agent.');
        continue;
      }

      const { response, body: html, url: finalPageUrl } = result;
      const pageUrl = finalPageUrl.toString();
      const headers = response.headers;
      const isHtml = /text\/html|application\/xhtml\+xml/i.test(headers.get('content-type') || '');
      const rootPage = visited.size === 1;
      const headerRules = [
        ['strict-transport-security', 'missing-hsts', 'Strict Transport Security is missing', 'Moderate', 'Transport Security',
          'The HTTPS response does not advertise HSTS, so browsers may accept a future plaintext connection.',
          'Add a Strict-Transport-Security header after confirming all subdomains support HTTPS.'],
        ['content-security-policy', 'missing-csp', 'Content Security Policy is missing', 'Moderate', 'Security Headers',
          'The page does not define a Content-Security-Policy response header.',
          'Deploy a tested Content-Security-Policy that restricts scripts, styles, frames, and other content sources.'],
        ['x-content-type-options', 'missing-nosniff', 'MIME sniffing protection is missing', 'Low', 'Security Headers',
          'The response does not include X-Content-Type-Options: nosniff.',
          'Set X-Content-Type-Options to nosniff on web responses.'],
        ['referrer-policy', 'missing-referrer-policy', 'Referrer Policy is missing', 'Low', 'Security Headers',
          'The response does not specify how much referrer information browsers may send.',
          'Set a restrictive Referrer-Policy such as strict-origin-when-cross-origin.'],
        ['permissions-policy', 'missing-permissions-policy', 'Permissions Policy is missing', 'Low', 'Security Headers',
          'The response does not restrict browser features such as camera, microphone, or geolocation.',
          'Add a Permissions-Policy header that disables browser features the site does not require.'],
      ];
      for (const [header, rule, title, severity, category, description, recommendation] of headerRules) {
        checksRun += 1;
        if (rootPage && !headers.get(header)) {
          if (header === 'strict-transport-security' && finalPageUrl.protocol !== 'https:') continue;
          await addFinding(rule, title, severity, category, pageUrl, description, `Header ${header} was not present.`, recommendation, { http_status: response.status });
        }
      }

      checksRun += 1;
      const frameProtected = Boolean(headers.get('x-frame-options'))
        || /frame-ancestors/i.test(headers.get('content-security-policy') || '');
      if (rootPage && !frameProtected) {
        await addFinding('missing-frame-protection', 'Clickjacking protection is missing', 'Moderate', 'Security Headers', pageUrl,
          'Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.',
          'No frame embedding restriction was present in the response headers.',
          'Use CSP frame-ancestors or X-Frame-Options to restrict which sites may embed this page.');
      }

      checksRun += 1;
      const acao = headers.get('access-control-allow-origin');
      const acac = headers.get('access-control-allow-credentials');
      if (acao === '*' && String(acac).toLowerCase() === 'true') {
        await addFinding('cors-wildcard-credentials', 'Unsafe CORS credential configuration', 'High', 'Configuration', pageUrl,
          'The response combines a wildcard allowed origin with credentialed cross-origin access.',
          'Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true',
          'Allow only trusted origins and do not combine wildcard origins with credentials.');
      } else if (rootPage && acao === '*') {
        await addFinding('cors-wildcard', 'Cross-origin access allows any origin', 'Low', 'Configuration', pageUrl,
          'The response allows any website origin to read the resource when browser CORS rules apply.',
          'Access-Control-Allow-Origin: *',
          'Confirm the resource is intended to be public. Otherwise, restrict allowed origins.');
      }

      checksRun += 1;
      const server = headers.get('server') || '';
      if (/\d/.test(server)) {
        await addFinding('server-version-disclosure', 'Server version information is exposed', 'Low', 'Information Exposure', pageUrl,
          'The Server header appears to disclose product version details that may help targeted reconnaissance.',
          `Server: ${server}`,
          'Remove detailed server version information from public response headers.');
      }

      for (const cookie of cookieHeaders(headers)) {
        const cookieName = cleanText(cookie.split('=')[0], 120) || 'Unnamed cookie';
        checksRun += 3;
        if (finalPageUrl.protocol === 'https:' && !/;\s*secure(?:;|$)/i.test(cookie)) {
          await addFinding('cookie-missing-secure', `Cookie lacks Secure: ${cookieName}`, 'Moderate', 'Cookie Security', pageUrl,
            'A cookie set over HTTPS does not include the Secure attribute.',
            `Cookie name: ${cookieName}; value redacted`,
            'Add the Secure attribute to cookies that should only travel over HTTPS.');
        }
        if (!/;\s*httponly(?:;|$)/i.test(cookie)) {
          await addFinding('cookie-missing-httponly', `Cookie lacks HttpOnly: ${cookieName}`, 'Low', 'Cookie Security', pageUrl,
            'A cookie does not include HttpOnly and may be accessible to client-side scripts.',
            `Cookie name: ${cookieName}; value redacted`,
            'Add HttpOnly to session or sensitive cookies that do not require JavaScript access.');
        }
        if (!/;\s*samesite=/i.test(cookie)) {
          await addFinding('cookie-missing-samesite', `Cookie lacks SameSite: ${cookieName}`, 'Low', 'Cookie Security', pageUrl,
            'A cookie does not declare a SameSite policy.',
            `Cookie name: ${cookieName}; value redacted`,
            'Set SameSite=Lax or Strict unless cross-site use is explicitly required.');
        }
      }

      if (isHtml) {
        checksRun += 4;
        if (finalPageUrl.protocol === 'https:' && /(?:src|href|action)\s*=\s*["']http:\/\//i.test(html)) {
          await addFinding('mixed-content', 'HTTPS page references HTTP content', 'High', 'Content Security', pageUrl,
            'The page contains a resource or form reference using plaintext HTTP.',
            'At least one src, href, or action attribute begins with http://.',
            'Serve every active resource and form destination over HTTPS.');
        }
        if (/<form\b[^>]*\baction\s*=\s*["']http:\/\//i.test(html)) {
          await addFinding('insecure-form-action', 'Form submits over HTTP', 'High', 'Content Security', pageUrl,
            'A form action sends submitted data over plaintext HTTP.',
            'A form action attribute begins with http://.',
            'Change the form destination to HTTPS and verify redirects do not downgrade the connection.');
        }
        if (/<title>\s*index of\s*\//i.test(html) || /directory listing for/i.test(html)) {
          await addFinding('directory-listing', 'Directory listing appears enabled', 'Moderate', 'Information Exposure', pageUrl,
            'The page resembles an automatically generated directory index.',
            'The response contains a directory index title or listing marker.',
            'Disable directory browsing and publish only intended files.');
        }
        const generator = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
        if (generator?.[1]) {
          await addFinding('generator-disclosure', 'Application generator is disclosed', 'Informational', 'Information Exposure', pageUrl,
            'The page exposes framework or content management generator metadata.',
            `Generator: ${cleanText(generator[1], 200)}`,
            'Remove generator metadata if it is not operationally required.');
        }

        for (const link of linkCandidates(html, pageUrl)) {
          const candidate = validateUrlShape(link);
          if (candidate.origin === finalPageUrl.origin && visited.size + queued.length < maxPages * 4) {
            discovered.add(candidate.toString());
            if (!visited.has(candidate.toString())) queued.push(candidate.toString());
          }
        }
      }
    }

    if (requestedUrl.protocol === 'https:') {
      checksRun += 1;
      const httpUrl = new URL(requestedUrl.toString());
      httpUrl.protocol = 'http:';
      httpUrl.port = '';
      try {
        await assertPinnedResolution(httpUrl);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
          response = await fetch(httpUrl.toString(), {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.5' },
          });
        } finally {
          clearTimeout(timer);
        }
        requestsMade += 1;
        // Same post-connect rebinding check as fetchPage before trusting headers.
        try {
          await assertPinnedResolution(httpUrl);
        } catch (error) {
          await response.body?.cancel().catch(() => {});
          throw error;
        }
        const location = response.headers.get('location') || '';
        const redirectsSecurely = [301, 302, 303, 307, 308].includes(response.status)
          && location
          && new URL(location, httpUrl).protocol === 'https:';
        await addLog('Info', 'http_redirect_check', `HTTP redirect check returned ${response.status}.`, httpUrl.toString(), {
          location: cleanText(location, 500),
          redirects_to_https: redirectsSecurely,
        });
        if (!redirectsSecurely) {
          await addFinding('http-no-https-redirect', 'HTTP does not redirect directly to HTTPS', 'Moderate', 'Transport Security', httpUrl.toString(),
            'The plaintext HTTP endpoint did not return an immediate redirect to HTTPS.',
            `HTTP status: ${response.status}; Location: ${location || 'not present'}`,
            'Redirect every HTTP request to the equivalent HTTPS URL before serving content.');
        }
        await response.body?.cancel().catch(() => {});
      } catch (error) {
        await addLog('Warning', 'http_redirect_check_failed', cleanText(errorMessage(error)), httpUrl.toString());
      }
    } else {
      checksRun += 1;
      await addFinding('target-uses-http', 'Website target uses plaintext HTTP', 'High', 'Transport Security', requestedUrl.toString(),
        'The authorized target URL uses HTTP and does not protect traffic with TLS.',
        `Target URL: ${requestedUrl.toString()}`,
        'Enable HTTPS with a publicly trusted certificate and redirect all HTTP traffic to HTTPS.');
    }

    if ((target.scan_profile || 'Standard') === 'Standard') {
      for (const specialPath of ['/robots.txt', '/.well-known/security.txt']) {
        const specialUrl = new URL(specialPath, requestedUrl.origin).toString();
        if (visited.has(specialUrl)) continue;
        checksRun += 1;
        try {
          const result = await fetchPage(specialUrl);
          const present = result.response.status >= 200 && result.response.status < 300 && Boolean(result.body.trim());
          if (!present && specialPath.includes('security.txt')) {
            await addFinding('missing-security-txt', 'Security contact file is not published', 'Informational', 'Configuration', specialUrl,
              'The standard /.well-known/security.txt location did not return a populated file.',
              `HTTP status: ${result.response.status}`,
              'Publish a security.txt file with a monitored security contact and expiration date.');
          }
        } catch (error) {
          await addLog('Warning', 'metadata_check_failed', cleanText(errorMessage(error)), specialUrl);
        }
      }
    }

    const counts: Record<string, number> = { Critical: 0, High: 0, Moderate: 0, Low: 0, Informational: 0 };
    findings.forEach((finding) => { counts[finding.severity] = (counts[finding.severity] || 0) + 1; });
    const deduction = findings.reduce((sum, finding) => sum + (SEVERITY_WEIGHT[finding.severity] || 0), 0);
    const score = Math.max(0, 100 - deduction);

    for (let i = 0; i < findings.length; i += 100) {
      await base44.asServiceRole.entities.WebsiteScanFinding.bulkCreate(findings.slice(i, i + 100));
    }

    const completedAt = new Date().toISOString();
    await addLog('Info', 'scan_completed', 'Website scan completed.', requestedUrl.toString(), {
      pages_scanned: visited.size,
      requests_made: requestsMade,
      checks_run: checksRun,
      finding_count: findings.length,
      security_score: score,
    });
    await persistLogs();
    const logDigest = await sha256(logs.map((log) => log.entry_hash).join(''));
    const finalUrl = [...visited][visited.size - 1] || requestedUrl.toString();
    const completedScan = await base44.asServiceRole.entities.WebsiteScan.update(scan.id, {
      status: 'Completed',
      final_url: finalUrl,
      completed_at: completedAt,
      duration_ms: Date.now() - started,
      pages_scanned: visited.size,
      requests_made: requestsMade,
      checks_run: checksRun,
      finding_count: findings.length,
      critical_count: counts.Critical,
      high_count: counts.High,
      moderate_count: counts.Moderate,
      low_count: counts.Low,
      informational_count: counts.Informational,
      security_score: score,
      log_sha256: logDigest,
      summary: {
        discovered_urls: discovered.size,
        authorization_attested_at: target.authorized_at,
        authorization_attested_by: target.authorized_by_email,
        note: 'Non-destructive public website configuration scan. No forms, credentials, exploit payloads, or brute-force requests were used.',
      },
    });
    await base44.asServiceRole.entities.WebsiteScanTarget.update(target.id, {
      last_scan_id: scan.id,
      last_scan_at: completedAt,
      last_scan_status: 'Completed',
      last_security_score: score,
    });
    await base44.asServiceRole.entities.AuditLog.create({
      organization_id: target.organization_id,
      user_email: caller.email || '',
      user_name: caller.full_name || '',
      action_type: 'ACOLYTE Website Scan Completed',
      target_entity: 'WebsiteScan',
      target_record_id: scan.id,
      action_summary: `Scanned ${target.target_name} with ${findings.length} findings across ${visited.size} page(s).`,
      ip_address: '',
      user_agent: req.headers.get('user-agent') || '',
    }).catch(() => {});

    return Response.json({ scan: completedScan, finding_count: findings.length, security_score: score });
  } catch (error) {
    const message = cleanText(errorMessage(error), 2000);
    if (scan?.id && target?.id) {
      await addLog('Error', 'scan_failed', message, target.start_url || '').catch(() => {});
      await persistLogs().catch(() => {});
      const completedAt = new Date().toISOString();
      await base44.asServiceRole.entities.WebsiteScan.update(scan.id, {
        status: 'Failed',
        completed_at: completedAt,
        error_message: message,
        log_sha256: await sha256(logs.map((log) => log.entry_hash).join('')),
      }).catch(() => {});
      await base44.asServiceRole.entities.WebsiteScanTarget.update(target.id, {
        last_scan_id: scan.id,
        last_scan_at: completedAt,
        last_scan_status: 'Failed',
      }).catch(() => {});
    }
    return jsonError(message, 500);
  }
});