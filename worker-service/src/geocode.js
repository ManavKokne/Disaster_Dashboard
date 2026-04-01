const GEOCODE_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PG_UNDEFINED_COLUMN_ERROR_CODE = "42703";
const COLUMN_CACHE_TTL_MS = 60_000;

let tweetsColumnsCache;
let tweetsColumnsCachedAt = 0;

function isUndefinedColumnError(error) {
  return error?.code === PG_UNDEFINED_COLUMN_ERROR_CODE;
}

function hasColumn(columns, name) {
  return columns.has(name.toLowerCase());
}

async function getTweetsColumns(pool) {
  const now = Date.now();
  if (tweetsColumnsCache && now - tweetsColumnsCachedAt <= COLUMN_CACHE_TTL_MS) {
    return tweetsColumnsCache;
  }

  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'tweets'
  `;

  const { rows } = await pool.query(query);
  if (!rows.length) {
    throw new Error("tweets table not found in the active PostgreSQL schema");
  }

  tweetsColumnsCache = new Set(rows.map((row) => String(row.column_name || "").toLowerCase()));
  tweetsColumnsCachedAt = now;
  return tweetsColumnsCache;
}

export function parseAttemptCount(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized || normalized === "pending" || normalized === "done") return 0;
  if (normalized === "failed") return 1;

  const match = normalized.match(/^failed_(\d+)$/);
  if (match) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  if (normalized.startsWith("failed")) return 1;
  return 0;
}

function toFailedStatus(attempt) {
  if (attempt <= 1) return "failed";
  return `failed_${attempt}`;
}

function resolveAttemptCount(row, columns) {
  if (hasColumn(columns, "geocode_attempts")) {
    const parsed = Number(row.geocode_attempts);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  if (hasColumn(columns, "geocode_status")) {
    return parseAttemptCount(row.geocode_status);
  }

  return 0;
}

function getGeocodingApiKey() {
  return process.env.GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export async function geocodeLocationWithGoogle(location, options = {}) {
  const apiKey = options.apiKey || getGeocodingApiKey();
  const region = options.region || process.env.GEOCODE_REGION || "in";
  const requestTimeoutMs = Math.max(1000, Number(options.requestTimeoutMs) || 10_000);

  if (!location || !String(location).trim()) return null;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_GEOCODING_API_KEY is required for geocoding");
  }

  const params = new URLSearchParams({
    address: String(location).trim(),
    key: apiKey,
    region,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${GEOCODE_API_URL}?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoding API failed with status ${response.status}`);
    }

    const payload = await response.json();
    const status = String(payload?.status || "").toUpperCase();

    if (status === "ZERO_RESULTS") {
      return null;
    }

    if (status && status !== "OK") {
      throw new Error(`Geocoding API returned status ${status}`);
    }

    const locationPoint = payload?.results?.[0]?.geometry?.location;
    if (!locationPoint) return null;

    const latitude = Number(locationPoint.lat);
    const longitude = Number(locationPoint.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPendingRows(pool, columns, { limit, retryFailed }) {
  const selectFields = ["id", "location"];
  if (hasColumn(columns, "geocode_status")) selectFields.push("geocode_status");
  if (hasColumn(columns, "geocode_attempts")) selectFields.push("geocode_attempts");

  const statusCondition = hasColumn(columns, "geocode_status")
    ? retryFailed
      ? "AND (geocode_status = 'pending' OR geocode_status LIKE 'failed%')"
      : "AND geocode_status = 'pending'"
    : "";

  const query = `
    SELECT ${selectFields.join(", ")}
    FROM tweets
    WHERE location IS NOT NULL
      AND BTRIM(location) <> ''
      AND latitude IS NULL
      ${statusCondition}
    ORDER BY id ASC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [limit]);
  return rows;
}

async function markGeocodeSuccess(pool, columns, row, coords, attemptCount) {
  const updates = ["latitude = $1", "longitude = $2"];
  const values = [coords.latitude, coords.longitude];

  if (hasColumn(columns, "geocode_status")) {
    values.push("done");
    updates.push(`geocode_status = $${values.length}`);
  }

  if (hasColumn(columns, "geocode_attempts")) {
    values.push(attemptCount);
    updates.push(`geocode_attempts = $${values.length}`);
  }

  if (hasColumn(columns, "geocoded_at")) {
    updates.push("geocoded_at = NOW()");
  }

  if (hasColumn(columns, "geocode_last_attempt_at")) {
    updates.push("geocode_last_attempt_at = NOW()");
  }

  if (hasColumn(columns, "geocode_error")) {
    updates.push("geocode_error = NULL");
  }

  if (hasColumn(columns, "updated_at")) {
    updates.push("updated_at = NOW()");
  }

  values.push(row.id);

  const query = `
    UPDATE tweets
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
  `;

  await pool.query(query, values);
}

async function markGeocodeFailure(pool, columns, row, attemptCount, reason) {
  const updates = [];
  const values = [];

  if (hasColumn(columns, "geocode_status")) {
    values.push(toFailedStatus(attemptCount));
    updates.push(`geocode_status = $${values.length}`);
  }

  if (hasColumn(columns, "geocode_attempts")) {
    values.push(attemptCount);
    updates.push(`geocode_attempts = $${values.length}`);
  }

  if (hasColumn(columns, "geocode_last_attempt_at")) {
    updates.push("geocode_last_attempt_at = NOW()");
  }

  if (hasColumn(columns, "geocode_error")) {
    values.push(String(reason || "Geocoding failed").slice(0, 500));
    updates.push(`geocode_error = $${values.length}`);
  }

  if (hasColumn(columns, "updated_at")) {
    updates.push("updated_at = NOW()");
  }

  if (!updates.length) return;

  values.push(row.id);

  const query = `
    UPDATE tweets
    SET ${updates.join(", ")}
    WHERE id = $${values.length}
  `;

  await pool.query(query, values);
}

export async function processGeocodeBatch({
  pool,
  limit = 10,
  retryFailed = true,
  maxAttempts = 3,
  requestTimeoutMs = 10_000,
  region = "in",
} = {}) {
  if (!pool) {
    throw new Error("processGeocodeBatch requires a PostgreSQL pool");
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const safeMaxAttempts = Math.max(1, Math.min(Number(maxAttempts) || 3, 20));

  const columns = await getTweetsColumns(pool);

  let rows;
  try {
    rows = await fetchPendingRows(pool, columns, {
      limit: safeLimit,
      retryFailed,
    });
  } catch (error) {
    if (isUndefinedColumnError(error)) {
      throw new Error(
        "Missing required geocoding columns. Ensure tweets has latitude, location, and geocode_status."
      );
    }

    throw error;
  }

  const eligibleRows = rows
    .filter((row) => resolveAttemptCount(row, columns) < safeMaxAttempts)
    .slice(0, safeLimit);

  let processed = 0;
  let geocoded = 0;
  let failed = 0;

  for (const row of eligibleRows) {
    processed += 1;

    const currentAttempt = resolveAttemptCount(row, columns);
    const nextAttempt = currentAttempt + 1;

    try {
      const coords = await geocodeLocationWithGoogle(row.location, {
        requestTimeoutMs,
        region,
      });

      if (coords) {
        await markGeocodeSuccess(pool, columns, row, coords, nextAttempt);
        geocoded += 1;
      } else {
        await markGeocodeFailure(pool, columns, row, nextAttempt, "No geocode results");
        failed += 1;
      }
    } catch (error) {
      await markGeocodeFailure(pool, columns, row, nextAttempt, error.message);
      failed += 1;
    }
  }

  return {
    fetched: rows.length,
    eligible: eligibleRows.length,
    processed,
    geocoded,
    failed,
    retryFailed,
    maxAttempts: safeMaxAttempts,
    statusColumnEnabled: hasColumn(columns, "geocode_status"),
    attemptsColumnEnabled: hasColumn(columns, "geocode_attempts"),
  };
}
