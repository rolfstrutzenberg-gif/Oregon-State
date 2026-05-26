const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(process.cwd(), "config", "self-roles.json");

function loadSelfRolesConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    channelId: process.env.SELF_ROLES_CHANNEL_ID || null,
    bannerUrl: process.env.SELF_ROLES_BANNER_URL || null,
    bannerPath: process.env.SELF_ROLES_BANNER_PATH || null,
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
