import { createClient, type Client, type InValue, type Row } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { resolve } from 'node:path'
import type { RangeStatus } from '../types'
import type { AccountingStatus, PositionVersion } from '../types'
import { schema } from './schema'

export interface StoredPositionStatus {
  positionId: string
  lastStatus?: RangeStatus
  outOfRangeSinceMs?: number
}

export interface StoredDiscordReportMessage {
  messageId: string
  messageKey: string
  kind: 'portfolio' | 'position'
  positionId?: string
  generation: string
  status: 'current' | 'stale'
  createdAtMs: number
}

export interface StoredReferencePool {
  key: string
  version: 'v3'
  poolAddress: string
  token0Address: string
  token1Address: string
  feeTier: number
  liquidity: bigint
  discoveredBlock: bigint
  refreshedAtMs: number
}

export interface StoredPositionCashflow {
  blockNumber: bigint
  logIndex: number
  type: 'deposit' | 'withdrawal' | 'fee'
  token0Raw: bigint
  token1Raw: bigint
}

export interface PositionCashflowWrite {
  positionId: string
  txHash: string
  logIndex: number
  blockNumber: bigint
  timestampMs: number
  type: 'deposit' | 'withdrawal' | 'fee' | 'decrease' | 'principal_collect'
  token0Raw: bigint
  token1Raw: bigint
  valueUsdg: number
}

export interface PositionLiquidityEventWrite {
  positionId: string
  txHash: string
  logIndex: number
  blockNumber: bigint
  timestampMs: number
  liquidityDelta: bigint
}

export interface StoredRealizedEvent {
  eventKey: string
  walletAddress: string
  positionId: string
  lifecycle: number
  kind: 'closure' | 'late_fee'
  dateKey: string
  version: PositionVersion
  pair: string
  depositedUsdg: number
  withdrawnUsdg: number
  claimedFeesUsdg: number
  pnlUsdg: number
  blockNumber: bigint
  txHash: string
  status: 'complete' | 'unavailable'
  error?: string
}

export class StateDatabase {
  readonly db: Client
  readonly orm: LibSQLDatabase<typeof schema>

  constructor(url: string, authToken?: string) {
    this.db = createClient({ url: toLibsqlUrl(url), authToken })
    this.orm = drizzle(this.db, { schema })
  }

  close() {
    this.db.close()
  }

