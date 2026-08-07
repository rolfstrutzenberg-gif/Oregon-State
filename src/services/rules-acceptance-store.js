const { readStore, writeStore } = require("./json-store");

const storeName = "rules-acceptance.json";

function readAllAcceptances() {
  return readStore(storeName, []);
}

function writeAllAcceptances(records) {
  writeStore(storeName, records);
}

function findAcceptanceByDiscordUserId(discordUserId) {
  return readAllAcceptances().find((record) => record.discordUserId === discordUserId) || null;
}

function isAcceptanceComplete(record) {
  return Boolean(record && (!record.status || record.status === "complete"));
}

function saveAcceptance(record) {
  const records = readAllAcceptances();
  const nextRecords = records.filter((entry) => entry.discordUserId !== record.discordUserId);
  nextRecords.push(record);
  writeAllAcceptances(nextRecords);
  return record;
}

module.exports = {
  findAcceptanceByDiscordUserId,
  isAcceptanceComplete,
  readAllAcceptances,
  saveAcceptance,
};
