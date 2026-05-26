const { SlashCommandBuilder } = require("discord.js");
const { createBaseEmbed } = require("../utils/embed-factory");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const { verificationReadiness } = require("../services/verification-config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify-status")
    .setDescription("Check the stored Roblox verification record for a Discord user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The Discord member to check.")
        .setRequired(false),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const record = findVerificationByDiscordUserId(user.id);
    const readiness = verificationReadiness();

    if (!record) {
      const embed = createBaseEmbed({
        title: "Verification Status",
        description: `No stored Roblox verification record was found for ${user.tag}.`,
      }).addFields({
        name: "Portal Status",
        value: readiness.hasPortalUrl ? "Configured" : "Not configured yet",
      });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }

    const embed = createBaseEmbed({
      title: "Verification Status",
      description: `Stored Roblox verification record found for ${user.tag}.`,
    }).addFields(
      { name: "Roblox Username", value: record.robloxUsername || "Unknown", inline: true },
      { name: "Roblox Display Name", value: record.robloxDisplayName || "Unknown", inline: true },
      { name: "Roblox User ID", value: String(record.robloxUserId || "Unknown"), inline: true },
      { name: "Verified At", value: record.verifiedAt || "Unknown" },
      { name: "Provider", value: record.provider || "Unknown", inline: true },
      { name: "Discord User ID", value: record.discordUserId, inline: true },
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
