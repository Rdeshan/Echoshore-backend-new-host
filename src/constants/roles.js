const ROLES = {
  VOLUNTEER: 'volunteer',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  AGENT: 'agent',
};

const ROLE_HIERARCHY = {
  [ROLES.AGENT]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.ORGANIZER]: 2,
  [ROLES.VOLUNTEER]: 1,
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
};
