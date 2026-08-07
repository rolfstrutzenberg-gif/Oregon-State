require("dotenv").config();

const { Client, Events, GatewayIntentBits } = require("discord.js");
const { panelBanner } = require("../src/constants/panel-banners");
const { createBrandedPanelMessage } = require("../src/utils/branded-panels");
const { createErlcDashboardMessage } = require("../src/utils/erlc-dashboard");
const { createRulesPanelMessage } = require("../src/utils/rules-panel");
const { createSelfRolesPanelMessage } = require("../src/utils/self-roles-panel");
const { createMockSessionsPanelMessage } = require("../src/utils/sessions-panel");
const { createVerificationPanelMessage } = require("../src/utils/verification-panel");
const { createCaseFilesDashboardMessage } = require("../src/utils/case-file-ui");
const { createMediaAsset } = require("../src/utils/panel-style");

const apply = process.argv.includes("--apply");
const only = process.argv.find((argument) => argument.startsWith("--only="))?.split("=")[1] || null;

function findChannelByNames(guild, names) {
  return guild.channels.cache.find((channel) =>
    channel.isTextBased?.() && names.includes(channel.name)
  ) || null;
}

function configuredChannel(guild, envName, names) {
  const configured = process.env[envName]
    ? guild.channels.cache.get(process.env[envName])
    : null;
  return configured?.isTextBased?.() ? configured : findChannelByNames(guild, names);
}

function componentText(message) {
  return JSON.stringify(message.components.map((component) => component.toJSON()));
}

async function replacePanel(client, guild, definition) {
  const channel = definition.resolveChannel(guild);
  if (!channel) {
    console.log(`[skip] ${definition.label}: channel not found`);
    return;
  }

  const messages = await channel.messages.fetch({ limit: 50 });
  const matches = messages.filter((message) =>
    message.author.id === client.user.id && definition.matches(componentText(message))
  );

  if (!apply) {
    console.log(`[dry-run] ${definition.label}: ${channel.name}; replace ${matches.size} message(s)`);
    return;
  }

  for (const message of matches.values()) {
    await message.delete().catch(() => null);
  }

  const built = definition.build(guild);
  const { readiness, ...payload } = built;
  if (definition.requireBanner !== false && !payload.files?.length) {
    throw new Error(`${definition.label} did not resolve a local banner attachment.`);
  }
  const posted = await channel.send(payload);
  console.log(`[posted] ${definition.label}: #${channel.name} -> ${posted.id}`);
  if (readiness?.missingActions?.length) {
    console.log(`  missing buttons: ${readiness.missingActions.join(", ")}`);
  }
}

async function cleanOldWelcomeMessages(client, guild) {
  const channel = configuredChannel(guild, "WELCOME_CHANNEL_ID", ["👋｜welcome"]);
  if (!channel) {
    console.log("[skip] Welcome: channel not found");
    return;
  }
  const messages = await channel.messages.fetch({ limit: 50 });
  const welcomeMessages = [...messages.values()]
    .filter((message) =>
      message.author.id === client.user.id && componentText(message).includes("welcome-banner.png")
    )
    .sort((left, right) => right.createdTimestamp - left.createdTimestamp);
  const oldMessages = welcomeMessages.slice(1);
  if (!apply) {
    console.log(`[dry-run] Welcome: refresh newest supplied-banner post; remove ${oldMessages.length} older bot welcome(s)`);
    return;
  }
  for (const message of oldMessages) {
    await message.delete().catch(() => null);
  }
  const newest = welcomeMessages[0];
  if (newest) {
    const bannerDefinition = panelBanner("welcome");
    const banner = createMediaAsset({
      localPath: bannerDefinition.localPath,
      fallbackLocalPath: bannerDefinition.fallbackLocalPath,
      remoteUrl: bannerDefinition.remoteUrl,
      fileName: bannerDefinition.attachmentName,
    });
    await newest.edit({
      components: newest.components,
      attachments: [],
      files: banner.files,
    });
  }
  console.log(`[cleaned] Welcome: refreshed ${newest?.id || "none"}; removed ${oldMessages.length} older post(s)`);
}

