export const LIVE_REFRESH_INTERVAL_MS = 30_000;
export const LIVE_REFRESH_STALE_AFTER_MS = 15_000;
export const LIVE_REFRESH_MAX_BACKOFF_MS = 300_000;

export function getLiveRefreshRetryDelayMs(consecutiveFailures: number) {
  const exponent = Math.max(0, Math.trunc(consecutiveFailures) - 1);
  return Math.min(
    LIVE_REFRESH_INTERVAL_MS * 2 ** exponent,
    LIVE_REFRESH_MAX_BACKOFF_MS,
  );
}

export function isLiveSnapshotStale(
  nowMs: number,
  lastFreshAtMs: number | null,
) {
  return (
    lastFreshAtMs == null ||
    nowMs - lastFreshAtMs > LIVE_REFRESH_STALE_AFTER_MS
  );
}
