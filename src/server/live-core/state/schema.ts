import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const positions = sqliteTable('positions', {
  positionId: text('position_id').primaryKey(),
  version: text('version').notNull(),
  manager: text('manager').notNull(),
  tokenId: text('token_id').notNull(),
  mintTimestampMs: integer('mint_timestamp_ms'),
  mintBlock: text('mint_block'),
})

export const walletPositions = sqliteTable('wallet_positions', {
  walletAddress: text('wallet_address').notNull(),
  positionId: text('position_id').notNull(),
  lastSeenAtMs: integer('last_seen_at_ms').notNull(),
}, (table) => [
  primaryKey({ columns: [table.walletAddress, table.positionId] }),
  index('wallet_positions_position_idx').on(table.positionId),
])

export const positionStatus = sqliteTable('position_status', {
  positionId: text('position_id').primaryKey(),
  lastStatus: text('last_status'),
  outOfRangeSinceMs: integer('out_of_range_since_ms'),
})

export const positionAccounting = sqliteTable('position_accounting', {
  positionId: text('position_id').primaryKey(),
  status: text('status').notNull(),
  depositedUsdg: real('deposited_usdg'),
  withdrawnUsdg: real('withdrawn_usdg'),
  claimedFeesUsdg: real('claimed_fees_usdg'),
  lastSyncedBlock: text('last_synced_block'),
  error: text('error'),
})

export const positionCashflows = sqliteTable('position_cashflows_v2', {
  positionId: text('position_id').notNull(),
  txHash: text('tx_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  blockNumber: text('block_number').notNull(),
  timestampMs: integer('timestamp_ms').notNull(),
  type: text('type').notNull(),
  token0Raw: text('token0_raw').notNull(),
  token1Raw: text('token1_raw').notNull(),
  valueUsdg: real('value_usdg').notNull(),
}, (table) => [
  primaryKey({ columns: [table.positionId, table.txHash, table.logIndex, table.type] }),
  index('position_cashflows_position_block_idx').on(table.positionId, table.blockNumber),
])

export const tokenMetadata = sqliteTable('token_metadata', {
  address: text('address').primaryKey(),
  symbol: text('symbol').notNull(),
  decimals: integer('decimals').notNull(),
})

export const discordReportMessages = sqliteTable('discord_report_messages', {
  messageId: text('message_id').primaryKey(),
  messageKey: text('message_key').notNull(),
  kind: text('kind').notNull(),
  positionId: text('position_id'),
  generation: text('generation').notNull(),
  status: text('status').notNull(),
  createdAtMs: integer('created_at_ms').notNull(),
}, (table) => [
  index('discord_report_messages_status_idx').on(table.status),
])

export const referencePools = sqliteTable('reference_pools', {
  poolKey: text('pool_key').primaryKey(),
  version: text('version').notNull(),
  poolAddress: text('pool_address').notNull(),
  token0Address: text('token0_address').notNull(),
  token1Address: text('token1_address').notNull(),
  feeTier: integer('fee_tier').notNull(),
  liquidity: text('liquidity').notNull(),
  discoveredBlock: text('discovered_block').notNull(),
  refreshedAtMs: integer('refreshed_at_ms').notNull(),
}, (table) => [
  index('reference_pools_pair_idx').on(table.token0Address, table.token1Address),
])

export const accountingSyncLeases = sqliteTable('accounting_sync_leases', {
  positionId: text('position_id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  expiresAtMs: integer('expires_at_ms').notNull(),
})

export const positionLiquidityEvents = sqliteTable('position_liquidity_events', {
  positionId: text('position_id').notNull(),
  txHash: text('tx_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  blockNumber: text('block_number').notNull(),
  timestampMs: integer('timestamp_ms').notNull(),
  liquidityDelta: text('liquidity_delta').notNull(),
}, (table) => [
  primaryKey({ columns: [table.positionId, table.txHash, table.logIndex] }),
  index('position_liquidity_position_block_idx').on(table.positionId, table.blockNumber),
])

export const realizedPositionEvents = sqliteTable('realized_position_events', {
  eventKey: text('event_key').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  positionId: text('position_id').notNull(),
  lifecycle: integer('lifecycle').notNull(),
  kind: text('kind').notNull(),
  dateKey: text('date_key').notNull(),
  version: text('version').notNull(),
  pair: text('pair').notNull(),
  depositedUsdg: real('deposited_usdg').notNull(),
  withdrawnUsdg: real('withdrawn_usdg').notNull(),
  claimedFeesUsdg: real('claimed_fees_usdg').notNull(),
  pnlUsdg: real('pnl_usdg').notNull(),
  blockNumber: text('block_number').notNull(),
  txHash: text('tx_hash').notNull(),
  status: text('status').notNull(),
  error: text('error'),
}, (table) => [
  index('realized_events_wallet_date_idx').on(table.walletAddress, table.dateKey),
  index('realized_events_position_idx').on(table.positionId),
])

export const calendarBackfills = sqliteTable('calendar_backfills', {
  walletAddress: text('wallet_address').primaryKey(),
  state: text('state').notNull(),
  completed: integer('completed').notNull(),
  total: integer('total').notNull(),
  retryable: integer('retryable', { mode: 'boolean' }).notNull(),
  error: text('error'),
  leaseOwnerId: text('lease_owner_id'),
  leaseExpiresAtMs: integer('lease_expires_at_ms'),
  updatedAtMs: integer('updated_at_ms').notNull(),
})

export const schema = {
  syncState,
  positions,
  walletPositions,
  positionStatus,
  positionAccounting,
  positionCashflows,
  tokenMetadata,
  discordReportMessages,
  referencePools,
  accountingSyncLeases,
  positionLiquidityEvents,
  realizedPositionEvents,
  calendarBackfills,
}
