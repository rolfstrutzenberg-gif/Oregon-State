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
  let value = String(command || "").trim();
  if (!value) {
    throw new Error("Command is required.");
  }

  if (value.startsWith("/")) {
    value = value.replace(/^\/+/, "");
  }

  if (!value.startsWith(":") && !value.startsWith(";")) {
    value = `:${value}`;
  }

  if (value.length > MAX_COMMAND_LENGTH) {
    throw new Error(`ER:LC commands must stay under ${MAX_COMMAND_LENGTH} characters.`);
  }

  const [commandName, ...args] = value.slice(1).trim().split(/\s+/);
  const lowerCommandName = commandName.toLowerCase();
  const commandsThatNeedText = new Set(["h", "hint", "m", "message", "pm"]);

  if (commandsThatNeedText.has(lowerCommandName) && args.join(" ").trim().length === 0) {
    throw new Error(`:${commandName} needs text after it.`);
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

async function fetchCommandLogs() {
  const response = await requestErlc("/v1/server/commandlogs");
  return Array.isArray(response.data) ? response.data : [];
}

async function findRecentRemoteCommand(command) {
  const normalized = normalizeCommand(command);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const logs = await fetchCommandLogs();

  return logs
    .slice()
    .reverse()
    .find((entry) =>
      entry?.Player === "Remote Server"
      && entry?.Command === normalized
      && Number(entry?.Timestamp || 0) >= nowSeconds - 120
    ) || null;
}

async function fetchModCalls() {
  const response = await requestErlc("/v2/server?ModCalls=true");
  return Array.isArray(response.data?.ModCalls) ? response.data.ModCalls : [];
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

function isRobloxUserId(value) {
  return /^\d+$/.test(String(value || ""));
}

function buildTeleportCommand(responder, caller) {
  if (!isRobloxUserId(responder?.robloxUserId) || !isRobloxUserId(caller?.robloxUserId)) {
    throw new Error("Both Roblox user IDs must be verified before responding.");
  }

  if (!responder?.username || !caller?.username) {
    throw new Error("Both Roblox usernames are required to build the teleport command.");
  }

  return `:tp ${responder.username} ${caller.username}`;
}

module.exports = {
  buildTeleportCommand,
  fetchCommandLogs,
  fetchModCalls,
  findRecentRemoteCommand,
  isRobloxUserId,
  normalizeCommand,
  normalizeModCallEntry,
  requestErlc,
  sendErlcCommand,
};
