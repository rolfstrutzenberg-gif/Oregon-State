const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const {
  assertCanAct,
  assertRoleManageable,
  notifyTarget,
  recordModerationAction,
  resolveBlacklistedRole,
} = require("../services/moderation-service");
const { replyPanel } = require("../utils/command-response");

function reasonOption(option) {
  return option
    .setName("reason")
    .setDescription("Reason for this action.")
    .setRequired(true)
    .setMaxLength(500);
}

function memberOption(option) {
  return option
    .setName("member")
    .setDescription("Member to target.")
    .setRequired(true);
}

async function getMember(interaction) {
  const user = interaction.options.getUser("member", true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    throw new Error("That user is not currently in the server.");
  }
  return member;
}

async function begin(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

async function success(interaction, title, description, lines = []) {
  return replyPanel(interaction, { title, description, lines, tone: "success" });
}

async function failure(interaction, error) {
  return replyPanel(interaction, {
    title: "Action Not Completed",
    description: error.message || "Discord rejected that action.",
    tone: "danger",
  });
}

function moderationCommand({ name, description, permission, configure, execute }) {
  const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDMPermission(false)
    .setDefaultMemberPermissions(permission);
  configure(data);
  return {
    data,
    async execute(interaction) {
      await begin(interaction);
      try {
        await execute(interaction);
      } catch (error) {
        await failure(interaction, error);
      }
    },
  };
}

const kick = moderationCommand({
  name: "kick",
  description: "Remove a member from the server.",
  permission: PermissionFlagsBits.KickMembers,
  configure: (data) => data.addUserOption(memberOption).addStringOption(reasonOption),
  async execute(interaction) {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    assertCanAct(interaction, member);
    if (!member.kickable) throw new Error("Discord will not allow the bot to kick that member.");
    await notifyTarget(member.user, { action: "Kick", reason, guildName: interaction.guild.name });
    await member.kick(reason);
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Kick", reason, result: "Removed from server" });
    await success(interaction, "Member Kicked", `${member.user.tag} was removed from the server.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

const ban = moderationCommand({
  name: "ban",
  description: "Ban a member from the server.",
  permission: PermissionFlagsBits.BanMembers,
  configure: (data) => data
    .addUserOption(memberOption)
    .addStringOption(reasonOption)
    .addIntegerOption((option) => option.setName("delete_days").setDescription("Delete recent message history.").setMinValue(0).setMaxValue(7)),
  async execute(interaction) {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    const deleteDays = interaction.options.getInteger("delete_days") || 0;
    assertCanAct(interaction, member);
    if (!member.bannable) throw new Error("Discord will not allow the bot to ban that member.");
    await notifyTarget(member.user, { action: "Ban", reason, guildName: interaction.guild.name });
    await member.ban({ reason, deleteMessageSeconds: deleteDays * 86_400 });
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Ban", reason, result: "Banned from server" });
    await success(interaction, "Member Banned", `${member.user.tag} was banned.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

const unban = moderationCommand({
  name: "unban",
  description: "Remove a server ban by Discord user ID.",
  permission: PermissionFlagsBits.BanMembers,
  configure: (data) => data
    .addStringOption((option) => option.setName("user_id").setDescription("Discord user ID to unban.").setRequired(true).setMinLength(17).setMaxLength(20))
    .addStringOption(reasonOption),
  async execute(interaction) {
    const userId = interaction.options.getString("user_id", true).trim();
    const reason = interaction.options.getString("reason", true);
    if (!/^\d{17,20}$/u.test(userId)) throw new Error("Enter a valid Discord user ID.");
    const entry = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!entry) throw new Error("That user is not banned from this server.");
    await interaction.guild.members.unban(userId, reason);
    const log = await recordModerationAction({ interaction, targetUser: entry.user, type: "Unban", reason, result: "Ban removed" });
    await success(interaction, "Member Unbanned", `${entry.user.tag} can join the server again.`, [`> Incident: **${log.incident.incidentId}**`]);
  },
});

const softban = moderationCommand({
  name: "softban",
  description: "Ban and immediately unban a member to clear messages.",
  permission: PermissionFlagsBits.BanMembers,
  configure: (data) => data
    .addUserOption(memberOption)
    .addStringOption(reasonOption)
    .addIntegerOption((option) => option.setName("delete_days").setDescription("Days of messages to delete.").setMinValue(1).setMaxValue(7)),
  async execute(interaction) {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    const deleteDays = interaction.options.getInteger("delete_days") || 1;
    assertCanAct(interaction, member);
    if (!member.bannable) throw new Error("Discord will not allow the bot to softban that member.");
    await notifyTarget(member.user, { action: "Softban", reason, guildName: interaction.guild.name });
    await interaction.guild.members.ban(member.id, { reason, deleteMessageSeconds: deleteDays * 86_400 });
    await interaction.guild.members.unban(member.id, "Softban completed");
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Softban", reason, result: `Removed and cleared ${deleteDays} day(s) of messages` });
    await success(interaction, "Softban Completed", `${member.user.tag} was removed and may rejoin.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

const timeoutChoices = [
  ["5 minutes", 300], ["15 minutes", 900], ["30 minutes", 1800],
  ["1 hour", 3600], ["6 hours", 21600], ["1 day", 86400], ["7 days", 604800], ["28 days", 2419200],
];

const mute = moderationCommand({
  name: "mute",
  description: "Temporarily timeout a member.",
  permission: PermissionFlagsBits.ModerateMembers,
  configure: (data) => data
    .addUserOption(memberOption)
    .addIntegerOption((option) => option.setName("duration").setDescription("How long the timeout lasts.").setRequired(true).addChoices(...timeoutChoices.map(([name, value]) => ({ name, value }))))
    .addStringOption(reasonOption),
  async execute(interaction) {
    const member = await getMember(interaction);
    const seconds = interaction.options.getInteger("duration", true);
    const reason = interaction.options.getString("reason", true);
    assertCanAct(interaction, member);
    if (!member.moderatable) throw new Error("Discord will not allow the bot to timeout that member.");
    const duration = timeoutChoices.find(([, value]) => value === seconds)?.[0] || `${seconds} seconds`;
    await member.timeout(seconds * 1000, reason);
    await notifyTarget(member.user, { action: "Mute", reason, duration, guildName: interaction.guild.name });
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Mute", reason, result: `Timed out for ${duration}` });
    await success(interaction, "Member Muted", `${member.user.tag} was muted for ${duration}.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

const unmute = moderationCommand({
  name: "unmute",
  description: "Remove a member timeout.",
  permission: PermissionFlagsBits.ModerateMembers,
  configure: (data) => data.addUserOption(memberOption).addStringOption(reasonOption),
  async execute(interaction) {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    assertCanAct(interaction, member);
    if (!member.moderatable) throw new Error("Discord will not allow the bot to update that member.");
    await member.timeout(null, reason);
    await notifyTarget(member.user, { action: "Unmute", reason, guildName: interaction.guild.name });
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Unmute", reason, result: "Timeout removed" });
    await success(interaction, "Member Unmuted", `${member.user.tag}'s timeout was removed.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

const strike = moderationCommand({
  name: "strike",
  description: "Add a formal strike to a member's case file.",
  permission: PermissionFlagsBits.ModerateMembers,
  configure: (data) => data.addUserOption(memberOption).addStringOption(reasonOption),
  async execute(interaction) {
    const member = await getMember(interaction);
    const reason = interaction.options.getString("reason", true);
    assertCanAct(interaction, member);
    await notifyTarget(member.user, { action: "Strike", reason, guildName: interaction.guild.name });
    const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: "Strike", reason, result: "Strike added to case file" });
    await success(interaction, "Strike Recorded", `${member.user.tag} received a formal strike.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
  },
});

function blacklistCommand(remove = false) {
  return moderationCommand({
    name: remove ? "unblacklist" : "blacklist",
    description: remove ? "Remove the blacklisted role from a member." : "Blacklist a member and record it in their case file.",
    permission: PermissionFlagsBits.ManageRoles,
    configure: (data) => data.addUserOption(memberOption).addStringOption(reasonOption),
    async execute(interaction) {
      const member = await getMember(interaction);
      const reason = interaction.options.getString("reason", true);
      assertCanAct(interaction, member);
      const role = resolveBlacklistedRole(interaction.guild);
      if (!role) throw new Error("The Blacklisted role is missing. Set BLACKLISTED_ROLE_ID in .env.");
      assertRoleManageable(interaction, role);
      if (remove) await member.roles.remove(role, reason);
      else await member.roles.add(role, reason);
      const action = remove ? "Unblacklist" : "Blacklist";
      await notifyTarget(member.user, { action, reason, guildName: interaction.guild.name });
      const log = await recordModerationAction({ interaction, targetUser: member.user, targetMember: member, type: action, reason, result: remove ? "Blacklisted role removed" : "Blacklisted role added" });
      await success(interaction, remove ? "Member Unblacklisted" : "Member Blacklisted", `${member.user.tag} was ${remove ? "removed from" : "added to"} the blacklist.`, [log.exempt ? "> Logging: **Exempt (Testing)**" : `> Incident: **${log.incident.incidentId}**`]);
    },
  });
}

const purge = moderationCommand({
  name: "purge",
  description: "Delete recent messages from this channel.",
  permission: PermissionFlagsBits.ManageMessages,
  configure: (data) => data
    .addIntegerOption((option) => option.setName("amount").setDescription("Messages to delete.").setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((option) => option.setName("member").setDescription("Only delete this member's messages.")),
  async execute(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const user = interaction.options.getUser("member");
    if (!interaction.channel?.isTextBased() || !interaction.channel.messages) throw new Error("This command only works in a text channel.");
    let messages;
    if (user) {
      const fetched = await interaction.channel.messages.fetch({ limit: 100 });
      messages = fetched.filter((message) => message.author.id === user.id).first(amount);
    } else {
      messages = await interaction.channel.messages.fetch({ limit: amount });
    }
    const deleted = await interaction.channel.bulkDelete(messages, true);
    await success(interaction, "Messages Purged", `Deleted ${deleted.size} recent message(s)${user ? ` from ${user.tag}` : ""}.`);
  },
});

const slowmode = moderationCommand({
  name: "slowmode",
  description: "Set the channel slowmode delay.",
  permission: PermissionFlagsBits.ManageChannels,
  configure: (data) => data
    .addIntegerOption((option) => option.setName("seconds").setDescription("Delay between messages; use 0 to disable.").setRequired(true).addChoices(
      { name: "Off", value: 0 }, { name: "5 seconds", value: 5 }, { name: "10 seconds", value: 10 },
      { name: "30 seconds", value: 30 }, { name: "1 minute", value: 60 }, { name: "5 minutes", value: 300 },
      { name: "10 minutes", value: 600 }, { name: "1 hour", value: 3600 }, { name: "6 hours", value: 21600 },
    ))
    .addChannelOption((option) => option.setName("channel").setDescription("Channel to update.").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const seconds = interaction.options.getInteger("seconds", true);
    if (!channel?.setRateLimitPerUser) throw new Error("That channel does not support slowmode.");
    await channel.setRateLimitPerUser(seconds, `Changed by ${interaction.user.tag}`);
    await success(interaction, "Slowmode Updated", seconds === 0 ? `Slowmode was disabled in <#${channel.id}>.` : `Slowmode in <#${channel.id}> is now ${seconds} seconds.`);
  },
});

function lockCommand(unlock = false) {
  return moderationCommand({
    name: unlock ? "unlock" : "lock",
    description: unlock ? "Restore member messaging in a channel." : "Stop members from messaging in a channel.",
    permission: PermissionFlagsBits.ManageChannels,
    configure: (data) => data
      .addChannelOption((option) => option.setName("channel").setDescription("Channel to update.").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption((option) => option.setName("reason").setDescription("Reason for this action.").setMaxLength(500)),
    async execute(interaction) {
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const reason = interaction.options.getString("reason") || `Changed by ${interaction.user.tag}`;
      if (!channel?.permissionOverwrites) throw new Error("That channel cannot be locked.");
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: unlock ? null : false }, { reason });
      await success(interaction, unlock ? "Channel Unlocked" : "Channel Locked", `<#${channel.id}> is now ${unlock ? "open" : "locked"}.`, [`> Reason: **${reason}**`]);
    },
  });
}

const nickname = moderationCommand({
  name: "nickname",
  description: "Set or clear a member's server nickname.",
  permission: PermissionFlagsBits.ManageNicknames,
  configure: (data) => data
    .addUserOption(memberOption)
    .addStringOption((option) => option.setName("nickname").setDescription("New nickname; omit to reset.").setMaxLength(32)),
  async execute(interaction) {
    const member = await getMember(interaction);
    const nicknameValue = interaction.options.getString("nickname");
    assertCanAct(interaction, member);
    if (!member.manageable) throw new Error("Discord will not allow the bot to update that member.");
    await member.setNickname(nicknameValue || null, `Changed by ${interaction.user.tag}`);
    await success(interaction, "Nickname Updated", nicknameValue ? `${member.user.tag}'s nickname is now **${nicknameValue}**.` : `${member.user.tag}'s nickname was reset.`);
  },
});

const role = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Add or remove a member role.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) => subcommand.setName("add").setDescription("Add a role to a member.").addUserOption(memberOption).addRoleOption((option) => option.setName("role").setDescription("Role to add.").setRequired(true)).addStringOption((option) => option.setName("reason").setDescription("Reason for the change.").setMaxLength(500)))
    .addSubcommand((subcommand) => subcommand.setName("remove").setDescription("Remove a role from a member.").addUserOption(memberOption).addRoleOption((option) => option.setName("role").setDescription("Role to remove.").setRequired(true)).addStringOption((option) => option.setName("reason").setDescription("Reason for the change.").setMaxLength(500))),
  async execute(interaction) {
    await begin(interaction);
    try {
      const member = await getMember(interaction);
      const selectedRole = interaction.options.getRole("role", true);
      const operation = interaction.options.getSubcommand();
      const reason = interaction.options.getString("reason") || `Changed by ${interaction.user.tag}`;
      assertCanAct(interaction, member);
      assertRoleManageable(interaction, selectedRole);
      if (operation === "add") await member.roles.add(selectedRole, reason);
      else await member.roles.remove(selectedRole, reason);
      await success(interaction, "Role Updated", `${selectedRole} was ${operation === "add" ? "added to" : "removed from"} ${member.user.tag}.`);
    } catch (error) {
      await failure(interaction, error);
    }
  },
};

module.exports = [
  kick, ban, unban, softban, mute, unmute, strike,
  blacklistCommand(false), blacklistCommand(true), purge, slowmode,
  lockCommand(false), lockCommand(true), nickname, role,
];
