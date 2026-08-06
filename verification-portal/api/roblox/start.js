const crypto = require("node:crypto");
const { loadPortalConfig } = require("../_lib/config");
const { escapeHtml, sendHtml } = require("../_lib/html");
const { encodeContext, validateLaunch } = require("../_lib/verification-context");

const authorizeUrl = "https://apis.roblox.com/oauth/v1/authorize";

module.exports = async function handler(request, response) {
  let config;
  try {
    config = loadPortalConfig();
  } catch (error) {
    console.error("Verification portal configuration error:", error);
    sendHtml(
      response,
      500,
      "Verification Not Ready",
      `<p class="result-kicker">System unavailable</p>
      <h1>Verification is offline.</h1>
      <p>The Roblox connection is not ready right now. Return to Discord and let staff know.</p>
      <div class="result-actions">
        <a class="button button-primary" href="https://discord.com/channels/1508482350764523530/1508549978493026444">Return to Discord <span aria-hidden="true">&#8599;</span></a>
      </div>
      <div class="result-meta">OSRP Verification / Configuration</div>`,
      { tone: "danger" },
    );
    return;
  }

  const state = crypto.randomUUID();
  let context;
  try {
    const requestUrl = new URL(request.url, `https://${request.headers.host}`);
    context = validateLaunch(requestUrl, config.botCallbackSecret);
  } catch (error) {
    sendHtml(
      response,
      400,
      "Verification Link Invalid",
      `<p class="result-kicker">Link expired</p>
      <h1>Start again in Discord.</h1>
      <p>${escapeHtml(error.message)}</p>
      <div class="result-actions">
        <a class="button button-primary" href="https://discord.com/channels/1508482350764523530/1508549978493026444">Get a new link <span aria-hidden="true">&#8599;</span></a>
      </div>
      <div class="result-meta">OSRP Verification / Invalid session</div>`,
      { tone: "danger" },
    );
    return;
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes,
    state,
  });

  response.setHeader("set-cookie", [
    `osrp_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    `osrp_verification_context=${encodeContext(context, config.botCallbackSecret)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  ]);
  response.statusCode = 302;
  response.setHeader("location", `${authorizeUrl}?${params.toString()}`);
  response.end();
};
