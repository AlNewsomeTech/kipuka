import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ONE-PURPOSE PROBE FUNCTION — delete after the RLS probe concludes.
// Admin-only. Sole capability: set a named user's platform role to 'client'
// and their organization_id to a specified org. Nothing else.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden — platform admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const organizationId = (body.organization_id || '').trim();
    if (!email || !organizationId) {
      return Response.json({ error: 'email and organization_id are required' }, { status: 400 });
    }

    // Find the target user by email (service role — admin operation).
    const matches = await base44.asServiceRole.entities.User.filter({ email });
    if (!matches || matches.length === 0) {
      return Response.json({ error: `No user found with email ${email}. Invite them first.` }, { status: 404 });
    }
    const target = matches[0];

    const updated = await base44.asServiceRole.entities.User.update(target.id, {
      role: 'client',
      organization_id: organizationId
    });

    return Response.json({
      ok: true,
      user_id: updated.id,
      email: updated.email,
      role: updated.role,
      organization_id: updated.organization_id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});