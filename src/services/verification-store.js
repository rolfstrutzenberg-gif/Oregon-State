const { readStore, writeStore } = require("./json-store");

const storeName = "verifications.json";

function readAllVerifications() {
  return readStore(storeName, []);
}

function writeAllVerifications(records) {
  writeStore(storeName, records);
}

function findVerificationByDiscordUserId(discordUserId) {
  return readAllVerifications().find((record) => record.discordUserId === discordUserId) || null;
}

function findVerificationByRobloxUserId(robloxUserId) {
  return readAllVerifications().find(
    (record) => String(record.robloxUserId) === String(robloxUserId),
  ) || null;
}

function saveVerification(record) {
  const records = readAllVerifications();
  const nextRecords = records.filter((entry) => entry.discordUserId !== record.discordUserId);
  nextRecords.push(record);
  writeAllVerifications(nextRecords);
  return record;
}

function updateVerificationByDiscordUserId(discordUserId, patch) {
  const records = readAllVerifications();
  const index = records.findIndex((entry) => entry.discordUserId === discordUserId);
  if (index === -1) {
    return null;
  }

  records[index] = {
    ...records[index],
    ...patch,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
  writeAllVerifications(records);
  return records[index];
}

module.exports = {
  findVerificationByDiscordUserId,
  findVerificationByRobloxUserId,
  readAllVerifications,
  saveVerification,
  updateVerificationByDiscordUserId,
};
