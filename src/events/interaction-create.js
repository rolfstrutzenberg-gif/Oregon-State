const { Events, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { findAcceptanceByDiscordUserId, saveAcceptance } = require("../services/rules-acceptance-store");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const {
  VERIFICATION_START_BUTTON_ID,
  createVerificationLaunchMessage,
} = require("../utils/verification-flow");
const { grantFullAccess } = require("../services/onboarding-service");
const { canApply } = require("../services/application-eligibility-service");
const {
  createStaffApplication,
  findPendingApplicationByUserId,
  findStaffApplication,
  updateStaffApplication,
} = require("../services/staff-application-service");
const {
  createAccessRequest,
  addIncident,
  findAccessRequest,
  hasApprovedAccess,
  incidentsForUser,
  findCaseFile,
  pendingAccessRequests,
  readCaseFiles,
  recentIncidents,
  searchCaseFiles,
  updateCaseFile,
  updateAccessRequest,
} = require("../services/case-file-service");
const { createTicketChannel, findTicketByChannelId, updateTicket } = require("../services/ticket-service");
const { enterGiveaway, findGiveaway } = require("../services/giveaway-service");
const { isLogExemptUser } = require("../services/log-exemption-service");
const { createLogger } = require("../utils/logger");
const {
  CASE_DASHBOARD_RECENT_ID,
  CASE_DASHBOARD_REQUESTS_ID,
  CASE_DASHBOARD_LOG_ACTION_ID,
  CASE_DASHBOARD_LOG_ID,
  CASE_DASHBOARD_LOG_MODAL_ID,
  CASE_DASHBOARD_LOG_NOTES_ID,
  CASE_DASHBOARD_LOG_SUMMARY_ID,
  CASE_DASHBOARD_LOG_TARGET_ID,
  CASE_DASHBOARD_LOG_TYPE_ID,
  CASE_DASHBOARD_ROLE_ID,
  CASE_DASHBOARD_ROLE_MODAL_ID,
  CASE_DASHBOARD_ROLE_QUERY_ID,
  CASE_DASHBOARD_SEARCH_ID,
  CASE_DASHBOARD_SEARCH_MODAL_ID,
  CASE_DASHBOARD_SEARCH_QUERY_ID,
  CASE_FILE_APPROVE_PREFIX,
  CASE_FILE_DENY_PREFIX,
  CASE_FILE_REQUEST_ID,
  CASE_FILE_REQUEST_MODAL_ID,
  CASE_FILE_REQUEST_REASON_ID,
  CASE_FILE_VIEW_ID,
  TICKET_CLOSE_ACTION_ID,
  TICKET_CLOSE_ID,
  TICKET_CLOSE_MODAL_ID,
  TICKET_CLOSE_RESULT_ID,
  TICKET_CLOSE_SUMMARY_ID,
  createAccessRequestMessage,
  createCaseLogCopyMessage,
  createCaseFileRequestModal,
  createCaseFileSummaryMessage,
  createCaseSearchModal,
  createCaseSearchResultsMessage,
  createIncidentLogModal,
  createRecentCasesMessage,
  createRequestsQueueMessage,
  createRoleSearchModal,
  createRoleSearchResultsMessage,
  createTicketCloseModal,
} = require("../utils/case-file-ui");
const {
  RULES_ACCEPT_BUTTON_ID,
  RULES_DISCORD_BUTTON_ID,
  RULES_INGAME_BUTTON_ID,
  createRulesDetailMessage,
} = require("../utils/rules-panel");
const { SELF_ROLES_SELECT_ID } = require("../utils/self-roles-panel");
const { syncMemberSelfRoles } = require("../services/self-roles-service");
const {
  addVoteInterest,
  findSessionVote,
  getActiveSession,
  readSessionsStore,
  removeVoteInterest,
} = require("../services/session-service");
const {
  SESSION_INFO_PREFIX,
  SESSION_VOTE_INTERESTED_PREFIX,
  SESSION_VOTE_REMOVE_PREFIX,
  createSessionInfoMessage,
  createSessionVotePanel,
} = require("../utils/sessions-panel");
const {
  buildTeleportCommand,
  findRecentRemoteCommand,
  isRobloxUserId,
  normalizeCommand,
  sendErlcCommand,
} = require("../services/erlc-api-service");
const {
  findModCall,
  pendingModCalls,
  recentCommandLogs,
  recordCommandLog,
  updateModCall,
} = require("../services/erlc-store");
const {
  relayModCalls,
  sendCommandLog,
} = require("../services/erlc-discord-service");
const {
  ERLC_COMMAND_BUTTON_ID,
  ERLC_COMMAND_INPUT_ID,
  ERLC_COMMAND_MODAL_ID,
  ERLC_COMMAND_REASON_ID,
  ERLC_MODCALL_RESPOND_PREFIX,
  ERLC_PENDING_MODCALLS_ID,
  ERLC_RECENT_COMMANDS_ID,
  ERLC_REFRESH_MODCALLS_ID,
  createErlcCommandModal,
  createModCallMessage,
  createPendingModCallsMessage,
  createRecentCommandsMessage,
} = require("../utils/erlc-dashboard");
const {
  SUPPORT_DETAILS_ID,
  SUPPORT_PROOF_ID,
  SUPPORT_ROBLOX_ID,
  SUPPORT_SUMMARY_ID,
  SUPPORT_TICKET_MODAL_PREFIX,
  SUPPORT_TICKET_PREFIX,
  SUPPORT_TICKET_SELECT_ID,
  createSupportTicketModal,
  createTicketOpenedMessage,
  ticketTypes,
} = require("../utils/support-tickets");
const {
  GIVEAWAY_JOIN_PREFIX,
  createGiveawayPanel,
} = require("../utils/giveaway-panel");
const {
  STAFF_APPLICATION_APPROVE_PREFIX,
  STAFF_APPLICATION_AVAILABILITY_ID,
  STAFF_APPLICATION_DENY_PREFIX,
  STAFF_APPLICATION_EXPERIENCE_ID,
  STAFF_APPLICATION_MODAL_ID,
  STAFF_APPLICATION_MOTIVATION_ID,
  STAFF_APPLICATION_OPEN_ID,
  STAFF_APPLICATION_ROBLOX_ID,
  STAFF_APPLICATION_SCENARIO_ID,
  createStaffApplicationModal,
  createStaffApplicationReviewMessage,
} = require("../utils/staff-application");

const logger = createLogger("interaction");

function resolveManagementMembers(guild) {
  const managementRole = process.env.MANAGEMENT_ROLE_ID
    ? guild.roles.cache.get(process.env.MANAGEMENT_ROLE_ID)
    : guild.roles.cache.find((role) => ["➟ Management", "➟ Senior Management"].includes(role.name));

  if (!managementRole) {
    return [];
  }

  return managementRole.members.filter((member) => !member.user.bot);
}

async function notifyCaseFileRequest(interaction, request) {
  const guild = interaction.guild;
  await guild.roles.fetch().catch(() => null);
  const onlineManagement = resolveManagementMembers(guild);
  const recipients = onlineManagement.size > 0
    ? [...onlineManagement.values()]
    : [process.env.OWNER_USER_ID ? await interaction.client.users.fetch(process.env.OWNER_USER_ID).catch(() => null) : null].filter(Boolean);

  const message = createAccessRequestMessage(request);
  for (const recipient of recipients) {
    await recipient.send(message).catch(() => null);
  }
}

function resolveVerifiedRole(guild) {
  if (process.env.VERIFIED_ROLE_ID) {
    return guild.roles.cache.get(process.env.VERIFIED_ROLE_ID) || null;
  }

  return guild.roles.cache.find((role) => role.name === "➟ Verified Community Member") || null;
}

function memberMeetsGiveawayGate(interaction, giveaway) {
  if (!giveaway.requireVerified) {
    return true;
  }

  const verifiedRole = resolveVerifiedRole(interaction.guild);
  const hasVerifiedRole = !verifiedRole || interaction.member.roles.cache.has(verifiedRole.id);
  const hasAcceptedRules = Boolean(findAcceptanceByDiscordUserId(interaction.user.id));

  return hasVerifiedRole && hasAcceptedRules;
}

function resolveApplicationLogsChannel(guild) {
  if (process.env.APPLICATION_LOGS_CHANNEL_ID) {
    const configured = guild.channels.cache.get(process.env.APPLICATION_LOGS_CHANNEL_ID);
    if (configured?.isTextBased()) {
      return configured;
    }
  }

  return guild.channels.cache.find(
    (channel) => channel.isTextBased?.() && channel.name.includes("application-logs"),
  ) || null;
}

function canReviewStaffApplications(interaction) {
  if (interaction.user.id === process.env.OWNER_USER_ID) {
    return true;
  }

  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  const managementRole = process.env.MANAGEMENT_ROLE_ID
    ? interaction.guild?.roles.cache.get(process.env.MANAGEMENT_ROLE_ID)
    : interaction.guild?.roles.cache.find((role) =>
      ["➟ Management", "➟ Senior Management"].includes(role.name)
    );

  return Boolean(managementRole && interaction.member?.roles.cache.has(managementRole.id));
}

async function refreshGiveawayMessage(interaction, giveaway) {
  const channel = giveaway.channelId
    ? await interaction.client.channels.fetch(giveaway.channelId).catch(() => null)
    : interaction.channel;

  if (!channel?.isTextBased() || !giveaway.messageId) {
    return;
  }

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit(createGiveawayPanel(giveaway)).catch(() => null);
}

async function resolveInteractionGuild(interaction) {
  if (interaction.guild) {
    return interaction.guild;
  }

  if (!process.env.GUILD_ID) {
    return null;
  }

  const guild = await interaction.client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
  if (!guild) {
    return null;
  }

  await guild.roles.fetch().catch(() => null);
  await guild.members.fetch().catch(() => null);
  return guild;
}

function cleanLookupValue(value) {
  return String(value || "").trim().replace(/[<@!>&]/g, "");
}

function canUseErlcControls(interaction) {
  if (!interaction.inGuild()) {
    return false;
  }

  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || false;
}

async function resolveMemberFromQuery(guild, query) {
  const lookup = cleanLookupValue(query);
  if (!lookup) {
    return null;
  }

  await guild.members.fetch().catch(() => null);

  const byId = guild.members.cache.get(lookup);
  if (byId) {
    return byId;
  }

  const lowered = lookup.toLowerCase();
  return guild.members.cache.find((member) => {
    const fields = [
      member.user.username,
      member.user.tag,
      member.displayName,
      member.nickname,
    ];

    return fields.some((field) => String(field || "").toLowerCase().includes(lowered));
  }) || null;
}

async function resolveRoleFromQuery(guild, query) {
  const lookup = cleanLookupValue(query);
  if (!lookup) {
    return null;
  }

  await guild.roles.fetch().catch(() => null);
  const byId = guild.roles.cache.get(lookup);
  if (byId) {
    return byId;
  }

  const lowered = lookup.toLowerCase();
  return guild.roles.cache.find((role) => role.name.toLowerCase().includes(lowered)) || null;
}

async function resolveCasesChannel(interaction) {
  const explicitId = process.env.CASES_CHANNEL_ID;
  if (explicitId) {
    const channel = await interaction.client.channels.fetch(explicitId).catch(() => null);
    if (channel?.isTextBased()) {
      return channel;
    }
  }

  const guild = await resolveInteractionGuild(interaction);
  if (!guild) {
    return null;
  }

  await guild.channels.fetch().catch(() => null);
  return guild.channels.cache.find((channel) => channel.isTextBased?.() && channel.name === "📁｜cases") || null;
}

async function runCommandWithLog({ interaction, command, reason, source, modCallId }) {
  let normalizedCommand = command;

  try {
    normalizedCommand = normalizeCommand(command);
    const response = await sendErlcCommand(normalizedCommand);
    const commandLog = await findRecentRemoteCommand(normalizedCommand).catch(() => null);
    const record = recordCommandLog({
      command: normalizedCommand,
      reason,
      source,
      modCallId,
      actorUser: interaction.user,
      status: "Sent",
      apiStatus: response.status,
      erlcCommandLoggedAt: commandLog?.Timestamp || null,
    });

    await sendCommandLog(interaction.client, record);
    return {
      ok: true,
      record,
    };
  } catch (error) {
    const record = recordCommandLog({
      command: normalizedCommand,
      reason,
      source,
      modCallId,
      actorUser: interaction.user,
      status: "Failed",
      apiStatus: error.status || null,
      error: error.message,
    });

    await sendCommandLog(interaction.client, record);
    return {
      ok: false,
      record,
      error,
    };
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId === STAFF_APPLICATION_OPEN_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Staff applications only work inside the server.", ephemeral: true });
        return;
      }

      const eligibility = canApply(interaction.user.id);
      if (!eligibility.allowed) {
        await interaction.reply({
          content: "You cannot submit a staff application while a blacklist is active on your case file.",
          ephemeral: true,
        });
        return;
      }

      const existing = findPendingApplicationByUserId(interaction.user.id);
      if (existing) {
        await interaction.reply({
          content: `You already have a pending staff application (${existing.applicationId}).`,
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(createStaffApplicationModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === STAFF_APPLICATION_MODAL_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Staff applications only work inside the server.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const eligibility = canApply(interaction.user.id);
      if (!eligibility.allowed) {
        await interaction.editReply("You cannot submit a staff application while a blacklist is active.");
        return;
      }

      const existing = findPendingApplicationByUserId(interaction.user.id);
      if (existing) {
        await interaction.editReply(`You already have a pending staff application (${existing.applicationId}).`);
        return;
      }

      const application = createStaffApplication({
        user: interaction.user,
        answers: {
          robloxUsername: interaction.fields.getTextInputValue(STAFF_APPLICATION_ROBLOX_ID),
          availability: interaction.fields.getTextInputValue(STAFF_APPLICATION_AVAILABILITY_ID),
          motivation: interaction.fields.getTextInputValue(STAFF_APPLICATION_MOTIVATION_ID),
          experience: interaction.fields.getTextInputValue(STAFF_APPLICATION_EXPERIENCE_ID),
          scenario: interaction.fields.getTextInputValue(STAFF_APPLICATION_SCENARIO_ID),
        },
      });

      await interaction.guild.channels.fetch().catch(() => null);
      const logsChannel = resolveApplicationLogsChannel(interaction.guild);
      const reviewMessage = createStaffApplicationReviewMessage(application);

      if (logsChannel) {
        await logsChannel.send(reviewMessage);
      } else if (process.env.OWNER_USER_ID) {
        const owner = await interaction.client.users.fetch(process.env.OWNER_USER_ID).catch(() => null);
        await owner?.send(reviewMessage).catch(() => null);
      }

      await interaction.editReply(
        `Application ${application.applicationId} submitted. Management will review it privately.`,
      );
      return;
    }

    if (
      interaction.isButton()
      && (
        interaction.customId.startsWith(STAFF_APPLICATION_APPROVE_PREFIX)
        || interaction.customId.startsWith(STAFF_APPLICATION_DENY_PREFIX)
      )
    ) {
      if (!interaction.inGuild() || !canReviewStaffApplications(interaction)) {
        await interaction.reply({ content: "You do not have permission to review staff applications.", ephemeral: true });
        return;
      }

      const approved = interaction.customId.startsWith(STAFF_APPLICATION_APPROVE_PREFIX);
      const prefix = approved ? STAFF_APPLICATION_APPROVE_PREFIX : STAFF_APPLICATION_DENY_PREFIX;
      const applicationId = interaction.customId.slice(prefix.length);
      const existing = findStaffApplication(applicationId);

      if (!existing) {
        await interaction.reply({ content: "That staff application could not be found.", ephemeral: true });
        return;
      }

      if (existing.status !== "Pending") {
        await interaction.reply({ content: `That application is already ${existing.status.toLowerCase()}.`, ephemeral: true });
        return;
      }

      const application = updateStaffApplication(applicationId, {
        status: approved ? "Approved" : "Denied",
        reviewedByUserId: interaction.user.id,
        reviewedByTag: interaction.user.tag,
        reviewedAt: new Date().toISOString(),
      });

      const reviewMessage = createStaffApplicationReviewMessage(application);
      await interaction.update({
        components: reviewMessage.components,
        allowedMentions: reviewMessage.allowedMentions,
      });

      const applicant = await interaction.client.users.fetch(application.discordUserId).catch(() => null);
      await applicant?.send(
        `Your Oregon State Roleplay staff application ${application.applicationId} was ${application.status.toLowerCase()}.`,
      ).catch(() => null);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(GIVEAWAY_JOIN_PREFIX)) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Giveaways only work inside the server.", ephemeral: true });
        return;
      }

      await interaction.guild.roles.fetch().catch(() => null);
      const giveawayId = interaction.customId.slice(GIVEAWAY_JOIN_PREFIX.length);
      const giveaway = findGiveaway(giveawayId);
      if (!giveaway) {
        await interaction.reply({ content: "That giveaway could not be found.", ephemeral: true });
        return;
      }

      if (!memberMeetsGiveawayGate(interaction, giveaway)) {
        await interaction.reply({
          content: "You need to verify and accept the rules before entering this giveaway.",
          ephemeral: true,
        });
        return;
      }

      const result = enterGiveaway(giveawayId, interaction.user);
      if (!result.ok) {
        await interaction.reply({
          content: result.reason === "ended" ? "That giveaway has already ended." : "That giveaway could not be found.",
          ephemeral: true,
        });
        return;
      }

      await refreshGiveawayMessage(interaction, result.giveaway);
      await interaction.reply({
        content: result.alreadyEntered ? "You are already entered." : "You are entered. Good luck.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(SUPPORT_TICKET_PREFIX)) {
      const typeKey = interaction.customId.slice(SUPPORT_TICKET_PREFIX.length);
      if (!ticketTypes[typeKey]) {
        await interaction.reply({ content: "That ticket type is not available.", ephemeral: true });
        return;
      }

      await interaction.showModal(createSupportTicketModal(typeKey));
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === SUPPORT_TICKET_SELECT_ID) {
      const typeKey = interaction.values[0];
      if (!ticketTypes[typeKey]) {
        await interaction.reply({ content: "That ticket type is not available.", ephemeral: true });
        return;
      }

      await interaction.showModal(createSupportTicketModal(typeKey));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(SUPPORT_TICKET_MODAL_PREFIX)) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Support tickets only work inside the server.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const typeKey = interaction.customId.slice(SUPPORT_TICKET_MODAL_PREFIX.length);
      const type = ticketTypes[typeKey];
      if (!type) {
        await interaction.editReply({ content: "That ticket type is not available." });
        return;
      }

      const details = {
        type: type.title,
        robloxUsername: interaction.fields.getTextInputValue(SUPPORT_ROBLOX_ID) || null,
        summary: interaction.fields.getTextInputValue(SUPPORT_SUMMARY_ID),
        details: interaction.fields.getTextInputValue(SUPPORT_DETAILS_ID),
        proof: interaction.fields.getTextInputValue(SUPPORT_PROOF_ID) || null,
        priority: typeKey === "report" || typeKey === "appeal" ? "Review" : "Normal",
      };

      const { channel, ticket } = await createTicketChannel(interaction, interaction.user, details);
      await channel.send({
        content: `<@${interaction.user.id}>`,
        allowedMentions: { users: [interaction.user.id] },
      });
      await channel.send(createTicketOpenedMessage({
        ticket,
        opener: interaction.user,
        targetUser: interaction.user,
      }));
      await channel.send(createTicketControlsMessage(interaction.user));

      await interaction.editReply({
        content: `Ticket opened: <#${channel.id}>`,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === ERLC_COMMAND_BUTTON_ID) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to ER:LC controls.", ephemeral: true });
        return;
      }

      await interaction.showModal(createErlcCommandModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === ERLC_COMMAND_MODAL_ID) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to ER:LC controls.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const command = interaction.fields.getTextInputValue(ERLC_COMMAND_INPUT_ID);
      const reason = interaction.fields.getTextInputValue(ERLC_COMMAND_REASON_ID);
      const result = await runCommandWithLog({
        interaction,
        command,
        reason,
        source: "Dashboard",
      });

      await interaction.editReply({
        content: result.ok
          ? `Command sent and logged as ${result.record.commandId}.`
          : `Command failed and was logged as ${result.record.commandId}: ${result.error.message}`,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === ERLC_REFRESH_MODCALLS_ID) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to ER:LC controls.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const relayed = await relayModCalls(interaction.client);
        await interaction.editReply({
          content: relayed.length > 0
            ? `Relayed ${relayed.length} new mod call(s).`
            : "No new mod calls found.",
        });
      } catch (error) {
        logger.error("Manual mod call refresh failed.", error);
        await interaction.editReply({
          content: `Mod call refresh failed: ${error.message}`,
        });
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === ERLC_RECENT_COMMANDS_ID) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to ER:LC controls.", ephemeral: true });
        return;
      }

      await interaction.reply({
        ...createRecentCommandsMessage(recentCommandLogs()),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === ERLC_PENDING_MODCALLS_ID) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to ER:LC controls.", ephemeral: true });
        return;
      }

      await interaction.reply({
        ...createPendingModCallsMessage(pendingModCalls()),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(ERLC_MODCALL_RESPOND_PREFIX)) {
      if (!canUseErlcControls(interaction)) {
        await interaction.reply({ content: "You do not have access to respond to ER:LC mod calls.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const modCallId = interaction.customId.slice(ERLC_MODCALL_RESPOND_PREFIX.length);
      const modCall = findModCall(modCallId);
      if (!modCall) {
        await interaction.editReply({ content: "That mod call record was not found." });
        return;
      }

      if (modCall.status === "Responded") {
        await interaction.editReply({ content: "That mod call has already been responded to." });
        return;
      }

      const verification = findVerificationByDiscordUserId(interaction.user.id);
      if (!verification?.robloxUserId || !isRobloxUserId(verification.robloxUserId)) {
        await interaction.editReply({
          content: "You need a valid Roblox verification record before the bot can teleport you to a mod call.",
        });
        return;
      }

      if (!modCall.callerRobloxUserId || !isRobloxUserId(modCall.callerRobloxUserId)) {
        await interaction.editReply({
          content: "That mod call did not include a caller Roblox ID, so I cannot build a safe teleport command.",
        });
        return;
      }

      const command = buildTeleportCommand(
        {
          robloxUserId: verification.robloxUserId,
          username: verification.robloxUsername,
        },
        {
          robloxUserId: modCall.callerRobloxUserId,
          username: modCall.callerUsername,
        },
      );
      const result = await runCommandWithLog({
        interaction,
        command,
        reason: `Responding to mod call from ${modCall.callerUsername || modCall.callerRobloxUserId}.`,
        source: "Mod Call Response",
        modCallId,
      });

      if (!result.ok) {
        await interaction.editReply({
          content: `Response failed: ${result.error.message}`,
        });
        return;
      }

      const updated = updateModCall(modCallId, {
        status: "Responded",
        responderDiscordUserId: interaction.user.id,
        responderDiscordTag: interaction.user.tag,
        responderRobloxUserId: verification.robloxUserId,
        responseCommand: command,
        respondedAt: new Date().toISOString(),
      });

      if (interaction.message?.editable && updated) {
        await interaction.message.edit(createModCallMessage(updated)).catch(() => null);
      }

      await interaction.editReply({
        content: `Responding to ${modCall.callerUsername || "the caller"}. Command logged as ${result.record.commandId}.`,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(SESSION_INFO_PREFIX)) {
      const sessionId = interaction.customId.slice(SESSION_INFO_PREFIX.length);
      const activeSession = getActiveSession();
      const session = activeSession?.sessionId === sessionId
        ? activeSession
        : readSessionsStore().history.find((entry) => entry.sessionId === sessionId);

      if (!session) {
        await interaction.reply({
          content: "Session record not found.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        ...createSessionInfoMessage(session),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(SESSION_VOTE_INTERESTED_PREFIX)) {
      const voteId = interaction.customId.slice(SESSION_VOTE_INTERESTED_PREFIX.length);
      const vote = addVoteInterest(voteId, interaction.user.id);

      if (!vote) {
        await interaction.reply({
          content: "Session vote not found.",
          ephemeral: true,
        });
        return;
      }

      await interaction.update(createSessionVotePanel({ vote }));
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(SESSION_VOTE_REMOVE_PREFIX)) {
      const voteId = interaction.customId.slice(SESSION_VOTE_REMOVE_PREFIX.length);
      const existing = findSessionVote(voteId);
      if (!existing) {
        await interaction.reply({
          content: "Session vote not found.",
          ephemeral: true,
        });
        return;
      }

      const vote = removeVoteInterest(voteId, interaction.user.id);
      await interaction.update(createSessionVotePanel({ vote }));
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_DASHBOARD_SEARCH_ID) {
      await interaction.showModal(createCaseSearchModal());
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_DASHBOARD_ROLE_ID) {
      await interaction.showModal(createRoleSearchModal());
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_DASHBOARD_LOG_ID) {
      await interaction.showModal(createIncidentLogModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === CASE_DASHBOARD_SEARCH_MODAL_ID) {
      const query = interaction.fields.getTextInputValue(CASE_DASHBOARD_SEARCH_QUERY_ID);
      const matches = searchCaseFiles(query);

      if (matches.length === 1) {
        await interaction.reply({
          ...createCaseFileSummaryMessage({
            caseFile: matches[0],
            incidents: incidentsForUser(matches[0].userId),
          }),
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        ...createCaseSearchResultsMessage({ query, caseFiles: matches }),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === CASE_DASHBOARD_ROLE_MODAL_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Role search only works inside the server.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const query = interaction.fields.getTextInputValue(CASE_DASHBOARD_ROLE_QUERY_ID);
      const role = await resolveRoleFromQuery(interaction.guild, query);
      if (!role) {
        await interaction.editReply({ content: "No role matched that search." });
        return;
      }

      await interaction.guild.members.fetch().catch(() => null);
      const roleMemberIds = new Set(role.members.map((member) => member.id));
      const files = readCaseFiles().filter((file) => roleMemberIds.has(file.userId)).slice(0, 20);

      await interaction.editReply(createRoleSearchResultsMessage({ role, caseFiles: files }));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === CASE_DASHBOARD_LOG_MODAL_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Incident logging only works inside the server.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const targetQuery = interaction.fields.getTextInputValue(CASE_DASHBOARD_LOG_TARGET_ID);
      const targetMember = await resolveMemberFromQuery(interaction.guild, targetQuery);
      if (!targetMember) {
        await interaction.editReply({ content: "No member matched that incident target." });
        return;
      }

      const type = interaction.fields.getTextInputValue(CASE_DASHBOARD_LOG_TYPE_ID);
      const summary = interaction.fields.getTextInputValue(CASE_DASHBOARD_LOG_SUMMARY_ID);
      const actionTaken = interaction.fields.getTextInputValue(CASE_DASHBOARD_LOG_ACTION_ID);
      const notes = interaction.fields.getTextInputValue(CASE_DASHBOARD_LOG_NOTES_ID) || null;
      const normalized = `${type} ${actionTaken}`.toLowerCase();
      const currentCaseFile = findCaseFile(targetMember.id);
      const nextFlags = new Set(currentCaseFile?.flags || []);

      if (normalized.includes("blacklist")) {
        nextFlags.add("Blacklist");
      }

      const incident = addIncident({
        targetUser: targetMember.user,
        moderatorUser: interaction.user,
        type,
        status: "Recorded",
        reason: summary,
        evidence: notes ? `Action / Result: ${actionTaken}\nNotes / Evidence: ${notes}` : `Action / Result: ${actionTaken}`,
      });

      const updatedCaseFile = updateCaseFile(targetMember.id, {
        status: nextFlags.has("Blacklist") ? "Blacklisted" : "Clear",
        flags: [...nextFlags],
        lastActionTaken: actionTaken,
        lastResult: actionTaken,
      }) || findCaseFile(targetMember.id);

      const casesChannel = await resolveCasesChannel(interaction);
      if (casesChannel) {
        await casesChannel.send(createCaseLogCopyMessage({
          incident,
          caseFile: updatedCaseFile,
          actionTaken,
        })).catch(() => null);
      }

      await interaction.editReply({
        ...createCaseFileSummaryMessage({
          caseFile: updatedCaseFile,
          incidents: incidentsForUser(targetMember.id),
          title: "Incident Logged",
        }),
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_DASHBOARD_RECENT_ID) {
      await interaction.reply({
        ...createRecentCasesMessage(recentIncidents()),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_DASHBOARD_REQUESTS_ID) {
      await interaction.reply({
        ...createRequestsQueueMessage(pendingAccessRequests()),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_FILE_REQUEST_ID) {
      const ticket = findTicketByChannelId(interaction.channelId);
      if (!ticket) {
        await interaction.reply({
          content: "This button only works inside an open ticket.",
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(createCaseFileRequestModal());
      return;
    }

    if (interaction.isButton() && interaction.customId === TICKET_CLOSE_ID) {
      const ticket = findTicketByChannelId(interaction.channelId);
      if (!ticket) {
        await interaction.reply({
          content: "This button only works inside an open ticket.",
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(createTicketCloseModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === TICKET_CLOSE_MODAL_ID) {
      const ticket = findTicketByChannelId(interaction.channelId);
      if (!ticket) {
        await interaction.reply({
          content: "This close form is not attached to an open ticket.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const targetUser = await interaction.client.users.fetch(ticket.targetUserId);
      const summary = interaction.fields.getTextInputValue(TICKET_CLOSE_SUMMARY_ID);
      const actionTaken = interaction.fields.getTextInputValue(TICKET_CLOSE_ACTION_ID);
      const result = interaction.fields.getTextInputValue(TICKET_CLOSE_RESULT_ID);
      const normalizedResult = result.toLowerCase();
      const caseFile = findCaseFile(ticket.targetUserId);
      const nextFlags = new Set(caseFile?.flags || []);

      if (normalizedResult.includes("blacklist")) {
        nextFlags.add("Blacklist");
      }

      addIncident({
        targetUser,
        moderatorUser: interaction.user,
        type: "Ticket Closure",
        status: "Closed",
        reason: summary,
        evidence: `Action Taken: ${actionTaken}\nResult: ${result}`,
        ticketId: ticket.ticketId,
      });

      updateCaseFile(ticket.targetUserId, {
        status: nextFlags.has("Blacklist") ? "Blacklisted" : "Clear",
        activeTicketId: null,
        activeInvestigationStartedAt: null,
        flags: [...nextFlags],
        lastTicketSummary: summary,
        lastActionTaken: actionTaken,
        lastResult: result,
      });

      updateTicket(ticket.ticketId, {
        status: "Closed",
        closedByUserId: interaction.user.id,
        closedByTag: interaction.user.tag,
        closedAt: new Date().toISOString(),
        summary,
        actionTaken,
        result,
      });

      await interaction.editReply({
        content: "Ticket closure recorded. Case file updated.",
      });
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === CASE_FILE_REQUEST_MODAL_ID) {
      const ticket = findTicketByChannelId(interaction.channelId);
      if (!ticket) {
        await interaction.reply({
          content: "This request is not attached to an open ticket.",
          ephemeral: true,
        });
        return;
      }

      const targetUser = await interaction.client.users.fetch(ticket.targetUserId);
      const reason = interaction.fields.getTextInputValue(CASE_FILE_REQUEST_REASON_ID);
      const request = createAccessRequest({
        ticketId: ticket.ticketId,
        ticketChannelId: ticket.channelId,
        targetUser,
        requesterUser: interaction.user,
        reason,
      });

      await notifyCaseFileRequest(interaction, request);

      await interaction.reply({
        content: "Case file access request sent to management.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId === CASE_FILE_VIEW_ID) {
      const ticket = findTicketByChannelId(interaction.channelId);
      if (!ticket) {
        await interaction.reply({
          content: "This button only works inside an open ticket.",
          ephemeral: true,
        });
        return;
      }

      if (!hasApprovedAccess(ticket.ticketId, interaction.user.id)) {
        await interaction.reply({
          content: "Case file access has not been approved for this ticket.",
          ephemeral: true,
        });
        return;
      }

      const caseFile = findCaseFile(ticket.targetUserId);
      if (!caseFile) {
        await interaction.reply({
          content: "No case file exists for this member yet.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        ...createCaseFileSummaryMessage({
          caseFile,
          incidents: incidentsForUser(ticket.targetUserId),
        }),
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(CASE_FILE_APPROVE_PREFIX)) {
      const requestId = interaction.customId.slice(CASE_FILE_APPROVE_PREFIX.length);
      const request = findAccessRequest(requestId);
      if (!request) {
        await interaction.reply({ content: "Access request not found.", ephemeral: true });
        return;
      }

      const guild = await resolveInteractionGuild(interaction);
      const exempt = guild ? await isLogExemptUser(guild, request.targetUserId) : false;
      const updated = updateAccessRequest(requestId, {
        status: "Approved",
        approvedByUserId: interaction.user.id,
        approvedByTag: interaction.user.tag,
        logExempt: exempt,
      });

      const ticketChannel = await interaction.client.channels.fetch(updated.ticketChannelId).catch(() => null);
      if (ticketChannel?.isTextBased()) {
        await ticketChannel.send({
          content: `<@${updated.requesterUserId}> case file access approved. Use \`View Case File\` in staff controls.`,
          allowedMentions: { users: [updated.requesterUserId] },
        }).catch(() => null);
      }

      await interaction.reply({ content: `Approved ${requestId}.`, ephemeral: true });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith(CASE_FILE_DENY_PREFIX)) {
      const requestId = interaction.customId.slice(CASE_FILE_DENY_PREFIX.length);
      const request = updateAccessRequest(requestId, {
        status: "Denied",
        approvedByUserId: interaction.user.id,
        approvedByTag: interaction.user.tag,
      });

      if (!request) {
        await interaction.reply({ content: "Access request not found.", ephemeral: true });
        return;
      }

      const ticketChannel = await interaction.client.channels.fetch(request.ticketChannelId).catch(() => null);
      if (ticketChannel?.isTextBased()) {
        await ticketChannel.send({
          content: `<@${request.requesterUserId}> case file access denied.`,
          allowedMentions: { users: [request.requesterUserId] },
        }).catch(() => null);
      }

      await interaction.reply({ content: `Denied ${requestId}.`, ephemeral: true });
      return;
    }

    if (interaction.isButton() && interaction.customId === VERIFICATION_START_BUTTON_ID) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "Start verification from the OSRP server.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } catch (error) {
        logger.error("Could not acknowledge verification interaction.", error);
        return;
      }

      try {
        await interaction.editReply(
          createVerificationLaunchMessage({
            discordUserId: interaction.user.id,
            guildId: interaction.guildId,
          }),
        );
      } catch (error) {
        logger.error("Could not create verification launch link.", error);
        await interaction.editReply({
          content: "Verification is not available right now. Staff have been notified.",
          components: [],
        }).catch((replyError) => {
          logger.error("Could not send verification failure response.", replyError);
        });
      }
      return;
    }

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
        await interaction.deferReply({ ephemeral: true });
        try {
          await grantFullAccess(interaction.member);
          await interaction.editReply(
            "You already accepted the rules. Your server access has been checked and repaired.",
          );
        } catch (error) {
          logger.error("Failed to repair roles for an existing rules acceptance.", error);
          await interaction.editReply(
            "Your previous acceptance was found, but the bot could not repair your access. Staff have been notified.",
          );
        }
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member;
      try {
        await grantFullAccess(member);
      } catch (error) {
        logger.error("Failed to grant full access after rules acceptance.", error);
        await interaction.editReply(
          "Your acceptance could not be completed because the Verified role is missing or the bot cannot assign it. The error has been logged for staff.",
        );
        return;
      }

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
