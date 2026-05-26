const { SlashCommandBuilder } = require("discord.js");
const { loadRulesConfig } = require("../services/rules-config");
const { createRulesPanelMessage } = require("../utils/rules-panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Post the rules panel in the configured rules channel."),
  async execute(interaction) {
    const config = loadRulesConfig();
    const targetChannelId = config.rulesChannelId || interaction.channelId;
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        content: "The rules target channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    const panel = createRulesPanelMessage();

    await targetChannel.send({
      components: panel.components,
      files: panel.files,
      flags: panel.flags,
    });

    await interaction.reply({
      content: `Rules panel posted in <#${targetChannel.id}>.`,
      ephemeral: true,
    });
  },
};
