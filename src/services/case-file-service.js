const { readStore, writeStore } = require("./json-store");

const caseFilesStore = "case-files.json";
const incidentsStore = "incidents.json";
const accessRequestsStore = "case-access-requests.json";

function nextId(prefix, records) {
  return `${prefix}-${String(records.length + 1).padStart(4, "0")}`;
}

function formatCaseFileId(number) {
  return `CF-${String(number).padStart(4, "0")}`;
}

function readCaseFiles() {
  return readStore(caseFilesStore, []);
}

function writeCaseFiles(records) {
  writeStore(caseFilesStore, records);
}

function readIncidents() {
  return readStore(incidentsStore, []);
}

function writeIncidents(records) {
  writeStore(incidentsStore, records);
}

function readAccessRequests() {
  return readStore(accessRequestsStore, []);
}

function writeAccessRequests(records) {
  writeStore(accessRequestsStore, records);
}

function findCaseFile(userId) {
  return readCaseFiles().find((file) => file.userId === userId) || null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .replace(/[<@!>&]/g, "")
    .toLowerCase();
}

function searchCaseFiles(query, limit = 8) {
  const search = normalizeSearchText(query);
  if (!search) {
    return [];
  }

  return readCaseFiles()
    .filter((file) => {
      const fields = [
        file.caseFileId,
        file.userId,
        file.username,
        file.tag,
        file.displayName,
        file.robloxUserId,
        file.robloxUsername,
      ];

      return fields.some((field) => normalizeSearchText(field).includes(search));
    })
    .slice(0, limit);
}

function updateCaseFile(userId, patch) {
  const caseFiles = readCaseFiles();
  const caseFile = caseFiles.find((file) => file.userId === userId);
  if (!caseFile) {
    return null;
  }

  Object.assign(caseFile, patch, { updatedAt: new Date().toISOString() });
  writeCaseFiles(caseFiles);
  return caseFile;
}

function ensureCaseFile(user) {
  const caseFiles = readCaseFiles();
  const existing = caseFiles.find((file) => file.userId === user.id);
  const now = new Date().toISOString();

  if (existing) {
    existing.username = user.username;
    existing.tag = user.tag;
    existing.updatedAt = now;
    writeCaseFiles(caseFiles);
    return existing;
  }

  const record = {
    caseFileId: nextId("CF", caseFiles),
    userId: user.id,
    username: user.username,
    tag: user.tag,
    displayName: user.displayName || user.username,
    bot: Boolean(user.bot),
    mention: `<@${user.id}>`,
    robloxUserId: null,
    robloxUsername: null,
    status: "Clear",
    activeTicketId: null,
    activeInvestigationStartedAt: null,
    flags: [],
    incidentIds: [],
    createdAt: now,
    updatedAt: now,
  };

  caseFiles.push(record);
  writeCaseFiles(caseFiles);
  return record;
}

function syncCaseFilesFromMembers(members, priorityUserIds = []) {
  const existing = readCaseFiles();
  const byUserId = new Map(existing.map((file) => [file.userId, file]));
  const now = new Date().toISOString();
  const priority = new Map(priorityUserIds.map((userId, index) => [userId, index]));
  const orderedMembers = [...members.values()].sort((left, right) => {
    const leftPriority = priority.has(left.id) ? priority.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightPriority = priority.has(right.id) ? priority.get(right.id) : Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.user.username.localeCompare(right.user.username);
  });

  const synced = [];
  const nextCaseFileIdByUserId = new Map();

  orderedMembers.forEach((member, index) => {
    nextCaseFileIdByUserId.set(member.id, formatCaseFileId(index + 1));
  });

  for (const [index, member] of orderedMembers.entries()) {
    const existingFile = byUserId.get(member.id);
    const caseFileId = formatCaseFileId(index + 1);

    if (existingFile) {
      existingFile.caseFileId = caseFileId;
      existingFile.username = member.user.username;
      existingFile.tag = member.user.tag;
      existingFile.displayName = member.displayName;
      existingFile.bot = member.user.bot;
      existingFile.mention = `<@${member.id}>`;
      existingFile.status = existingFile.status || "Clear";
      existingFile.activeTicketId = existingFile.activeTicketId || null;
      existingFile.activeInvestigationStartedAt = existingFile.activeInvestigationStartedAt || null;
      existingFile.flags = existingFile.flags || [];
      existingFile.updatedAt = now;
      synced.push(existingFile);
      continue;
    }

    const record = {
      caseFileId,
      userId: member.id,
      username: member.user.username,
      tag: member.user.tag,
      displayName: member.displayName,
      bot: member.user.bot,
      mention: `<@${member.id}>`,
      robloxUserId: null,
      robloxUsername: null,
      status: "Clear",
      activeTicketId: null,
      activeInvestigationStartedAt: null,
      flags: [],
      incidentIds: [],
      createdAt: now,
      updatedAt: now,
    };

    existing.push(record);
    byUserId.set(member.id, record);
    synced.push(record);
  }

  const orderedUserIds = new Set(orderedMembers.map((member) => member.id));
  const retiredFiles = existing.filter((file) => !orderedUserIds.has(file.userId));
  const finalCaseFiles = [...synced, ...retiredFiles];
  const incidents = readIncidents();

  for (const incident of incidents) {
    const nextCaseFileId = nextCaseFileIdByUserId.get(incident.targetUserId);
    if (nextCaseFileId) {
      incident.caseFileId = nextCaseFileId;
      incident.updatedAt = now;
    }
  }

  writeCaseFiles(finalCaseFiles);
  writeIncidents(incidents);
  return synced;
}

