const fs = require("node:fs");
const {
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadWelcomeConfig } = require("../services/welcome-config");

function buildBannerFiles(config) {
  if (!config.bannerPath || !fs.existsSync(config.bannerPath)) {
    return { files: [], bannerUrl: config.bannerUrl || null };
  }

  const fileName = "welcome-banner.png";
  return {
    files: [new AttachmentBuilder(config.bannerPath, { name: fileName })],
    bannerUrl: `attachment://${fileName}`,
  };
}

function createWelcomePanelMessage() {
  const config = loadWelcomeConfig();
  const { files, bannerUrl } = buildBannerFiles(config);
  const components = [];

  if (bannerUrl) {
    components.push(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(bannerUrl),
      ),
    );
  }

  components.push(
    new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${config.brandText}`),
        new TextDisplayBuilder().setContent(config.description),
        new TextDisplayBuilder().setContent(config.subtext),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
      ),
  );

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components,
  };
}

module.exports = {
  createWelcomePanelMessage,
};
