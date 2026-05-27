const crypto = require("node:crypto");
const { readStore, writeStore } = require("./json-store");

const storeName = "erlc.json";

function defaultStore() {
  return {
    commands: [],
    modCalls: [],
  };
}

function readErlcStore() {
  const store = readStore(storeName, defaultStore());
  return {
    commands: Array.isArray(store.commands) ? store.commands : [],
    modCalls: Array.isArray(store.modCalls) ? store.modCalls : [],
  };
}

function writeErlcStore(store) {
  writeStore(storeName, {
    commands: store.commands || [],
    modCalls: store.modCalls || [],
  });
}

function nextId(prefix, records) {
  return `${prefix}-${String(records.length + 1).padStart(4, "0")}`;
}

function modCallId(sourceKey) {
  const hash = crypto.createHash("sha1").update(sourceKey).digest("hex").slice(0, 10).toUpperCase();
  return `MC-${hash}`;
}

function recordCommandLog(entry) {
  const store = readErlcStore();
  const record = {
    commandId: nextId("CMD", store.commands),
    command: entry.command,
    status: entry.status || "Sent",
    apiStatus: entry.apiStatus || null,
    error: entry.error || null,
    reason: entry.reason || null,
    source: entry.source || "Dashboard",
    modCallId: entry.modCallId || null,
    actorUserId: entry.actorUser?.id || entry.actorUserId || null,
    actorTag: entry.actorUser?.tag || entry.actorTag || null,
    createdAt: new Date().toISOString(),
  };

  store.commands.push(record);
  writeErlcStore(store);
  return record;
}

function recentCommandLogs(limit = 10) {
  return readErlcStore().commands.slice(-limit).reverse();
}

function upsertModCalls(entries) {
  const store = readErlcStore();
  const existingKeys = new Set(store.modCalls.map((call) => call.sourceKey));
  const created = [];

  for (const entry of entries) {
    if (!entry.sourceKey || existingKeys.has(entry.sourceKey)) {
      continue;
    }

    const call = {
      modCallId: modCallId(entry.sourceKey),
      sourceKey: entry.sourceKey,
      status: "Pending",
      callerRaw: entry.callerRaw,
      callerUsername: entry.callerUsername,
      callerRobloxUserId: entry.callerRobloxUserId,
      moderatorRaw: entry.moderatorRaw,
      moderatorUsername: entry.moderatorUsername,
      moderatorRobloxUserId: entry.moderatorRobloxUserId,
      timestamp: entry.timestamp,
      receivedAt: new Date().toISOString(),
      relayedAt: null,
      relayChannelId: null,
      relayMessageId: null,
      responderDiscordUserId: null,
      responderDiscordTag: null,
      responderRobloxUserId: null,
      responseCommand: null,
      respondedAt: null,
      raw: entry.raw,
    };

    existingKeys.add(entry.sourceKey);
    store.modCalls.push(call);
    created.push(call);
  }

  if (created.length > 0) {
    writeErlcStore(store);
  }

  return created;
}

function updateModCall(modCallIdValue, patch) {
  const store = readErlcStore();
  let updated = null;

  store.modCalls = store.modCalls.map((call) => {
    if (call.modCallId !== modCallIdValue) {
      return call;
    }

    updated = {
      ...call,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  if (updated) {
    writeErlcStore(store);
  }

  return updated;
}

function findModCall(modCallIdValue) {
  return readErlcStore().modCalls.find((call) => call.modCallId === modCallIdValue) || null;
}

function pendingModCalls(limit = 10) {
  return readErlcStore()
    .modCalls
    .filter((call) => call.status === "Pending")
    .slice(-limit)
    .reverse();
}

module.exports = {
  findModCall,
  pendingModCalls,
  readErlcStore,
  recentCommandLogs,
  recordCommandLog,
  updateModCall,
  upsertModCalls,
};
