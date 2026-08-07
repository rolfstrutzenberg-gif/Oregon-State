const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { loadVerificationConfig, verificationReadiness } = require("../services/verification-config");
const { VERIFICATION_START_BUTTON_ID } = require("./verification-flow");
const { accentColor } = require("../constants/branding");
const {
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

function discordChannelUrl(guildId, channelId) {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function createVerificationPanelMessage({ guildId = process.env.GUILD_ID } = {}) {
  const config = loadVerificationConfig();
  const readiness = verificationReadiness(config);
  const banner = createMediaAsset({
    localPath: config.verifyBannerPath,
    remoteUrl: config.verifyBannerUrl,
    fileName: "osrp-verification-banner-v2.png",
  });
  const isReady = Boolean(config.verifyPortalUrl && config.callbackSecret);
  const verificationButton = isReady
    ? new ButtonBuilder()
      .setLabel("Start Verification")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(VERIFICATION_START_BUTTON_ID)
    : new ButtonBuilder()
      .setCustomId("verification:setup-pending")
      .setLabel("Verification Setup Pending")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
  const controls = [verificationButton];
  if (guildId && config.supportChannelId) {
    controls.push(
      new ButtonBuilder()
        .setLabel("Get Support")
        .setStyle(ButtonStyle.Link)
        .setURL(discordChannelUrl(guildId, config.supportChannelId)),
    );
  }

  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading(config.verifyPanelTitle, config.verifyBrandText)),
      new TextDisplayBuilder().setContent(
        panelDescription("Connect your Roblox account to unlock Oregon State Roleplay."),
      ),
    )
    .addSeparatorComponents(
      panelDivider(),
    );

  body.addActionRowComponents(
    new ActionRowBuilder().addComponents(controls),
  );

  body
    .addSeparatorComponents(
      panelDivider({ visible: false }),
    )
    .addTextDisplayComponents(
      footerText("Official Roblox verification"),
    );

  return {
    files: banner.files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    readiness: {
      ...readiness,
      hasPortalUrl: Boolean(config.verifyPortalUrl),
      hasSiteUrl: Boolean(config.verifySiteUrl),
      hasSupportChannel: Boolean(guildId && config.supportChannelId),
      isReady,
    },
  };
}

module.exports = {
  createVerificationPanelMessage,
};
