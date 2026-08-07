const { readStore, writeStore } = require("./json-store");

const storeName = "staff-applications.json";

function readStaffApplications() {
  return readStore(storeName, []);
}

function writeStaffApplications(applications) {
  writeStore(storeName, applications);
}

function nextApplicationId(applications) {
  return `SA-${String(applications.length + 1).padStart(4, "0")}`;
}

function findStaffApplication(applicationId) {
  return readStaffApplications().find((application) => application.applicationId === applicationId) || null;
}

function findPendingApplicationByUserId(userId) {
  return readStaffApplications().find(
    (application) => application.discordUserId === userId && application.status === "Pending",
  ) || null;
}

function createStaffApplication({ user, answers }) {
  const applications = readStaffApplications();
  const record = {
    applicationId: nextApplicationId(applications),
    discordUserId: user.id,
    discordTag: user.tag,
    robloxUsername: answers.robloxUsername,
    availability: answers.availability,
    motivation: answers.motivation,
    experience: answers.experience,
    scenario: answers.scenario,
    status: "Pending",
    reviewedByUserId: null,
    reviewedByTag: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  applications.push(record);
  writeStaffApplications(applications);
  return record;
}

function updateStaffApplication(applicationId, patch) {
  const applications = readStaffApplications();
  const application = applications.find((entry) => entry.applicationId === applicationId);
  if (!application) {
    return null;
  }

  Object.assign(application, patch, { updatedAt: new Date().toISOString() });
  writeStaffApplications(applications);
  return application;
}

module.exports = {
  createStaffApplication,
  findPendingApplicationByUserId,
  findStaffApplication,
  readStaffApplications,
  updateStaffApplication,
};
