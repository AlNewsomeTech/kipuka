import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public demo-request intake for the Kipuka landing page.
// Intentionally callable WITHOUT user authentication (the landing page is
// public). It therefore:
//   - never reads any entity data,
//   - only CREATES a single DemoRequest record via the service role,
//   - validates and length-caps every field,
//   - rejects submissions that fill the hidden honeypot field.
export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Honeypot: real users never fill this hidden field.
    if (typeof payload.website === 'string' && payload.website.trim() !== '') {
      // Pretend success so bots learn nothing.
      return Response.json({ ok: true });
    }

    const str = (v: unknown, max: number) =>
      typeof v === 'string' ? v.trim().slice(0, max) : '';

    const fullName = str(payload.full_name, 120);
    const email = str(payload.email, 200);
    const company = str(payload.company, 160);
    const roleTitle = str(payload.role_title, 120);
    const message = str(payload.message, 2000);

    if (!fullName || fullName.length < 2) {
      return Response.json({ error: 'Please provide your name.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.DemoRequest.create({
      full_name: fullName,
      email,
      company,
      role_title: roleTitle,
      message,
      source_page: 'landing',
      status: 'New',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Unable to submit request. Please try again.' }, { status: 500 });
  }
}