const panelDefinitions = [
  {
    key: "verification",
    label: "Verification",
    resolveChannel: (guild) => configuredChannel(guild, "VERIFY_CHANNEL_ID", ["✅｜verify"]),
    matches: (text) => text.includes("verification:start") || text.includes("osrp-verification-banner-v2.png"),
    build: (guild) => createVerificationPanelMessage({ guildId: guild.id }),
  },
  {
    key: "rules",
    label: "Rules",
    resolveChannel: (guild) => configuredChannel(guild, "RULES_CHANNEL_ID", ["📕｜rules"]),
    matches: (text) => text.includes("rules:view:discord") || text.includes("rules-banner.png"),
    build: () => createRulesPanelMessage(),
  },
  {
    key: "self_roles",
    label: "Self Roles",
    resolveChannel: (guild) => configuredChannel(guild, "SELF_ROLES_CHANNEL_ID", ["🎭｜self-roles"]),
    matches: (text) => text.includes("self_roles_select:main") || text.includes("self-roles-banner.png"),
    build: () => createSelfRolesPanelMessage(),
  },
  {
    key: "information",
    label: "Information",
    resolveChannel: (guild) => configuredChannel(guild, "INFORMATION_CHANNEL_ID", ["📌｜information"]),
    matches: (text) => text.includes("### OSRP | Information") || text.includes("information-banner.png"),
    build: (guild) => createBrandedPanelMessage("information", guild),
  },
  {
    key: "support",
    label: "Support",
    resolveChannel: (guild) => configuredChannel(guild, "SUPPORT_CHANNEL_ID", ["🆘｜support"]),
    matches: (text) => text.includes("support:ticket-select") || text.includes("support-banner.png"),
    build: (guild) => createBrandedPanelMessage("support", guild),
  },
  {
    key: "announcements",
    label: "Announcements",
    resolveChannel: (guild) => configuredChannel(guild, "ANNOUNCEMENTS_CHANNEL_ID", ["📢｜announcements"]),
    matches: (text) => text.includes("### OSRP | Announcements") || text.includes("announcements-banner.png"),
    build: (guild) => createBrandedPanelMessage("announcements", guild),
  },
  {
    key: "giveaways",
    label: "Giveaways",
    resolveChannel: (guild) => configuredChannel(guild, "GIVEAWAYS_CHANNEL_ID", ["🎉｜giveaways"]),
    matches: (text) => text.includes("### OSRP | Giveaways") || text.includes("giveaways-banner.png"),
    build: (guild) => createBrandedPanelMessage("giveaways", guild),
  },
  {
    key: "staff_application",
    label: "Staff Application",
    resolveChannel: (guild) => configuredChannel(guild, "STAFF_APPLICATION_CHANNEL_ID", ["📋｜staff-application"]),
    matches: (text) => text.includes("staff_application:open") || text.includes("staff-application-banner.png"),
    build: (guild) => createBrandedPanelMessage("staff_application", guild),
  },
  {
    key: "case_files",
    label: "Case Files",
    resolveChannel: (guild) => configuredChannel(guild, "CASE_FILES_CHANNEL_ID", ["🗂️｜case-files", "📂｜case-files", "📁｜case-files"]),
    matches: (text) => text.includes("casefiles:search") || text.includes("case-files-banner.png"),
    build: () => createCaseFilesDashboardMessage(),
  },
  {
    key: "staff_dashboard",
    label: "Staff Dashboard",
    resolveChannel: (guild) => configuredChannel(guild, "STAFF_INFORMATION_CHANNEL_ID", ["📌｜staff-information"]),
    matches: (text) => text.includes("### OSRP | Staff Dashboard") || text.includes("staff-dashboard-banner.png"),
    build: (guild) => createBrandedPanelMessage("staff_dashboard", guild),
  },
  {
    key: "sessions",
    label: "Sessions",
    resolveChannel: (guild) => configuredChannel(guild, "SESSIONS_CHANNEL_ID", ["🛰️｜sessions"]),
    matches: (text) => text.includes("SES-MOCK") || text.includes("session-banner.png"),
    build: (guild) => createMockSessionsPanelMessage(guild),
  },
  {
    key: "game_dashboard",
    label: "Game Dashboard",
    requireBanner: false,
    resolveChannel: (guild) => configuredChannel(guild, "GAME_LOGS_CHANNEL_ID", ["🎮｜game-logs"]),
    matches: (text) => text.includes("erlc:command") || text.includes("game-dashboard-banner.png"),
    build: () => createErlcDashboardMessage(),
  },
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    if (!only) await cleanOldWelcomeMessages(client, guild);
    const selected = only
      ? panelDefinitions.filter((definition) => definition.key === only)
      : panelDefinitions;
    if (selected.length === 0) throw new Error(`Unknown panel key: ${only}`);
    for (const definition of selected) {
      await replacePanel(client, guild, definition);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error(error);
  process.exit(1);
});
