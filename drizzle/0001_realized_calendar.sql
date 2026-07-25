CREATE TABLE `position_liquidity_events` (
  `position_id` text NOT NULL,
  `tx_hash` text NOT NULL,
  `log_index` integer NOT NULL,
  `block_number` text NOT NULL,
  `timestamp_ms` integer NOT NULL,
  `liquidity_delta` text NOT NULL,
  PRIMARY KEY(`position_id`, `tx_hash`, `log_index`)
);
--> statement-breakpoint
CREATE INDEX `position_liquidity_position_block_idx` ON `position_liquidity_events` (`position_id`,`block_number`);
--> statement-breakpoint
CREATE TABLE `realized_position_events` (
  `event_key` text PRIMARY KEY NOT NULL,
  `wallet_address` text NOT NULL,
  `position_id` text NOT NULL,
  `lifecycle` integer NOT NULL,
  `kind` text NOT NULL,
  `date_key` text NOT NULL,
  `version` text NOT NULL,
  `pair` text NOT NULL,
  `deposited_usdg` real NOT NULL,
  `withdrawn_usdg` real NOT NULL,
  `claimed_fees_usdg` real NOT NULL,
  `pnl_usdg` real NOT NULL,
  `block_number` text NOT NULL,
  `tx_hash` text NOT NULL,
  `status` text NOT NULL,
  `error` text
);
--> statement-breakpoint
CREATE INDEX `realized_events_wallet_date_idx` ON `realized_position_events` (`wallet_address`,`date_key`);
--> statement-breakpoint
CREATE INDEX `realized_events_position_idx` ON `realized_position_events` (`position_id`);
--> statement-breakpoint
CREATE TABLE `calendar_backfills` (
  `wallet_address` text PRIMARY KEY NOT NULL,
  `state` text NOT NULL,
  `completed` integer NOT NULL,
  `total` integer NOT NULL,
  `retryable` integer NOT NULL,
  `error` text,
  `lease_owner_id` text,
  `lease_expires_at_ms` integer,
  `updated_at_ms` integer NOT NULL
);
