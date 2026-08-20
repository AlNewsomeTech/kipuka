// Shared secret that authenticates the "Blog Content Schedule" workflow when it
// invokes generateBlogArticle. Workflow invocations carry no user session, so
// the absence of a session must never be treated as proof of a scheduled run.
// The workflow passes this token in its args; the function verifies it before
// allowing unauthenticated (scheduled) generation or auto-publishing.
//
// Rotate by changing this value AND the matching workflow_secret arg in
// base44/workflows/Blog Content Schedule.jsonc in the same change.
export const BLOG_WORKFLOW_SECRET = '9f4c1e7a2d5b8036c4e9a1f7d3b60c85e2a749f0b1d6c38e5a07f4923cd8b16e';