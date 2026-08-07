const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
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
  const button = isReady
    ? new ButtonBuilder()
      .setLabel(`${config.verifyPanelButtonText} →`)
      .setStyle(ButtonStyle.Primary)
      .setCustomId(VERIFICATION_START_BUTTON_ID)
    : new ButtonBuilder()
      .setCustomId("verification:setup-pending")
      .setLabel("Verification Setup Pending")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
  const links = [];
  if (config.verifySiteUrl) {
    links.push(
      new ButtonBuilder()
        .setLabel("Verification Page")
        .setStyle(ButtonStyle.Link)
        .setURL(config.verifySiteUrl),
    );
  }
  if (guildId && config.supportChannelId) {
    links.push(
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
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            isReady ? "## Verify Your Account" : "## Verification Unavailable",
          ),
          new TextDisplayBuilder().setContent(
            isReady
              ? "Press the button to continue through Roblox. Once complete, return to Discord and accept the rules."
              : "The Roblox connection is temporarily unavailable. Please try again shortly.",
          ),
        )
        .setButtonAccessory(button),
    );

  if (links.length > 0) {
    body.addActionRowComponents(
      new ActionRowBuilder().addComponents(links),
    );
  }

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
