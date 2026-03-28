import { spawn } from "child_process";

const isWindows = process.platform === "win32";
const npmCmd = "npm";

function startTask(args, label) {
  const child = spawn(npmCmd, args, {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
  });

  child.on("error", (error) => {
    console.error(`[dev-with-geocode] ${label} failed to start:`, error.message);
  });

  return child;
}

const nextDev = startTask(["run", "dev"], "next-dev");
const geocodeWorker = startTask(["run", "worker:geocode"], "geocode-worker");

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (nextDev && !nextDev.killed) {
    if (isWindows) {
      nextDev.kill();
    } else {
      nextDev.kill("SIGINT");
    }
  }

  if (geocodeWorker && !geocodeWorker.killed) {
    if (isWindows) {
      geocodeWorker.kill();
    } else {
      geocodeWorker.kill("SIGINT");
    }
  }

  setTimeout(() => process.exit(code), 200);
}

nextDev.on("exit", (code) => shutdown(code ?? 0));
geocodeWorker.on("exit", (code) => shutdown(code ?? 0));

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