function addIncident({ targetUser, moderatorUser, type, reason, evidence = null, ticketId = null, status = "Open" }) {
  const caseFile = ensureCaseFile(targetUser);
  const incidents = readIncidents();
  const now = new Date().toISOString();
  const incident = {
    incidentId: nextId("INC", incidents),
    caseFileId: caseFile.caseFileId,
    targetUserId: targetUser.id,
    targetTag: targetUser.tag,
    moderatorUserId: moderatorUser.id,
    moderatorTag: moderatorUser.tag,
    type,
    status,
    reason,
    evidence,
    ticketId,
    createdAt: now,
    updatedAt: now,
  };

  incidents.push(incident);
  writeIncidents(incidents);

  const caseFiles = readCaseFiles();
  const storedCaseFile = caseFiles.find((file) => file.caseFileId === caseFile.caseFileId);
  if (storedCaseFile && !storedCaseFile.incidentIds.includes(incident.incidentId)) {
    storedCaseFile.incidentIds.push(incident.incidentId);
    storedCaseFile.updatedAt = now;
    writeCaseFiles(caseFiles);
  }

  return incident;
}

function incidentsForUser(userId) {
  return readIncidents().filter((incident) => incident.targetUserId === userId);
}

function recentIncidents(limit = 10) {
  return readIncidents()
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
}

function pendingAccessRequests(limit = 10) {
  return readAccessRequests()
    .filter((request) => request.status === "Pending")
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
}

function createAccessRequest({ ticketId, ticketChannelId, targetUser, requesterUser, reason }) {
  const caseFile = ensureCaseFile(targetUser);
  const requests = readAccessRequests();
  const now = new Date().toISOString();
  const request = {
    requestId: nextId("CFR", requests),
    ticketId,
    ticketChannelId,
    targetUserId: targetUser.id,
    targetTag: targetUser.tag,
    requesterUserId: requesterUser.id,
    requesterTag: requesterUser.tag,
    reason,
    status: "Pending",
    approvedByUserId: null,
    approvedByTag: null,
    createdAt: now,
    updatedAt: now,
  };

  requests.push(request);
  writeAccessRequests(requests);
  updateCaseFile(targetUser.id, {
    status: "Under Investigation",
    activeTicketId: ticketId,
    activeInvestigationStartedAt: caseFile.activeInvestigationStartedAt || now,
  });
  return request;
}

function findAccessRequest(requestId) {
  return readAccessRequests().find((request) => request.requestId === requestId) || null;
}

function updateAccessRequest(requestId, patch) {
  const requests = readAccessRequests();
  const request = requests.find((entry) => entry.requestId === requestId);
  if (!request) {
    return null;
  }

  Object.assign(request, patch, { updatedAt: new Date().toISOString() });
  writeAccessRequests(requests);
  return request;
}

function hasApprovedAccess(ticketId, userId) {
  return readAccessRequests().some(
    (request) =>
      request.ticketId === ticketId &&
      request.requesterUserId === userId &&
      request.status === "Approved",
  );
}

module.exports = {
  addIncident,
  createAccessRequest,
  ensureCaseFile,
  findAccessRequest,
  findCaseFile,
  hasApprovedAccess,
  incidentsForUser,
  pendingAccessRequests,
  readAccessRequests,
  readCaseFiles,
  readIncidents,
  recentIncidents,
  searchCaseFiles,
  syncCaseFilesFromMembers,
  updateCaseFile,
  updateAccessRequest,
};
