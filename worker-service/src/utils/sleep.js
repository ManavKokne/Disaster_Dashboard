export function sleep(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  return new Promise((resolve) => setTimeout(resolve, safeMs));
}
