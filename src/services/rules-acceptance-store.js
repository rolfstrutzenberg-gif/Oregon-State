const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "rules-acceptance.json");

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, "[]\n");
  }
}

function readAllAcceptances() {
  ensureStore();
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function writeAllAcceptances(records) {
  ensureStore();
  fs.writeFileSync(storePath, `${JSON.stringify(records, null, 2)}\n`);
}

function findAcceptanceByDiscordUserId(discordUserId) {
  return readAllAcceptances().find((record) => record.discordUserId === discordUserId) || null;
}

function saveAcceptance(record) {
  const records = readAllAcceptances();
  const nextRecords = records.filter((entry) => entry.discordUserId !== record.discordUserId);
  nextRecords.push(record);
  writeAllAcceptances(nextRecords);
  return record;
}

module.exports = {
  ensureStore,
  findAcceptanceByDiscordUserId,
  readAllAcceptances,
  saveAcceptance,
};
