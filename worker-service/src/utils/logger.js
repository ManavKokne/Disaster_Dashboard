function formatMeta(meta) {
  if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) {
    return "";
  }

  try {
    return ` | ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

function timestamp() {
  return new Date().toISOString();
}

export function logInfo(message, meta) {
  console.log(`[${timestamp()}] [worker-service] INFO: ${message}${formatMeta(meta)}`);
}

export function logWarn(message, meta) {
  console.warn(`[${timestamp()}] [worker-service] WARN: ${message}${formatMeta(meta)}`);
}

export function logError(message, meta) {
  console.error(`[${timestamp()}] [worker-service] ERROR: ${message}${formatMeta(meta)}`);
}
