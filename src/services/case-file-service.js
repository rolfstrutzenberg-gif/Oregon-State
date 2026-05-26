const { readStore, writeStore } = require("./json-store");

const caseFilesStore = "case-files.json";
const incidentsStore = "incidents.json";
const accessRequestsStore = "case-access-requests.json";

function nextId(prefix, records) {
  return `${prefix}-${String(records.length + 1).padStart(4, "0")}`;
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
    robloxUserId: null,
    robloxUsername: null,
    incidentIds: [],
    createdAt: now,
    updatedAt: now,
  };

  caseFiles.push(record);
  writeCaseFiles(caseFiles);
  return record;
}

function addIncident({ targetUser, moderatorUser, type, reason, evidence = null, ticketId = null }) {
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
    status: "Open",
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

function createAccessRequest({ ticketId, ticketChannelId, targetUser, requesterUser, reason }) {
  ensureCaseFile(targetUser);
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
  readAccessRequests,
  readCaseFiles,
  readIncidents,
  updateAccessRequest,
};
