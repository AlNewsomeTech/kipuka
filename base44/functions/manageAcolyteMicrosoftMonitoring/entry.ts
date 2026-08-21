// OPTIONAL ACOLYTE Microsoft Graph monitoring: READ-ONLY posture scans,
// evidence collection, and configuration drift detection.
//
// Guarantees enforced here, server-side, on every request:
//  - The acolyte_microsoft_graph_monitoring_enabled flag (super-admin set,
//    default false) AND an ACOLYTE service entitlement are required.
//  - Monitoring NEVER requires the separate Graph deployment entitlement.
//  - Every Graph call is a GET; this function never changes customer
//    Microsoft configuration and never repairs drift silently.
//  - Caller, organization, project, tenant, and role are resolved from
//    canonical records; browser-supplied identifiers are lookup keys only.
//  - Each scan creates a NEW immutable MicrosoftPostureSnapshot; nothing is
//    overwritten. The first scan is never automatically a baseline.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  HttpError, MONITOR_ROLES, BASELINE_ROLES, resolveGraphAccess, getActiveConnection,
  getActiveCredential, getTenantToken, verifyTenantMatch, writeAudit,
  createGraphSnapshotEvidence, companySegment, sanitizeSegment,
} from '../../shared/microsoftGraph.ts';
import { COLLECTOR_VERSION, MONITORING_READ_PERMISSIONS, collectPosture, buildDriftItems } from '../../shared/microsoftPosture.ts';
import { parseExport, PARSER_VERSION, cleanText } from '../../shared/secureScoreParser.ts';
import { sha256Hex, sha256HexOfText, stableStringify, metadataSha } from '../../shared/evidenceIntegrity.ts';

const ACTIONS = ['status', 'run_scan', 'approve_baseline', 'list_snapshots'];
const ALLOWED_KEYS = ['action', 'project_id', 'snapshot_id'];
const OPEN_STATUSES = ['Open', 'In Progress', 'Pending Validation'];
const EVIDENCE_CONTROL_CANDIDATES = ['AC.L2-3.1.1', 'IA.L2-3.5.3', 'CM.L2-3.4.1', 'CM.L2-3.4.2'];
const EVIDENCE_OBJECTIVE_CANDIDATES = ['3.5.3[c]', '3.5.3[d]'];

function condenseSnapshot(s: any) {
  if (!s) return null;
  return {
    id: s.id, snapshot_date: s.snapshot_date, collection_status: s.collection_status,
    comparison_status: s.comparison_status, tenant_id: s.tenant_id,
    collector_version: s.collector_version, collected_by: s.collected_by,
    identity_summary: s.identity_summary || {}, mfa_summary: s.mfa_summary || {},
    conditional_access_summary: s.conditional_access_summary || {},
    device_summary: { ...(s.device_summary || {}), devices: undefined },
    compliance_summary: s.compliance_summary || {},
    secure_score_summary: s.secure_score_summary || {},
    drift_summary: s.drift_summary || {}, warnings: s.warnings || [], errors: s.errors || [],
    evidence_ids: s.evidence_ids || [], secure_score_import_id: s.secure_score_import_id || '',
    previous_snapshot_id: s.previous_snapshot_id || '', baseline_snapshot_id: s.baseline_snapshot_id || '',
    snapshot_sha256: s.snapshot_sha256 || '', is_approved_baseline: s.is_approved_baseline === true,
    baseline_approved_by: s.baseline_approved_by || '', baseline_approved_date: s.baseline_approved_date || '',
  };
}

async function latestSnapshot(sr: any, projectId: string) {
  const rows = await sr.entities.MicrosoftPostureSnapshot
    .filter({ project_id: projectId }, '-snapshot_date', 1).catch(() => []);
  return rows[0] || null;
}

