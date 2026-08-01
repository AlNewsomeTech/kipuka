// RETIRED — Phase 4 canonical project document engine.
//
// This legacy Client/ControlProgress Markdown generator has been replaced by
// the canonical Project-based DOCX engine:
//   - preflightProjectDocument  (deterministic, write-free readiness check)
//   - generateProjectDocument   (DOCX draft generation from versioned templates)
//
// This endpoint fails closed. It performs no reads and no writes of any kind.

Deno.serve(() => {
  return Response.json(
    {
      error: 'Gone',
      message:
        'generateDocument has been retired. Use preflightProjectDocument to check readiness and generateProjectDocument to generate a Project-based DOCX draft.',
      replacement: ['preflightProjectDocument', 'generateProjectDocument'],
    },
    { status: 410 },
  );
});