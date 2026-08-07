const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const { findCaseFile } = require("../services/case-file-service");
const { createReminder, parseReminderDuration, scheduleReminder } = require("../services/reminder-service");
const { findVerificationByDiscordUserId } = require("../services/verification-store");
const { commandPanel, replyPanel } = require("../utils/command-response");

function discordTime(date, style = "F") {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

function visibleRoles(member) {
  const roles = member.roles.cache
    .filter((role) => role.id !== member.guild.id)
    .sort((left, right) => right.position - left.position)
    .map((role) => role.toString());
  if (roles.length === 0) return "None";
  const text = roles.slice(0, 12).join(", ");
  return roles.length > 12 ? `${text} +${roles.length - 12} more` : text;
}

const whois = {
  data: new SlashCommandBuilder()
    .setName("whois")
    .setDescription("View a member's Discord, Roblox, and case-file summary.")
    .setDMPermission(false)
    .addUserOption((option) => option.setName("member").setDescription("Member to inspect.")),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("member") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return replyPanel(interaction, { title: "Member Not Found", description: "That user is not currently in this server.", tone: "danger" });
    const verification = findVerificationByDiscordUserId(user.id);
    const caseFile = findCaseFile(user.id);
    await replyPanel(interaction, {
      title: `Member • ${member.displayName}`,
      description: `${user} • @${user.username}`,
      lines: [
        `> Discord ID: \`${user.id}\``,
        `> Account created: ${discordTime(user.createdAt)} (${discordTime(user.createdAt, "R")})`,
        `> Joined OSRP: ${member.joinedAt ? discordTime(member.joinedAt) : "Unknown"}`,
        `> Roblox: **${verification?.robloxUsername || "Not verified"}**${verification?.robloxUserId ? ` (\`${verification.robloxUserId}\`)` : ""}`,
        `> Case file: **${caseFile?.caseFileId || "Not created"}** • ${caseFile?.status || "No record"}`,
        `> Roles: ${visibleRoles(member)}`,
      ],
      mediaUrl: user.displayAvatarURL({ extension: "png", size: 512 }),
    });
  },
};

const avatar = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View a user's full-size Discord avatar.")
    .addUserOption((option) => option.setName("user").setDescription("User whose avatar you want to view.")),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const url = user.displayAvatarURL({ extension: "png", size: 4096 });
    await replyPanel(interaction, {
      title: `Avatar • ${user.username}`,
      description: `[Open full-size avatar](${url})`,
      mediaUrl: url,
    }, { ephemeral: false });
  },
};

const serverinfo = {
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("View Oregon State Roleplay server information.").setDMPermission(false),
  async execute(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch().catch(() => null);
    const humans = guild.members.cache.filter((member) => !member.user.bot).size;
    const bots = guild.memberCount - humans;
    await replyPanel(interaction, {
      title: guild.name,
      description: guild.description || "Oregon State Roleplay",
      lines: [
        `> Owner: <@${guild.ownerId}>`,
        `> Members: **${guild.memberCount.toLocaleString()}** (${humans.toLocaleString()} people • ${bots.toLocaleString()} bots)`,
        `> Roles: **${guild.roles.cache.size}**`,
        `> Channels: **${guild.channels.cache.size}**`,
        `> Created: ${discordTime(guild.createdAt)} (${discordTime(guild.createdAt, "R")})`,
        `> Server ID: \`${guild.id}\``,
      ],
      mediaUrl: guild.iconURL({ extension: "png", size: 1024 }),
    }, { ephemeral: false });
  },
};

const roleinfo = {
  data: new SlashCommandBuilder().setName("roleinfo").setDescription("View details about a server role.").setDMPermission(false)
    .addRoleOption((option) => option.setName("role").setDescription("Role to inspect.").setRequired(true)),
  async execute(interaction) {
    const role = interaction.options.getRole("role", true);
    await replyPanel(interaction, {
      title: `Role • ${role.name}`,
      lines: [
        `> Role: ${role}`,
        `> ID: \`${role.id}\``,
        `> Members: **${role.members.size.toLocaleString()}**`,
        `> Position: **${role.position}**`,
        `> Color: \`${role.hexColor}\``,
        `> Mentionable: **${role.mentionable ? "Yes" : "No"}**`,
        `> Hoisted: **${role.hoist ? "Yes" : "No"}**`,
        `> Created: ${discordTime(role.createdAt, "R")}`,
      ],
    });
  },
};

