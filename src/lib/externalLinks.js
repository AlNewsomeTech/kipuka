// Global external-link handler: any anchor pointing off-origin opens in a new
// tab with noopener, no matter where it came from — including links inside
// injected HTML content (runbook steps, requirement text, help articles,
// markdown) that can't carry target="_blank" themselves. Internal SPA links
// and download links are untouched. Self-installs on import; idempotent.
(function installExternalLinkHandler() {
  if (typeof document === 'undefined' || window.__externalLinksInstalled) return;
  window.__externalLinksInstalled = true;
  document.addEventListener('click', (e) => {
    // Respect modified clicks (user explicitly choosing a behavior).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return;           // relative/router links stay in-app
    if (href.startsWith(window.location.origin)) return; // same-origin absolute links stay in-app
    e.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  });
})();
