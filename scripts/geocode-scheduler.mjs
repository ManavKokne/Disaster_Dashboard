import fs from "fs";
import path from "path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env.local"));

const intervalMs = Number(process.env.GEOCODE_SCHEDULER_INTERVAL_MS || 5000);
const batchLimit = Number(process.env.GEOCODE_BATCH_LIMIT || 10);
const retryFailed = process.env.GEOCODE_RETRY_FAILED === "1";
const retryMaxAttempts = Math.max(
  1,
  Math.min(Number(process.env.GEOCODE_RETRY_MAX_ATTEMPTS || 3), 10)
);
const workerSecret = process.env.GEOCODE_WORKER_SECRET || "";
const baseUrl = process.env.GEOCODE_BASE_URL || "http://localhost:3000";

let running = false;
let timer = null;

async function tick() {
  if (running) return;
  running = true;

  try {
    const response = await fetch(`${baseUrl}/api/geocode/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workerSecret ? { "x-worker-secret": workerSecret } : {}),
      },
      body: JSON.stringify({
        limit: batchLimit,
        retryFailed,
        retryMaxAttempts,
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error || `HTTP ${response.status}`;
      console.error(`[geocode-scheduler] Request failed: ${message}`);
      return;
    }

    const processed = payload?.processed ?? 0;
    const geocoded = payload?.geocoded ?? 0;
    const failed = payload?.failed ?? 0;

    if (processed > 0) {
      console.log(
        `[geocode-scheduler] processed=${processed}, geocoded=${geocoded}, failed=${failed}`
      );
    }
  } catch (error) {
    console.error(`[geocode-scheduler] ${error.message}`);
  } finally {
    running = false;
  }
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  console.log("[geocode-scheduler] stopped");
  process.exit(0);
}

console.log(
  `[geocode-scheduler] started | interval=${intervalMs}ms | batch=${batchLimit} | retryFailed=${retryFailed} | retryMaxAttempts=${retryMaxAttempts} | target=${baseUrl}`
);

timer = setInterval(tick, intervalMs);
void tick();

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
