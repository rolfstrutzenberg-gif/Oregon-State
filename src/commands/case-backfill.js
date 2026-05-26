const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { syncCaseFilesFromMembers } = require("../services/case-file-service");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("case-backfill")
    .setDescription("Backfill case files for current server members.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    await interaction.guild.members.fetch();
    const priorityUserIds = [
      process.env.OWNER_USER_ID,
      interaction.client.user.id,
    ].filter(Boolean);
    const synced = syncCaseFilesFromMembers(interaction.guild.members.cache, priorityUserIds);

    await interaction.editReply({
      content: `Backfilled ${synced.length} case file(s). Owner should be CF-0001 and bot should be CF-0002 when both are in the server.`,
    });
  },
};
