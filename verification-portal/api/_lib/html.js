function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #070908;
        --panel: #111612;
        --line: #1c3325;
        --text: #f4f6f3;
        --muted: #a6afa8;
        --accent: #0b3d24;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #132217 0, var(--bg) 42rem);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(92vw, 560px);
        border: 1px solid var(--line);
        border-left: 6px solid var(--accent);
        background: color-mix(in srgb, var(--panel) 92%, black);
        padding: 28px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(28px, 6vw, 46px);
        line-height: 1;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.55;
      }

      a {
        color: var(--text);
      }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

function sendHtml(response, statusCode, title, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(page(title, body));
}

module.exports = {
  escapeHtml,
  sendHtml,
};
