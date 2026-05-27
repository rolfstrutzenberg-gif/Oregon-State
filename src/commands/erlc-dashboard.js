const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createErlcDashboardMessage } = require("../utils/erlc-dashboard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("erlc-dashboard")
    .setDescription("Post the ER:LC command and mod call dashboard.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.channel;
    if (!targetChannel?.isTextBased()) {
      await interaction.editReply("This dashboard needs to be posted in a text channel.");
      return;
    }

    await targetChannel.send(createErlcDashboardMessage());
    await interaction.editReply(`ER:LC dashboard posted in <#${targetChannel.id}>.`);
  },
};
