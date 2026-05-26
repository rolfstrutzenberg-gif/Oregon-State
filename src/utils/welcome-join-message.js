const fs = require("node:fs");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { defaultChannelNames, loadWelcomeConfig } = require("../services/welcome-config");

function buildBanner(config) {
  if (!config.bannerPath || !fs.existsSync(config.bannerPath)) {
    return {
      files: [],
      imageUrl: config.bannerUrl || null,
    };
  }

  const fileName = "welcome-banner.png";
  return {
    files: [new AttachmentBuilder(config.bannerPath, { name: fileName })],
    imageUrl: `attachment://${fileName}`,
  };
}

function resolveTargetChannel(guild, explicitId, fallbackName) {
  if (explicitId) {
    return guild.channels.cache.get(explicitId) || null;
  }

  return guild.channels.cache.find((channel) => channel.name === fallbackName) || null;
}

function buildChannelUrl(guildId, channel) {
  return `https://discord.com/channels/${guildId}/${channel.id}`;
}

function buildWelcomeJoinMessage(member) {
  const config = loadWelcomeConfig();
  const { files, imageUrl } = buildBanner(config);
  const welcomeChannel = resolveTargetChannel(member.guild, config.channelId, defaultChannelNames.welcome);
  const verifyChannel = resolveTargetChannel(member.guild, config.verifyChannelId, defaultChannelNames.verify);
  const rulesChannel = resolveTargetChannel(member.guild, config.rulesChannelId, defaultChannelNames.rules);

  const components = [];

  if (imageUrl) {
    components.push(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(imageUrl),
      ),
    );
  }

  const buttonRow = new ActionRowBuilder();

  if (verifyChannel) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setLabel("Get Verified →")
        .setStyle(ButtonStyle.Link)
        .setURL(buildChannelUrl(member.guild.id, verifyChannel)),
    );
  }

  if (rulesChannel) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setLabel("Read Rules →")
        .setStyle(ButtonStyle.Link)
        .setURL(buildChannelUrl(member.guild.id, rulesChannel)),
    );
  }

  const body = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${config.brandText}`),
      new TextDisplayBuilder().setContent(`## ${config.title}`),
      new TextDisplayBuilder().setContent(
        `> Welcome to Oregon State Roleplay, <@${member.id}>.\n> Use the buttons below to get verified and read the rules before continuing.`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  if (buttonRow.components.length > 0) {
    body.addActionRowComponents(buttonRow);
  }

  body.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Small),
  );

  body.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
  );

  components.push(body);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components,
    allowedMentions: { users: [member.id] },
    targetChannel: welcomeChannel,
  };
}

module.exports = {
  buildWelcomeJoinMessage,
};
