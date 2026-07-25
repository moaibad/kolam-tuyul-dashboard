# KolamTuyul Dashboard

A production-oriented, read-only dashboard for monitoring Uniswap v3 and v4
liquidity positions on Robinhood Chain. It reads public on-chain data through a
server-side API and never requests a wallet connection, signature, private key,
or seed phrase.

## Features

- Discovers open Uniswap v3 and v4 positions for any public EVM address.
- Displays current liquidity value, token composition, price range, and
  unclaimed fees.
- Reconstructs deposits, withdrawals, claimed fees, and profit/loss from
  historical on-chain events.
- Keeps blockchain and Blockscout access on the server.
- Uses the same Turso schema and accounting checkpoints as the notifier.
- Preserves available real-time data when historical accounting is incomplete
  and resumes from the last completed block.

## Requirements

- Node.js 20 or newer
- npm
- Network access to the Robinhood Chain public RPC and Blockscout

## Local development

```bash
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then enter a public EVM
wallet address. The selected address is kept only in the dashboard's local
component state and is cleared when the page reloads.

## Production

```bash
npm install
npm run build
npm run start
```

Configure `ROBINHOOD_RPC_URL`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` as
server-only environment variables. Historical accounting is committed in
atomic block groups and shared with the notifier. When only part of a scan
fails, current position data remains visible, the checkpoint is retained, and
unsafe accounting values are shown as partial or unavailable.

The notifier carries the same migration history. Migration jobs for the shared
database must not run concurrently.

## API

### `GET /api/portfolio?address={EVM_ADDRESS}`

- Returns `200` with the serialized portfolio snapshot.
- Returns `400` when the address is missing or invalid.
- Returns `502` when upstream blockchain data cannot be loaded.
- Always sends `Cache-Control: no-store`.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
