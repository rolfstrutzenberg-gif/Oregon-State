const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
} = require("discord.js");
const { accentColor } = require("../constants/branding");
const { loadRulesConfig } = require("../services/rules-config");
const {
  createMediaAsset,
  footerText,
  panelDescription,
  panelDivider,
  panelHeading,
  prependBanner,
} = require("./panel-style");

const RULES_ACCEPT_BUTTON_ID = "rules:accept";
const RULES_DISCORD_BUTTON_ID = "rules:view:discord";
const RULES_INGAME_BUTTON_ID = "rules:view:ingame";

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
          new TextDisplayBuilder().setContent(panelHeading(title, config.brandText)),
          new TextDisplayBuilder().setContent(
            `${renderRuleList(rules)}\n\n-# Return to the rules channel when you are finished.`,
          ),
        )
        .addSeparatorComponents(
          panelDivider({ visible: false }),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Read both rule sets before accepting."),
        ),
    ],
  };
}

function createRulesPanelMessage() {
  const config = loadRulesConfig();
  const banner = createMediaAsset({
    localPath: config.rulesBannerPath,
    remoteUrl: config.rulesBannerUrl,
    fileName: "rules-banner.png",
  });
  const body = new ContainerBuilder().setAccentColor(accentColor);
  prependBanner(body, banner.url);

  body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(panelHeading(config.title, config.brandText)),
        new TextDisplayBuilder().setContent(
          panelDescription("Read both rulebooks before accepting. You must complete verification first."),
        ),
      )
      .addSeparatorComponents(
        panelDivider(),
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(RULES_DISCORD_BUTTON_ID)
            .setLabel("Discord Rules")
            .setEmoji("💬")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(RULES_INGAME_BUTTON_ID)
            .setLabel("In-Game Rules")
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(RULES_ACCEPT_BUTTON_ID)
            .setLabel("I Accept These Rules")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),
        ),
      )
      .addSeparatorComponents(
        panelDivider({ visible: false }),
      )
      .addTextDisplayComponents(
        footerText("Read both sections before accepting"),
      );

  return {
    files: banner.files,
    flags: MessageFlags.IsComponentsV2,
    components: [body],
  };
}

module.exports = {
  createRulesPanelMessage,
  RULES_ACCEPT_BUTTON_ID,
  RULES_DISCORD_BUTTON_ID,
  RULES_INGAME_BUTTON_ID,
  createRulesDetailMessage,
};
