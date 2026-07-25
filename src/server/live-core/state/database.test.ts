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
})