const channelinfo = {
  data: new SlashCommandBuilder().setName("channelinfo").setDescription("View details about a server channel.").setDMPermission(false)
    .addChannelOption((option) => option.setName("channel").setDescription("Channel to inspect.")),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    await replyPanel(interaction, {
      title: `Channel • ${channel.name || "Unknown"}`,
      lines: [
        `> Channel: <#${channel.id}>`,
        `> ID: \`${channel.id}\``,
        `> Type: **${ChannelType[channel.type] || channel.type}**`,
        `> Category: **${channel.parent?.name || "None"}**`,
        `> Position: **${channel.rawPosition ?? channel.position ?? "Unknown"}**`,
        `> Created: ${discordTime(channel.createdAt, "R")}`,
      ],
    });
  },
};

const roblox = {
  data: new SlashCommandBuilder().setName("roblox").setDescription("View a member's linked Roblox account.").setDMPermission(false)
    .addUserOption((option) => option.setName("member").setDescription("Member to check.")),
  async execute(interaction) {
    const user = interaction.options.getUser("member") || interaction.user;
    const record = findVerificationByDiscordUserId(user.id);
    if (!record) return replyPanel(interaction, { title: "Roblox • Not Verified", description: `${user} does not have a stored Roblox verification.`, tone: "warning" });
    await replyPanel(interaction, {
      title: `Roblox • ${record.robloxUsername}`,
      description: `${user}'s linked Roblox account.`,
      lines: [
        `> Username: **${record.robloxUsername || "Unknown"}**`,
        `> Display name: **${record.robloxDisplayName || "Unknown"}**`,
        `> Roblox ID: \`${record.robloxUserId || "Unknown"}\``,
        `> Verified: ${record.verifiedAt ? discordTime(record.verifiedAt, "R") : "Unknown"}`,
        `> [Open Roblox profile](https://www.roblox.com/users/${record.robloxUserId}/profile)`,
      ],
    });
  },
};

const membercount = {
  data: new SlashCommandBuilder().setName("membercount").setDescription("View the current server member count.").setDMPermission(false),
  async execute(interaction) {
    await interaction.guild.members.fetch().catch(() => null);
    const members = interaction.guild.members.cache;
    const humans = members.filter((member) => !member.user.bot).size;
    const bots = members.filter((member) => member.user.bot).size;
    const verifiedRole = process.env.VERIFIED_ROLE_ID ? interaction.guild.roles.cache.get(process.env.VERIFIED_ROLE_ID) : null;
    await replyPanel(interaction, {
      title: "Member Count",
      description: `Oregon State Roleplay currently has **${interaction.guild.memberCount.toLocaleString()} members**.`,
      lines: [`> People: **${humans.toLocaleString()}**`, `> Bots: **${bots.toLocaleString()}**`, `> Verified: **${verifiedRole ? verifiedRole.members.size.toLocaleString() : "Not configured"}**`],
    }, { ephemeral: false });
  },
};

const staff = {
  data: new SlashCommandBuilder().setName("staff").setDescription("View the current Oregon State Roleplay staff team.").setDMPermission(false),
  async execute(interaction) {
    await Promise.all([interaction.guild.roles.fetch(), interaction.guild.members.fetch()]).catch(() => null);
    const roleIds = [process.env.INTERNAL_AFFAIRS_ROLE_ID, process.env.MANAGEMENT_ROLE_ID, process.env.STAFF_TEAM_ROLE_ID, process.env.SUPPORT_TEAM_ROLE_ID].filter(Boolean);
    const roles = roleIds.map((id) => interaction.guild.roles.cache.get(id)).filter(Boolean);
    const members = new Map();
    for (const role of roles) for (const member of role.members.values()) if (!member.user.bot) members.set(member.id, member);
    const list = [...members.values()].sort((a, b) => b.roles.highest.position - a.roles.highest.position);
    await replyPanel(interaction, {
      title: "Staff Team",
      description: list.length ? "Current Oregon State Roleplay staff members." : "No configured staff roles currently have members.",
      lines: list.slice(0, 30).map((member) => `> ${member} • **${member.roles.highest.name}**`).concat(list.length > 30 ? [`> +${list.length - 30} more`] : []),
    }, { ephemeral: false });
  },
};

