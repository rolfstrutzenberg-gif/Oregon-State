const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "verifications.json");

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, "[]\n");
  }
}

function readAllVerifications() {
  ensureStore();
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function writeAllVerifications(records) {
  ensureStore();
  fs.writeFileSync(storePath, `${JSON.stringify(records, null, 2)}\n`);
}

function findVerificationByDiscordUserId(discordUserId) {
  return readAllVerifications().find((record) => record.discordUserId === discordUserId) || null;
}

function saveVerification(record) {
  const records = readAllVerifications();
  const nextRecords = records.filter((entry) => entry.discordUserId !== record.discordUserId);
  nextRecords.push(record);
  writeAllVerifications(nextRecords);
  return record;
}

module.exports = {
  ensureStore,
  findVerificationByDiscordUserId,
  readAllVerifications,
  saveVerification,
};
