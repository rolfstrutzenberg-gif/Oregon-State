const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { panelBanner } = require("../constants/panel-banners");
const { createSupportTicketSelect } = require("./support-tickets");
const { createStaffApplicationButton } = require("./staff-application");
const {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

const panelDefinitions = {
  information: {
    label: "Information",
    bannerSlot: "information",
    heading: "Information",
    copy: [
      "The quick reference for OSRP.",
      "Find the chain of command, server ad, partnership info, department overview, and the channels you need before opening a ticket.",
    ],
    note: "If it is a basic server question, it belongs here before it becomes a ticket.",
    buttons: [
      { label: "Rules", env: "RULES_CHANNEL_ID", names: ["📕｜rules"] },
      { label: "Departments", env: "DEPARTMENTS_CHANNEL_ID", names: ["👥｜departments"] },
      { label: "Support", env: "SUPPORT_CHANNEL_ID", names: ["🆘｜support"] },
    ],
  },
  announcements: {
    label: "Announcements",
    bannerSlot: "announcements",
    heading: "Announcements",
    copy: [
      "Official posts only.",
      "This channel is for launch notices, policy changes, staff updates, session announcements, and anything that affects the whole server.",
    ],
    note: "If a post needs discussion, staff will open the thread. Otherwise, keep replies out of announcements.",
    buttons: [
      { label: "Information", env: "INFORMATION_CHANNEL_ID", names: ["📌｜information"] },
      { label: "Sessions", env: "SESSIONS_CHANNEL_ID", names: ["🛰️｜sessions"] },
      { label: "Rules", env: "RULES_CHANNEL_ID", names: ["📕｜rules"] },
    ],
  },
  support: {
    label: "Support",
    bannerSlot: "support",
    heading: "Welcome to OSRP Support",
    copy: [
      "Need help? Pick the ticket that matches your issue and the right staff team will take it from there.",
      "Have usernames, dates, and any screenshots or clips ready before you open it. Keep one issue per ticket.",
      "Choose an option below to get started. Staff are notified automatically, so do not ping anyone.",
    ],
    ticketPanel: true,
    buttons: [
      { label: "Information", emoji: "📌", env: "INFORMATION_CHANNEL_ID", names: ["📌｜information"] },
      { label: "Rules", emoji: "📕", env: "RULES_CHANNEL_ID", names: ["📕｜rules"] },
    ],
  },
  giveaways: {
    label: "Giveaways",
    bannerSlot: "giveaways",
    heading: "Giveaways",
    copy: [
      "Giveaways, rewards, and event prizes are handled here.",
      "Every giveaway will list the prize, requirements, end time, and winner selection method. Read it before entering.",
    ],
    note: "No alts, fake entries, or loopholes. Winners are final unless staff says otherwise.",
    buttons: [
      { label: "Information", env: "INFORMATION_CHANNEL_ID", names: ["📌｜information"] },
      { label: "Announcements", env: "ANNOUNCEMENTS_CHANNEL_ID", names: ["📢｜announcements"] },
      { label: "Rules", env: "RULES_CHANNEL_ID", names: ["📕｜rules"] },
    ],
  },
  staff_application: {
    label: "Staff Application",
    bannerSlot: "staff_application",
    heading: "Staff Application",
    copy: [
      "Staff is earned, not handed out.",
      "Applications are reviewed for maturity, activity, communication, and whether you understand how OSRP should be run.",
    ],
    note: "Blacklisted members cannot apply. Rushed, copied, or low-effort applications will be denied.",
    staffApplicationPanel: true,
    buttons: [
      { label: "Information", env: "INFORMATION_CHANNEL_ID", names: ["📌｜information"] },
      { label: "Rules", env: "RULES_CHANNEL_ID", names: ["📕｜rules"] },
    ],
  },
  staff_dashboard: {
    label: "Staff Dashboard",
    bannerSlot: "staff_dashboard",
    heading: "Staff Dashboard",
    copy: [
      "Internal staff controls.",
      "Use this dashboard for case files, ticket follow-up, moderation records, and the tools that should stay out of public channels.",
    ],
    note: "Every action should have a reason. If it would look bad in a log, do not do it.",
    buttons: [
      { label: "Cases", env: "CASES_CHANNEL_ID", names: ["📁｜cases"] },
      { label: "Case Files", env: "CASE_FILES_CHANNEL_ID", names: ["📂｜case-files", "📁｜case-files"] },
      { label: "Game Logs", env: "GAME_LOGS_CHANNEL_ID", names: ["🎮｜game-logs"] },
    ],
  },
};

function buildChannelUrl(guildId, channelId) {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function resolveChannel(guild, action) {
  const explicitId = action.env ? process.env[action.env] : null;
  if (explicitId) {
    const channel = guild.channels.cache.get(explicitId);
    if (channel?.isTextBased?.()) {
      return channel;
    }
  }

  return guild.channels.cache.find((channel) =>
    channel.isTextBased?.() && action.names?.includes(channel.name)
  ) || null;
}

function createPanelButtons(guild, definition) {
  const buttons = [];
  const missingActions = [];
  for (const action of definition.buttons || []) {
    const channel = resolveChannel(guild, action);
    if (!channel) {
      missingActions.push(action.label);
      continue;
    }

    const button = new ButtonBuilder()
      .setLabel(action.label)
      .setStyle(ButtonStyle.Link)
      .setURL(buildChannelUrl(guild.id, channel.id));
    if (action.emoji) {
      button.setEmoji(action.emoji);
    }
    buttons.push(button);
  }

  return { buttons, missingActions };
}

function createBrandedPanelMessage(panelKey, guild) {
  const definition = panelDefinitions[panelKey];
  if (!definition) {
    throw new Error(`Unknown panel: ${panelKey}`);
  }

  const bannerDefinition = panelBanner(definition.bannerSlot);
  const banner = createMediaAsset({
    localPath: bannerDefinition.localPath,
    fallbackLocalPath: bannerDefinition.fallbackLocalPath,
    remoteUrl: bannerDefinition.remoteUrl,
    fileName: bannerDefinition.attachmentName,
  });
  const files = [...banner.files];
  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  const { buttons, missingActions } = createPanelButtons(guild, definition);
  if (definition.ticketPanel) {
    body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> ### 🛟 ${definition.heading}`),
        new TextDisplayBuilder().setContent(definition.copy.join("\n\n")),
      )
      .addSeparatorComponents(panelDivider());

    if (buttons.length > 0) {
      body.addActionRowComponents(
        new ActionRowBuilder().addComponents(buttons.slice(0, 5)),
      );
    }

    body.addActionRowComponents(createSupportTicketSelect());
  } else {
    body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(panelHeading(definition.heading)),
        new TextDisplayBuilder().setContent(panelDescription(definition.copy.join("\n"))),
      )
      .addSeparatorComponents(panelDivider())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(definition.note),
      );
  }

  if (definition.staffApplicationPanel) {
    body.addActionRowComponents(createStaffApplicationButton());
  }

  if (!definition.ticketPanel && buttons.length > 0) {
    body.addActionRowComponents(
      new ActionRowBuilder().addComponents(buttons.slice(0, 5)),
    );
  }

  if (!definition.ticketPanel) {
    body
      .addSeparatorComponents(
        panelDivider({ visible: false }),
      )
      .addTextDisplayComponents(
        footerText(),
      );

    appendFooterBanner(body, files);
  }

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    allowedMentions: { parse: [] },
    readiness: {
      missingActions,
    },
  };
}

function panelChoices() {
  return Object.entries(panelDefinitions).map(([value, definition]) => ({
    name: definition.label,
    value,
  }));
}

module.exports = {
  createBrandedPanelMessage,
  panelChoices,
  panelDefinitions,
};
