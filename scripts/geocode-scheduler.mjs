import { spawn } from "child_process";
import path from "path";

const workerEntry = path.join(process.cwd(), "worker-service", "src", "worker.js");

const child = spawn(process.execPath, [workerEntry], {
  stdio: "inherit",
  shell: false,
  windowsHide: false,
});

child.on("error", (error) => {
  console.error("[geocode-scheduler] failed to start worker-service:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[geocode-scheduler] worker-service exited due to signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});

function shutdown(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
