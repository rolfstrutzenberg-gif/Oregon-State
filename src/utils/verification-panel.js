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
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { loadVerificationConfig, verificationReadiness } = require("../services/verification-config");
const { accentColor } = require("../constants/branding");

function buildBannerFiles(config) {
  if (!config.verifyBannerPath || !fs.existsSync(config.verifyBannerPath)) {
    return { files: [], bannerUrl: config.verifyBannerUrl || null };
  }

  const fileName = "verification-banner.png";
  return {
    files: [new AttachmentBuilder(config.verifyBannerPath, { name: fileName })],
    bannerUrl: `attachment://${fileName}`,
  };
}

function createVerificationPanelMessage() {
  const config = loadVerificationConfig();
  const readiness = verificationReadiness(config);
  const { files, bannerUrl } = buildBannerFiles(config);
  const portalUrl = config.verifyPortalUrl || "https://roblox.com";

  const mediaGallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(bannerUrl || config.verifyBannerUrl || "https://example.com"),
  );

  const button = new ButtonBuilder()
    .setLabel(`${config.verifyPanelButtonText} →`)
    .setStyle(ButtonStyle.Link)
    .setURL(portalUrl);

  const body = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${config.verifyBrandText}`),
      new TextDisplayBuilder().setContent("Verification required."),
      new TextDisplayBuilder().setContent("Verify your Roblox account to continue into Oregon State Roleplay."),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${config.verifyPanelTitle}`,
          ),
          new TextDisplayBuilder().setContent("Continue with the button on the right."),
        )
        .setButtonAccessory(button),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
    );

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [mediaGallery, body],
    readiness: {
      ...readiness,
      hasPortalUrl: true,
    },
  };
}

module.exports = {
  createVerificationPanelMessage,
};
