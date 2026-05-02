export const ACTIVITY_LOG_KEY = "phantom-troupe-guild-tracker:activity-log:v1";
const MAX_ACTIVITY_ITEMS = 150;

export function loadActivityLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordActivity(action, details = {}) {
  if (!action) return [];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    details: sanitizeDetails(details)
  };
  const nextLog = [entry, ...loadActivityLog()].slice(0, MAX_ACTIVITY_ITEMS);
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(nextLog));
  } catch {
    // Best-effort local audit trail. Never block the app if storage is full/unavailable.
  }
  return nextLog;
}

export function clearActivityLog() {
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch {
    // Ignore localStorage failures.
  }
  return [];
}

export function exportActivityLog() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Phantom Troupe Guild Tracker",
      version: 1,
      activityLog: loadActivityLog()
    },
    null,
    2
  );
}

function sanitizeDetails(details) {
  if (!details || typeof details !== "object") return {};
  return Object.fromEntries(
    Object.entries(details)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sanitizeValue(value)])
  );
}

function sanitizeValue(value) {
  if (value === null) return null;
  if (["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, childValue]) => [key, sanitizeValue(childValue)]));
  }
  return String(value);
}
