const { SlashCommandBuilder } = require("discord.js");
const { loadSelfRolesConfig } = require("../services/self-roles-config");
const { createSelfRolesPanelMessage } = require("../utils/self-roles-panel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("selfroles")
    .setDescription("Post the self-role panel in the configured channel."),
  async execute(interaction) {
    const config = loadSelfRolesConfig();
    const targetChannelId = config.channelId || interaction.channelId;
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        content: "The self-role target channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    const panel = createSelfRolesPanelMessage();

    await targetChannel.send({
      components: panel.components,
      files: panel.files,
      flags: panel.flags,
    });

    await interaction.reply({
      content: `Self-role panel posted in <#${targetChannel.id}>.`,
      ephemeral: true,
    });
  },
};
