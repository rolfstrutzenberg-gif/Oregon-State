const { Events } = require("discord.js");
const { findAcceptanceByDiscordUserId, saveAcceptance } = require("../services/rules-acceptance-store");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const { grantFullAccess } = require("../services/onboarding-service");
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
const { findTicketByChannelId, updateTicket } = require("../services/ticket-service");
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

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
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
