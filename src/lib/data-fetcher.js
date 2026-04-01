import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { Pool } from "pg";

const CSV_DIR = path.join(process.cwd(), "public");
const GEOCODE_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PG_UNDEFINED_COLUMN_ERROR_CODE = "42703";
let dbPool;

function isUndefinedColumnError(error) {
  return error?.code === PG_UNDEFINED_COLUMN_ERROR_CODE;
}

function getDbPool() {
  if (dbPool) return dbPool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  let ssl = { rejectUnauthorized: false };

  try {
    const parsedUrl = new URL(connectionString);
    const host = (parsedUrl.hostname || "").toLowerCase();
    const sslMode = (parsedUrl.searchParams.get("sslmode") || "").toLowerCase();
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (isLocalHost || sslMode === "disable") {
      ssl = false;
    }
  } catch {
    // Keep SSL enabled by default for hosted PostgreSQL providers.
  }

  dbPool = new Pool({
    connectionString,
    max: 10,
    ssl,
  });

  return dbPool;
}

function normalizeTweetRow(row) {
  const latitude = row.latitude == null ? null : Number(row.latitude);
  const longitude = row.longitude == null ? null : Number(row.longitude);
  const createdAt = row.created_at || null;
  const updatedAt = row.updated_at || null;

  return {
    id: row.id,
    tweet: row.tweet || row.content || "",
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: row.urgency || "non-urgent",
    is_resolved: Boolean(row.is_resolved),
    is_closed: Boolean(row.is_closed),
    is_acknowledged: Boolean(row.is_acknowledged),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    geocode_status: row.geocode_status || null,
    created_at: createdAt ? new Date(createdAt).toISOString() : null,
    updated_at: updatedAt ? new Date(updatedAt).toISOString() : null,
    resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
  };
}

function normalizeMarkerType(markerType) {
  const value = String(markerType || "all").trim().toLowerCase();
  if (["urgent", "non-urgent", "resolved", "all"].includes(value)) {
    return value;
  }
  return "all";
}

