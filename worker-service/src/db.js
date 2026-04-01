import { Pool } from "pg";
import { parseNumberEnv } from "./utils/env.js";
import { logError, logInfo } from "./utils/logger.js";

let dbPool;

function resolveSslConfig(connectionString) {
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
    // Keep SSL enabled by default for hosted providers if URL parsing fails.
  }

  return ssl;
}

export function getDbPool() {
  if (dbPool) return dbPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for worker-service");
  }

  const max = parseNumberEnv(process.env.WORKER_DB_POOL_MAX, {
    fallback: 10,
    min: 1,
    max: 50,
  });

  dbPool = new Pool({
    connectionString,
    max,
    ssl: resolveSslConfig(connectionString),
  });

  dbPool.on("error", (error) => {
    logError("Unexpected idle PostgreSQL pool error", {
      message: error.message,
      code: error.code,
    });
  });

  logInfo("PostgreSQL pool initialized", { max });
  return dbPool;
}

export async function closeDbPool() {
  if (!dbPool) return;

  await dbPool.end();
  dbPool = undefined;
  logInfo("PostgreSQL pool closed");
}
