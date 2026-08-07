const fs = require("node:fs");
const path = require("node:path");
const { panelBanner } = require("../constants/panel-banners");

const configPath = path.join(process.cwd(), "config", "welcome.json");
function loadWelcomeConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const banner = panelBanner("welcome");

  return {
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    verifyChannelId: process.env.VERIFY_CHANNEL_ID || null,
    rulesChannelId: process.env.RULES_CHANNEL_ID || null,
    bannerUrl: banner.remoteUrl,
    bannerPath: banner.localPath,
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