async function approvedBaseline(sr: any, projectId: string) {
  const rows = await sr.entities.MicrosoftPostureSnapshot
    .filter({ project_id: projectId, is_approved_baseline: true }, '-baseline_approved_date', 1).catch(() => []);
  return rows[0] || null;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const action = String(body.action || '');
    if (!ACTIONS.includes(action)) return Response.json({ error: 'Unsupported action.' }, { status: 400 });
    const projectId = String(body.project_id || '');
    if (!projectId) return Response.json({ error: 'project_id is required.' }, { status: 400 });

    // `status` never fails on the flag so the UI can render the locked state.
    const access = await resolveGraphAccess(base44, {
      projectId,
      flag: 'monitoring',
      requireFlag: action !== 'status',
      allowedRoles: action === 'status' ? null
        : action === 'approve_baseline' ? BASELINE_ROLES
        : MONITOR_ROLES,
    });
    const { caller, sr, org, project, orgRole, deploymentEnabled, monitoringEnabled } = access;

    if (action === 'status') {
      if (!monitoringEnabled) {
        return Response.json({ monitoring_enabled: false, deployment_enabled: deploymentEnabled });
      }
      const [connection, latest, baseline] = await Promise.all([
        getActiveConnection(sr, org.id),
        latestSnapshot(sr, project.id),
        approvedBaseline(sr, project.id),
      ]);
      const findings = await sr.entities.CyberFinding
        .filter({ project_id: project.id, detection_source: 'Microsoft Graph Monitoring' }).catch(() => []);
      const open = findings.filter((f: any) => OPEN_STATUSES.includes(f.finding_status));
      return Response.json({
        monitoring_enabled: true,
        deployment_enabled: deploymentEnabled,
        connection: connection ? {
          tenant_id: connection.tenant_id, tenant_display_name: connection.tenant_display_name || '',
          tenant_primary_domain: connection.tenant_primary_domain || '',
          connection_status: connection.connection_status, connection_health: connection.connection_health,
          last_successful_call: connection.last_successful_call || '',
        } : null,
        latest_snapshot: condenseSnapshot(latest),
        baseline: baseline ? {
          snapshot_id: baseline.id, snapshot_sha256: baseline.snapshot_sha256 || '',
          approved_by: baseline.baseline_approved_by || '', approved_date: baseline.baseline_approved_date || '',
          snapshot_date: baseline.snapshot_date,
        } : null,
        open_findings: open.length,
        high_or_critical_findings: open.filter((f: any) => ['High', 'Critical'].includes(f.severity)).length,
        can_run_scan: MONITOR_ROLES.includes(orgRole),
        can_approve_baseline: BASELINE_ROLES.includes(orgRole),
        required_read_permissions: MONITORING_READ_PERMISSIONS,
      });
    }

    if (action === 'list_snapshots') {
      const rows = await sr.entities.MicrosoftPostureSnapshot
        .filter({ project_id: project.id }, '-snapshot_date', 24).catch(() => []);
      return Response.json({
        snapshots: rows.map((s: any) => ({
          id: s.id, snapshot_date: s.snapshot_date, collection_status: s.collection_status,
          comparison_status: s.comparison_status, is_approved_baseline: s.is_approved_baseline === true,
          snapshot_sha256: s.snapshot_sha256 || '',
          mfa_coverage_percent: s.mfa_summary?.coverage_percent ?? null,
          secure_score_percent: s.secure_score_summary?.percent ?? null,
          ca_policies: s.conditional_access_summary?.total ?? null,
          drift_count: Array.isArray(s.drift_summary?.items) ? s.drift_summary.items.length : 0,
        })),
      });
    }

    if (action === 'approve_baseline') {
      const snapshotId = String(body.snapshot_id || '');
      if (!snapshotId) return Response.json({ error: 'snapshot_id is required.' }, { status: 400 });
      const snapshot = await sr.entities.MicrosoftPostureSnapshot.get(snapshotId).catch(() => null);
      if (!snapshot || snapshot.project_id !== project.id || snapshot.organization_id !== org.id) {
        return Response.json({ error: 'Snapshot not found.' }, { status: 404 });
      }
      if (snapshot.is_approved_baseline === true) {
        return Response.json({ snapshot: condenseSnapshot(snapshot), idempotent: true });
      }
      const now = new Date().toISOString();
      const updated = await sr.entities.MicrosoftPostureSnapshot.update(snapshot.id, {
        is_approved_baseline: true, baseline_approved_by: caller.email || '', baseline_approved_date: now,
      });
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Baseline Approved',
        targetEntity: 'MicrosoftPostureSnapshot', targetRecordId: snapshot.id,
        summary: `Approved Microsoft posture snapshot ${snapshot.id} (tenant ${snapshot.tenant_id}, SHA-256 ${String(snapshot.snapshot_sha256 || '').slice(0, 12)}) as the Microsoft baseline.`,
      });
      return Response.json({ snapshot: condenseSnapshot(updated) });
    }

    // ---- run_scan ----
    const connection = await getActiveConnection(sr, org.id);
    if (!connection || connection.connection_status !== 'Connected') {
      return Response.json({ error: 'No connected Microsoft tenant. Connect the tenant before running a posture scan.' }, { status: 409 });
    }
    const credential = await getActiveCredential(sr, org.id);
    if (!credential || credential.tenant_id !== connection.tenant_id) {
      return Response.json({ error: 'The stored Microsoft credential is missing or does not match the connected tenant.' }, { status: 409 });
    }

    await writeAudit(sr, {
      organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Posture Scan Started',
      targetEntity: 'MicrosoftPostureSnapshot', targetRecordId: '',
      summary: `Read-only Microsoft 365 posture scan started for ${project.project_name || project.id} (tenant ${connection.tenant_id}).`,
    });

    try {
      const { accessToken, roles: grantedScopes } = await getTenantToken(credential);
      // Tenant identity is verified BEFORE any data collection.
      const tenant = await verifyTenantMatch(accessToken, connection.tenant_id);

      const deployments = await sr.entities.MicrosoftPolicyDeployment
        .filter({ organization_id: org.id, project_id: project.id }, null, 200).catch(() => []);

      const collected = await collectPosture(accessToken, { tenant, deployments });
      if (collected.collectedAreas === 0) {
        throw new HttpError(502, `No posture area could be collected. Grant the read permissions and retry. Details: ${collected.warnings.join(' | ')}`);
      }

      const previous = await latestSnapshot(sr, project.id);
      const baseline = await approvedBaseline(sr, project.id);
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // ---- Drift ----
      const driftItems = buildDriftItems({
        current: collected, baseline, deployments, deploymentEnabled,
        rawCaPolicies: collected.rawCaPolicies,
      });
      const hasComparison = Boolean(baseline) || deployments.some((d: any) => d.status === 'Verified' && d.graph_object_id);
      const comparisonStatus = !hasComparison ? 'No Baseline' : (driftItems.length ? 'Drift Detected' : 'In Sync');

      // ---- Secure Score → existing SecureScoreImport history ----
      let secureScoreImportId = '';
      const scanWarnings = [...collected.warnings];
      if (Array.isArray(collected.raw.secure_scores) && collected.raw.secure_scores.length) {
        const ssBytes = new TextEncoder().encode(JSON.stringify({ value: collected.raw.secure_scores }, null, 2));
        const ssHash = await sha256Hex(ssBytes);
        const duplicate = await sr.entities.SecureScoreImport
          .filter({ project_id: project.id, hash_value: ssHash }, '-uploaded_at', 1).catch(() => []);
        if (duplicate.length) {
          secureScoreImportId = duplicate[0].id;
          scanWarnings.push('Secure Score is unchanged since the last collection; no new history entry was created.');
        } else {
          const parsed = parseExport(ssBytes, 'json');
          const reportDate = parsed.reportDate || today;
          const storedName = [
            sanitizeSegment(companySegment(org), 'Company'), 'Microsoft_Secure_Score', reportDate,
          ].join('_') + '.json';
          const uploadedFile = await sr.integrations.Core.UploadPrivateFile({
            file: new File([ssBytes], storedName, { type: 'application/json' }),
          });
          if (uploadedFile?.file_uri) {
            const scorePercent = parsed.currentScore !== null && parsed.maxScore ? Math.round((parsed.currentScore / parsed.maxScore) * 1000) / 10 : null;
            const ssRecord = await sr.entities.SecureScoreImport.create({
              organization_id: org.id, project_id: project.id, client_id: '',
              source_type: 'Microsoft Graph JSON',
              import_status: parsed.recognized ? 'Parsed' : 'Stored - Review Required',
              report_date: reportDate, tenant_id: connection.tenant_id,
              current_score: parsed.currentScore, max_score: parsed.maxScore, score_percent: scorePercent,
              record_count: parsed.recordCount, recommendation_count: parsed.recommendationCount,
              completed_count: parsed.completedCount, category_summary: parsed.categorySummary,
              parsed_summary: parsed.summary,
              parser_warnings: [...new Set(parsed.warnings.map((w: string) => cleanText(w, 500)))],
              file_uri: uploadedFile.file_uri, file_name: storedName, original_file_name: storedName,
              mime_type: 'application/json', file_size_bytes: ssBytes.length,
              hash_algorithm: 'SHA-256', hash_value: ssHash,
              uploaded_by_email: caller.email || '', uploaded_by_name: caller.full_name || caller.email || '',
              uploaded_at: now, parser_version: PARSER_VERSION,
              notes: 'Collected automatically from Microsoft Graph by ACOLYTE monitoring. Manual uploads remain available as a fallback.',
            });
            secureScoreImportId = ssRecord.id;
            await writeAudit(sr, {
              organizationId: org.id, caller, actionType: 'ACOLYTE Secure Score Collected via Graph',
              targetEntity: 'SecureScoreImport', targetRecordId: ssRecord.id,
              summary: `Collected Microsoft Secure Score from Graph (SHA-256 ${ssHash.slice(0, 12)}) into the existing Secure Score history.`,
            });
          } else {
            scanWarnings.push('Secure Score raw response could not be stored privately.');
          }
        }
      }

      // ---- Raw evidence preservation (canonical ProjectEvidence lifecycle) ----
      const transitionId = `graphmon_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const evidencePayload = {
        provenance: {
          source: 'Microsoft Graph', tenant_id: connection.tenant_id,
          graph_endpoint: 'Multiple read-only endpoints (posture scan)',
          collected_at: now, collector_version: COLLECTOR_VERSION,
          collected_by: caller.email || '', client_id: connection.client_id || '',
          graph_scopes: grantedScopes,
        },
        responses: collected.raw,
      };
      let evidence: any = null;
      try {
        evidence = await createGraphSnapshotEvidence(sr, {
          org, project, caller, orgRole,
          title: `Microsoft 365 posture scan — ${tenant.displayName || connection.tenant_primary_domain || connection.tenant_id} — ${today}`,
          label: 'PostureScan',
          controlIds: EVIDENCE_CONTROL_CANDIDATES, objectiveIds: EVIDENCE_OBJECTIVE_CANDIDATES,
          payload: evidencePayload, tenantDomain: connection.tenant_primary_domain || connection.tenant_id,
          transitionId, requireControls: false,
          collector: 'ACOLYTE Microsoft Graph monitoring (read-only)',
          descriptionNote: 'Raw Microsoft Graph responses from a read-only ACOLYTE posture scan. Supports but does not independently prove CMMC compliance; review follows the normal evidence workflow.',
        });
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Evidence Stored',
          targetEntity: 'ProjectEvidence', targetRecordId: evidence.id,
          summary: `Preserved raw Graph posture responses as evidence (SHA-256 ${String(evidence.hash_value || '').slice(0, 12)}).`,
        });
        // Evidence refresh: the newest scan supersedes the previous scan's raw
        // posture evidence through the existing lifecycle. History is preserved.
        const priorEvidenceId = (previous?.evidence_ids || [])[0];
        if (priorEvidenceId) {
          const prior = await sr.entities.ProjectEvidence.get(priorEvidenceId).catch(() => null);
          if (prior && prior.project_id === project.id && !prior.superseded_by_evidence_id) {
            const priorUpdates: any = {
              review_status: 'Superseded', lifecycle_status: 'Superseded',
              superseded_by_evidence_id: evidence.id,
              last_transition_id: `${transitionId}_supersede`, last_transition_action: 'supersede',
              last_transition_from_status: prior.review_status || '', last_transition_to_status: 'Superseded',
            };
            priorUpdates.metadata_sha256 = await metadataSha({ ...prior, ...priorUpdates });
            const supersededPrior = await sr.entities.ProjectEvidence.update(prior.id, priorUpdates);
            const eventPayload = {
              organization_id: org.id, project_id: project.id, project_evidence_id: prior.id,
              action: 'Superseded', from_status: prior.review_status || '', to_status: 'Superseded',
              transition_id: `${transitionId}_supersede`, actor_user_id: caller.id || '',
              actor_email: caller.email || '', actor_name: caller.full_name || caller.email,
              actor_role: orgRole, note: 'Superseded by a newer Microsoft Graph posture scan; historical evidence retained.',
              evidence_sha256: supersededPrior.hash_value || '', metadata_sha256: priorUpdates.metadata_sha256, event_date: now,
            };
            await sr.entities.ProjectEvidenceEvent.create({
              ...eventPayload, event_sha256: await sha256HexOfText(stableStringify(eventPayload)),
            });
            const newUpdates: any = { supersedes_evidence_id: prior.id, version: Number(prior.version || 1) + 1 };
            newUpdates.metadata_sha256 = await metadataSha({ ...evidence, ...newUpdates });
            evidence = await sr.entities.ProjectEvidence.update(evidence.id, newUpdates);
          }
        }
      } catch (e) {
        scanWarnings.push(`Evidence preservation failed: ${e.message}`);
      }

      // ---- Immutable snapshot ----
      const driftCounts: Record<string, number> = {};
      for (const d of driftItems) driftCounts[d.severity] = (driftCounts[d.severity] || 0) + 1;
      const content = {
        tenant_id: connection.tenant_id, collector_version: COLLECTOR_VERSION,
        identity_summary: collected.identity_summary, mfa_summary: collected.mfa_summary,
        conditional_access_summary: collected.conditional_access_summary,
        device_summary: collected.device_summary, compliance_summary: collected.compliance_summary,
        secure_score_summary: collected.secure_score_summary, config_hashes: collected.config_hashes,
      };
      const snapshot = await sr.entities.MicrosoftPostureSnapshot.create({
        organization_id: org.id, project_id: project.id, tenant_id: connection.tenant_id,
        snapshot_date: now, collector_version: COLLECTOR_VERSION,
        connection_client_id: connection.client_id || '', collected_by: caller.email || '',
        graph_scopes: grantedScopes,
        identity_summary: collected.identity_summary, mfa_summary: collected.mfa_summary,
        conditional_access_summary: collected.conditional_access_summary,
        device_summary: collected.device_summary, compliance_summary: collected.compliance_summary,
        secure_score_summary: collected.secure_score_summary, config_hashes: collected.config_hashes,
        evidence_ids: evidence ? [evidence.id] : [], secure_score_import_id: secureScoreImportId,
        previous_snapshot_id: previous?.id || '', baseline_snapshot_id: baseline?.id || '',
        comparison_status: comparisonStatus,
        drift_summary: { counts: driftCounts, items: driftItems },
        collection_status: scanWarnings.length ? 'Partial' : 'Complete',
        warnings: scanWarnings.map((w) => String(w).slice(0, 500)),
        errors: collected.errors.map((e: string) => String(e).slice(0, 500)),
        snapshot_sha256: await sha256HexOfText(stableStringify(content)),
        is_approved_baseline: false,
      });

      // ---- Findings: idempotent by drift fingerprint, never duplicated ----
      let findingsCreated = 0;
      let findingsUpdated = 0;
      const currentFingerprints = new Set(driftItems.map((d) => d.fingerprint));
      const existingMsFindings = await sr.entities.CyberFinding
        .filter({ project_id: project.id, detection_source: 'Microsoft Graph Monitoring' }).catch(() => []);

      for (const drift of driftItems) {
        if (drift.severity === 'Informational') continue;
        const description = `Expected state: ${drift.expected}\n\nObserved state: ${drift.observed}\n\nDetected by a read-only ACOLYTE Microsoft Graph posture scan on ${today}. No automatic change was made to the Microsoft configuration.`;
        const open = existingMsFindings.find((f: any) =>
          f.drift_fingerprint === drift.fingerprint && OPEN_STATUSES.includes(f.finding_status));
        if (open) {
          await sr.entities.CyberFinding.update(open.id, {
            source_snapshot_id: snapshot.id, description,
            severity: drift.severity,
            related_evidence_ids: [...new Set([...(open.related_evidence_ids || []), ...(evidence ? [evidence.id] : [])])],
            microsoft_object_id: drift.object_id, related_deployment_id: drift.deployment_id,
          });
          findingsUpdated += 1;
        } else {
          const created = await sr.entities.CyberFinding.create({
            organization_id: org.id, project_id: project.id,
            finding_title: drift.title, finding_category: drift.category, severity: drift.severity,
            finding_status: 'Open', description,
            affected_systems: drift.category === 'Endpoint Security' ? 'Microsoft Intune managed devices'
              : drift.category === 'Cloud Security' ? 'Microsoft 365 tenant' : 'Microsoft Entra ID',
            recommended_action: drift.recommended_action,
            related_control_ids: drift.control_ids, related_evidence_ids: evidence ? [evidence.id] : [],
            created_by: 'ACOLYTE Microsoft Graph Monitoring',
            detection_source: 'Microsoft Graph Monitoring', drift_fingerprint: drift.fingerprint,
            source_snapshot_id: snapshot.id, microsoft_object_id: drift.object_id,
            related_deployment_id: drift.deployment_id,
          });
          findingsCreated += 1;
          await writeAudit(sr, {
            organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Drift Finding Created',
            targetEntity: 'CyberFinding', targetRecordId: created.id,
            summary: `${drift.severity} drift finding created: ${drift.title}`,
          });
        }
      }
      if (driftItems.length) {
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Drift Detected',
          targetEntity: 'MicrosoftPostureSnapshot', targetRecordId: snapshot.id,
          summary: `${driftItems.length} drift item(s) detected (${Object.entries(driftCounts).map(([k, v]) => `${v} ${k}`).join(', ')}).`,
        });
      }

      // Resolved drift → Pending Validation (never auto-closed).
      let findingsPendingValidation = 0;
      if (hasComparison) {
        for (const finding of existingMsFindings) {
          if (!OPEN_STATUSES.includes(finding.finding_status) || finding.finding_status === 'Pending Validation') continue;
          if (finding.drift_fingerprint && !currentFingerprints.has(finding.drift_fingerprint)) {
            await sr.entities.CyberFinding.update(finding.id, {
              finding_status: 'Pending Validation',
              validation_notes: `${finding.validation_notes ? `${finding.validation_notes}\n` : ''}Drift no longer observed in the ${today} posture scan (snapshot ${snapshot.id}). Validate the correction and close the finding.`,
              source_snapshot_id: snapshot.id,
            });
            findingsPendingValidation += 1;
            await writeAudit(sr, {
              organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Drift Finding Pending Validation',
              targetEntity: 'CyberFinding', targetRecordId: finding.id,
              summary: `Drift condition resolved in scan ${snapshot.id}; finding moved to Pending Validation for human review.`,
            });
          }
        }
      }

      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Posture Scan Completed',
        targetEntity: 'MicrosoftPostureSnapshot', targetRecordId: snapshot.id,
        summary: `Posture scan completed (${snapshot.collection_status}): ${comparisonStatus}; ${driftItems.length} drift item(s); ${findingsCreated} finding(s) created, ${findingsUpdated} updated, ${findingsPendingValidation} pending validation. SHA-256 ${String(snapshot.snapshot_sha256).slice(0, 12)}.`,
      });

      return Response.json({
        snapshot: condenseSnapshot(snapshot),
        drift_items: driftItems,
        findings_created: findingsCreated,
        findings_updated: findingsUpdated,
        findings_pending_validation: findingsPendingValidation,
        secure_score_import_id: secureScoreImportId,
        evidence_id: evidence?.id || '',
      });
    } catch (error) {
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'ACOLYTE Microsoft Posture Scan Failed',
        targetEntity: 'MicrosoftPostureSnapshot', targetRecordId: '',
        summary: `Posture scan failed: ${String(error.message || error).slice(0, 500)}`,
      });
      throw error;
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error.message }, { status });
  }
}