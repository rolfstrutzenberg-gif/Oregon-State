const crypto = require("node:crypto");
const { readStore, writeStore } = require("./json-store");

const storeName = "verification-audit.json";

function readVerificationAudit() {
  return readStore(storeName, []);
}

function appendVerificationAuditEvent(event) {
  const records = readVerificationAudit();
  const record = {
    auditId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    ...event,
  };

  records.push(record);
  writeStore(storeName, records);
  return record;
}

module.exports = {
  appendVerificationAuditEvent,
  readVerificationAudit,
};
