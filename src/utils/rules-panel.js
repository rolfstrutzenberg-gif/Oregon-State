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
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadRulesConfig } = require("../services/rules-config");

const RULES_ACCEPT_BUTTON_ID = "rules:accept";
const RULES_DISCORD_BUTTON_ID = "rules:view:discord";
const RULES_INGAME_BUTTON_ID = "rules:view:ingame";

function buildBanner(config) {
  if (!config.rulesBannerPath || !fs.existsSync(config.rulesBannerPath)) {
    return {
      files: [],
      imageUrl: config.rulesBannerUrl || null,
    };
  }

  const fileName = "rules-banner.png";
  return {
    files: [new AttachmentBuilder(config.rulesBannerPath, { name: fileName })],
    imageUrl: `attachment://${fileName}`,
  };
}

function renderRuleList(rules) {
  return rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
}

function createRulesDetailMessage(kind) {
  const config = loadRulesConfig();
  const isDiscord = kind === "discord";
  const title = isDiscord ? "Discord Rules" : "In-Game Rules";
  const rules = isDiscord ? config.discordRules : config.inGameRules;

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### ${config.brandText}`),
          new TextDisplayBuilder().setContent(`## ${title}`),
          new TextDisplayBuilder().setContent(renderRuleList(rules)),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setDivider(false)
            .setSpacing(SeparatorSpacingSize.Small),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Read both rule sets before accepting."),
        ),
    ],
  };
}

function createRulesPanelMessage() {
  const config = loadRulesConfig();
  const { files, imageUrl } = buildBanner(config);
  const components = [];

  if (imageUrl) {
    components.push(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(imageUrl),
      ),
    );
  }

  components.push(
    new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${config.brandText}`),
        new TextDisplayBuilder().setContent(`## ${config.title}`),
        new TextDisplayBuilder().setContent(config.intro),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Open both rule sets below, then accept once you have read them."),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(RULES_DISCORD_BUTTON_ID)
            .setLabel("Discord Rules")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(RULES_INGAME_BUTTON_ID)
            .setLabel("In-Game Rules")
            .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(RULES_ACCEPT_BUTTON_ID)
            .setLabel("I Accept These Rules")
            .setStyle(ButtonStyle.Success),
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(false)
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
  createRulesPanelMessage,
  RULES_ACCEPT_BUTTON_ID,
  RULES_DISCORD_BUTTON_ID,
  RULES_INGAME_BUTTON_ID,
  createRulesDetailMessage,
};
