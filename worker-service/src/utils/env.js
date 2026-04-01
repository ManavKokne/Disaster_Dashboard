export function parseBooleanEnv(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

export function parseNumberEnv(value, { fallback, min, max } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  let resolved = parsed;
  if (Number.isFinite(min)) {
    resolved = Math.max(min, resolved);
  }
  if (Number.isFinite(max)) {
    resolved = Math.min(max, resolved);
  }

  return resolved;
}
