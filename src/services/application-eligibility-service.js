const { findCaseFile } = require("./case-file-service");

function canApply(userId) {
  const caseFile = findCaseFile(userId);
  const flags = caseFile?.flags || [];

  return {
    allowed: !flags.includes("Blacklist"),
    caseFile,
    reason: flags.includes("Blacklist")
      ? "This member has a blacklist flag on their case file."
      : null,
  };
}

module.exports = {
  canApply,
};
