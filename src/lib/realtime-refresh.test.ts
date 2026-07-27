import { describe, expect, it } from "vitest";

import {
  getLiveRefreshRetryDelayMs,
  isLiveSnapshotStale,
} from "@/lib/realtime-refresh";

describe("realtime refresh policy", () => {
  it("backs off from 30 seconds to a maximum of five minutes", () => {
    expect([1, 2, 3, 4, 5, 6].map(getLiveRefreshRetryDelayMs)).toEqual([
      30_000,
      60_000,
      120_000,
      240_000,
      300_000,
      300_000,
    ]);
  });

  it("treats missing or older-than-15-second fresh data as stale", () => {
    expect(isLiveSnapshotStale(20_000, null)).toBe(true);
    expect(isLiveSnapshotStale(20_000, 5_000)).toBe(false);
    expect(isLiveSnapshotStale(20_001, 5_000)).toBe(true);
  });
});
