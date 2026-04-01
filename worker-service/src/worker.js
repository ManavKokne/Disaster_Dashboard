import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { closeDbPool, getDbPool } from "./db.js";
import { processGeocodeBatch } from "./geocode.js";
import { parseBooleanEnv, parseNumberEnv } from "./utils/env.js";
import { logError, logInfo, logWarn } from "./utils/logger.js";
import { sleep } from "./utils/sleep.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ROOT = path.resolve(__dirname, "..");

let shuttingDown = false;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnvironment() {
  loadEnvFile(path.join(SERVICE_ROOT, ".env"));
}

function getConfig() {
  const pollIntervalMs = parseNumberEnv(process.env.WORKER_POLL_INTERVAL_MS, {
    fallback: 5000,
    min: 1000,
    max: 300_000,
  });

  const errorDelayMs = parseNumberEnv(process.env.WORKER_ERROR_DELAY_MS, {
    fallback: 10000,
    min: 1000,
    max: 300_000,
  });

  const batchSize = parseNumberEnv(process.env.WORKER_BATCH_SIZE, {
    fallback: 10,
    min: 1,
    max: 100,
  });

  const maxAttempts = parseNumberEnv(process.env.WORKER_MAX_ATTEMPTS, {
    fallback: 3,
    min: 1,
    max: 20,
  });

  const requestTimeoutMs = parseNumberEnv(process.env.GEOCODE_REQUEST_TIMEOUT_MS, {
    fallback: 10000,
    min: 1000,
    max: 60000,
  });

  const retryFailed = parseBooleanEnv(process.env.WORKER_RETRY_FAILED, true);
  const region = process.env.GEOCODE_REGION || "in";

  return {
    pollIntervalMs,
    errorDelayMs,
    batchSize,
    maxAttempts,
    requestTimeoutMs,
    retryFailed,
    region,
  };
}

function validateRequiredEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Set it in worker-service/.env");
  }

  if (!process.env.GOOGLE_MAPS_GEOCODING_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "GOOGLE_MAPS_GEOCODING_API_KEY is missing. Add it to worker-service/.env"
    );
  }
}

function setupShutdownSignals() {
  const stop = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logWarn("Shutdown signal received", { signal });
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
}

async function runWorker({ runOnce = false } = {}) {
  loadEnvironment();
  validateRequiredEnv();
  setupShutdownSignals();

  const config = getConfig();
  const pool = getDbPool();

  logInfo("Worker started", {
    runOnce,
    pollIntervalMs: config.pollIntervalMs,
    errorDelayMs: config.errorDelayMs,
    batchSize: config.batchSize,
    maxAttempts: config.maxAttempts,
    retryFailed: config.retryFailed,
    region: config.region,
    requestTimeoutMs: config.requestTimeoutMs,
  });

  try {
    while (!shuttingDown) {
      const startedAt = Date.now();

      try {
        const result = await processGeocodeBatch({
          pool,
          limit: config.batchSize,
          retryFailed: config.retryFailed,
          maxAttempts: config.maxAttempts,
          requestTimeoutMs: config.requestTimeoutMs,
          region: config.region,
        });

        if (result.processed > 0) {
          logInfo("Batch completed", result);
        } else {
          logInfo("No eligible rows found", {
            fetched: result.fetched,
            eligible: result.eligible,
          });
        }
      } catch (error) {
        logError("Batch execution failed", {
          message: error.message,
          code: error.code,
        });

        if (runOnce) {
          throw error;
        }

        await sleep(config.errorDelayMs);
        continue;
      }

      if (runOnce) {
        break;
      }

      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, config.pollIntervalMs - elapsed);
      await sleep(waitMs);
    }
  } finally {
    await closeDbPool();
    logInfo("Worker stopped");
  }
}

const runOnce = process.argv.includes("--once");

runWorker({ runOnce }).catch((error) => {
  logError("Worker terminated with fatal error", {
    message: error.message,
  });
  process.exitCode = 1;
});
