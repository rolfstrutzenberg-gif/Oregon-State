const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(process.cwd(), "config", "rules.json");

function loadRulesConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    rulesChannelId: process.env.RULES_CHANNEL_ID || null,
    rulesBannerUrl: process.env.RULES_BANNER_URL || null,
    rulesBannerPath: process.env.RULES_BANNER_PATH || null,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID || null,
    unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID || null,
    pendingRulesRoleId: process.env.PENDING_RULES_ROLE_ID || null,
    brandText: raw.brandText || "OSRP",
    title: raw.title || "Rules",
    intro: raw.intro || "Review both rule sets below before continuing.",
    discordRules: raw.discordRules || [],
    inGameRules: raw.inGameRules || [],
  };
}

module.exports = {
  loadRulesConfig,
};
