const fs = require("node:fs");
const {
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");

const ESTABLISHED_LINE = "Oregon State Roleplay • EST 2026";

function panelHeading(title, brand = "OSRP") {
  return `### ${brand} | ${title}`;
}

function panelDescription(text) {
  return String(text || "")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function panelFooter(prefix = "") {
  return `-# ${prefix ? `${prefix} • ` : ""}${ESTABLISHED_LINE}`;
}

function panelDivider({ visible = true } = {}) {
  return new SeparatorBuilder()
    .setDivider(visible)
    .setSpacing(SeparatorSpacingSize.Small);
}

function createMediaAsset({ localPath, fallbackLocalPath, remoteUrl, fileName }) {
  if (localPath && fs.existsSync(localPath)) {
    return {
      files: [new AttachmentBuilder(localPath, { name: fileName })],
      url: `attachment://${fileName}`,
    };
  }

  if (fallbackLocalPath && fs.existsSync(fallbackLocalPath)) {
    return {
      files: [new AttachmentBuilder(fallbackLocalPath, { name: fileName })],
      url: `attachment://${fileName}`,
    };
  }

  return {
    files: [],
    url: remoteUrl || null,
  };
}

function mediaGallery(url) {
  if (!url) {
    return null;
  }

  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(url),
  );
}

function footerBannerAsset() {
  return createMediaAsset({
    localPath: process.env.BRAND_FOOTER_BANNER_PATH || null,
    remoteUrl: process.env.BRAND_FOOTER_BANNER_URL || null,
    fileName: "osrp-footer-banner.png",
  });
}

function appendFooterBanner(container, files) {
  const footer = footerBannerAsset();
  const gallery = mediaGallery(footer.url);
  if (!gallery) {
    return;
  }

  files.push(...footer.files);
  container
    .addSeparatorComponents(panelDivider())
    .addMediaGalleryComponents(gallery);
}

function prependBanner(container, bannerUrl) {
  const gallery = mediaGallery(bannerUrl);
  if (!gallery) {
    return container;
  }

  return container
    .addMediaGalleryComponents(gallery)
    .addSeparatorComponents(panelDivider());
}

function footerText(prefix = "") {
  return new TextDisplayBuilder().setContent(panelFooter(prefix));
}

module.exports = {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  mediaGallery,
  panelDescription,
  panelDivider,
  panelFooter,
  panelHeading,
  prependBanner,
};
