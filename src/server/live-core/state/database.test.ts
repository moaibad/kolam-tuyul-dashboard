import { afterEach, describe, expect, it } from 'vitest'
import { StateDatabase } from './database'

const databases: StateDatabase[] = []

afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

describe('shared Turso state database', () => {
  it('commits cashflows and accounting checkpoint atomically without duplicates', async () => {
    const database = new StateDatabase(':memory:')
    databases.push(database)
    await database.initialize()
    const cashflow = { positionId: 'v4:manager:1', txHash: '0x01', logIndex: 1, blockNumber: 10n, timestampMs: 20, type: 'deposit' as const, token0Raw: 1n, token1Raw: 2n, valueUsdg: 30 }

    await database.commitAccountingBlock({ positionId: cashflow.positionId, blockNumber: 10n, status: 'partial', cashflows: [cashflow] })
    await database.commitAccountingBlock({ positionId: cashflow.positionId, blockNumber: 10n, status: 'partial', cashflows: [cashflow] })

    expect(await database.getAccounting(cashflow.positionId)).toMatchObject({
      status: 'partial',
      depositedUsdg: 30,
      lastSyncedBlock: 10n,
    })
    expect(await database.listPositionCashflows(cashflow.positionId)).toHaveLength(1)
  })

  it('keeps checkpoints monotonic and coordinates accounting leases', async () => {
    const database = new StateDatabase(':memory:')
    databases.push(database)
    await database.initialize()
    await database.commitAccountingBlock({ positionId: 'v4:manager:1', blockNumber: 20n, status: 'synced' })
    await database.commitAccountingBlock({ positionId: 'v4:manager:1', blockNumber: 10n, status: 'partial', error: 'stale' })

    expect(await database.getAccounting('v4:manager:1')).toMatchObject({ status: 'synced', lastSyncedBlock: 20n })
    expect(await database.acquireAccountingLease('v4:manager:1', 'owner-a', 1_000)).toBe(true)
    expect(await database.acquireAccountingLease('v4:manager:1', 'owner-b', 1_001)).toBe(false)
    expect(await database.acquireAccountingLease('v4:manager:1', 'owner-b', 301_001)).toBe(true)
  })

  it('scopes cached discovery candidates to their wallet', async () => {
    const database = new StateDatabase(':memory:')
    databases.push(database)
    await database.initialize()
    await database.upsertPosition({ positionId: 'v4:manager:1', version: 'v4', manager: 'manager', tokenId: 1n })
    await database.upsertPosition({ positionId: 'v4:manager:2', version: 'v4', manager: 'manager', tokenId: 2n })
    await database.linkWalletPosition('0xwallet-a', 'v4:manager:1')
    await database.linkWalletPosition('0xwallet-b', 'v4:manager:2')

    expect((await database.listPositionsForWallet('0xwallet-a')).map((position) => position.positionId)).toEqual(['v4:manager:1'])
    expect((await database.listPositionsForWallet('0xwallet-b')).map((position) => position.positionId)).toEqual(['v4:manager:2'])
  })

  it('deduplicates liquidity and realized events across retries', async () => {
    const database = new StateDatabase(':memory:')
    databases.push(database)
    await database.initialize()
    const liquidityEvent = {
      positionId: 'v3:manager:7',
      txHash: '0xclose',
      logIndex: 1,
      blockNumber: 42n,
      timestampMs: 1_000,
      liquidityDelta: -100n,
    }

    await database.commitAccountingBlock({
      positionId: liquidityEvent.positionId,
      blockNumber: 42n,
      status: 'synced',
      liquidityEvents: [liquidityEvent],
    })
    await database.commitAccountingBlock({
      positionId: liquidityEvent.positionId,
      blockNumber: 42n,
      status: 'synced',
      liquidityEvents: [liquidityEvent],
    })
    expect(await database.listLiquidityEvents(liquidityEvent.positionId)).toHaveLength(1)

    const realized = {
      eventKey: 'wallet:v3:manager:7:closure:1',
      walletAddress: '0xwallet',
      positionId: liquidityEvent.positionId,
      lifecycle: 1,
      kind: 'closure' as const,
      dateKey: '2026-07-01',
      version: 'v3' as const,
      pair: 'ETH / USDC',
      depositedUsdg: 100,
      withdrawnUsdg: 110,
      claimedFeesUsdg: 2,
      pnlUsdg: 12,
      blockNumber: 42n,
      txHash: '0xclose',
      status: 'complete' as const,
    }
    await database.upsertRealizedEvent(realized)
    await database.upsertRealizedEvent(realized)
    expect(await database.listRealizedEvents('0xwallet', '2026-07')).toHaveLength(1)
  })

  it('stores calendar backfill progress per wallet', async () => {
    const database = new StateDatabase(':memory:')
    databases.push(database)
    await database.initialize()
    await database.setCalendarBackfill({
      walletAddress: '0xwallet',
      state: 'partial',
      completed: 2,
      total: 3,
      retryable: true,
      error: 'historical state unavailable',
    })

    expect(await database.getCalendarBackfill('0xwallet')).toMatchObject({
      state: 'partial',
      completed: 2,
      total: 3,
      retryable: true,
      error: 'historical state unavailable',
    })
  })
})
