const DEFAULT_BASE_URL = "https://api.erlc.gg";
const MAX_COMMAND_LENGTH = 120;

function erlcApiBaseUrl() {
  return (process.env.ERLC_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function erlcHeaders(hasBody = false) {
  const headers = {
    Accept: "application/json",
  };

  if (process.env.ERLC_API_KEY) {
    headers["server-key"] = process.env.ERLC_API_KEY;
  }

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function normalizeCommand(command) {
  const value = String(command || "").trim();
  if (!value) {
    throw new Error("Command is required.");
  }

  if (!value.startsWith(":") && !value.startsWith(";")) {
    throw new Error("ER:LC commands must start with : or ;");
  }

  if (value.length > MAX_COMMAND_LENGTH) {
    throw new Error(`ER:LC commands must stay under ${MAX_COMMAND_LENGTH} characters.`);
  }

  return value;
}

async function requestErlc(pathname, options = {}) {
  if (!process.env.ERLC_API_KEY) {
    throw new Error("ERLC_API_KEY is missing.");
  }

  const body = options.body ? JSON.stringify(options.body) : undefined;
  const response = await fetch(`${erlcApiBaseUrl()}${pathname}`, {
    method: options.method || "GET",
    headers: erlcHeaders(Boolean(body)),
    body,
  });

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message || data?.error || `ER:LC API returned HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return {
    data,
    status: response.status,
  };
}

async function sendErlcCommand(command) {
  const normalized = normalizeCommand(command);
  return requestErlc("/v1/server/command", {
    method: "POST",
    body: { command: normalized },
  });
}

async function fetchModCalls() {
  const response = await requestErlc("/v1/server/modcalls");
  return Array.isArray(response.data) ? response.data : [];
}

function parsePlayerLabel(label) {
  if (!label) {
    return {
      raw: null,
      username: null,
      robloxUserId: null,
    };
  }

  const raw = String(label);
  const [username, robloxUserId] = raw.split(":");

  return {
    raw,
    username: username || raw,
    robloxUserId: robloxUserId || null,
  };
}

function normalizeModCallEntry(entry) {
  const caller = parsePlayerLabel(entry?.Caller);
  const moderator = entry?.Moderator ? parsePlayerLabel(entry.Moderator) : null;
  const timestamp = Number(entry?.Timestamp || Date.now());

  return {
    sourceKey: `${timestamp}:${caller.raw || "unknown"}`,
    timestamp,
    callerRaw: caller.raw,
    callerUsername: caller.username,
    callerRobloxUserId: caller.robloxUserId,
    moderatorRaw: moderator?.raw || null,
    moderatorUsername: moderator?.username || null,
    moderatorRobloxUserId: moderator?.robloxUserId || null,
    raw: entry,
  };
}

function buildTeleportCommand(responderRobloxUserId, callerRobloxUserId) {
  if (!responderRobloxUserId || !callerRobloxUserId) {
    throw new Error("Both Roblox user IDs are required to respond.");
  }

  return `:tp ${responderRobloxUserId} ${callerRobloxUserId}`;
}

module.exports = {
  buildTeleportCommand,
  fetchModCalls,
  normalizeCommand,
  normalizeModCallEntry,
  requestErlc,
  sendErlcCommand,
};
