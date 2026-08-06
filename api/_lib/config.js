function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const DEFAULT_BOT_CALLBACK_URL =
  "https://osrp-verification-relay.rolfstrutzenberg.workers.dev/verification/callback";

function botCallbackUrl() {
  const configured = process.env.BOT_VERIFICATION_CALLBACK_URL;
  if (configured && !configured.includes(".trycloudflare.com")) {
    return configured;
  }

  return DEFAULT_BOT_CALLBACK_URL;
}

function loadPortalConfig() {
  return {
    clientId: requiredEnv("ROBLOX_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("ROBLOX_OAUTH_CLIENT_SECRET"),
    redirectUri: requiredEnv("ROBLOX_OAUTH_REDIRECT_URI"),
    scopes: process.env.ROBLOX_OAUTH_SCOPES || "openid profile",
    successRedirectUrl: process.env.SUCCESS_REDIRECT_URL || null,
    botCallbackUrl: botCallbackUrl(),
    botCallbackSecret: requiredEnv("BOT_VERIFICATION_CALLBACK_SECRET"),
  };
}

module.exports = {
  loadPortalConfig,
};
