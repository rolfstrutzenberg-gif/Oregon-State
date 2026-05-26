const crypto = require("node:crypto");
const { loadPortalConfig } = require("../_lib/config");
const { escapeHtml, sendHtml } = require("../_lib/html");

const authorizeUrl = "https://apis.roblox.com/oauth/v1/authorize";

module.exports = async function handler(request, response) {
  let config;
  try {
    config = loadPortalConfig();
  } catch (error) {
    sendHtml(
      response,
      500,
      "Verification Not Ready",
      `<h1>Verification Not Ready</h1><p>${escapeHtml(error.message)}</p>`,
      { tone: "danger" },
    );
    return;
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes,
    state,
  });

  response.setHeader("set-cookie", [
    `osrp_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  ]);
  response.statusCode = 302;
  response.setHeader("location", `${authorizeUrl}?${params.toString()}`);
  response.end();
};
