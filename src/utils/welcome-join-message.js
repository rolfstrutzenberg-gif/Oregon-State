const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { defaultChannelNames, loadWelcomeConfig } = require("../services/welcome-config");
const {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

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
  const banner = createMediaAsset({
    localPath: config.bannerPath,
    remoteUrl: config.bannerUrl,
    fileName: "welcome-banner.png",
  });
  const files = [...banner.files];
  const welcomeChannel = resolveTargetChannel(member.guild, config.channelId, defaultChannelNames.welcome);
  const verifyChannel = resolveTargetChannel(member.guild, config.verifyChannelId, defaultChannelNames.verify);
  const rulesChannel = resolveTargetChannel(member.guild, config.rulesChannelId, defaultChannelNames.rules);

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

  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading(config.title, config.brandText)),
      new TextDisplayBuilder().setContent(
        panelDescription(`<@${member.id}>, welcome to Oregon State Roleplay. Verify first, then read and accept the rules.`),
      ),
    )
    .addSeparatorComponents(
      panelDivider(),
    );

  if (buttonRow.components.length > 0) {
    body.addActionRowComponents(buttonRow);
  }

  body.addSeparatorComponents(
    panelDivider({ visible: false }),
  );

  body.addTextDisplayComponents(
    footerText("Complete both steps to unlock the server"),
  );

  appendFooterBanner(body, files);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    allowedMentions: { users: [member.id] },
    targetChannel: welcomeChannel,
  };
}

module.exports = {
  buildWelcomeJoinMessage,
};
