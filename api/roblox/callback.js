const { loadPortalConfig } = require("../_lib/config");
const { escapeHtml, sendHtml } = require("../_lib/html");

const tokenUrl = "https://apis.roblox.com/oauth/v1/token";
const userInfoUrl = "https://apis.roblox.com/oauth/v1/userinfo";

function cookieValue(request, name) {
  const cookies = request.headers.cookie || "";
  const match = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(name.length + 1));
}

async function exchangeCode(config, code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Roblox token exchange failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchUserInfo(accessToken) {
  const response = await fetch(userInfoUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Roblox userinfo failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function notifyBot(config, profile) {
  if (!config.botCallbackUrl || !config.botCallbackSecret) {
    return false;
  }

  const response = await fetch(config.botCallbackUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-osrp-verification-secret": config.botCallbackSecret,
    },
    body: JSON.stringify({
      robloxUserId: profile.sub,
      robloxUsername: profile.preferred_username || profile.name || profile.sub,
      robloxDisplayName: profile.name || profile.preferred_username || profile.sub,
      verifiedAt: new Date().toISOString(),
      provider: "roblox-oauth",
    }),
  });

  if (!response.ok) {
    throw new Error(`Bot callback failed: ${response.status} ${await response.text()}`);
  }

  return true;
}

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
    );
    return;
  }

  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const savedState = cookieValue(request, "osrp_oauth_state");

  if (!code || !state || !savedState || state !== savedState) {
    sendHtml(
      response,
      400,
      "Verification Failed",
      "<h1>Verification Failed</h1><p>The verification session expired or was invalid. Return to Discord and start again.</p>",
    );
    return;
  }

  try {
    const token = await exchangeCode(config, code);
    const profile = await fetchUserInfo(token.access_token);
    const notifiedBot = await notifyBot(config, profile);

    if (config.successRedirectUrl) {
      response.statusCode = 302;
      response.setHeader("set-cookie", ["osrp_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"]);
      response.setHeader("location", config.successRedirectUrl);
      response.end();
      return;
    }

    sendHtml(
      response,
      200,
      "Verification Complete",
      `<h1>Verification Complete</h1><p>Roblox account linked as <strong>${escapeHtml(profile.preferred_username || profile.name || profile.sub)}</strong>. ${notifiedBot ? "You can return to Discord now." : "The Discord bot handoff is not connected yet."}</p>`,
    );
  } catch (error) {
    sendHtml(
      response,
      500,
      "Verification Failed",
      `<h1>Verification Failed</h1><p>${escapeHtml(error.message)}</p>`,
    );
  }
};
