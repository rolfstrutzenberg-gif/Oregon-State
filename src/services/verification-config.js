function loadVerificationConfig() {
  return {
    verifyChannelId: process.env.VERIFY_CHANNEL_ID || null,
    verifyLogChannelId: process.env.VERIFY_LOG_CHANNEL_ID || null,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID || null,
    unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || null,
    verifyBannerUrl: process.env.VERIFY_BANNER_URL || null,
    verifyBannerPath: process.env.VERIFY_BANNER_PATH || null,
    verifyFooterBannerUrl: process.env.VERIFY_FOOTER_BANNER_URL || null,
    verifyBrandText: process.env.VERIFY_BRAND_TEXT || "OSRP",
    verifyPanelTitle: process.env.VERIFY_PANEL_TITLE || "Verification",
    verifyPanelButtonText: process.env.VERIFY_PANEL_BUTTON_TEXT || "Start Verification",
    verifyPortalUrl: process.env.VERIFY_PORTAL_URL || null,
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
    hasClientId: Boolean(config.robloxClientId),
    hasRedirectUri: Boolean(config.robloxRedirectUri),
    hasVerifiedRoleId: Boolean(config.verifiedRoleId),
    hasUnverifiedRoleId: Boolean(config.unverifiedRoleId),
    hasVerifyLogChannelId: Boolean(config.verifyLogChannelId),
  };
}

module.exports = {
  loadVerificationConfig,
  verificationReadiness,
};
