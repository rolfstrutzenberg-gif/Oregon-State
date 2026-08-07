function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title, body, options = {}) {
  const tone = options.tone === "danger" ? "danger" : "default";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#07110b">
    <meta name="robots" content="noindex, nofollow">
    <title>${escapeHtml(title)} | OSRP</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/site.css">
  </head>
  <body class="result-body">
    <div class="atmosphere" aria-hidden="true"></div>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Oregon State Roleplay home">
        <span class="brand-mark">OSRP</span>
        <span class="brand-copy">Oregon State Roleplay</span>
      </a>
      <div class="service-state" data-ready="true">
        <span class="state-dot"></span>
        <span>Official verification</span>
      </div>
    </header>
    <main class="result-main">
      <section class="result-panel" data-tone="${tone}">
        <div class="result-banner">
          <img src="/assets/banners/verification.png" alt="Oregon State Roleplay verification">
        </div>
        <div class="result-content">${body}</div>
      </section>
    </main>
    <footer class="site-footer shell">
      <span>Oregon State Roleplay</span>
      <nav class="footer-links" aria-label="Legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <span>EST 2026</span>
    </footer>
  </body>
</html>`;
}

function sendHtml(response, statusCode, title, body, options = {}) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.end(page(title, body, options));
}

module.exports = {
  escapeHtml,
  page,
  sendHtml,
};
