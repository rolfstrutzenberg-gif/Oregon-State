const path = require("node:path");

const bannerSlots = {
  welcome: {
    fileName: "welcome.png",
    pathEnv: "WELCOME_BANNER_PATH",
    urlEnv: "WELCOME_BANNER_URL",
  },
  verification: {
    fileName: "verification.png",
    pathEnv: "VERIFY_BANNER_PATH",
    urlEnv: "VERIFY_BANNER_URL",
  },
  rules: {
    fileName: "rules.png",
    pathEnv: "RULES_BANNER_PATH",
    urlEnv: "RULES_BANNER_URL",
  },
  self_roles: {
    fileName: "self-roles.png",
    pathEnv: "SELF_ROLES_BANNER_PATH",
    urlEnv: "SELF_ROLES_BANNER_URL",
  },
  information: {
    fileName: "information.png",
    fallbackFileName: "welcome.png",
    pathEnv: "INFORMATION_BANNER_PATH",
    urlEnv: "INFORMATION_BANNER_URL",
  },
  announcements: {
    fileName: "announcements.png",
    pathEnv: "ANNOUNCEMENTS_BANNER_PATH",
    urlEnv: "ANNOUNCEMENTS_BANNER_URL",
  },
  support: {
    fileName: "support.png",
    pathEnv: "SUPPORT_BANNER_PATH",
    urlEnv: "SUPPORT_BANNER_URL",
  },
  giveaways: {
    fileName: "giveaways.png",
    pathEnv: "GIVEAWAYS_BANNER_PATH",
    urlEnv: "GIVEAWAYS_BANNER_URL",
  },
  staff_application: {
    fileName: "staff-application.png",
    pathEnv: "STAFF_APPLICATION_BANNER_PATH",
    urlEnv: "STAFF_APPLICATION_BANNER_URL",
  },
  staff_dashboard: {
    fileName: "case-files.png",
    pathEnv: "STAFF_DASHBOARD_BANNER_PATH",
    urlEnv: "STAFF_DASHBOARD_BANNER_URL",
  },
  case_files: {
    fileName: "case-files.png",
    pathEnv: "CASE_FILES_BANNER_PATH",
    urlEnv: "CASE_FILES_BANNER_URL",
  },
};

function assetPath(fileName) {
  return path.join(process.cwd(), "assets", "banners", fileName);
}

function panelBanner(slotName) {
  const slot = bannerSlots[slotName];
  if (!slot) {
    throw new Error(`Unknown panel banner slot: ${slotName}`);
  }

  return {
    localPath: process.env[slot.pathEnv] || assetPath(slot.fileName),
    fallbackLocalPath: slot.fallbackFileName ? assetPath(slot.fallbackFileName) : null,
    remoteUrl: process.env[slot.urlEnv] || null,
    attachmentName: `${slotName.replaceAll("_", "-")}-banner.png`,
  };
}

module.exports = {
  bannerSlots,
  panelBanner,
};
