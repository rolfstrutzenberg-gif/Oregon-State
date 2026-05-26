const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createCaseFilesDashboardMessage } = require("../utils/case-file-ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("case-dashboard")
    .setDescription("Post the management case files dashboard.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const channelId = process.env.CASE_FILES_CHANNEL_ID || interaction.channelId;
    const channel = await interaction.client.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: "The case files channel is missing or is not a text channel.",
        ephemeral: true,
      });
      return;
    }

    await channel.send(createCaseFilesDashboardMessage());
    await interaction.reply({
      content: `Case files dashboard posted in <#${channel.id}>.`,
      ephemeral: true,
    });
  },
};
