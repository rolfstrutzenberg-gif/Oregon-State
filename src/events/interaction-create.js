const { Events } = require("discord.js");
const { findAcceptanceByDiscordUserId, saveAcceptance } = require("../services/rules-acceptance-store");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const { grantFullAccess } = require("../services/onboarding-service");
const { createLogger } = require("../utils/logger");
const {
  RULES_ACCEPT_BUTTON_ID,
  RULES_DISCORD_BUTTON_ID,
  RULES_INGAME_BUTTON_ID,
  createRulesDetailMessage,
} = require("../utils/rules-panel");
const { SELF_ROLES_SELECT_ID } = require("../utils/self-roles-panel");
const { syncMemberSelfRoles } = require("../services/self-roles-service");

const logger = createLogger("interaction");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId === RULES_DISCORD_BUTTON_ID) {
      await interaction.reply({
        ...createRulesDetailMessage("discord"),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === RULES_INGAME_BUTTON_ID) {
      await interaction.reply({
        ...createRulesDetailMessage("ingame"),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === RULES_ACCEPT_BUTTON_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "Rules acceptance only works inside the server.",
          ephemeral: true,
        });
        return;
      }

      const verification = findVerificationByDiscordUserId(interaction.user.id);
      if (!verification) {
        await interaction.reply({
          content: "You need to verify first before accepting the rules.",
          ephemeral: true,
        });
        return;
      }

      const existingAcceptance = findAcceptanceByDiscordUserId(interaction.user.id);
      if (existingAcceptance) {
        await interaction.reply({
          content: "You already accepted the rules. Full access should already be available.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;
      await grantFullAccess(member);

      saveAcceptance({
        discordUserId: interaction.user.id,
        discordTag: interaction.user.tag,
        acceptedAt: new Date().toISOString(),
        acceptedInGuildId: interaction.guildId,
      });

      await interaction.editReply({
        content: "Rules accepted. You now have full access to the server.",
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === SELF_ROLES_SELECT_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "Self-role selection only works inside the server.",
          ephemeral: true,
        });
        return;
      }

      const member = interaction.member;
      const result = await syncMemberSelfRoles(member, interaction.values);
      const summary = [
        result.added.length > 0 ? `Added: ${result.added.join(", ")}` : null,
        result.removed.length > 0 ? `Removed: ${result.removed.join(", ")}` : null,
        result.added.length === 0 && result.removed.length === 0 ? "No role changes were needed." : null,
      ]
        .filter(Boolean)
        .join("\n");

      await interaction.reply({
        content: summary,
        ephemeral: true,
      });
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        content: "That command is not available in this build.",
        ephemeral: true,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Command failed: ${interaction.commandName}`, error);

      const response = {
        content: "Something went wrong while running that command.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
        return;
      }

      await interaction.reply(response);
    }
  },
};
