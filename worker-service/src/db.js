import { Pool } from "pg";
import { parseBooleanEnv, parseNumberEnv } from "./utils/env.js";
import { logError, logInfo } from "./utils/logger.js";

let dbPool;

function sanitizeConnectionString(connectionString) {
  const parsedUrl = new URL(connectionString);

  // Avoid pg-connection-string sslmode warnings and enforce SSL behavior in code.
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
    const sslConfigMode = (process.env.WORKER_DB_SSL_MODE || "auto").trim().toLowerCase();
    const rejectUnauthorized = parseBooleanEnv(
      process.env.WORKER_DB_SSL_REJECT_UNAUTHORIZED,
      false
    );
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const shouldDisableSsl =
      sslConfigMode === "disable" || isLocalHost || sslMode === "disable";

    sanitizedConnectionString = sanitizeConnectionString(connectionString);

    if (shouldDisableSsl) {
      ssl = false;
    } else {
      ssl = { rejectUnauthorized };
    }
  } catch {
    // Keep SSL enabled by default for hosted providers if URL parsing fails.
  }

  return {
    connectionString: sanitizedConnectionString,
    ssl,
  };
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

  const connectionConfig = resolveConnectionConfig(connectionString);

  dbPool = new Pool({
    connectionString: connectionConfig.connectionString,
    max,
    ssl: connectionConfig.ssl,
  });

  dbPool.on("error", (error) => {
    logError("Unexpected idle PostgreSQL pool error", {
      message: error.message,
      code: error.code,
    });
  });

  logInfo("PostgreSQL pool initialized", {
    max,
    sslEnabled: connectionConfig.ssl !== false,
    rejectUnauthorized:
      connectionConfig.ssl === false ? undefined : connectionConfig.ssl.rejectUnauthorized,
  });
  return dbPool;
}

export async function closeDbPool() {
  if (!dbPool) return;

  await dbPool.end();
  dbPool = undefined;
  logInfo("PostgreSQL pool closed");
}

// # Optional SSL overrides
// # auto: enable SSL except local DB or sslmode=disable in URL
// # disable: force SSL off
// # require: force SSL on
// WORKER_DB_SSL_MODE=auto
// # Set true only if your DB certificate chain is trusted in the runtime.
// WORKER_DB_SSL_REJECT_UNAUTHORIZED=false
