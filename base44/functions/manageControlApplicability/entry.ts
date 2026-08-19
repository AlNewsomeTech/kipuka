import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PHASE 6A — CONTROL APPLICABILITY REQUEST AND INDEPENDENT REVIEW
// The browser may request or display a decision, but only this service writes
// protected Not Applicable fields on ControlAssessment.

const ACTIONS = ['get', 'request', 'approve', 'reject', 'withdraw', 'restore'];
const REQUEST_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Evidence Contributor', 'Pac-Sec Admin', 'Pac-Sec Support'];
const REVIEW_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin'];
const ALLOWED_KEYS = ['action', 'project_id', 'control_id', 'request_id', 'justification', 'scope_evidence', 'scope_confirmation', 'review_note', 'transition_id'];
const SHA256 = /^[a-f0-9]{64}$/i;

function text(value: unknown): string {
  return String(value || '').trim();
}
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}
async function sha256Hex(value: any): Promise<string> {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(typeof value === 'string' ? value : stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function assessmentSource(assessment: any) {
  return {
    id: assessment.id,
    organization_id: assessment.organization_id || '',
    project_id: assessment.project_id || '',
    control_id: assessment.control_id || '',
    status: assessment.status || 'Not Started',
    not_applicable_justification: assessment.not_applicable_justification || '',
    not_applicable_scope_evidence: assessment.not_applicable_scope_evidence || '',
    not_applicable_previous_status: assessment.not_applicable_previous_status || '',
  };
}
function safePreviousStatus(assessment: any): string {
  const candidate = assessment.status === 'Not Applicable'
    ? text(assessment.not_applicable_previous_status)
    : text(assessment.status);
  return candidate && candidate !== 'Not Applicable' ? candidate : 'Not Started';
}
function permissions(isPlatformAdmin: boolean, orgRole: string, caller: any, request: any) {
  const canRequest = isPlatformAdmin || REQUEST_ROLES.includes(orgRole);
  const roleCanReview = isPlatformAdmin || REVIEW_ROLES.includes(orgRole);
  const ownRequest = Boolean(request && (
    text(request.submitted_by_user_id) === text(caller.id)
    || text(request.submitted_by_email).toLowerCase() === text(caller.email).toLowerCase()
  ));
  return {
    can_request: canRequest,
    can_review: roleCanReview && !ownRequest,
    can_restore: canRequest,
    can_withdraw: Boolean(request?.status === 'Pending Review' && (ownRequest || isPlatformAdmin)),
    is_own_request: ownRequest,
    reviewer_separation_required: true,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((key) => !ALLOWED_KEYS.includes(key));
    if (unknown.length) return Response.json({ error: 'Unexpected fields: ' + unknown.join(', ') }, { status: 400 });

    const action = text(body.action) || 'get';
    const projectId = text(body.project_id);
    const controlId = text(body.control_id);
    if (!ACTIONS.includes(action)) return Response.json({ error: 'Unsupported action.' }, { status: 400 });
    if (!projectId || !controlId) return Response.json({ error: 'project_id and control_id are required.' }, { status: 400 });

    const sr = base44.asServiceRole;
    const isPlatformAdmin = caller.role === 'admin' || caller._app_role === 'admin';
    // Platform technicians are Pac-Sec staff: they carry no tenant org on their
    // user record and access projects cross-tenant (mirroring entity RLS).
    // They act with the Pac-Sec Support org role: may request/withdraw/restore,
    // never review — reviewer separation is preserved.
    const isPlatformTechnician = !isPlatformAdmin && (caller.role === 'technician' || caller._app_role === 'technician');
    const isPlatformStaff = isPlatformAdmin || isPlatformTechnician;
    let callerOrg = text(caller.organization_id);
    let orgRole = isPlatformAdmin ? 'Platform Admin' : (isPlatformTechnician ? 'Pac-Sec Support' : '');

    // Active membership is resolved before any tenant data is read.
    if (!isPlatformStaff) {
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({
        user_email: caller.email,
        organization_id: callerOrg,
      }).catch(() => []);
      const active = memberships.filter((membership: any) => membership.status === 'Active');
      if (active.length !== 1) {
        return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      }
      orgRole = active[0].role;
    }

    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project || (!isPlatformStaff && project.organization_id !== callerOrg)) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!project.organization_id) return Response.json({ error: 'Project is not linked to an organization.' }, { status: 409 });
    callerOrg = project.organization_id;

    const [assessments, libraryRows, requests, events] = await Promise.all([
      sr.entities.ControlAssessment.filter({ project_id: projectId, control_id: controlId }).catch(() => []),
      sr.entities.ControlLibrary.filter({
        control_id: controlId,
        cmmc_level: project.target_cmmc_level,
        active: true,
        authoritative: true,
      }).catch(() => []),
      sr.entities.ControlApplicabilityRequest.filter({ project_id: projectId, control_id: controlId }, '-request_version', 100).catch(() => []),
      sr.entities.ControlApplicabilityEvent.filter({ project_id: projectId, control_id: controlId }, '-event_date', 100).catch(() => []),
    ]);
    if (assessments.length !== 1) return Response.json({ error: 'Canonical control assessment is missing or ambiguous.' }, { status: 409 });
    if (libraryRows.length !== 1) return Response.json({ error: 'Authoritative control mapping is missing or ambiguous.' }, { status: 409 });
    const assessment = assessments[0];
    if (assessment.organization_id !== project.organization_id) return Response.json({ error: 'Control assessment tenant mismatch.' }, { status: 409 });

    const orderedRequests = [...requests].sort((a: any, b: any) => (b.request_version || 0) - (a.request_version || 0));
    const pending = orderedRequests.find((row: any) => row.status === 'Pending Review') || null;
    const latest = orderedRequests[0] || null;
    const currentPermissions = permissions(isPlatformAdmin, orgRole, caller, pending || latest);
    const legacyReviewRequired = assessment.status === 'Not Applicable'
      && !(assessment.not_applicable_request_status === 'Approved'
        && SHA256.test(text(assessment.not_applicable_decision_sha256))
        && text(assessment.not_applicable_request_id));

    if (action === 'get') {
      return Response.json({
        request: pending || latest,
        pending_request: pending,
        history: orderedRequests.slice(0, 20),
        events: [...events].sort((a: any, b: any) => text(b.event_date).localeCompare(text(a.event_date))).slice(0, 30),
        permissions: currentPermissions,
        legacy_review_required: legacyReviewRequired,
      });
    }

    if (action === 'request' && !(isPlatformAdmin || REQUEST_ROLES.includes(orgRole))) {
      return Response.json({ error: 'Your active organization role cannot request an applicability decision.' }, { status: 403 });
    }
    if (['approve', 'reject'].includes(action) && !(isPlatformAdmin || REVIEW_ROLES.includes(orgRole))) {
      return Response.json({ error: 'Your active organization role cannot review applicability requests.' }, { status: 403 });
    }
    if (['withdraw', 'restore'].includes(action) && !(isPlatformAdmin || REQUEST_ROLES.includes(orgRole))) {
      return Response.json({ error: 'Your active organization role cannot perform this applicability action.' }, { status: 403 });
    }

    const transitionId = text(body.transition_id);
    if (!transitionId || transitionId.length < 12 || transitionId.length > 120) {
      return Response.json({ error: 'A unique transition_id of 12 to 120 characters is required.' }, { status: 400 });
    }
    const transitionInput = {
      action,
      project_id: projectId,
      control_id: controlId,
      request_id: text(body.request_id),
      justification: text(body.justification),
      scope_evidence: text(body.scope_evidence),
      scope_confirmation: body.scope_confirmation === true,
      review_note: text(body.review_note),
      actor_user_id: text(caller.id),
      actor_email: text(caller.email).toLowerCase(),
    };
    const transitionInputSha = await sha256Hex(transitionInput);
    const priorTransitionEvents = events.filter((event: any) => event.transition_id === transitionId);
    if (priorTransitionEvents.length > 1) return Response.json({ error: 'Duplicate transition audit records exist.' }, { status: 409 });
    if (priorTransitionEvents.length === 1) {
      if (priorTransitionEvents[0].transition_input_sha256 !== transitionInputSha) {
        return Response.json({ error: 'transition_id was already used for a different action or payload.' }, { status: 409 });
      }
      const replayRequest = text(priorTransitionEvents[0].request_id)
        ? await sr.entities.ControlApplicabilityRequest.get(priorTransitionEvents[0].request_id).catch(() => null)
        : null;
      const replayAssessment = await sr.entities.ControlAssessment.get(assessment.id).catch(() => assessment);
      return Response.json({ request: replayRequest, assessment: replayAssessment, idempotent_replay: true });
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const actorName = text(caller.full_name) || text(caller.email) || 'System';
    const actorRole = orgRole || caller.role || 'Unknown';

    async function appendEvent(params: any) {
      const currentEvents = await sr.entities.ControlApplicabilityEvent.filter({
        project_id: projectId,
        control_id: controlId,
      }, '-event_date', 100).catch(() => []);
      const previous = [...currentEvents].sort((a: any, b: any) => text(b.event_date).localeCompare(text(a.event_date)))[0] || null;
      const payload = {
        organization_id: project.organization_id,
        project_id: projectId,
        control_assessment_id: assessment.id,
        control_id: controlId,
        request_id: params.request_id || '',
        action: params.action,
        from_status: params.from_status || '',
        to_status: params.to_status || '',
        transition_id: transitionId,
        transition_input_sha256: transitionInputSha,
        actor_user_id: text(caller.id),
        actor_email: text(caller.email),
        actor_name: actorName,
        actor_role: actorRole,
        note: params.note || '',
        request_sha256: params.request_sha256 || '',
        decision_sha256: params.decision_sha256 || '',
        previous_event_sha256: previous?.event_sha256 || '',
        event_date: now,
      };
      const eventSha = await sha256Hex(payload);
      return sr.entities.ControlApplicabilityEvent.create({ ...payload, event_sha256: eventSha });
    }

    // If a prior attempt committed part of a transition but not its audit event,
    // finish the protected assessment state and append the missing event.
    const transitionRequests = orderedRequests.filter((row: any) => row.last_transition_id === transitionId);
    const assessmentTransitionMatch = assessment.not_applicable_last_transition_id === transitionId;
    if (transitionRequests.length > 1) {
      return Response.json({ error: 'Duplicate request transition markers exist.' }, { status: 409 });
    }
    const transitionRequest = transitionRequests[0] || null;
    if (transitionRequest && transitionRequest.last_transition_input_sha256 !== transitionInputSha) {
      return Response.json({ error: 'transition_id was already used for a different request payload.' }, { status: 409 });
    }
    if (assessmentTransitionMatch && assessment.not_applicable_last_transition_input_sha256 !== transitionInputSha) {
      return Response.json({ error: 'transition_id was already used for a different assessment payload.' }, { status: 409 });
    }
    if (transitionRequest || assessmentTransitionMatch) {
      let recoveredAssessment = assessment;
      let recoveredRequest = transitionRequest;

      if (action === 'request') {
        if (!transitionRequest || transitionRequest.status !== 'Pending Review') {
          return Response.json({ error: 'Interrupted request transition is inconsistent.' }, { status: 409 });
        }
        if (transitionRequest.supersedes_request_id) {
          const superseded = orderedRequests.find((row: any) => row.id === transitionRequest.supersedes_request_id);
          if (superseded?.status === 'Pending Review') {
            await sr.entities.ControlApplicabilityRequest.update(superseded.id, {
              status: 'Superseded',
              superseded_by_request_id: transitionRequest.id,
            });
          }
        }
        recoveredAssessment = await sr.entities.ControlAssessment.update(assessment.id, {
          not_applicable_request_id: transitionRequest.id,
          not_applicable_request_status: 'Pending Review',
          not_applicable_last_transition_id: transitionId,
          not_applicable_last_transition_input_sha256: transitionInputSha,
        });
        await appendEvent({
          request_id: transitionRequest.id,
          action: 'Requested',
          from_status: assessment.status || 'Not Started',
          to_status: 'Pending Review',
          note: 'Independent review requested.',
          request_sha256: transitionRequest.request_sha256,
        });
      } else if (action === 'approve' || action === 'reject') {
        const expectedStatus = action === 'approve' ? 'Approved' : 'Rejected';
        if (!transitionRequest || transitionRequest.status !== expectedStatus) {
          return Response.json({ error: 'Interrupted review transition is inconsistent.' }, { status: 409 });
        }
        const patch: any = action === 'approve' ? {
          status: 'Not Applicable',
          not_applicable_justification: transitionRequest.justification,
          not_applicable_scope_evidence: transitionRequest.scope_evidence,
          not_applicable_confirmed_by: transitionRequest.reviewed_by_name,
          not_applicable_confirmed_date: text(transitionRequest.reviewed_date).slice(0, 10),
          not_applicable_previous_status: transitionRequest.previous_assessment_status || 'Not Started',
          not_applicable_request_id: transitionRequest.id,
          not_applicable_request_status: 'Approved',
          not_applicable_decision_sha256: transitionRequest.decision_sha256,
          not_applicable_approved_by_email: transitionRequest.reviewed_by_email,
          not_applicable_approved_date: transitionRequest.reviewed_date,
          last_reviewed_by: transitionRequest.reviewed_by_name,
          last_reviewed_date: text(transitionRequest.reviewed_date).slice(0, 10),
          not_applicable_last_transition_id: transitionId,
          not_applicable_last_transition_input_sha256: transitionInputSha,
        } : {
          not_applicable_request_id: transitionRequest.id,
          not_applicable_request_status: 'Rejected',
          not_applicable_last_transition_id: transitionId,
          not_applicable_last_transition_input_sha256: transitionInputSha,
        };
        recoveredAssessment = await sr.entities.ControlAssessment.update(assessment.id, patch);
        await appendEvent({
          request_id: transitionRequest.id,
          action: expectedStatus,
          from_status: 'Pending Review',
          to_status: expectedStatus,
          note: transitionRequest.review_note,
          request_sha256: transitionRequest.request_sha256,
          decision_sha256: transitionRequest.decision_sha256,
        });
      } else if (action === 'withdraw') {
        if (!transitionRequest || transitionRequest.status !== 'Withdrawn') {
          return Response.json({ error: 'Interrupted withdrawal transition is inconsistent.' }, { status: 409 });
        }
        recoveredAssessment = await sr.entities.ControlAssessment.update(assessment.id, {
          not_applicable_request_id: transitionRequest.id,
          not_applicable_request_status: 'Withdrawn',
          not_applicable_last_transition_id: transitionId,
          not_applicable_last_transition_input_sha256: transitionInputSha,
        });
        await appendEvent({
          request_id: transitionRequest.id,
          action: 'Withdrawn',
          from_status: 'Pending Review',
          to_status: 'Withdrawn',
          note: transitionRequest.review_note || 'Withdrawn by requester.',
          request_sha256: transitionRequest.request_sha256,
        });
      } else if (action === 'restore') {
        if (!assessmentTransitionMatch || assessment.status === 'Not Applicable') {
          return Response.json({ error: 'Interrupted restore transition is inconsistent.' }, { status: 409 });
        }
        recoveredRequest = text(assessment.not_applicable_request_id)
          ? await sr.entities.ControlApplicabilityRequest.get(assessment.not_applicable_request_id).catch(() => null)
          : null;
        await appendEvent({
          request_id: text(assessment.not_applicable_request_id),
          action: 'Restored Applicable',
          from_status: 'Not Applicable',
          to_status: assessment.status,
          note: text(body.review_note) || 'Control restored as applicable.',
          decision_sha256: text(recoveredRequest?.decision_sha256),
        });
      } else {
        return Response.json({ error: 'Interrupted transition is inconsistent.' }, { status: 409 });
      }
      return Response.json({
        request: recoveredRequest,
        assessment: recoveredAssessment,
        idempotent_replay: true,
        audit_recovered: true,
      });
    }

    if (action === 'request') {
      const justification = text(body.justification);
      const scopeEvidence = text(body.scope_evidence);
      if (justification.length < 40) {
        return Response.json({ error: 'Explain why the control is outside scope in at least 40 characters.' }, { status: 400 });
      }
      if (scopeEvidence.length < 20) {
        return Response.json({ error: 'Identify the scope records or evidence in at least 20 characters.' }, { status: 400 });
      }
      if (body.scope_confirmation !== true) {
        return Response.json({ error: 'Confirm the assessment-scope statement before submitting.' }, { status: 400 });
      }
      if (pending) return Response.json({ error: 'This control already has an applicability request awaiting review.' }, { status: 409 });
      if (assessment.not_applicable_request_status === 'Approved' && assessment.status === 'Not Applicable') {
        return Response.json({ error: 'This control already has an approved Not Applicable decision. Restore it as applicable before requesting a new decision.' }, { status: 409 });
      }

      const sourceSha = await sha256Hex(assessmentSource(assessment));
      const requestVersion = (latest?.request_version || 0) + 1;
      const requestPayload = {
        organization_id: project.organization_id,
        project_id: projectId,
        control_assessment_id: assessment.id,
        control_id: controlId,
        request_version: requestVersion,
        status: 'Pending Review',
        justification,
        scope_evidence: scopeEvidence,
        scope_confirmation: true,
        previous_assessment_status: safePreviousStatus(assessment),
        source_assessment_sha256: sourceSha,
        submitted_by_user_id: text(caller.id),
        submitted_by_email: text(caller.email),
        submitted_by_name: actorName,
        submitted_by_role: actorRole,
        submitted_date: now,
        last_transition_id: transitionId,
        last_transition_input_sha256: transitionInputSha,
        supersedes_request_id: latest?.id || '',
      };
      const requestSha = await sha256Hex(requestPayload);
      const created = await sr.entities.ControlApplicabilityRequest.create({ ...requestPayload, request_sha256: requestSha });
      if (latest?.id) {
        await sr.entities.ControlApplicabilityRequest.update(latest.id, {
          status: latest.status === 'Pending Review' ? 'Superseded' : latest.status,
          superseded_by_request_id: created.id,
        }).catch(() => {});
      }
      await sr.entities.ControlAssessment.update(assessment.id, {
        not_applicable_request_id: created.id,
        not_applicable_request_status: 'Pending Review',
        not_applicable_last_transition_id: transitionId,
        not_applicable_last_transition_input_sha256: transitionInputSha,
      });
      await appendEvent({
        request_id: created.id,
        action: 'Requested',
        from_status: assessment.status || 'Not Started',
        to_status: 'Pending Review',
        note: 'Independent review requested.',
        request_sha256: requestSha,
      });
      return Response.json({ request: created, assessment: { ...assessment, not_applicable_request_id: created.id, not_applicable_request_status: 'Pending Review' } });
    }

    const requestId = text(body.request_id);
    const target = requestId ? await sr.entities.ControlApplicabilityRequest.get(requestId).catch(() => null) : pending;
    if (action !== 'restore' && (!target || target.project_id !== projectId || target.control_id !== controlId || target.organization_id !== project.organization_id)) {
      return Response.json({ error: 'Applicability request not found.' }, { status: 404 });
    }

    if (action === 'approve' || action === 'reject') {
      if (target.status !== 'Pending Review') return Response.json({ error: 'Only a pending applicability request can be reviewed.' }, { status: 409 });
      const selfReview = text(target.submitted_by_user_id) === text(caller.id)
        || text(target.submitted_by_email).toLowerCase() === text(caller.email).toLowerCase();
      if (selfReview) return Response.json({ error: 'Reviewer separation required: the requester cannot review their own applicability request.' }, { status: 403 });
      const reviewNote = text(body.review_note);
      if (reviewNote.length < 10) return Response.json({ error: 'Enter a review note of at least 10 characters.' }, { status: 400 });

      const sourceSha = await sha256Hex(assessmentSource(assessment));
      if (sourceSha !== target.source_assessment_sha256) {
        return Response.json({ error: 'The control assessment changed after this request was submitted. Submit a fresh applicability request.' }, { status: 409 });
      }
      if (!SHA256.test(text(target.request_sha256))) return Response.json({ error: 'Applicability request hash is missing or invalid.' }, { status: 409 });

      const approved = action === 'approve';
      const decisionPayload = {
        request_id: target.id,
        request_sha256: target.request_sha256,
        decision: approved ? 'Approved' : 'Rejected',
        reviewer_user_id: text(caller.id),
        reviewer_email: text(caller.email),
        reviewer_name: actorName,
        reviewer_role: actorRole,
        review_note: reviewNote,
        reviewed_date: now,
      };
      const decisionSha = await sha256Hex(decisionPayload);
      const finalRequest = await sr.entities.ControlApplicabilityRequest.update(target.id, {
        status: approved ? 'Approved' : 'Rejected',
        decision_sha256: decisionSha,
        reviewed_by_user_id: text(caller.id),
        reviewed_by_email: text(caller.email),
        reviewed_by_name: actorName,
        reviewed_by_role: actorRole,
        review_note: reviewNote,
        reviewed_date: now,
        last_transition_id: transitionId,
        last_transition_input_sha256: transitionInputSha,
      });

      const assessmentPatch: any = approved ? {
        status: 'Not Applicable',
        not_applicable_justification: target.justification,
        not_applicable_scope_evidence: target.scope_evidence,
        not_applicable_confirmed_by: actorName,
        not_applicable_confirmed_date: today,
        not_applicable_previous_status: target.previous_assessment_status || 'Not Started',
        not_applicable_request_id: target.id,
        not_applicable_request_status: 'Approved',
        not_applicable_decision_sha256: decisionSha,
        not_applicable_approved_by_email: text(caller.email),
        not_applicable_approved_date: now,
        last_reviewed_by: actorName,
        last_reviewed_date: today,
        not_applicable_last_transition_id: transitionId,
        not_applicable_last_transition_input_sha256: transitionInputSha,
      } : {
        not_applicable_request_id: target.id,
        not_applicable_request_status: 'Rejected',
        not_applicable_last_transition_id: transitionId,
        not_applicable_last_transition_input_sha256: transitionInputSha,
      };
      const updatedAssessment = await sr.entities.ControlAssessment.update(assessment.id, assessmentPatch);
      await appendEvent({
        request_id: target.id,
        action: approved ? 'Approved' : 'Rejected',
        from_status: 'Pending Review',
        to_status: approved ? 'Approved' : 'Rejected',
        note: reviewNote,
        request_sha256: target.request_sha256,
        decision_sha256: decisionSha,
      });
      return Response.json({ request: finalRequest, assessment: updatedAssessment });
    }

    if (action === 'withdraw') {
      const ownRequest = text(target.submitted_by_user_id) === text(caller.id)
        || text(target.submitted_by_email).toLowerCase() === text(caller.email).toLowerCase();
      if (!isPlatformAdmin && !ownRequest) return Response.json({ error: 'Only the requester may withdraw this request.' }, { status: 403 });
      if (target.status !== 'Pending Review') return Response.json({ error: 'Only a pending request can be withdrawn.' }, { status: 409 });
      const finalRequest = await sr.entities.ControlApplicabilityRequest.update(target.id, {
        status: 'Withdrawn',
        review_note: text(body.review_note) || 'Withdrawn by requester.',
        reviewed_date: now,
        last_transition_id: transitionId,
        last_transition_input_sha256: transitionInputSha,
      });
      const updatedAssessment = await sr.entities.ControlAssessment.update(assessment.id, {
        not_applicable_request_id: target.id,
        not_applicable_request_status: 'Withdrawn',
        not_applicable_last_transition_id: transitionId,
        not_applicable_last_transition_input_sha256: transitionInputSha,
      });
      await appendEvent({
        request_id: target.id,
        action: 'Withdrawn',
        from_status: 'Pending Review',
        to_status: 'Withdrawn',
        note: text(body.review_note) || 'Withdrawn by requester.',
        request_sha256: target.request_sha256,
      });
      return Response.json({ request: finalRequest, assessment: updatedAssessment });
    }

    if (action === 'restore') {
      if (assessment.status !== 'Not Applicable') return Response.json({ error: 'This control is already applicable.' }, { status: 409 });
      const restoredStatus = safePreviousStatus(assessment);
      const updatedAssessment = await sr.entities.ControlAssessment.update(assessment.id, {
        status: restoredStatus,
        not_applicable_request_status: 'Restored',
        not_applicable_confirmed_by: '',
        not_applicable_confirmed_date: '',
        not_applicable_decision_sha256: '',
        not_applicable_approved_by_email: '',
        not_applicable_approved_date: '',
        last_reviewed_by: actorName,
        last_reviewed_date: today,
        not_applicable_last_transition_id: transitionId,
        not_applicable_last_transition_input_sha256: transitionInputSha,
      });
      await appendEvent({
        request_id: text(assessment.not_applicable_request_id),
        action: 'Restored Applicable',
        from_status: 'Not Applicable',
        to_status: restoredStatus,
        note: text(body.review_note) || 'Control restored as applicable.',
        decision_sha256: text(assessment.not_applicable_decision_sha256),
      });
      return Response.json({ request: target, assessment: updatedAssessment });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});