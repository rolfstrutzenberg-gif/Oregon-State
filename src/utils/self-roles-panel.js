const {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadSelfRolesConfig } = require("../services/self-roles-config");
const {
  appendFooterBanner,
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

const SELF_ROLES_SELECT_ID = "self_roles_select:main";

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
  const banner = createMediaAsset({
    localPath: config.bannerPath,
    remoteUrl: config.bannerUrl,
    fileName: "self-roles-banner.png",
  });
  const files = [...banner.files];

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

  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelHeading(config.title, config.brandText)),
      new TextDisplayBuilder().setContent(panelDescription(config.description)),
    )
    .addSeparatorComponents(
      panelDivider(),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(menu),
    )
    .addTextDisplayComponents(
      footerText("Changes save when you close the menu"),
    );

  appendFooterBanner(body, files);

  return {
    files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
  };
}

module.exports = {
  SELF_ROLES_SELECT_ID,
  createSelfRolesPanelMessage,
};
