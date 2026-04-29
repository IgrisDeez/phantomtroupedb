export const ROLES = {
  guest: "guest",
  member: "member",
  officer: "officer"
};

export const ROLE_STORAGE_KEY = "phantom-troupe-guild-tracker:dev-role";

export const ROLE_TABS = {
  [ROLES.guest]: ["overview", "leaders", "upgrades", "contributions"],
  [ROLES.member]: ["overview", "leaders", "upgrades", "contributions"],
  [ROLES.officer]: ["overview", "snapshots", "members", "analytics", "leaders", "upgrades", "settings"]
};

export function normalizeRole(role) {
  return Object.values(ROLES).includes(role) ? role : ROLES.guest;
}

export function loadRole() {
  try {
    return normalizeRole(localStorage.getItem(ROLE_STORAGE_KEY));
  } catch {
    return ROLES.guest;
  }
}

export function saveRole(role) {
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, normalizeRole(role));
  } catch {
    // Local development helper only; ignore storage failures.
  }
}

export function getAllowedTabs(role) {
  return ROLE_TABS[normalizeRole(role)] || ROLE_TABS[ROLES.guest];
}

export function canAccessTab(role, tabId) {
  return getAllowedTabs(role).includes(tabId);
}

export function isOfficer(role) {
  return normalizeRole(role) === ROLES.officer;
}
