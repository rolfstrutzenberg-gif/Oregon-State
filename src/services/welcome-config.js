const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(process.cwd(), "config", "welcome.json");

function loadWelcomeConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    verifyChannelId: process.env.VERIFY_CHANNEL_ID || null,
    rulesChannelId: process.env.RULES_CHANNEL_ID || null,
    bannerUrl: process.env.WELCOME_BANNER_URL || null,
    bannerPath: process.env.WELCOME_BANNER_PATH || null,
    brandText: raw.brandText || "OSRP",
    title: raw.title || "Welcome",
    description: raw.description || "Welcome to Oregon State Roleplay.",
    subtext: raw.subtext || "Start with verification and continue through setup.",
  };
}

const defaultChannelNames = {
  welcome: "👋｜welcome",
  verify: "✅｜verify",
  rules: "📕｜rules",
};

module.exports = {
  defaultChannelNames,
  loadWelcomeConfig,
};
