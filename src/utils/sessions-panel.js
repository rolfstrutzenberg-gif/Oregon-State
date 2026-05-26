const fs = require("node:fs");
const path = require("node:path");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");

const SESSION_VOTE_INTERESTED_PREFIX = "session:vote:interested:";
const SESSION_VOTE_REMOVE_PREFIX = "session:vote:remove:";
const SESSION_INFO_PREFIX = "session:info:";
const DEFAULT_SESSION_BANNER_PATH = path.join(process.cwd(), "assets", "sessions", "session-open.png");

function buildChannelUrl(guildId, channel) {
  return `https://discord.com/channels/${guildId}/${channel.id}`;
}

function findChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

function buildBanner() {
  const bannerPath = process.env.SESSION_BANNER_PATH || DEFAULT_SESSION_BANNER_PATH;
  if (bannerPath && fs.existsSync(bannerPath)) {
    const fileName = "session-banner.png";
    return {
      files: [new AttachmentBuilder(bannerPath, { name: fileName })],
      bannerUrl: `attachment://${fileName}`,
    };
  }

  return {
    files: [],
    bannerUrl: process.env.SESSION_BANNER_URL || null,
  };
}

function sessionJoinUrl(session) {
  return session?.joinUrl || process.env.ERLC_SERVER_URL || "https://roblox.com";
}

function sessionFooter(guild, channel) {
  return channel
    ? `-# Oregon State Roleplay • EST 2026 • Posted in <#${channel.id}>`
    : "-# Oregon State Roleplay • EST 2026";
}

function buildSessionButtons(guild, session) {
  const rulesChannel = findChannel(guild, process.env.RULES_CHANNEL_ID, "📕｜rules");
  const row = new ActionRowBuilder();

  if (rulesChannel) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel("Read Rules")
        .setStyle(ButtonStyle.Link)
        .setURL(buildChannelUrl(guild.id, rulesChannel)),
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${SESSION_INFO_PREFIX}${session.sessionId}`)
      .setLabel("Session Info")
      .setStyle(ButtonStyle.Secondary),
  );

  return row;
}

function createSessionOpenPanel({ guild, session }) {
  const { files, bannerUrl } = buildBanner();
  const sessionsChannel = findChannel(guild, process.env.SESSIONS_CHANNEL_ID, "🛰️｜sessions");
  const joinButton = new ButtonBuilder()
    .setLabel("Join Session →")
    .setStyle(ButtonStyle.Link)
    .setURL(sessionJoinUrl(session));

  const components = [];
  if (bannerUrl) {
    components.push(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(bannerUrl),
      ),
    );
  }

  const body = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("### OSRP"),
      new TextDisplayBuilder().setContent("## Session Open"),
      new TextDisplayBuilder().setContent("Oregon State Roleplay is open. Join up, stay realistic, and follow staff direction."),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Server"),
          new TextDisplayBuilder().setContent([
            `Host: <@${session.hostUserId}>`,
            session.notes ? `Notes: ${session.notes}` : "Use the button to join the session.",
          ].join("\n")),
        )
        .setButtonAccessory(joinButton),
    )
    .addActionRowComponents(buildSessionButtons(guild, session))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(sessionFooter(guild, sessionsChannel)),
    );

  components.push(body);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components,
    allowedMentions: { roles: session.pingRoleId ? [session.pingRoleId] : [], users: [session.hostUserId] },
  };
}

function createSessionClosedPanel({ session }) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## Session Closed"),
          new TextDisplayBuilder().setContent([
            "The session has ended.",
            `Host: <@${session.hostUserId}>`,
            session.closeNotes ? `Notes: ${session.closeNotes}` : null,
          ].filter(Boolean).join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createSessionVotePanel({ vote }) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### OSRP"),
          new TextDisplayBuilder().setContent("## Session Vote"),
          new TextDisplayBuilder().setContent([
            "React below if you would join a session right now.",
            `Host: <@${vote.hostUserId}>`,
            vote.notes ? `Notes: ${vote.notes}` : null,
            `Interested: ${vote.interestedUserIds.length}`,
          ].filter(Boolean).join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`${SESSION_VOTE_INTERESTED_PREFIX}${vote.voteId}`)
              .setLabel("I Would Join")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`${SESSION_VOTE_REMOVE_PREFIX}${vote.voteId}`)
              .setLabel("Remove Vote")
              .setStyle(ButtonStyle.Secondary),
          ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
        ),
    ],
    allowedMentions: { users: [vote.hostUserId] },
  };
}

function createSessionStatusMessage({ activeSession, recentSessions }) {
  const recentLines = recentSessions.length > 0
    ? recentSessions.map((session) => `- ${session.sessionId} | ${session.status} | ${session.hostTag} | ${session.openedAt}`).join("\n")
    : "No sessions recorded yet.";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Session Status"),
          new TextDisplayBuilder().setContent(
            activeSession
              ? `Active: ${activeSession.sessionId}\nHost: <@${activeSession.hostUserId}>\nOpened: ${activeSession.openedAt}`
              : "No active session.",
          ),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Recent\n${recentLines}`),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createSessionInfoMessage(session) {
  const snapshot = session?.apiSnapshot
    ? `API Snapshot\n\`\`\`json\n${JSON.stringify(session.apiSnapshot, null, 2).slice(0, 1200)}\n\`\`\``
    : "API Snapshot\nNo API data recorded yet.";

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Session Info"),
          new TextDisplayBuilder().setContent([
            `Session: ${session.sessionId}`,
            `Status: ${session.status}`,
            `Host: <@${session.hostUserId}>`,
            `Opened: ${session.openedAt}`,
            session.closedAt ? `Closed: ${session.closedAt}` : null,
            session.notes ? `Notes: ${session.notes}` : null,
          ].filter(Boolean).join("\n")),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(snapshot),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

function createMockSessionsPanelMessage(guild) {
  const mockSession = {
    sessionId: "SES-MOCK",
    hostUserId: guild.client.user.id,
    hostTag: guild.client.user.tag,
    notes: "Mock panel for scaling and layout testing.",
    joinUrl: process.env.ERLC_SERVER_URL || "https://roblox.com",
    pingRoleId: null,
  };

  return createSessionOpenPanel({ guild, session: mockSession });
}

module.exports = {
  SESSION_INFO_PREFIX,
  SESSION_VOTE_INTERESTED_PREFIX,
  SESSION_VOTE_REMOVE_PREFIX,
  createMockSessionsPanelMessage,
  createSessionClosedPanel,
  createSessionInfoMessage,
  createSessionOpenPanel,
  createSessionStatusMessage,
  createSessionVotePanel,
};
