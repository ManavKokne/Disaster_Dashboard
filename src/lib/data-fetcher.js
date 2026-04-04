import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { Pool } from "pg";
import { getUrgencyMeta, normalizeUrgencyLabel, normalizeUrgencyScore } from "./urgency";

const CSV_DIR = path.join(process.cwd(), "public");
const PG_UNDEFINED_COLUMN_ERROR_CODE = "42703";
let dbPool;

function isUndefinedColumnError(error) {
  return error?.code === PG_UNDEFINED_COLUMN_ERROR_CODE;
}

function parseBooleanEnv(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function sanitizeConnectionString(connectionString) {
  const parsedUrl = new URL(connectionString);

  // Keep SSL behavior explicit in code to avoid pg sslmode parsing differences.
  parsedUrl.searchParams.delete("sslmode");
  parsedUrl.searchParams.delete("sslrootcert");
  parsedUrl.searchParams.delete("sslcert");
  parsedUrl.searchParams.delete("sslkey");
  parsedUrl.searchParams.delete("uselibpqcompat");

  return parsedUrl.toString();
}

function resolveConnectionConfig(connectionString) {
  let sanitizedConnectionString = connectionString;
  let ssl = { rejectUnauthorized: false };

  try {
    const parsedUrl = new URL(connectionString);
    const host = (parsedUrl.hostname || "").toLowerCase();
    const sslMode = (parsedUrl.searchParams.get("sslmode") || "").toLowerCase();
    const dbSslMode = (process.env.DB_SSL_MODE || "auto").trim().toLowerCase();
    const rejectUnauthorized = parseBooleanEnv(
      process.env.DB_SSL_REJECT_UNAUTHORIZED,
      false
    );
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const shouldDisableSsl = dbSslMode === "disable" || isLocalHost || sslMode === "disable";

    sanitizedConnectionString = sanitizeConnectionString(connectionString);

    if (shouldDisableSsl) {
      ssl = false;
    } else {
      ssl = { rejectUnauthorized };
    }
  } catch {
    // Keep SSL enabled by default for hosted PostgreSQL providers.
  }

  return {
    connectionString: sanitizedConnectionString,
    ssl,
  };
}

function getDbPool() {
  if (dbPool) return dbPool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  const connectionConfig = resolveConnectionConfig(connectionString);

  dbPool = new Pool({
    connectionString: connectionConfig.connectionString,
    max: 10,
    ssl: connectionConfig.ssl,
  });

  return dbPool;
}

function toIsoIfValid(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function getTimestampMs(tweet) {
  const timestampValue =
    tweet?.created_at ||
    tweet?.updated_at ||
    tweet?.resolved_at ||
    tweet?.closed_at ||
    tweet?.timestamp ||
    null;

  if (!timestampValue) return null;

  const parsed = new Date(timestampValue).getTime();
  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function isWithinTimeWindow(tweet, timeWindow, nowMs = Date.now()) {
  if (!timeWindow || timeWindow === "all") return true;

  const tweetTimestamp = getTimestampMs(tweet);
  if (!Number.isFinite(tweetTimestamp)) return false;

  const diffMs = nowMs - tweetTimestamp;
  const windowsInMs = {
    "24h": 24 * 60 * 60 * 1000,
    "72h": 72 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };

  return diffMs <= (windowsInMs[timeWindow] || Number.MAX_SAFE_INTEGER);
}

function normalizeTweetRow(row) {
  const latitude = row.latitude == null ? null : Number(row.latitude);
  const longitude = row.longitude == null ? null : Number(row.longitude);
  const createdAt = row.created_at || row.timestamp || null;
  const updatedAt = row.updated_at || row.timestamp || null;
  const tweetText = row.tweet || row.content || "";
  const urgencyMeta = getUrgencyMeta(row);
  const rawUrgencyScore = normalizeUrgencyScore(row.urgency_score);

  return {
    id: row.id,
    tweet: tweetText,
    content: tweetText,
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: row.urgency || null,
    urgency_label: urgencyMeta.label,
    urgency_score: rawUrgencyScore ?? urgencyMeta.score,
    is_resolved: Boolean(row.is_resolved),
    is_closed: Boolean(row.is_closed),
    is_acknowledged: Boolean(row.is_acknowledged),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    geocode_status: row.geocode_status || null,
    created_at: toIsoIfValid(createdAt),
    updated_at: toIsoIfValid(updatedAt),
    resolved_at: toIsoIfValid(row.resolved_at),
    closed_at: toIsoIfValid(row.closed_at),
    timestamp: toIsoIfValid(row.timestamp),
  };
}

function matchesExportFilters(tweet, filters = {}) {
  const locationFilter = (filters.location || "").trim().toLowerCase();
  if (locationFilter && (tweet.location || "").trim().toLowerCase() !== locationFilter) {
    return false;
  }

  const requestTypeFilter = (filters.requestType || "").trim();
  if (requestTypeFilter && (tweet.request_type || "") !== requestTypeFilter) {
    return false;
  }

  const acknowledgementFilter = String(filters.acknowledgement || "all").toLowerCase();
  if (acknowledgementFilter === "acknowledged" && !tweet.is_acknowledged) return false;
  if (acknowledgementFilter === "unacknowledged" && tweet.is_acknowledged) return false;

  const markerStateFilter = String(filters.markerState || "all").toLowerCase();
  const isResolved = Boolean(tweet.is_resolved);
  if (markerStateFilter === "resolved" && !isResolved) return false;
  if (markerStateFilter === "active" && isResolved) return false;

  const normalizedUrgencyFilters = Array.isArray(filters.urgencyLabels)
    ? filters.urgencyLabels.map((value) => normalizeUrgencyLabel(value)).filter(Boolean)
    : [];

  if (normalizedUrgencyFilters.length > 0) {
    if (isResolved) return false;
    const { label } = getUrgencyMeta(tweet);
    if (!normalizedUrgencyFilters.includes(label)) {
      return false;
    }
  }

  if (!isWithinTimeWindow(tweet, filters.timeWindow)) {
    return false;
  }

  return true;
}

async function fetchTweetsFromSql({ since, includeClosed = false } = {}) {
  const pool = getDbPool();
  if (!pool) return null;

  await autoCloseResolvedTweets();

  const queries = includeClosed
    ? [
        `
          SELECT *
          FROM tweets
          ORDER BY id ASC
        `,
      ]
    : [
        `
          SELECT *
          FROM tweets
          WHERE COALESCE(is_closed, FALSE) = FALSE
          ORDER BY id ASC
        `,
        `
          SELECT *
          FROM tweets
          ORDER BY id ASC
        `,
      ];

  let rows = null;
  let lastError = null;

  for (const query of queries) {
    try {
      const result = await pool.query(query);
      rows = result.rows;
      break;
    } catch (error) {
      lastError = error;
      if (!isUndefinedColumnError(error)) {
        throw error;
      }
    }
  }

  if (!rows) {
    throw lastError || new Error("Unable to fetch tweets");
  }

  let normalizedRows = rows.map(normalizeTweetRow);

  if (!includeClosed) {
    normalizedRows = normalizedRows.filter((tweet) => !tweet.is_closed);
  }

  if (!since) {
    return normalizedRows;
  }

  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(sinceMs)) {
    return normalizedRows;
  }

  return normalizedRows.filter((tweet) => {
    const tweetTimestampMs = getTimestampMs(tweet);
    if (!Number.isFinite(tweetTimestampMs)) return false;
    return tweetTimestampMs > sinceMs;
  });
}

export async function fetchTweetsForCsvExport(filters = {}) {
  try {
    const includeClosed = Boolean(filters.includeClosed);
    const rows = await fetchTweets({ includeClosed });
    const filteredRows = rows.filter((tweet) => matchesExportFilters(tweet, filters));

    const sortedRows = [...filteredRows].sort((a, b) => {
      const aTime = getTimestampMs(a) ?? 0;
      const bTime = getTimestampMs(b) ?? 0;
      if (aTime === bTime) {
        return Number(b.id || 0) - Number(a.id || 0);
      }
      return bTime - aTime;
    });

    return {
      success: true,
      rows: sortedRows,
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Unable to export tweets",
      rows: [],
    };
  }
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

  return data.map((row, index) => {
    const urgencyMeta = getUrgencyMeta(row);

    return {
      id: index + 1,
      tweet: row.tweet || row.content || "",
      content: row.tweet || row.content || "",
      location: row.location || "",
      request_type: row.request_type || "",
      urgency: (row.urgency || "").trim().toLowerCase() || null,
      urgency_label: urgencyMeta.label,
      urgency_score: normalizeUrgencyScore(row.urgency_score) ?? urgencyMeta.score,
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
      timestamp: null,
    };
  });
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

  const queries = [
    `
      UPDATE tweets
      SET is_closed = TRUE, closed_at = COALESCE(closed_at, NOW())
      WHERE is_resolved = TRUE
        AND is_closed = FALSE
        AND resolved_at IS NOT NULL
        AND resolved_at <= (NOW() - INTERVAL '5 minutes')
    `,
    `
      UPDATE tweets
      SET is_closed = TRUE
      WHERE is_resolved = TRUE
        AND is_closed = FALSE
        AND created_at <= (NOW() - INTERVAL '5 minutes')
    `,
    `
      UPDATE tweets
      SET is_closed = TRUE
      WHERE is_resolved = TRUE
        AND is_closed = FALSE
        AND "timestamp" <= (NOW() - INTERVAL '5 minutes')
    `,
  ];

  let lastError = null;

  for (const query of queries) {
    try {
      await pool.query(query);
      return;
    } catch (error) {
      lastError = error;
      if (!isUndefinedColumnError(error)) {
        console.error("Auto-close update failed:", error.message);
        return;
      }
    }
  }

  if (lastError && !isUndefinedColumnError(lastError)) {
    console.error("Auto-close update failed:", lastError.message);
  }
}
