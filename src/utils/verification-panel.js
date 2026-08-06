const {
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

function createVerificationPanelMessage() {
  const config = loadVerificationConfig();
  const readiness = verificationReadiness(config);
  const banner = createMediaAsset({
    localPath: config.verifyBannerPath,
    remoteUrl: config.verifyBannerUrl,
    fileName: "verification-banner.png",
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

  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading(config.verifyPanelTitle, config.verifyBrandText)),
      new TextDisplayBuilder().setContent(
        panelDescription("Link your Roblox account before entering the rest of the server."),
      ),
    )
    .addSeparatorComponents(
      panelDivider(),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            isReady ? "## Start Verification" : "## Verification Unavailable",
          ),
          new TextDisplayBuilder().setContent(
            isReady
              ? "Continue through Roblox, then return to Discord."
              : "Staff are finishing the Roblox connection. Check back shortly.",
          ),
        )
        .setButtonAccessory(button),
    )
    .addSeparatorComponents(
      panelDivider({ visible: false }),
    )
    .addTextDisplayComponents(
      footerText(),
    );

  return {
    files: banner.files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
    readiness: {
      ...readiness,
      hasPortalUrl: Boolean(config.verifyPortalUrl),
      isReady,
    },
  };
}

module.exports = {
  createVerificationPanelMessage,
};
