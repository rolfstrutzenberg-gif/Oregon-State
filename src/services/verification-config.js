const { panelBanner } = require("../constants/panel-banners");

function loadVerificationConfig() {
  const banner = panelBanner("verification");
  return {
    verifyChannelId: process.env.VERIFY_CHANNEL_ID || null,
    verifyLogChannelId: process.env.VERIFY_LOG_CHANNEL_ID || null,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID || null,
    unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || null,
    verifyBannerUrl: banner.remoteUrl,
    verifyBannerPath: banner.localPath,
    verifyFooterBannerUrl: process.env.VERIFY_FOOTER_BANNER_URL || null,
    verifyBrandText: process.env.VERIFY_BRAND_TEXT || "OSRP",
    verifyPanelTitle: process.env.VERIFY_PANEL_TITLE || "Verification",
    verifyPanelButtonText: process.env.VERIFY_PANEL_BUTTON_TEXT || "Start Verification",
    verifyPortalUrl: process.env.VERIFY_PORTAL_URL || null,
    callbackSecret: process.env.BOT_VERIFICATION_CALLBACK_SECRET || null,
    callbackPort: Number(process.env.VERIFICATION_CALLBACK_PORT || 3001),
    relayUrl: process.env.VERIFICATION_RELAY_URL || null,
    relayPollIntervalMs: Math.max(
      500,
      Number(process.env.VERIFICATION_RELAY_POLL_INTERVAL_MS || 1000),
    ),
    robloxClientId: process.env.ROBLOX_OAUTH_CLIENT_ID || null,
    robloxRedirectUri: process.env.ROBLOX_OAUTH_REDIRECT_URI || null,
    robloxScopes: (process.env.ROBLOX_OAUTH_SCOPES || "openid profile")
      .split(/\s+/u)
      .filter(Boolean),
  };
}

function verificationReadiness(config = loadVerificationConfig()) {
  return {
    hasPortalUrl: Boolean(config.verifyPortalUrl),
    hasCallbackSecret: Boolean(config.callbackSecret),
    hasClientId: Boolean(config.robloxClientId),
    hasRedirectUri: Boolean(config.robloxRedirectUri),
    hasVerifiedRoleId: Boolean(config.verifiedRoleId),
    hasUnverifiedRoleId: Boolean(config.unverifiedRoleId),
    hasVerifyLogChannelId: Boolean(config.verifyLogChannelId),
    hasRelayUrl: Boolean(config.relayUrl),
  };
}

module.exports = {
  loadVerificationConfig,
  verificationReadiness,
};