async function fetchTweetsFromSql({ since, includeClosed = false } = {}) {
  const pool = getDbPool();
  if (!pool) return null;

  await autoCloseResolvedTweets();

  const baseConditions = [];
  if (!includeClosed) {
    baseConditions.push("is_closed = FALSE");
  }
  const params = [];
  if (since) {
    params.push(since);
    baseConditions.push(`created_at > $${params.length}`);
  }

  const whereSql = baseConditions.length > 0 ? `WHERE ${baseConditions.join(" AND ")}` : "";

  const queries = [
    `
      SELECT
        id,
        content AS tweet,
        location,
        request_type,
        urgency,
        is_resolved,
        is_closed,
        is_acknowledged,
        latitude,
        longitude,
        geocode_status,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      FROM tweets
      ${whereSql}
      ORDER BY created_at ASC
    `,
    `
      SELECT
        id,
        tweet,
        location,
        request_type,
        urgency,
        is_resolved,
        is_closed,
        is_acknowledged,
        latitude,
        longitude,
        geocode_status,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      FROM tweets
      ${whereSql}
      ORDER BY created_at ASC
    `,
  ];

  let lastError = null;

  for (const query of queries) {
    try {
      const { rows } = await pool.query(query, params);
      return rows.map(normalizeTweetRow);
    } catch (error) {
      lastError = error;
      if (!isUndefinedColumnError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to fetch tweets");
}

export async function fetchTweetsForCsvExport(markerType = "all") {
  const pool = getDbPool();
  if (!pool) {
    return { success: false, message: "SQL not configured", rows: [] };
  }

  const normalizedType = normalizeMarkerType(markerType);
  const whereClauses = [];

  if (normalizedType === "urgent") {
    whereClauses.push(
      "LOWER(COALESCE(urgency, '')) = 'urgent' AND COALESCE(is_resolved, FALSE) = FALSE"
    );
  }

  if (normalizedType === "non-urgent") {
    whereClauses.push(
      "LOWER(COALESCE(urgency, '')) <> 'urgent' AND COALESCE(is_resolved, FALSE) = FALSE"
    );
  }

  if (normalizedType === "resolved") {
    whereClauses.push(
      "COALESCE(is_resolved, FALSE) = TRUE OR LOWER(COALESCE(urgency, '')) = 'resolved'"
    );
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const queries = [
    `
      SELECT
        id,
        content AS tweet,
        location,
        request_type,
        urgency,
        is_resolved,
        is_closed,
        is_acknowledged,
        latitude,
        longitude,
        geocode_status,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      FROM tweets
      ${whereSql}
      ORDER BY created_at DESC, id DESC
    `,
    `
      SELECT
        id,
        tweet,
        location,
        request_type,
        urgency,
        is_resolved,
        is_closed,
        is_acknowledged,
        latitude,
        longitude,
        geocode_status,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      FROM tweets
      ${whereSql}
      ORDER BY created_at DESC, id DESC
    `,
  ];

  let lastError = null;

  for (const query of queries) {
    try {
      const { rows } = await pool.query(query);
      return {
        success: true,
        rows: rows.map(normalizeTweetRow),
      };
    } catch (error) {
      lastError = error;
      if (!isUndefinedColumnError(error)) {
        return { success: false, message: error.message || "SQL query failed", rows: [] };
      }
    }
  }

  return {
    success: false,
    message: lastError?.message || "Unable to export tweets",
    rows: [],
  };
}

async function fetchTweetsFromCsv({ since } = {}) {
  // CSV fallback does not support incremental inserts in this MVP.
  if (since) {
    return [];
  }

  const csvPath = path.join(CSV_DIR, "dummy_tweets_1000.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row, index) => ({
    id: index + 1,
    tweet: row.tweet || row.content || "",
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: (row.urgency || "non-urgent").trim().toLowerCase(),
    is_acknowledged: false,
    is_resolved: false,
    is_closed: false,
    latitude: null,
    longitude: null,
    geocode_status: null,
    created_at: null,
    updated_at: null,
    resolved_at: null,
    closed_at: null,
  }));
}

export async function fetchTweets(options = {}) {
  try {
    const sqlTweets = await fetchTweetsFromSql(options);
    if (sqlTweets) {
      return sqlTweets;
    }
  } catch (error) {
    console.error("SQL fetch failed, falling back to CSV:", error.message);
  }

  return fetchTweetsFromCsv(options);
}

async function geocodeLocationWithGoogle(location) {
  const apiKey =
    process.env.GOOGLE_MAPS_GEOCODING_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !location) {
    return null;
  }

  const params = new URLSearchParams({
    address: location,
    key: apiKey,
    region: "in",
  });

  const response = await fetch(`${GEOCODE_API_URL}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Geocoding API failed with status ${response.status}`);
  }

  const payload = await response.json();
  const first = payload?.results?.[0]?.geometry?.location;

  if (!first) return null;

  return {
    latitude: Number(first.lat),
    longitude: Number(first.lng),
  };
}

