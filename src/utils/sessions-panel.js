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

const SESSION_BANNER_PATH = path.join(process.cwd(), "assets", "sessions", "session-open.png");

function buildChannelUrl(guildId, channel) {
  return `https://discord.com/channels/${guildId}/${channel.id}`;
}

function findChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

function createMockSessionsPanelMessage(guild) {
  const fileName = "session-open.png";
  const sessionsChannel = findChannel(guild, process.env.SESSIONS_CHANNEL_ID, "🛰️｜sessions");
  const rulesChannel = findChannel(guild, process.env.RULES_CHANNEL_ID, "📕｜rules");

  const joinButton = new ButtonBuilder()
    .setLabel("Join Session →")
    .setStyle(ButtonStyle.Link)
    .setURL(process.env.ERLC_SERVER_URL || "https://roblox.com");
  const rulesRow = new ActionRowBuilder();

  if (rulesChannel) {
    rulesRow.addComponents(
      new ButtonBuilder()
        .setLabel("Read Rules")
        .setStyle(ButtonStyle.Link)
        .setURL(buildChannelUrl(guild.id, rulesChannel)),
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
          new TextDisplayBuilder().setContent("Use the button to join the session."),
        )
        .setButtonAccessory(joinButton),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  if (rulesRow.components.length > 0) {
    body.addActionRowComponents(rulesRow);
  }

  body.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        sessionsChannel
          ? `-# Oregon State Roleplay • EST 2026 • Posted in <#${sessionsChannel.id}>`
          : "-# Oregon State Roleplay • EST 2026",
      ),
    );

  return {
    files: [new AttachmentBuilder(SESSION_BANNER_PATH, { name: fileName })],
    flags: MessageFlags.IsComponentsV2,
    components: [
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`),
      ),
      body,
    ],
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  createMockSessionsPanelMessage,
};
