const fs = require("node:fs");
const path = require("node:path");
const { normalizePermissionList } = require("../utils/permission-map");

function parseOverwriteField(text) {
  if (!text || text.trim() === "None") {
    return [];
  }

  if (text.includes("Administrator / bypasses channel overwrites")) {
    return [];
  }

  return normalizePermissionList(text);
}

function parseChannelOrder(lines) {
  const categories = [];
  let currentCategory = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      continue;
    }

    const categoryMatch = line.match(/^\d+\.\s+(━━\s*.+?\s*━━)$/u);
    if (categoryMatch) {
      currentCategory = {
        name: categoryMatch[1].trim(),
        channels: [],
      };
      categories.push(currentCategory);
      continue;
    }

    const channelMatch = line.match(/^\s+-\s+(.+)$/u);
    if (channelMatch && currentCategory) {
      currentCategory.channels.push(channelMatch[1].trim());
    }
  }

  return categories;
}

function parseCategoryBlocks(lines) {
  const categories = [];
  const tickets = [];
  let current = null;
  let currentOverwrite = null;
  let mode = "categories";

  function finalizeOverwrite() {
    if (current && currentOverwrite) {
      current.overwrites.push(currentOverwrite);
      currentOverwrite = null;
    }
  }

  function finalizeBlock() {
    finalizeOverwrite();
    if (current) {
      if (mode === "categories") {
        categories.push(current);
      } else {
        tickets.push(current);
      }
      current = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed === "DYNAMIC TICKET CHANNEL PERMISSIONS") {
      finalizeBlock();
      mode = "tickets";
      continue;
    }

    const categoryMatch = trimmed.match(/^CATEGORY:\s+(.+)$/u);
    if (categoryMatch) {
      finalizeBlock();
      current = {
        name: categoryMatch[1].trim(),
        purpose: "",
        channels: [],
        overwrites: [],
      };
      continue;
    }

    const ticketMatch = trimmed.match(/^(?:\d+\.\s+)?Ticket Type:\s+(.+)$/u);
    if (ticketMatch) {
      finalizeBlock();
      current = {
        name: ticketMatch[1].trim(),
        purpose: "",
        channels: [],
        overwrites: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const purposeMatch = trimmed.match(/^Purpose:\s+(.+)$/u);
    if (purposeMatch) {
      current.purpose = purposeMatch[1].trim();
      continue;
    }

    if (trimmed === "Channels:" || trimmed === "Category Permission Overwrites:" || trimmed === "Permission Overwrites:") {
      finalizeOverwrite();
      continue;
    }

    const channelMatch = trimmed.match(/^-\s+(.+)$/u);
    if (channelMatch && !trimmed.startsWith("- Role:")) {
      current.channels.push(channelMatch[1].trim());
      continue;
    }

    const roleMatch = trimmed.match(/^- Role:\s+(.+)$/u);
    if (roleMatch) {
      finalizeOverwrite();
      currentOverwrite = {
        roleName: roleMatch[1].trim(),
        allow: [],
        deny: [],
        notes: "",
      };
      continue;
    }

    if (!currentOverwrite) {
      continue;
    }

    const allowMatch = trimmed.match(/^Allow:\s+(.+)$/u);
    if (allowMatch) {
      currentOverwrite.allow = parseOverwriteField(allowMatch[1].trim());
      continue;
    }

    const denyMatch = trimmed.match(/^Deny:\s+(.+)$/u);
    if (denyMatch) {
      currentOverwrite.deny = parseOverwriteField(denyMatch[1].trim());
      continue;
    }

    const notesMatch = trimmed.match(/^Notes:\s+(.+)$/u);
    if (notesMatch) {
      currentOverwrite.notes = notesMatch[1].trim();
    }
  }

  finalizeBlock();

  return {
    categories,
    tickets,
  };
}

function parseChannelMatrixFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const lines = source.split(/\r?\n/);

  const orderStart = lines.findIndex((line) => line.trim() === "CHANNEL ORDER");
  const summaryStart = lines.findIndex((line) => line.trim() === "PERMISSION SET SUMMARY");
  const dynamicStart = lines.findIndex((line) => line.trim() === "DYNAMIC TICKET CHANNEL PERMISSIONS");

  if (orderStart === -1 || summaryStart === -1) {
    throw new Error("Channel matrix file is missing the channel order or permission summary section.");
  }

  const order = parseChannelOrder(lines.slice(orderStart + 1, summaryStart));
  const blocks = parseCategoryBlocks(lines.slice(summaryStart + 1, dynamicStart === -1 ? undefined : undefined));

  return {
    order,
    categories: blocks.categories,
    tickets: blocks.tickets,
  };
}

module.exports = {
  parseChannelMatrixFile,
};
