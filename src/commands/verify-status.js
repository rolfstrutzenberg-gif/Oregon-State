const { SlashCommandBuilder } = require("discord.js");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const { verificationReadiness } = require("../services/verification-config");
const { replyPanel } = require("../utils/command-response");

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
      await replyPanel(interaction, {
        title: "Verification • Not Linked",
        description: `No stored Roblox verification was found for ${user}.`,
        lines: [`> Verification portal: **${readiness.hasPortalUrl ? "Online" : "Not configured"}**`],
        tone: "warning",
      });
      return;
    }

    await replyPanel(interaction, {
      title: "Verification • Linked",
      description: `${user} is verified with Roblox.`,
      lines: [
        `> Username: **${record.robloxUsername || "Unknown"}**`,
        `> Display name: **${record.robloxDisplayName || "Unknown"}**`,
        `> Roblox ID: \`${record.robloxUserId || "Unknown"}\``,
        `> Discord ID: \`${record.discordUserId}\``,
        `> Verified: **${record.verifiedAt ? new Date(record.verifiedAt).toLocaleString() : "Unknown"}**`,
      ],
      tone: "success",
    });
  },
};
