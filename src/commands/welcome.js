const { SlashCommandBuilder } = require("discord.js");
const { loadWelcomeConfig } = require("../services/welcome-config");
const { createWelcomePanelMessage } = require("../utils/welcome-panel");
const { buildWelcomeJoinMessage } = require("../utils/welcome-join-message");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Post the welcome join embed in the configured channel."),
  async execute(interaction) {
    const config = loadWelcomeConfig();
    const targetChannelId = config.channelId || interaction.channelId;
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        content: "The welcome target channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);
    const panel = buildWelcomeJoinMessage(member);

    await targetChannel.send({
      components: panel.components,
      files: panel.files,
      flags: panel.flags,
      allowedMentions: panel.allowedMentions,
    });

    await interaction.reply({
      content: `Welcome embed posted in <#${targetChannel.id}>.`,
      ephemeral: true,
    });
  },
};
