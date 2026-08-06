const { loadPortalConfig } = require("../_lib/config");
const { escapeHtml, sendHtml } = require("../_lib/html");
const { decodeContext } = require("../_lib/verification-context");

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

async function notifyBot(config, profile, context) {
  const response = await fetch(config.botCallbackUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-osrp-verification-secret": config.botCallbackSecret,
    },
    body: JSON.stringify({
      discordUserId: context.discordUserId,
      guildId: context.guildId,
      robloxUserId: profile.sub,
      robloxUsername: profile.preferred_username || profile.name || profile.sub,
      robloxDisplayName: profile.name || profile.preferred_username || profile.sub,
      verifiedAt: new Date().toISOString(),
      provider: "roblox-oauth",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.error || "The Discord verification service did not accept the account.");
    error.code = response.status === 409
      ? "ACCOUNT_CONFLICT"
      : response.status === 404
        ? "MEMBER_NOT_FOUND"
        : "CALLBACK_FAILED";
    throw error;
  }

}

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

  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const savedState = cookieValue(request, "osrp_oauth_state");
  const savedContext = cookieValue(request, "osrp_verification_context");

  if (!code || !state || !savedState || !savedContext || state !== savedState) {
    sendHtml(
      response,
      400,
      "Verification Failed",
      `<p class="result-kicker">Session expired</p>
      <h1>Verification failed.</h1>
      <p>This verification session is no longer valid. Return to Discord and create a new link.</p>
      <div class="result-actions">
        <a class="button button-primary" href="https://discord.com/channels/1508482350764523530/1508549978493026444">Try again in Discord <span aria-hidden="true">&#8599;</span></a>
      </div>
      <div class="result-meta">OSRP Verification / Invalid session</div>`,
      { tone: "danger" },
    );
    return;
  }

  try {
    const context = decodeContext(savedContext, config.botCallbackSecret);
    const token = await exchangeCode(config, code);
    const profile = await fetchUserInfo(token.access_token);
    await notifyBot(config, profile, context);

    const clearedCookies = [
      "osrp_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      "osrp_verification_context=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    ];

    if (config.successRedirectUrl) {
      response.statusCode = 302;
      response.setHeader("set-cookie", clearedCookies);
      response.setHeader("location", config.successRedirectUrl);
      response.end();
      return;
    }

    response.setHeader("set-cookie", clearedCookies);
    sendHtml(
      response,
      200,
      "Verification Complete",
      `<p class="result-kicker">Account connected</p>
      <h1>Verification complete.</h1>
      <p>Roblox account linked as <strong>${escapeHtml(profile.preferred_username || profile.name || profile.sub)}</strong>. Return to Discord and accept the rules to unlock the server.</p>
      <div class="result-actions">
        <a class="button button-primary" href="https://discord.com/channels/1508482350764523530/1508549979902312489">Read the rules <span aria-hidden="true">&#8599;</span></a>
        <a class="text-link" href="/">Verification home</a>
      </div>
      <div class="result-meta">OSRP Verification / Complete</div>`,
    );
  } catch (error) {
    console.error("Roblox verification failed:", error);
    const message = error.code === "ACCOUNT_CONFLICT"
      ? "That Discord or Roblox account is already connected to another account. Contact Management if you need the link reviewed."
      : error.code === "MEMBER_NOT_FOUND"
        ? "Your Discord account could not be found in Oregon State Roleplay. Rejoin the server, then start verification again."
        : "The account could not be linked right now. Return to Discord and try again in a moment.";
    sendHtml(
      response,
      500,
      "Verification Failed",
      `<p class="result-kicker">Connection failed</p>
      <h1>Verification failed.</h1>
      <p>${escapeHtml(message)}</p>
      <div class="result-actions">
        <a class="button button-primary" href="https://discord.com/channels/1508482350764523530/1508549978493026444">Return to Discord <span aria-hidden="true">&#8599;</span></a>
      </div>
      <div class="result-meta">OSRP Verification / Error</div>`,
      { tone: "danger" },
    );
  }
};
