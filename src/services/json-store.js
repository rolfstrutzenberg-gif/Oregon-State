const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(process.cwd(), "data");

function ensureStore(fileName, fallback) {
  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback, null, 2)}\n`);
  }

  return filePath;
}

function readStore(fileName, fallback = []) {
  const filePath = ensureStore(fileName, fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeStore(fileName, value) {
  const filePath = ensureStore(fileName, Array.isArray(value) ? [] : {});
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = {
  readStore,
  writeStore,
};
