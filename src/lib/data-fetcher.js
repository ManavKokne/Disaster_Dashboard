import fs from "fs";
import path from "path";
import Papa from "papaparse";
import mysql from "mysql2/promise";

const CSV_DIR = path.join(process.cwd(), "public");
const GEOCODE_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";
let dbPool;

function getDbPool() {
  if (dbPool) return dbPool;

  const hasConfig =
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME;

  if (!hasConfig) {
    return null;
  }

  dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
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

async function fetchTweetsFromSql({ since } = {}) {
  const pool = getDbPool();
  if (!pool) return null;

  await autoCloseResolvedTweets();

  const baseConditions = ["is_closed = 0"];
  const params = [];
  if (since) {
    baseConditions.push("created_at > ?");
    params.push(since);
  }

  const whereSql = `WHERE ${baseConditions.join(" AND ")}`;

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
      const [rows] = await pool.query(query, params);
      return rows.map(normalizeTweetRow);
    } catch (error) {
      lastError = error;
      if (error?.code !== "ER_BAD_FIELD_ERROR") {
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
      "LOWER(COALESCE(urgency, '')) = 'urgent' AND COALESCE(is_resolved, 0) = 0"
    );
  }

  if (normalizedType === "non-urgent") {
    whereClauses.push(
      "LOWER(COALESCE(urgency, '')) <> 'urgent' AND COALESCE(is_resolved, 0) = 0"
    );
  }

  if (normalizedType === "resolved") {
    whereClauses.push(
      "COALESCE(is_resolved, 0) = 1 OR LOWER(COALESCE(urgency, '')) = 'resolved'"
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
      const [rows] = await pool.query(query);
      return {
        success: true,
        rows: rows.map(normalizeTweetRow),
      };
    } catch (error) {
      lastError = error;
      if (error?.code !== "ER_BAD_FIELD_ERROR") {
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

export async function processPendingGeocodes(limit = 10) {
  const pool = getDbPool();
  if (!pool) {
    return { success: false, message: "SQL not configured", processed: 0 };
  }

  const parsedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));

  const queryWithStatus = `
    SELECT id, location
    FROM tweets
    WHERE location IS NOT NULL
      AND location <> ''
      AND latitude IS NULL
      AND geocode_status = 'pending'
    ORDER BY id ASC
    LIMIT ?
  `;

  const queryWithoutStatus = `
    SELECT id, location
    FROM tweets
    WHERE location IS NOT NULL
      AND location <> ''
      AND latitude IS NULL
    ORDER BY id ASC
    LIMIT ?
  `;

  let rows = [];
  let hasStatusColumn = true;

  try {
    const [resultRows] = await pool.query(queryWithStatus, [parsedLimit]);
    rows = resultRows;
  } catch (error) {
    if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
    hasStatusColumn = false;
    try {
      const [resultRows] = await pool.query(queryWithoutStatus, [parsedLimit]);
      rows = resultRows;
    } catch (fallbackError) {
      if (fallbackError?.code === "ER_BAD_FIELD_ERROR") {
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

    try {
      const coords = await geocodeLocationWithGoogle(row.location);

      if (coords) {
        if (hasStatusColumn) {
          await pool.query(
            `
            UPDATE tweets
            SET latitude = ?, longitude = ?, geocode_status = 'done'
            WHERE id = ?
            `,
            [coords.latitude, coords.longitude, row.id]
          );
        } else {
          await pool.query(
            `
            UPDATE tweets
            SET latitude = ?, longitude = ?
            WHERE id = ?
            `,
            [coords.latitude, coords.longitude, row.id]
          );
        }
        success += 1;
      } else {
        if (hasStatusColumn) {
          await pool.query(
            `
            UPDATE tweets
            SET geocode_status = 'failed'
            WHERE id = ?
            `,
            [row.id]
          );
        }
        failed += 1;
      }
    } catch (error) {
      if (hasStatusColumn) {
        await pool.query(
          `
          UPDATE tweets
          SET geocode_status = 'failed'
          WHERE id = ?
          `,
          [row.id]
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
          SET is_resolved = 1, resolved_at = NOW()
          WHERE id = ?
          `,
          [id]
        );
      } catch (error) {
        if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
        await pool.query(
          `
          UPDATE tweets
          SET is_resolved = 1
          WHERE id = ?
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
          SET is_acknowledged = 1
          WHERE id = ?
          `,
          [id]
        );
      } catch (error) {
        if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
        // Column might not exist yet, just return success
        console.warn("is_acknowledged column not found, consider running database migration");
      }
    }

    if (action === "close") {
      try {
        await pool.query(
          `
          UPDATE tweets
          SET is_closed = 1, closed_at = NOW()
          WHERE id = ?
          `,
          [id]
        );
      } catch (error) {
        if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
        await pool.query(
          `
          UPDATE tweets
          SET is_closed = 1
          WHERE id = ?
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
      SET is_closed = 1, closed_at = COALESCE(closed_at, NOW())
      WHERE is_resolved = 1
        AND is_closed = 0
        AND resolved_at IS NOT NULL
        AND resolved_at <= (NOW() - INTERVAL 5 MINUTE)
      `
    );
  } catch (error) {
    if (error?.code !== "ER_BAD_FIELD_ERROR") {
      console.error("Auto-close update failed:", error.message);
      return;
    }

    try {
      await pool.query(
        `
        UPDATE tweets
        SET is_closed = 1
        WHERE is_resolved = 1
          AND is_closed = 0
          AND created_at <= (NOW() - INTERVAL 5 MINUTE)
        `
      );
    } catch (fallbackError) {
      console.error("Auto-close fallback failed:", fallbackError.message);
    }
  }
}