const poll = {
  data: new SlashCommandBuilder().setName("poll").setDescription("Create a native Discord poll.").setDMPermission(false)
    .addStringOption((option) => option.setName("question").setDescription("Poll question.").setRequired(true).setMaxLength(300))
    .addStringOption((option) => option.setName("option_1").setDescription("First choice.").setRequired(true).setMaxLength(55))
    .addStringOption((option) => option.setName("option_2").setDescription("Second choice.").setRequired(true).setMaxLength(55))
    .addStringOption((option) => option.setName("option_3").setDescription("Optional third choice.").setMaxLength(55))
    .addStringOption((option) => option.setName("option_4").setDescription("Optional fourth choice.").setMaxLength(55))
    .addIntegerOption((option) => option.setName("duration").setDescription("Poll duration.").addChoices({ name: "1 hour", value: 1 }, { name: "6 hours", value: 6 }, { name: "12 hours", value: 12 }, { name: "1 day", value: 24 }, { name: "3 days", value: 72 }, { name: "7 days", value: 168 }))
    .addBooleanOption((option) => option.setName("multiple").setDescription("Allow multiple answers.")),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const answers = ["option_1", "option_2", "option_3", "option_4"].map((name) => interaction.options.getString(name)).filter(Boolean).map((text) => ({ text }));
    await interaction.channel.send({
      poll: {
        question: { text: interaction.options.getString("question", true) },
        answers,
        duration: interaction.options.getInteger("duration") || 24,
        allowMultiselect: interaction.options.getBoolean("multiple") || false,
      },
    });
    await replyPanel(interaction, { title: "Poll Posted", description: `Your poll is live in <#${interaction.channelId}>.`, tone: "success" });
  },
};

const remindme = {
  data: new SlashCommandBuilder().setName("remindme").setDescription("Set a reminder that survives bot restarts.")
    .addStringOption((option) => option.setName("when").setDescription("Time from now, such as 30m, 2h, 3d, or 1w.").setRequired(true).setMaxLength(12))
    .addStringOption((option) => option.setName("reminder").setDescription("What should the bot remind you about?").setRequired(true).setMaxLength(500)),
  async execute(interaction) {
    const duration = parseReminderDuration(interaction.options.getString("when", true));
    if (!duration) return replyPanel(interaction, { title: "Invalid Reminder Time", description: "Use a time like `30m`, `2h`, `3d`, or `1w` (maximum 90 days).", tone: "danger" });
    const reminder = createReminder({ userId: interaction.user.id, guildId: interaction.guildId, channelId: interaction.channelId, text: interaction.options.getString("reminder", true), dueAt: Date.now() + duration });
    scheduleReminder(interaction.client, reminder);
    await replyPanel(interaction, { title: "Reminder Set", description: `I’ll remind you ${discordTime(reminder.dueAt, "R")}.`, lines: [`> ${reminder.text}`], tone: "success" });
  },
};

const announce = {
  data: new SlashCommandBuilder().setName("announce").setDescription("Post a polished announcement panel.").setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) => option.setName("title").setDescription("Announcement title.").setRequired(true).setMaxLength(100))
    .addStringOption((option) => option.setName("message").setDescription("Announcement message.").setRequired(true).setMaxLength(3000))
    .addChannelOption((option) => option.setName("channel").setDescription("Channel to post in.").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption((option) => option.setName("ping").setDescription("Optional role to notify.")),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const ping = interaction.options.getRole("ping");
    const message = interaction.options.getString("message", true);
    const payload = commandPanel({
      title: interaction.options.getString("title", true),
      description: ping ? `${ping}\n${message}` : message,
      footer: `Posted by ${interaction.user.username} • Oregon State Roleplay`,
    });
    await channel.send({ ...payload, allowedMentions: { roles: ping ? [ping.id] : [] } });
    await replyPanel(interaction, { title: "Announcement Posted", description: `The announcement was posted in <#${channel.id}>.`, tone: "success" });
  },
};

const status = {
  data: new SlashCommandBuilder().setName("status").setDescription("View bot and integration health."),
  async execute(interaction) {
    const relayConfigured = Boolean(process.env.VERIFICATION_RELAY_URL);
    const erlcConfigured = Boolean(process.env.ERLC_API_KEY);
    await replyPanel(interaction, {
      title: "System Status",
      description: "Current Oregon State Systems health.",
      lines: [
        `> Discord gateway: **Online** (${Math.round(interaction.client.ws.ping)}ms)`,
        `> Roblox verification: **${relayConfigured || process.env.BOT_VERIFICATION_CALLBACK_URL ? "Configured" : "Needs configuration"}**`,
        `> ER:LC API: **${erlcConfigured ? "Configured" : "Needs configuration"}**`,
        `> Uptime: **${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m**`,
      ],
      tone: relayConfigured ? "success" : "warning",
    }, { ephemeral: false });
  },
};

module.exports = [whois, avatar, serverinfo, roleinfo, channelinfo, roblox, membercount, staff, poll, remindme, announce, status];
