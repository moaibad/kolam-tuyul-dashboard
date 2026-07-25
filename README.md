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
- Uses an in-memory SQLite database as a request-scoped calculation workspace.
  No wallet address or portfolio data is persisted.
- Preserves available real-time data when historical accounting is incomplete.

## Requirements

- Node.js 20 or newer
- npm
- Network access to the Robinhood Chain public RPC and Blockscout

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then enter a public EVM
wallet address. The selected address is stored only in the browser URL as the
`?address=` query parameter.

## Production

```bash
npm install
npm run build
npm run start
```

The application currently uses the Robinhood Chain public RPC endpoint. Full
historical accounting can be slow or rate-limited because every request is
calculated without persistent storage. When only part of the historical scan
fails, current position data remains visible and unsafe accounting values are
shown as `Unavailable`.

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