  async initialize() {
    await migrate(this.orm, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  }

  async listDiscordReportMessages(status?: StoredDiscordReportMessage['status']): Promise<StoredDiscordReportMessage[]> {
    const result = await this.db.execute(status
      ? { sql: 'SELECT message_id, message_key, kind, position_id, generation, status, created_at_ms FROM discord_report_messages WHERE status = ? ORDER BY created_at_ms DESC', args: [status] }
      : 'SELECT message_id, message_key, kind, position_id, generation, status, created_at_ms FROM discord_report_messages ORDER BY created_at_ms DESC')
    const rows = result.rows
    return rows.map((row) => ({
      messageId: String(row.message_id),
      messageKey: String(row.message_key),
      kind: String(row.kind) as StoredDiscordReportMessage['kind'],
      positionId: row.position_id == null ? undefined : String(row.position_id),
      generation: String(row.generation),
      status: String(row.status) as StoredDiscordReportMessage['status'],
      createdAtMs: Number(row.created_at_ms),
    }))
  }

  async seedDiscordReportMessages(messages: StoredDiscordReportMessage[]) {
    if (messages.length === 0) return
    await this.db.batch(messages.map((message) => statement(
      'INSERT OR IGNORE INTO discord_report_messages(message_id, message_key, kind, position_id, generation, status, created_at_ms) VALUES(?, ?, ?, ?, ?, ?, ?)',
      message.messageId, message.messageKey, message.kind, message.positionId ?? null, message.generation, message.status, message.createdAtMs,
    )), 'write')
  }

  async activateDiscordReportGeneration(messages: StoredDiscordReportMessage[]) {
    await this.db.batch([
      { sql: "UPDATE discord_report_messages SET status = 'stale' WHERE status = 'current'", args: [] },
      ...messages.map((message) => statement(
        'INSERT INTO discord_report_messages(message_id, message_key, kind, position_id, generation, status, created_at_ms) VALUES(?, ?, ?, ?, ?, ?, ?)',
        message.messageId, message.messageKey, message.kind, message.positionId ?? null, message.generation, 'current', message.createdAtMs,
      )),
    ], 'write')
  }

  async deleteDiscordReportMessage(messageId: string) {
    await this.execute('DELETE FROM discord_report_messages WHERE message_id = ?', messageId)
  }

  async getSyncBlock(key: string): Promise<bigint | undefined> {
    const row = await this.first('SELECT value FROM sync_state WHERE key = ?', key)
    return row ? BigInt(String(row.value)) : undefined
  }

  async setSyncBlock(key: string, blockNumber: bigint) {
    await this.execute('INSERT INTO sync_state(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, blockNumber.toString())
  }

  async upsertPosition(input: { positionId: string; version: string; manager: string; tokenId: bigint; mintTimestampMs?: number; mintBlock?: bigint }) {
    await this.execute(`
        INSERT INTO positions(position_id, version, manager, token_id, mint_timestamp_ms, mint_block)
        VALUES(?, ?, ?, ?, ?, ?)
        ON CONFLICT(position_id) DO UPDATE SET
          mint_timestamp_ms = COALESCE(excluded.mint_timestamp_ms, positions.mint_timestamp_ms),
          mint_block = COALESCE(excluded.mint_block, positions.mint_block)
      `, input.positionId, input.version, input.manager, input.tokenId.toString(), input.mintTimestampMs ?? null, input.mintBlock?.toString() ?? null)
  }

  async listPositions(): Promise<Array<{ positionId: string; version: PositionVersion; manager: string; tokenId: bigint; mintTimestampMs?: number; mintBlock?: bigint }>> {
    const rows = (await this.db.execute('SELECT position_id, version, manager, token_id, mint_timestamp_ms, mint_block FROM positions')).rows
    return rows.map((row) => ({
      positionId: String(row.position_id),
      version: String(row.version) as PositionVersion,
      manager: String(row.manager),
      tokenId: BigInt(String(row.token_id)),
      mintTimestampMs: row.mint_timestamp_ms == null ? undefined : Number(row.mint_timestamp_ms),
      mintBlock: row.mint_block == null ? undefined : BigInt(String(row.mint_block)),
    }))
  }

  async getPosition(positionId: string) {
    return (await this.listPositions()).find((position) => position.positionId === positionId)
  }

  async linkWalletPosition(walletAddress: string, positionId: string, lastSeenAtMs = Date.now()) {
    await this.execute(`
      INSERT INTO wallet_positions(wallet_address, position_id, last_seen_at_ms)
      VALUES(?, ?, ?)
      ON CONFLICT(wallet_address, position_id) DO UPDATE SET last_seen_at_ms = excluded.last_seen_at_ms
    `, walletAddress.toLowerCase(), positionId, lastSeenAtMs)
  }

  async listPositionsForWallet(walletAddress: string) {
    const rows = (await this.db.execute({
      sql: `
        SELECT p.position_id, p.version, p.manager, p.token_id, p.mint_timestamp_ms, p.mint_block
        FROM positions p
        INNER JOIN wallet_positions wp ON wp.position_id = p.position_id
        WHERE wp.wallet_address = ?
      `,
      args: [walletAddress.toLowerCase()],
    })).rows
    return rows.map((row) => ({
      positionId: String(row.position_id),
      version: String(row.version) as PositionVersion,
      manager: String(row.manager),
      tokenId: BigInt(String(row.token_id)),
      mintTimestampMs: row.mint_timestamp_ms == null ? undefined : Number(row.mint_timestamp_ms),
      mintBlock: row.mint_block == null ? undefined : BigInt(String(row.mint_block)),
    }))
  }

  async getMintTimestamp(positionId: string): Promise<number | undefined> {
    const row = await this.first('SELECT mint_timestamp_ms FROM positions WHERE position_id = ?', positionId)
    return row?.mint_timestamp_ms == null ? undefined : Number(row.mint_timestamp_ms)
  }

  async getPositionStatus(positionId: string): Promise<StoredPositionStatus> {
    const row = await this.first('SELECT last_status, out_of_range_since_ms FROM position_status WHERE position_id = ?', positionId)
    return { positionId, lastStatus: row?.last_status == null ? undefined : String(row.last_status) as RangeStatus, outOfRangeSinceMs: row?.out_of_range_since_ms == null ? undefined : Number(row.out_of_range_since_ms) }
  }

  async setPositionStatus(positionId: string, status: RangeStatus, outOfRangeSinceMs?: number) {
    await this.execute('INSERT INTO position_status(position_id, last_status, out_of_range_since_ms) VALUES(?, ?, ?) ON CONFLICT(position_id) DO UPDATE SET last_status = excluded.last_status, out_of_range_since_ms = excluded.out_of_range_since_ms', positionId, status, outOfRangeSinceMs ?? null)
  }

  async getAccounting(positionId: string) {
    const row = await this.first('SELECT status, deposited_usdg, withdrawn_usdg, claimed_fees_usdg, last_synced_block, error FROM position_accounting WHERE position_id = ?', positionId)
    return {
      status: row?.status == null ? ('syncing' as const) : String(row.status) as AccountingStatus,
      depositedUsdg: row?.deposited_usdg == null ? null : Number(row.deposited_usdg),
      withdrawnUsdg: row?.withdrawn_usdg == null ? null : Number(row.withdrawn_usdg),
      claimedFeesUsdg: row?.claimed_fees_usdg == null ? null : Number(row.claimed_fees_usdg),
      lastSyncedBlock: row?.last_synced_block == null ? undefined : BigInt(String(row.last_synced_block)),
      error: row?.error == null ? undefined : String(row.error),
    }
  }


  async setAccounting(input: { positionId: string; status: AccountingStatus; depositedUsdg: number | null; withdrawnUsdg: number | null; claimedFeesUsdg: number | null; lastSyncedBlock?: bigint; error?: string }) {
    await this.execute(`
        INSERT INTO position_accounting(position_id, status, deposited_usdg, withdrawn_usdg, claimed_fees_usdg, last_synced_block, error)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(position_id) DO UPDATE SET
          status = excluded.status,
          deposited_usdg = excluded.deposited_usdg,
          withdrawn_usdg = excluded.withdrawn_usdg,
          claimed_fees_usdg = excluded.claimed_fees_usdg,
          last_synced_block = excluded.last_synced_block,
          error = excluded.error
      `, input.positionId, input.status, input.depositedUsdg, input.withdrawnUsdg, input.claimedFeesUsdg, input.lastSyncedBlock?.toString() ?? null, input.error ?? null)
  }

  async insertPositionCashflow(input: PositionCashflowWrite) {
    await this.execute('INSERT OR IGNORE INTO position_cashflows_v2(position_id, tx_hash, log_index, block_number, timestamp_ms, type, token0_raw, token1_raw, value_usdg) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', input.positionId, input.txHash, input.logIndex, input.blockNumber.toString(), input.timestampMs, input.type, input.token0Raw.toString(), input.token1Raw.toString(), input.valueUsdg)
  }

  async commitAccountingBlock(input: {
    positionId: string
    blockNumber: bigint
    status: AccountingStatus
    cashflows?: PositionCashflowWrite[]
    liquidityEvents?: PositionLiquidityEventWrite[]
    error?: string
    leaseOwnerId?: string
  }) {
    const cashflows = input.cashflows ?? []
    const liquidityEvents = input.liquidityEvents ?? []
    await this.db.batch([
      ...cashflows.map((cashflow) => statement(
        'INSERT OR IGNORE INTO position_cashflows_v2(position_id, tx_hash, log_index, block_number, timestamp_ms, type, token0_raw, token1_raw, value_usdg) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        cashflow.positionId,
        cashflow.txHash,
        cashflow.logIndex,
        cashflow.blockNumber.toString(),
        cashflow.timestampMs,
        cashflow.type,
        cashflow.token0Raw.toString(),
        cashflow.token1Raw.toString(),
        cashflow.valueUsdg,
      )),
      ...liquidityEvents.map((event) => statement(
        'INSERT OR IGNORE INTO position_liquidity_events(position_id, tx_hash, log_index, block_number, timestamp_ms, liquidity_delta) VALUES(?, ?, ?, ?, ?, ?)',
        event.positionId,
        event.txHash,
        event.logIndex,
        event.blockNumber.toString(),
        event.timestampMs,
        event.liquidityDelta.toString(),
      )),
      {
        sql: `
          INSERT INTO position_accounting(position_id, status, deposited_usdg, withdrawn_usdg, claimed_fees_usdg, last_synced_block, error)
          VALUES(
            ?,
            ?,
            COALESCE((SELECT SUM(value_usdg) FROM position_cashflows_v2 WHERE position_id = ? AND type = 'deposit'), 0),
            COALESCE((SELECT SUM(value_usdg) FROM position_cashflows_v2 WHERE position_id = ? AND type = 'withdrawal'), 0),
            COALESCE((SELECT SUM(value_usdg) FROM position_cashflows_v2 WHERE position_id = ? AND type = 'fee'), 0),
            ?,
            ?
          )
          ON CONFLICT(position_id) DO UPDATE SET
            status = CASE
              WHEN position_accounting.last_synced_block IS NULL
                OR CAST(excluded.last_synced_block AS INTEGER) >= CAST(position_accounting.last_synced_block AS INTEGER)
              THEN excluded.status ELSE position_accounting.status END,
            deposited_usdg = excluded.deposited_usdg,
            withdrawn_usdg = excluded.withdrawn_usdg,
            claimed_fees_usdg = excluded.claimed_fees_usdg,
            last_synced_block = CASE
              WHEN position_accounting.last_synced_block IS NULL
                OR CAST(excluded.last_synced_block AS INTEGER) >= CAST(position_accounting.last_synced_block AS INTEGER)
              THEN excluded.last_synced_block ELSE position_accounting.last_synced_block END,
            error = CASE
              WHEN position_accounting.last_synced_block IS NULL
                OR CAST(excluded.last_synced_block AS INTEGER) >= CAST(position_accounting.last_synced_block AS INTEGER)
              THEN excluded.error ELSE position_accounting.error END
        `,
        args: [
          input.positionId,
          input.status,
          input.positionId,
          input.positionId,
          input.positionId,
          input.blockNumber.toString(),
          input.error ?? null,
        ],
      },
      ...(input.leaseOwnerId ? [{
        sql: 'UPDATE accounting_sync_leases SET expires_at_ms = ? WHERE position_id = ? AND owner_id = ?',
        args: [Date.now() + 5 * 60_000, input.positionId, input.leaseOwnerId],
      }] : []),
    ], 'write')
  }

  async markAccountingFailure(positionId: string, error: string, leaseOwnerId?: string) {
    const existing = await this.getAccounting(positionId)
    if (existing.lastSyncedBlock == null) {
      await this.setAccounting({
        positionId,
        status: 'unavailable',
        depositedUsdg: null,
        withdrawnUsdg: null,
        claimedFeesUsdg: null,
        error,
      })
      return
    }
    await this.commitAccountingBlock({
      positionId,
      blockNumber: existing.lastSyncedBlock,
      status: 'partial',
      error,
      leaseOwnerId,
    })
  }

  async acquireAccountingLease(positionId: string, ownerId: string, nowMs = Date.now()) {
    const expiresAtMs = nowMs + 5 * 60_000
    await this.execute(`
      INSERT INTO accounting_sync_leases(position_id, owner_id, expires_at_ms)
      VALUES(?, ?, ?)
      ON CONFLICT(position_id) DO UPDATE SET
        owner_id = excluded.owner_id,
        expires_at_ms = excluded.expires_at_ms
      WHERE accounting_sync_leases.expires_at_ms <= ? OR accounting_sync_leases.owner_id = ?
    `, positionId, ownerId, expiresAtMs, nowMs, ownerId)
    const row = await this.first('SELECT owner_id FROM accounting_sync_leases WHERE position_id = ?', positionId)
    return row?.owner_id === ownerId
  }

  async releaseAccountingLease(positionId: string, ownerId: string) {
    await this.execute('DELETE FROM accounting_sync_leases WHERE position_id = ? AND owner_id = ?', positionId, ownerId)
  }

  async getPositionCashflowTotals(positionId: string) {
    const rows = (await this.db.execute({ sql: 'SELECT type, SUM(value_usdg) AS total FROM position_cashflows_v2 WHERE position_id = ? GROUP BY type', args: [positionId] })).rows
    const totals = { depositedUsdg: 0, withdrawnUsdg: 0, claimedFeesUsdg: 0 }
    for (const row of rows) {
      if (row.type === 'deposit') totals.depositedUsdg = Number(row.total)
      if (row.type === 'withdrawal') totals.withdrawnUsdg = Number(row.total)
      if (row.type === 'fee') totals.claimedFeesUsdg = Number(row.total)
    }
    return totals
  }

  async listPositionCashflows(positionId: string): Promise<StoredPositionCashflow[]> {
    const rows = (await this.db.execute({
      sql: `
        SELECT block_number, log_index, type, token0_raw, token1_raw
        FROM position_cashflows_v2
        WHERE position_id = ? AND type IN ('deposit', 'withdrawal', 'fee')
        ORDER BY CAST(block_number AS INTEGER), log_index,
          CASE type WHEN 'deposit' THEN 0 WHEN 'withdrawal' THEN 1 ELSE 2 END
      `,
      args: [positionId],
    })).rows
    return rows.map((row) => ({
      blockNumber: BigInt(String(row.block_number)),
      logIndex: Number(row.log_index),
      type: String(row.type) as StoredPositionCashflow['type'],
      token0Raw: BigInt(String(row.token0_raw)),
      token1Raw: BigInt(String(row.token1_raw)),
    }))
  }

  async listRealizedCashflows(positionId: string) {
    const rows = (await this.db.execute({
      sql: `
        SELECT tx_hash, log_index, block_number, timestamp_ms, type, value_usdg
        FROM position_cashflows_v2
        WHERE position_id = ? AND type IN ('deposit', 'withdrawal', 'fee')
        ORDER BY CAST(block_number AS INTEGER), log_index
      `,
      args: [positionId],
    })).rows
    return rows.map((row) => ({
      txHash: String(row.tx_hash),
      logIndex: Number(row.log_index),
      blockNumber: BigInt(String(row.block_number)),
      timestampMs: Number(row.timestamp_ms),
      type: String(row.type) as 'deposit' | 'withdrawal' | 'fee',
      valueUsdg: Number(row.value_usdg),
    }))
  }

  async listLiquidityEvents(positionId: string) {
    const rows = (await this.db.execute({
      sql: `
        SELECT tx_hash, log_index, block_number, timestamp_ms, liquidity_delta
        FROM position_liquidity_events
        WHERE position_id = ?
        ORDER BY CAST(block_number AS INTEGER), log_index
      `,
      args: [positionId],
    })).rows
    return rows.map((row) => ({
      txHash: String(row.tx_hash),
      logIndex: Number(row.log_index),
      blockNumber: BigInt(String(row.block_number)),
      timestampMs: Number(row.timestamp_ms),
      liquidityDelta: BigInt(String(row.liquidity_delta)),
    }))
  }

  async upsertRealizedEvent(event: StoredRealizedEvent) {
    await this.execute(`
      INSERT INTO realized_position_events(
        event_key, wallet_address, position_id, lifecycle, kind, date_key, version, pair,
        deposited_usdg, withdrawn_usdg, claimed_fees_usdg, pnl_usdg,
        block_number, tx_hash, status, error
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_key) DO UPDATE SET
        wallet_address = excluded.wallet_address,
        date_key = excluded.date_key,
        pair = excluded.pair,
        deposited_usdg = excluded.deposited_usdg,
        withdrawn_usdg = excluded.withdrawn_usdg,
        claimed_fees_usdg = excluded.claimed_fees_usdg,
        pnl_usdg = excluded.pnl_usdg,
        block_number = excluded.block_number,
        tx_hash = excluded.tx_hash,
        status = excluded.status,
        error = excluded.error
    `,
    event.eventKey,
    event.walletAddress.toLowerCase(),
    event.positionId,
    event.lifecycle,
    event.kind,
    event.dateKey,
    event.version,
    event.pair,
    event.depositedUsdg,
    event.withdrawnUsdg,
    event.claimedFeesUsdg,
    event.pnlUsdg,
    event.blockNumber.toString(),
    event.txHash,
    event.status,
    event.error ?? null)
  }

  async listRealizedEvents(walletAddress: string, month: string): Promise<StoredRealizedEvent[]> {
    const rows = (await this.db.execute({
      sql: `
        SELECT event_key, wallet_address, position_id, lifecycle, kind, date_key, version, pair,
          deposited_usdg, withdrawn_usdg, claimed_fees_usdg, pnl_usdg,
          block_number, tx_hash, status, error
        FROM realized_position_events
        WHERE wallet_address = ? AND date_key LIKE ?
        ORDER BY date_key, CAST(block_number AS INTEGER)
      `,
      args: [walletAddress.toLowerCase(), `${month}-%`],
    })).rows
    return rows.map((row) => ({
      eventKey: String(row.event_key),
      walletAddress: String(row.wallet_address),
      positionId: String(row.position_id),
      lifecycle: Number(row.lifecycle),
      kind: String(row.kind) as StoredRealizedEvent['kind'],
      dateKey: String(row.date_key),
      version: String(row.version) as PositionVersion,
      pair: String(row.pair),
      depositedUsdg: Number(row.deposited_usdg),
      withdrawnUsdg: Number(row.withdrawn_usdg),
      claimedFeesUsdg: Number(row.claimed_fees_usdg),
      pnlUsdg: Number(row.pnl_usdg),
      blockNumber: BigInt(String(row.block_number)),
      txHash: String(row.tx_hash),
      status: String(row.status) as StoredRealizedEvent['status'],
      error: row.error == null ? undefined : String(row.error),
    }))
  }

  async getCalendarBackfill(walletAddress: string) {
    const row = await this.first(
      'SELECT state, completed, total, retryable, error, lease_owner_id, lease_expires_at_ms, updated_at_ms FROM calendar_backfills WHERE wallet_address = ?',
      walletAddress.toLowerCase(),
    )
    if (!row) {
      return {
        state: 'idle' as const,
        completed: 0,
        total: 0,
        retryable: true,
        updatedAtMs: 0,
      }
    }
    return {
      state: String(row.state) as 'idle' | 'running' | 'complete' | 'partial' | 'failed',
      completed: Number(row.completed),
      total: Number(row.total),
      retryable: Boolean(row.retryable),
      error: row.error == null ? undefined : String(row.error),
      leaseOwnerId: row.lease_owner_id == null ? undefined : String(row.lease_owner_id),
      leaseExpiresAtMs: row.lease_expires_at_ms == null ? undefined : Number(row.lease_expires_at_ms),
      updatedAtMs: Number(row.updated_at_ms),
    }
  }

  async setCalendarBackfill(input: {
    walletAddress: string
    state: 'idle' | 'running' | 'complete' | 'partial' | 'failed'
    completed: number
    total: number
    retryable: boolean
    error?: string
    leaseOwnerId?: string
    leaseExpiresAtMs?: number
    updatedAtMs?: number
  }) {
    await this.execute(`
      INSERT INTO calendar_backfills(
        wallet_address, state, completed, total, retryable, error,
        lease_owner_id, lease_expires_at_ms, updated_at_ms
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet_address) DO UPDATE SET
        state = excluded.state,
        completed = excluded.completed,
        total = excluded.total,
        retryable = excluded.retryable,
        error = excluded.error,
        lease_owner_id = excluded.lease_owner_id,
        lease_expires_at_ms = excluded.lease_expires_at_ms,
        updated_at_ms = excluded.updated_at_ms
    `,
    input.walletAddress.toLowerCase(),
    input.state,
    input.completed,
    input.total,
    input.retryable ? 1 : 0,
    input.error ?? null,
    input.leaseOwnerId ?? null,
    input.leaseExpiresAtMs ?? null,
    input.updatedAtMs ?? Date.now())
  }

  async getPendingPrincipal(positionId: string): Promise<[bigint, bigint]> {
    const rows = (await this.db.execute({ sql: "SELECT type, token0_raw, token1_raw FROM position_cashflows_v2 WHERE position_id = ? AND type IN ('decrease', 'principal_collect')", args: [positionId] })).rows
    let amount0 = 0n
    let amount1 = 0n
    for (const row of rows) {
      const sign = row.type === 'decrease' ? 1n : -1n
      amount0 += sign * BigInt(String(row.token0_raw))
      amount1 += sign * BigInt(String(row.token1_raw))
    }
    return [amount0 > 0n ? amount0 : 0n, amount1 > 0n ? amount1 : 0n]
  }

  async getToken(address: string) {
    const row = await this.first('SELECT symbol, decimals FROM token_metadata WHERE address = ?', address.toLowerCase())
    return row ? { symbol: String(row.symbol), decimals: Number(row.decimals) } : undefined
  }

  async setToken(address: string, symbol: string, decimals: number) {
    await this.execute('INSERT INTO token_metadata(address, symbol, decimals) VALUES(?, ?, ?) ON CONFLICT(address) DO UPDATE SET symbol = excluded.symbol, decimals = excluded.decimals', address.toLowerCase(), symbol, decimals)
  }

  async listReferencePools(): Promise<StoredReferencePool[]> {
    const rows = (await this.db.execute('SELECT pool_key, version, pool_address, token0_address, token1_address, fee_tier, liquidity, discovered_block, refreshed_at_ms FROM reference_pools')).rows
    return rows.map((row) => ({
      key: String(row.pool_key),
      version: String(row.version) as 'v3',
      poolAddress: String(row.pool_address),
      token0Address: String(row.token0_address),
      token1Address: String(row.token1_address),
      feeTier: Number(row.fee_tier),
      liquidity: BigInt(String(row.liquidity)),
      discoveredBlock: BigInt(String(row.discovered_block)),
      refreshedAtMs: Number(row.refreshed_at_ms),
    }))
  }

  async upsertReferencePool(pool: StoredReferencePool) {
    await this.execute(`
      INSERT INTO reference_pools(pool_key, version, pool_address, token0_address, token1_address, fee_tier, liquidity, discovered_block, refreshed_at_ms)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pool_key) DO UPDATE SET
        liquidity = excluded.liquidity,
        refreshed_at_ms = excluded.refreshed_at_ms
    `, pool.key, pool.version, pool.poolAddress.toLowerCase(), pool.token0Address.toLowerCase(), pool.token1Address.toLowerCase(),
    pool.feeTier, pool.liquidity.toString(), pool.discoveredBlock.toString(), pool.refreshedAtMs)
  }

  private async execute(sql: string, ...args: InValue[]) {
    return this.db.execute({ sql, args })
  }

  private async first(sql: string, ...args: InValue[]): Promise<Row | undefined> {
    return (await this.execute(sql, ...args)).rows[0]
  }
}

function statement(sql: string, ...args: InValue[]) {
  return { sql, args }
}

function toLibsqlUrl(path: string) {
  if (path === ':memory:') return ':memory:'
  if (/^(file|libsql|https?):/.test(path)) return path
  return `file:${path.replaceAll('\\', '/')}`
}
