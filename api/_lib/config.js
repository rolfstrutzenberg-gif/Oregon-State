function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadPortalConfig() {
  return {
    clientId: requiredEnv("ROBLOX_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("ROBLOX_OAUTH_CLIENT_SECRET"),
    redirectUri: requiredEnv("ROBLOX_OAUTH_REDIRECT_URI"),
    scopes: process.env.ROBLOX_OAUTH_SCOPES || "openid profile",
    successRedirectUrl: process.env.SUCCESS_REDIRECT_URL || null,
    botCallbackUrl: process.env.BOT_VERIFICATION_CALLBACK_URL || null,
    botCallbackSecret: process.env.BOT_VERIFICATION_CALLBACK_SECRET || null,
  };
}

module.exports = {
  loadPortalConfig,
};
