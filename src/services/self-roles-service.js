const { loadSelfRolesConfig } = require("./self-roles-config");

function getSelfRoleOptionsMap() {
  const config = loadSelfRolesConfig();
  return new Map(config.options.map((option) => [option.value, option]));
}

function findGuildRoleByName(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName) || null;
}

async function syncMemberSelfRoles(member, selectedValues) {
  const optionMap = getSelfRoleOptionsMap();
  const selectedSet = new Set(selectedValues);
  const rolesToAdd = [];
  const rolesToRemove = [];

  for (const [value, option] of optionMap.entries()) {
    const role = findGuildRoleByName(member.guild, option.roleName);
    if (!role) {
      continue;
    }

    const hasRole = member.roles.cache.has(role.id);
    const shouldHaveRole = selectedSet.has(value);

    if (shouldHaveRole && !hasRole) {
      rolesToAdd.push(role);
    }

    if (!shouldHaveRole && hasRole) {
      rolesToRemove.push(role);
    }
  }

  for (const role of rolesToAdd) {
    await member.roles.add(role, "Self-role selection");
  }

  for (const role of rolesToRemove) {
    await member.roles.remove(role, "Self-role selection");
  }

  return {
    added: rolesToAdd.map((role) => role.name),
    removed: rolesToRemove.map((role) => role.name),
  };
}

module.exports = {
  syncMemberSelfRoles,
};
