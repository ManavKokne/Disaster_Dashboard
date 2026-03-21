import fs from "fs";
import path from "path";
import Papa from "papaparse";
import mysql from "mysql2/promise";

const CSV_DIR = path.join(process.cwd(), "public");
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
  return {
    id: row.id,
    tweet: row.tweet || row.content || "",
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: row.urgency || "non-urgent",
    is_resolved: Boolean(row.is_resolved),
    is_closed: Boolean(row.is_closed),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : null,
    resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
  };
}

async function fetchTweetsFromSql({ since } = {}) {
  const pool = getDbPool();
  if (!pool) return null;

  await autoCloseResolvedTweets();

  const baseConditions = ["is_closed = 0"];
  const params = [];
  if (since) {
    baseConditions.push("timestamp > ?");
    params.push(since);
  }

  const whereSql = `WHERE ${baseConditions.join(" AND ")}`;

  const queryWithContent = `
    SELECT
      id,
      content AS tweet,
      location,
      request_type,
      urgency,
      is_resolved,
      is_closed,
      timestamp,
      resolved_at,
      closed_at
    FROM tweets
    ${whereSql}
    ORDER BY timestamp ASC
  `;

  const queryWithTweet = `
    SELECT
      id,
      tweet,
      location,
      request_type,
      urgency,
      is_resolved,
      is_closed,
      timestamp,
      resolved_at,
      closed_at
    FROM tweets
    ${whereSql}
    ORDER BY timestamp ASC
  `;

  try {
    const [rows] = await pool.query(queryWithContent, params);
    return rows.map(normalizeTweetRow);
  } catch (error) {
    if (error?.code !== "ER_BAD_FIELD_ERROR") {
      throw error;
    }
    const [rows] = await pool.query(queryWithTweet, params);
    return rows.map(normalizeTweetRow);
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

  return data.map((row, index) => ({
    id: index + 1,
    tweet: row.tweet || row.content || "",
    location: row.location || "",
    request_type: row.request_type || "",
    urgency: (row.urgency || "non-urgent").trim().toLowerCase(),
    is_resolved: false,
    is_closed: false,
    timestamp: null,
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

export async function fetchCityCoordinates() {
  const csvPath = path.join(CSV_DIR, "india_city_coordinates.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}

export async function updateTweetStatus(id, action) {
  const pool = getDbPool();
  if (!pool) {
    return { success: false, message: "SQL not configured" };
  }

  if (!id || !["resolve", "close"].includes(action)) {
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
          AND timestamp <= (NOW() - INTERVAL 5 MINUTE)
        `
      );
    } catch (fallbackError) {
      console.error("Auto-close fallback failed:", fallbackError.message);
    }
  }
}
