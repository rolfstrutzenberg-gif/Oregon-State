const {
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadWelcomeConfig } = require("../services/welcome-config");
const {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

function createWelcomePanelMessage() {
  const config = loadWelcomeConfig();
  const banner = createMediaAsset({
    localPath: config.bannerPath,
    remoteUrl: config.bannerUrl,
    fileName: "welcome-banner.png",
  });
  const files = [...banner.files];
  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(panelHeading(config.title, config.brandText)),
        new TextDisplayBuilder().setContent(panelDescription(config.description)),
        new TextDisplayBuilder().setContent(config.subtext),
      )
      .addSeparatorComponents(
        panelDivider({ visible: false }),
      )
      .addTextDisplayComponents(
        footerText(),
      );

  appendFooterBanner(body, files);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
  };
}

module.exports = {
  createWelcomePanelMessage,
};
