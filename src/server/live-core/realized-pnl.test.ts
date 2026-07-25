import { describe, expect, it } from "vitest";

import {
  bangkokDateKey,
  deriveRealizedEvents,
  type RealizedCashflowEvent,
  type RealizedLiquidityEvent,
} from "./realized-pnl";

function liquidity(
  blockNumber: bigint,
  liquidityDelta: bigint,
  timestampMs = Number(blockNumber) * 1_000,
): RealizedLiquidityEvent {
  return {
    blockNumber,
    logIndex: 1,
    timestampMs,
    liquidityDelta,
    txHash: `0x${blockNumber}`,
  };
}

function cashflow(
  blockNumber: bigint,
  type: RealizedCashflowEvent["type"],
  valueUsdg: number,
  logIndex = 2,
): RealizedCashflowEvent {
  return {
    blockNumber,
    logIndex,
    timestampMs: Number(blockNumber) * 1_000,
    type,
    valueUsdg,
    txHash: `0x${blockNumber}`,
  };
}

describe("realized LP lifecycle", () => {
  it("does not emit PnL for an active or partially withdrawn position", () => {
    expect(
      deriveRealizedEvents({
        liquidity: [liquidity(1n, 100n), liquidity(2n, -40n)],
        cashflows: [
          cashflow(1n, "deposit", 1_000),
          cashflow(2n, "withdrawal", 450),
        ],
      }),
    ).toEqual([]);
  });

  it("emits one closure after the full withdrawal block is complete", () => {
    const events = deriveRealizedEvents({
      liquidity: [liquidity(1n, 100n), liquidity(2n, -100n)],
      cashflows: [
        cashflow(1n, "deposit", 1_000),
        cashflow(2n, "withdrawal", 1_080),
        cashflow(2n, "fee", 25, 3),
      ],
    });

    expect(events).toMatchObject([
      {
        lifecycle: 1,
        kind: "closure",
        depositedUsdg: 1_000,
        withdrawnUsdg: 1_080,
        claimedFeesUsdg: 25,
        pnlUsdg: 105,
      },
    ]);
  });

  it("creates a new lifecycle after liquidity is reopened", () => {
    const events = deriveRealizedEvents({
      liquidity: [
        liquidity(1n, 100n),
        liquidity(2n, -100n),
        liquidity(3n, 50n),
        liquidity(4n, -50n),
      ],
      cashflows: [
        cashflow(1n, "deposit", 100),
        cashflow(2n, "withdrawal", 110),
        cashflow(3n, "deposit", 200),
        cashflow(4n, "withdrawal", 180),
      ],
    });

    expect(events.map((event) => [event.lifecycle, event.pnlUsdg])).toEqual([
      [1, 10],
      [2, -20],
    ]);
  });

  it("records a post-closure fee on its claim block", () => {
    const events = deriveRealizedEvents({
      liquidity: [liquidity(1n, 100n), liquidity(2n, -100n)],
      cashflows: [
        cashflow(1n, "deposit", 100),
        cashflow(2n, "withdrawal", 100),
        cashflow(3n, "fee", 12),
      ],
    });

    expect(events.at(-1)).toMatchObject({
      lifecycle: 1,
      kind: "late_fee",
      claimedFeesUsdg: 12,
      pnlUsdg: 12,
      blockNumber: 3n,
    });
  });

  it("groups timestamps using the Bangkok calendar day", () => {
    expect(bangkokDateKey(Date.parse("2026-07-01T17:30:00Z"))).toBe(
      "2026-07-02",
    );
  });
});

