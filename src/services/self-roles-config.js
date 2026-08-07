const fs = require("node:fs");
const path = require("node:path");
const { panelBanner } = require("../constants/panel-banners");

const configPath = path.join(process.cwd(), "config", "self-roles.json");
function loadSelfRolesConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const banner = panelBanner("self_roles");

  return {
    channelId: process.env.SELF_ROLES_CHANNEL_ID || null,
    bannerUrl: banner.remoteUrl,
    bannerPath: banner.localPath,
    brandText: raw.brandText || "OSRP",
    title: raw.title || "Self Roles",
    description: raw.description || "Select the roles that apply to you.",
    placeholder: raw.placeholder || "Select your roles",
    options: Array.isArray(raw.options) ? raw.options : [],
  };
}

module.exports = {
  loadSelfRolesConfig,
};
