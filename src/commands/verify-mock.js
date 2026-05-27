const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { moveMemberToPendingRules, resolveRulesChannel } = require("../services/onboarding-service");
const { saveVerification } = require("../services/verification-store");
const { isRobloxUserId } = require("../services/erlc-api-service");
const { createRulesReferralMessage } = require("../utils/rules-referral-message");
const { createBaseEmbed } = require("../utils/embed-factory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify-mock")
    .setDescription("Create a mock Roblox verification record for development.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("display_name")
        .setDescription("Roblox display name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("roblox_user_id")
        .setDescription("Roblox user ID")
        .setRequired(true),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const robloxUsername = interaction.options.getString("username", true);
    const robloxDisplayName = interaction.options.getString("display_name", true);
    const robloxUserId = interaction.options.getString("roblox_user_id", true);

    if (!isRobloxUserId(robloxUserId)) {
      await interaction.editReply({
        content: "Roblox user ID must be numbers only.",
      });
      return;
    }

    const record = saveVerification({
      discordUserId: interaction.user.id,
      discordTag: interaction.user.tag,
      robloxUserId,
      robloxUsername,
      robloxDisplayName,
      verifiedAt: new Date().toISOString(),
      provider: "mock",
      notes: "Development-only verification seed record.",
    });

    if (interaction.inGuild()) {
      await moveMemberToPendingRules(interaction.member);

      const rulesChannel = resolveRulesChannel(interaction.guild);
      if (rulesChannel && rulesChannel.isTextBased()) {
        const referral = createRulesReferralMessage(interaction.member, rulesChannel);
        await interaction.followUp({
          ...referral,
          ephemeral: true,
        }).catch(() => null);
      }
    }

    const embed = createBaseEmbed({
      title: "Mock Verification Saved",
      description: `Stored a development verification record for ${interaction.user.tag} and moved them into the rules step.`,
    }).addFields(
      { name: "Roblox Username", value: record.robloxUsername, inline: true },
      { name: "Display Name", value: record.robloxDisplayName, inline: true },
      { name: "Roblox User ID", value: String(record.robloxUserId), inline: true },
    );

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
