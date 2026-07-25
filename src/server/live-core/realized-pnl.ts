export interface RealizedLiquidityEvent {
  blockNumber: bigint;
  logIndex: number;
  timestampMs: number;
  liquidityDelta: bigint;
  txHash: string;
}

export interface RealizedCashflowEvent {
  blockNumber: bigint;
  logIndex: number;
  timestampMs: number;
  type: "deposit" | "withdrawal" | "fee";
  valueUsdg: number;
  txHash: string;
}

export interface DerivedRealizedEvent {
  key: string;
  lifecycle: number;
  kind: "closure" | "late_fee";
  timestampMs: number;
  blockNumber: bigint;
  txHash: string;
  depositedUsdg: number;
  withdrawnUsdg: number;
  claimedFeesUsdg: number;
  pnlUsdg: number;
}

export function deriveRealizedEvents(input: {
  liquidity: RealizedLiquidityEvent[];
  cashflows: RealizedCashflowEvent[];
}): DerivedRealizedEvent[] {
  const blocks = new Map<
    string,
    {
      blockNumber: bigint;
      liquidity: RealizedLiquidityEvent[];
      cashflows: RealizedCashflowEvent[];
    }
  >();

  for (const event of input.liquidity) {
    const key = event.blockNumber.toString();
    const block = blocks.get(key) ?? {
      blockNumber: event.blockNumber,
      liquidity: [],
      cashflows: [],
    };
    block.liquidity.push(event);
    blocks.set(key, block);
  }
  for (const event of input.cashflows) {
    const key = event.blockNumber.toString();
    const block = blocks.get(key) ?? {
      blockNumber: event.blockNumber,
      liquidity: [],
      cashflows: [],
    };
    block.cashflows.push(event);
    blocks.set(key, block);
  }

  let liquidity = 0n;
  let lifecycle = 0;
  let totals = emptyTotals();
  const result: DerivedRealizedEvent[] = [];
  const orderedBlocks = [...blocks.values()].sort((a, b) =>
    a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0,
  );

  for (const block of orderedBlocks) {
    const wasActive = liquidity > 0n;
    const orderedLiquidity = [...block.liquidity].sort(
      (a, b) => a.logIndex - b.logIndex,
    );
    const orderedCashflows = [...block.cashflows].sort(
      (a, b) => a.logIndex - b.logIndex,
    );
    const blockDelta = orderedLiquidity.reduce(
      (sum, event) => sum + event.liquidityDelta,
      0n,
    );
    const nextLiquidity = liquidity + blockDelta;
    const opens = !wasActive && nextLiquidity > 0n;
    const closes = (wasActive || opens) && nextLiquidity === 0n && blockDelta < 0n;

    if (opens) {
      lifecycle += 1;
      totals = emptyTotals();
    }

    for (const cashflow of orderedCashflows) {
      if (!wasActive && !opens && cashflow.type === "fee") {
        result.push({
          key: `late_fee:${cashflow.txHash}:${cashflow.logIndex}`,
          lifecycle,
          kind: "late_fee",
          timestampMs: cashflow.timestampMs,
          blockNumber: cashflow.blockNumber,
          txHash: cashflow.txHash,
          depositedUsdg: 0,
          withdrawnUsdg: 0,
          claimedFeesUsdg: cashflow.valueUsdg,
          pnlUsdg: cashflow.valueUsdg,
        });
        continue;
      }
      if (!wasActive && !opens) continue;
      if (cashflow.type === "deposit") totals.deposited += cashflow.valueUsdg;
      if (cashflow.type === "withdrawal")
        totals.withdrawn += cashflow.valueUsdg;
      if (cashflow.type === "fee") totals.fees += cashflow.valueUsdg;
    }

    if (closes) {
      const marker =
        orderedLiquidity.at(-1) ??
        ({
          blockNumber: block.blockNumber,
          logIndex: 0,
          timestampMs: orderedCashflows.at(-1)?.timestampMs ?? 0,
          txHash: orderedCashflows.at(-1)?.txHash ?? "",
        } as RealizedLiquidityEvent);
      result.push({
        key: `closure:${lifecycle}:${marker.txHash}:${marker.logIndex}`,
        lifecycle,
        kind: "closure",
        timestampMs: marker.timestampMs,
        blockNumber: marker.blockNumber,
        txHash: marker.txHash,
        depositedUsdg: totals.deposited,
        withdrawnUsdg: totals.withdrawn,
        claimedFeesUsdg: totals.fees,
        pnlUsdg: totals.withdrawn + totals.fees - totals.deposited,
      });
      totals = emptyTotals();
    }

    liquidity = nextLiquidity > 0n ? nextLiquidity : 0n;
  }

  return result;
}

export function bangkokDateKey(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function persistRealizedPositionEvents(input: {
  db: import("./state/database").StateDatabase;
  walletAddress: string;
  positionId: string;
  version: "v3" | "v4";
  pair: string;
}) {
  const [liquidity, cashflows] = await Promise.all([
    input.db.listLiquidityEvents(input.positionId),
    input.db.listRealizedCashflows(input.positionId),
  ]);
  const events = deriveRealizedEvents({ liquidity, cashflows });
  for (const event of events) {
    await input.db.upsertRealizedEvent({
      eventKey: `${input.walletAddress.toLowerCase()}:${input.positionId}:${event.key}`,
      walletAddress: input.walletAddress,
      positionId: input.positionId,
      lifecycle: event.lifecycle,
      kind: event.kind,
      dateKey: bangkokDateKey(event.timestampMs),
      version: input.version,
      pair: input.pair,
      depositedUsdg: event.depositedUsdg,
      withdrawnUsdg: event.withdrawnUsdg,
      claimedFeesUsdg: event.claimedFeesUsdg,
      pnlUsdg: event.pnlUsdg,
      blockNumber: event.blockNumber,
      txHash: event.txHash,
      status: "complete",
    });
  }
  return events.length;
}

function emptyTotals() {
  return { deposited: 0, withdrawn: 0, fees: 0 };
}
