const crypto = require("node:crypto");
const { readStore, writeStore } = require("./json-store");

const storeName = "giveaways.json";

function readGiveaways() {
  return readStore(storeName, []);
}

function writeGiveaways(giveaways) {
  writeStore(storeName, giveaways);
}

function nextGiveawayId(giveaways) {
  return `G-${String(giveaways.length + 1).padStart(4, "0")}`;
}

function parseDuration(input) {
  if (!input) {
    return null;
  }

  const match = input.trim().toLowerCase().match(/^(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const minutes = unit.startsWith("m")
    ? amount
    : unit.startsWith("h")
      ? amount * 60
      : amount * 60 * 24;

  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function createGiveaway({
  prize,
  winnerCount = 1,
  requirements = null,
  endsAt = null,
  requireVerified = true,
  hostUser,
  channelId = null,
}) {
  const giveaways = readGiveaways();
  const giveawayId = nextGiveawayId(giveaways);
  const record = {
    giveawayId,
    prize,
    winnerCount,
    requirements,
    endsAt,
    requireVerified,
    hostUserId: hostUser.id,
    hostTag: hostUser.tag,
    channelId,
    messageId: null,
    status: "Open",
    entries: [],
    winners: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    endedAt: null,
  };

  giveaways.push(record);
  writeGiveaways(giveaways);
  return record;
}

function updateGiveaway(giveawayId, patch) {
  const giveaways = readGiveaways();
  const giveaway = giveaways.find((entry) => entry.giveawayId === giveawayId);
  if (!giveaway) {
    return null;
  }

  Object.assign(giveaway, patch, { updatedAt: new Date().toISOString() });
  writeGiveaways(giveaways);
  return giveaway;
}

function findGiveaway(giveawayId) {
  return readGiveaways().find((giveaway) => giveaway.giveawayId === giveawayId) || null;
}

function enterGiveaway(giveawayId, user) {
  const giveaway = findGiveaway(giveawayId);
  if (!giveaway) {
    return { ok: false, reason: "missing" };
  }

  if (giveaway.status !== "Open") {
    return { ok: false, reason: "ended", giveaway };
  }

  if (giveaway.entries.includes(user.id)) {
    return { ok: true, alreadyEntered: true, giveaway };
  }

  giveaway.entries.push(user.id);
  giveaway.updatedAt = new Date().toISOString();
  updateGiveaway(giveawayId, { entries: giveaway.entries });
  return { ok: true, alreadyEntered: false, giveaway: findGiveaway(giveawayId) };
}

function drawWinners(giveaway, count = giveaway.winnerCount) {
  const pool = [...new Set(giveaway.entries)];
  const winners = [];
  const target = Math.min(count, pool.length);

  while (winners.length < target) {
    const index = crypto.randomInt(pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }

  return winners;
}

function endGiveaway(giveawayId) {
  const giveaway = findGiveaway(giveawayId);
  if (!giveaway) {
    return { ok: false, reason: "missing" };
  }

  if (giveaway.status !== "Open") {
    return { ok: false, reason: "ended", giveaway };
  }

  const winners = drawWinners(giveaway);
  const updated = updateGiveaway(giveawayId, {
    status: "Ended",
    winners,
    endedAt: new Date().toISOString(),
  });

  return { ok: true, giveaway: updated };
}

function rerollGiveaway(giveawayId, count = 1) {
  const giveaway = findGiveaway(giveawayId);
  if (!giveaway) {
    return { ok: false, reason: "missing" };
  }

  const previous = new Set(giveaway.winners || []);
  const pool = giveaway.entries.filter((userId) => !previous.has(userId));
  const winners = drawWinners({ ...giveaway, entries: pool, winnerCount: count }, count);
  const updated = updateGiveaway(giveawayId, {
    winners: [...(giveaway.winners || []), ...winners],
  });

  return { ok: true, giveaway: updated, winners };
}

module.exports = {
  createGiveaway,
  endGiveaway,
  enterGiveaway,
  findGiveaway,
  parseDuration,
  readGiveaways,
  rerollGiveaway,
  updateGiveaway,
};
