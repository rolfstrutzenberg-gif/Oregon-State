const { readStore, writeStore } = require("./json-store");

const sessionsStore = "sessions.json";

function defaultStore() {
  return {
    active: null,
    history: [],
    votes: [],
    api: {
      lastPollAt: null,
      lastSnapshot: null,
      lastError: null,
    },
  };
}

function readSessionsStore() {
  const store = readStore(sessionsStore, defaultStore());
  return {
    ...defaultStore(),
    ...store,
    history: store.history || [],
    votes: store.votes || [],
    api: {
      ...defaultStore().api,
      ...(store.api || {}),
    },
  };
}

function writeSessionsStore(store) {
  writeStore(sessionsStore, {
    ...defaultStore(),
    ...store,
  });
}

function nextId(prefix, records) {
  return `${prefix}-${String(records.length + 1).padStart(4, "0")}`;
}

function getActiveSession() {
  return readSessionsStore().active;
}

function openSession({ hostUser, notes = null, joinUrl = null, pingRoleId = null, source = "manual" }) {
  const store = readSessionsStore();
  const now = new Date().toISOString();

  if (store.active) {
    return {
      created: false,
      session: store.active,
    };
  }

  const session = {
    sessionId: nextId("SES", store.history),
    status: "Open",
    hostUserId: hostUser.id,
    hostTag: hostUser.tag,
    notes,
    joinUrl,
    pingRoleId,
    source,
    openedAt: now,
    closedAt: null,
    closedByUserId: null,
    closedByTag: null,
    closeNotes: null,
    apiSnapshot: null,
    createdAt: now,
    updatedAt: now,
  };

  store.active = session;
  store.history.push(session);
  writeSessionsStore(store);

  return {
    created: true,
    session,
  };
}

function closeSession({ closedByUser, notes = null }) {
  const store = readSessionsStore();
  if (!store.active) {
    return null;
  }

  const now = new Date().toISOString();
  const closed = {
    ...store.active,
    status: "Closed",
    closedAt: now,
    closedByUserId: closedByUser.id,
    closedByTag: closedByUser.tag,
    closeNotes: notes,
    updatedAt: now,
  };

  store.active = null;
  store.history = store.history.map((session) =>
    session.sessionId === closed.sessionId ? closed : session,
  );

  writeSessionsStore(store);
  return closed;
}

function createSessionVote({ hostUser, notes = null }) {
  const store = readSessionsStore();
  const now = new Date().toISOString();
  const vote = {
    voteId: nextId("SV", store.votes),
    status: "Open",
    hostUserId: hostUser.id,
    hostTag: hostUser.tag,
    notes,
    interestedUserIds: [],
    createdAt: now,
    updatedAt: now,
  };

  store.votes.push(vote);
  writeSessionsStore(store);
  return vote;
}

function findSessionVote(voteId) {
  return readSessionsStore().votes.find((vote) => vote.voteId === voteId) || null;
}

function updateSessionVote(voteId, updater) {
  const store = readSessionsStore();
  const vote = store.votes.find((entry) => entry.voteId === voteId);
  if (!vote) {
    return null;
  }

  updater(vote);
  vote.updatedAt = new Date().toISOString();
  writeSessionsStore(store);
  return vote;
}

function addVoteInterest(voteId, userId) {
  return updateSessionVote(voteId, (vote) => {
    if (!vote.interestedUserIds.includes(userId)) {
      vote.interestedUserIds.push(userId);
    }
  });
}

function removeVoteInterest(voteId, userId) {
  return updateSessionVote(voteId, (vote) => {
    vote.interestedUserIds = vote.interestedUserIds.filter((id) => id !== userId);
  });
}

function updateSessionApiSnapshot(snapshot) {
  const store = readSessionsStore();
  const now = new Date().toISOString();

  store.api = {
    lastPollAt: now,
    lastSnapshot: snapshot,
    lastError: null,
  };

  if (store.active) {
    store.active.apiSnapshot = snapshot;
    store.active.updatedAt = now;
    store.history = store.history.map((session) =>
      session.sessionId === store.active.sessionId ? store.active : session,
    );
  }

  writeSessionsStore(store);
  return store.active;
}

function recordSessionApiError(errorMessage) {
  const store = readSessionsStore();
  store.api = {
    ...(store.api || {}),
    lastPollAt: new Date().toISOString(),
    lastError: errorMessage,
  };
  writeSessionsStore(store);
}

function recentSessions(limit = 8) {
  return readSessionsStore()
    .history
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit);
}

module.exports = {
  addVoteInterest,
  closeSession,
  createSessionVote,
  findSessionVote,
  getActiveSession,
  openSession,
  readSessionsStore,
  recentSessions,
  recordSessionApiError,
  removeVoteInterest,
  updateSessionApiSnapshot,
};
