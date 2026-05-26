const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { readStore, writeStore } = require("./json-store");

const ticketsStore = "tickets.json";
const defaultTicketCategoryName = "🎫｜TICKETS";

function readTickets() {
  return readStore(ticketsStore, []);
}

function writeTickets(tickets) {
  writeStore(ticketsStore, tickets);
}

function nextTicketId(tickets) {
  return `T-${String(tickets.length + 1).padStart(4, "0")}`;
}

function findTicketByChannelId(channelId) {
  return readTickets().find((ticket) => ticket.channelId === channelId && ticket.status === "Open") || null;
}

function resolveRole(guild, explicitId, fallbackNames = []) {
  if (explicitId) {
    return guild.roles.cache.get(explicitId) || null;
  }

  return guild.roles.cache.find((role) => fallbackNames.includes(role.name)) || null;
}

async function ensureTicketCategory(guild) {
  if (process.env.TICKET_CATEGORY_ID) {
    const existing = guild.channels.cache.get(process.env.TICKET_CATEGORY_ID);
    if (existing) {
      return existing;
    }
  }

  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === defaultTicketCategoryName,
  );
  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name: defaultTicketCategoryName,
    type: ChannelType.GuildCategory,
    reason: "Create ticket category",
  });
}

async function createTicketChannel(interaction, targetUser) {
  const guild = interaction.guild;
  await guild.channels.fetch();
  await guild.roles.fetch();

  const tickets = readTickets();
  const ticketId = nextTicketId(tickets);
  const category = await ensureTicketCategory(guild);
  const staffRole = resolveRole(guild, process.env.STAFF_TEAM_ROLE_ID, ["➟ Staff Team", "➟ Staff"]);
  const managementRole = resolveRole(guild, process.env.MANAGEMENT_ROLE_ID, ["➟ Management", "➟ Senior Management"]);
  const iaRole = resolveRole(guild, process.env.INTERNAL_AFFAIRS_ROLE_ID, ["➟ Internal Affairs", "➟ IA"]);

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: targetUser.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  for (const role of [staffRole, managementRole, iaRole].filter(Boolean)) {
    permissionOverwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${ticketId.toLowerCase()}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
    reason: `Create ticket ${ticketId}`,
  });

  const record = {
    ticketId,
    channelId: channel.id,
    guildId: guild.id,
    openedByUserId: interaction.user.id,
    openedByTag: interaction.user.tag,
    targetUserId: targetUser.id,
    targetTag: targetUser.tag,
    status: "Open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tickets.push(record);
  writeTickets(tickets);
  return { channel, ticket: record };
}

module.exports = {
  createTicketChannel,
  findTicketByChannelId,
  readTickets,
};
