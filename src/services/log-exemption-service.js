function resolveTestingRole(guild) {
  if (process.env.TESTING_ROLE_ID) {
    return guild.roles.cache.get(process.env.TESTING_ROLE_ID) || null;
  }

  return guild.roles.cache.find((role) => role.name === "➟ Testing") || null;
}

function isLogExemptMember(member) {
  if (!member || !member.guild) {
    return false;
  }

  const testingRole = resolveTestingRole(member.guild);
  return Boolean(testingRole && member.roles.cache.has(testingRole.id));
}

async function isLogExemptUser(guild, userId) {
  await guild.roles.fetch().catch(() => null);
  const member = await guild.members.fetch(userId).catch(() => null);
  return isLogExemptMember(member);
}

module.exports = {
  isLogExemptMember,
  isLogExemptUser,
  resolveTestingRole,
};
