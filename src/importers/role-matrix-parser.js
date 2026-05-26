const fs = require("node:fs");
const path = require("node:path");
const { normalizePermissionList } = require("../utils/permission-map");

function parseYesNo(value) {
  return value.trim().toLowerCase() === "yes";
}

function parseRoleOrder(lines) {
  const roles = [];

  for (const line of lines) {
    const numberSeparatorIndex = line.indexOf(". ");
    const roleSeparatorIndex = line.indexOf(" — ");

    if (numberSeparatorIndex === -1 || roleSeparatorIndex === -1) {
      continue;
    }

    roles.push({
      name: line.slice(numberSeparatorIndex + 2, roleSeparatorIndex).trim(),
      colorName: line.slice(roleSeparatorIndex + 3).trim(),
    });
  }

  return roles;
}

function parseRoleBlocks(lines) {
  const specs = [];
  let currentSpec = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const roleStart = line.match(/^(\d+)\.\s+Role:\s+(.+)$/u);
    if (roleStart) {
      if (currentSpec) {
        specs.push(currentSpec);
      }

      currentSpec = {
        matrixIndex: Number(roleStart[1]),
        name: roleStart[2].trim(),
        permissions: [],
        notes: "",
      };
      continue;
    }

    if (!currentSpec) {
      continue;
    }

    const fieldMatch = line.match(/^(Color|Hoisted|Mentionable|Allowed Global Permissions|Notes):\s+(.+)$/u);
    if (!fieldMatch) {
      continue;
    }

    const [, fieldName, rawValue] = fieldMatch;

    if (fieldName === "Color") {
      const colorMatch = rawValue.match(/^(.*?)\s+\((#[0-9A-Fa-f]{6})\)$/u);
      currentSpec.colorName = colorMatch ? colorMatch[1].trim() : rawValue.trim();
      currentSpec.color = colorMatch ? colorMatch[2] : undefined;
      continue;
    }

    if (fieldName === "Hoisted") {
      currentSpec.hoist = parseYesNo(rawValue);
      continue;
    }

    if (fieldName === "Mentionable") {
      currentSpec.mentionable = parseYesNo(rawValue);
      continue;
    }

    if (fieldName === "Allowed Global Permissions") {
      currentSpec.permissions = normalizePermissionList(rawValue);
      continue;
    }

    if (fieldName === "Notes") {
      currentSpec.notes = rawValue.trim();
    }
  }

  if (currentSpec) {
    specs.push(currentSpec);
  }

  return specs;
}

function assignOccurrences(roles) {
  const counts = new Map();

  return roles.map((role) => {
    const nextOccurrence = (counts.get(role.name) || 0) + 1;
    counts.set(role.name, nextOccurrence);

    return {
      ...role,
      occurrence: nextOccurrence,
      key: `${role.name}::${nextOccurrence}`,
    };
  });
}

function parseRoleMatrixFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const lines = source.split(/\r?\n/);

  const orderStart = lines.findIndex((line) => line.trim() === "ROLE ORDER + COLOR NAMES");
  const matrixFormatStart = lines.findIndex((line) => line.trim() === "PERMISSION MATRIX FORMAT");
  const matrixStart = lines.findIndex((line) => line.trim() === "GLOBAL PERMISSION MATRIX");

  if (orderStart === -1 || matrixFormatStart === -1 || matrixStart === -1) {
    throw new Error("Matrix file is missing the role order section or the global permission matrix section.");
  }

  const orderRoles = assignOccurrences(parseRoleOrder(lines.slice(orderStart + 1, matrixFormatStart)));
  const matrixRoles = assignOccurrences(parseRoleBlocks(lines.slice(matrixStart + 1)));

  if (orderRoles.length !== matrixRoles.length) {
    throw new Error(
      `Role count mismatch between order list (${orderRoles.length}) and permission blocks (${matrixRoles.length}).`,
    );
  }

  const mergedRoles = orderRoles.map((orderedRole, index) => {
    const matrixRole = matrixRoles[index];

    if (orderedRole.name !== matrixRole.name || orderedRole.occurrence !== matrixRole.occurrence) {
      throw new Error(
        `Role order mismatch at index ${index + 1}: expected ${orderedRole.name}, found ${matrixRole.name}.`,
      );
    }

    return {
      ...matrixRole,
      orderIndex: index,
      colorNameFromOrder: orderedRole.colorName,
    };
  });

  return {
    roles: mergedRoles,
  };
}

module.exports = {
  parseRoleMatrixFile,
};
