const fs = require("node:fs");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadSelfRolesConfig } = require("../services/self-roles-config");

const SELF_ROLES_SELECT_ID = "self_roles_select:main";

function buildBannerFiles(config) {
  if (!config.bannerPath || !fs.existsSync(config.bannerPath)) {
    return { files: [], bannerUrl: config.bannerUrl || null };
  }

  const fileName = "self-roles-banner.png";
  return {
    files: [new AttachmentBuilder(config.bannerPath, { name: fileName })],
    bannerUrl: `attachment://${fileName}`,
  };
}

function buildSelfRolesOptions(config) {
  return config.options.slice(0, 25).map((option) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(option.label)
      .setDescription(option.description)
      .setValue(option.value),
  );
}

function createSelfRolesPanelMessage() {
  const config = loadSelfRolesConfig();
  const { files, bannerUrl } = buildBannerFiles(config);

  const components = [];

  if (bannerUrl) {
    components.push(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(bannerUrl),
      ),
    );
  }

  const selectOptions = buildSelfRolesOptions(config);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(SELF_ROLES_SELECT_ID)
    .setPlaceholder(config.placeholder)
    .setMinValues(0)
    .setMaxValues(selectOptions.length || 1)
    .setDisabled(selectOptions.length === 0)
    .addOptions(
      selectOptions.length > 0
        ? selectOptions
        : [
            new StringSelectMenuOptionBuilder()
              .setLabel("Role setup in progress")
              .setDescription("No self-role options have been configured yet.")
              .setValue("setup_pending"),
          ],
    );

  const body = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${config.brandText} | ${config.title}`),
      new TextDisplayBuilder().setContent(config.description),
    )
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(menu),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("-# Tap Done after choosing your roles."),
      new TextDisplayBuilder().setContent("-# Oregon State Roleplay • EST 2026"),
    );

  components.push(body);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components,
  };
}

module.exports = {
  SELF_ROLES_SELECT_ID,
  createSelfRolesPanelMessage,
};
