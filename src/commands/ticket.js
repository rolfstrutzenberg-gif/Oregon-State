const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { createTicketChannel } = require("../services/ticket-service");
const { createTicketControlsMessage } = require("../utils/case-file-ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a basic staff ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Member this ticket is about.")
        .setRequired(true),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);
    const { channel } = await createTicketChannel(interaction, targetUser);

    await channel.send({
      content: `<@${interaction.user.id}> <@${targetUser.id}>`,
      allowedMentions: { users: [interaction.user.id, targetUser.id] },
    });
    await channel.send(createTicketControlsMessage(targetUser));

    await interaction.editReply({
      content: `Ticket created: <#${channel.id}>`,
    });
  },
};