export async function processPendingGeocodes(input = 10) {
  const pool = getDbPool();
  if (!pool) {
    return { success: false, message: "SQL not configured", processed: 0 };
  }

  const options =
    typeof input === "object" && input !== null ? input : { limit: input };

  const retryFailed =
    typeof options.retryFailed === "boolean"
      ? options.retryFailed
      : process.env.GEOCODE_RETRY_FAILED === "1";

  const retryMaxAttempts = Math.max(
    1,
    Math.min(Number(options.retryMaxAttempts ?? process.env.GEOCODE_RETRY_MAX_ATTEMPTS) || 3, 10)
  );

  const parsedLimit = Math.max(1, Math.min(Number(options.limit) || 10, 100));

  const statusCondition = retryFailed
    ? "AND (geocode_status = 'pending' OR geocode_status LIKE 'failed%')"
    : "AND geocode_status = 'pending'";

  const parseAttemptCount = (status) => {
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
  };

  const toFailedStatus = (attempt) => {
    if (attempt <= 1) return "failed";
    return `failed_${attempt}`;
  };

  const queryWithStatus = `
    SELECT id, location, geocode_status
    FROM tweets
    WHERE location IS NOT NULL
      AND location <> ''
      AND latitude IS NULL
      ${statusCondition}
    ORDER BY id ASC
    LIMIT $1
  `;

  const queryWithoutStatus = `
    SELECT id, location
    FROM tweets
    WHERE location IS NOT NULL
      AND location <> ''
      AND latitude IS NULL
    ORDER BY id ASC
    LIMIT $1
  `;

  let rows = [];
  let hasStatusColumn = true;

  try {
    const result = await pool.query(queryWithStatus, [parsedLimit]);
    rows = result.rows;

    if (retryFailed) {
      rows = rows
        .filter((row) => parseAttemptCount(row.geocode_status) < retryMaxAttempts)
        .slice(0, parsedLimit);
    }
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;
    hasStatusColumn = false;
    try {
      const result = await pool.query(queryWithoutStatus, [parsedLimit]);
      rows = result.rows;
    } catch (fallbackError) {
      if (isUndefinedColumnError(fallbackError)) {
        return {
          success: false,
          message:
            "Missing latitude/longitude columns. Apply the latest tweets table migration first.",
          processed: 0,
        };
      }
      throw fallbackError;
    }
  }

  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const row of rows) {
    processed += 1;
    const currentAttempt = hasStatusColumn ? parseAttemptCount(row.geocode_status) : 0;

    try {
      const coords = await geocodeLocationWithGoogle(row.location);

      if (coords) {
        if (hasStatusColumn) {
          await pool.query(
            `
            UPDATE tweets
            SET latitude = $1, longitude = $2, geocode_status = 'done'
            WHERE id = $3
            `,
            [coords.latitude, coords.longitude, row.id]
          );
        } else {
          await pool.query(
            `
            UPDATE tweets
            SET latitude = $1, longitude = $2
            WHERE id = $3
            `,
            [coords.latitude, coords.longitude, row.id]
          );
        }
        success += 1;
      } else {
        if (hasStatusColumn) {
          const nextAttempt = currentAttempt + 1;
          await pool.query(
            `
            UPDATE tweets
            SET geocode_status = $1
            WHERE id = $2
            `,
            [toFailedStatus(nextAttempt), row.id]
          );
        }
        failed += 1;
      }
    } catch (error) {
      if (hasStatusColumn) {
        const nextAttempt = currentAttempt + 1;
        await pool.query(
          `
          UPDATE tweets
          SET geocode_status = $1
          WHERE id = $2
          `,
          [toFailedStatus(nextAttempt), row.id]
        );
      }
      failed += 1;
      console.error(`Geocode failed for tweet ${row.id}:`, error.message);
    }
  }

  return {
    success: true,
    processed,
    geocoded: success,
    failed,
    retryFailed,
    retryMaxAttempts,
    statusColumnEnabled: hasStatusColumn,
  };
}

export async function updateTweetStatus(id, action) {
  const pool = getDbPool();
  if (!pool) {
    return { success: false, message: "SQL not configured" };
  }

  if (!id || !["resolve", "close", "acknowledge"].includes(action)) {
    return { success: false, message: "Invalid update payload" };
  }

  try {
    if (action === "resolve") {
      try {
        await pool.query(
          `
          UPDATE tweets
          SET is_resolved = TRUE, resolved_at = NOW()
          WHERE id = $1
          `,
          [id]
        );
      } catch (error) {
        if (!isUndefinedColumnError(error)) throw error;
        await pool.query(
          `
          UPDATE tweets
          SET is_resolved = TRUE
          WHERE id = $1
          `,
          [id]
        );
      }
    }

    if (action === "acknowledge") {
      try {
        await pool.query(
          `
          UPDATE tweets
          SET is_acknowledged = TRUE
          WHERE id = $1
          `,
          [id]
        );
      } catch (error) {
        if (!isUndefinedColumnError(error)) throw error;
        // Column might not exist yet, just return success
        console.warn("is_acknowledged column not found, consider running database migration");
      }
    }

    if (action === "close") {
      try {
        await pool.query(
          `
          UPDATE tweets
          SET is_closed = TRUE, closed_at = NOW()
          WHERE id = $1
          `,
          [id]
        );
      } catch (error) {
        if (!isUndefinedColumnError(error)) throw error;
        await pool.query(
          `
          UPDATE tweets
          SET is_closed = TRUE
          WHERE id = $1
          `,
          [id]
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update tweet status:", error.message);
    return { success: false, message: error.message };
  }
}

export async function autoCloseResolvedTweets() {
  const pool = getDbPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      UPDATE tweets
      SET is_closed = TRUE, closed_at = COALESCE(closed_at, NOW())
      WHERE is_resolved = TRUE
        AND is_closed = FALSE
        AND resolved_at IS NOT NULL
        AND resolved_at <= (NOW() - INTERVAL '5 minutes')
      `
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      console.error("Auto-close update failed:", error.message);
      return;
    }

    try {
      await pool.query(
        `
        UPDATE tweets
        SET is_closed = TRUE
        WHERE is_resolved = TRUE
          AND is_closed = FALSE
          AND created_at <= (NOW() - INTERVAL '5 minutes')
        `
      );
    } catch (fallbackError) {
      console.error("Auto-close fallback failed:", fallbackError.message);
    }
  }
}
