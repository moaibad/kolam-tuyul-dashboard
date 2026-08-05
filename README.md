<p align="center">
  <img
    src="public/brand/kolam-tuyul-logo.png"
    alt="KolamTuyul logo"
    width="160"
  />
  <br />
  <a href="https://kolam-tuyul.moaibad.id">
    <img
      src="https://img.shields.io/badge/Live_Demo-kolam--tuyul.moaibad.id-8b5cf6?style=for-the-badge"
      alt="Open the KolamTuyul live demo"
    />
  </a>
</p>

# KolamTuyul Dashboard

A read-only dashboard for monitoring concentrated-liquidity positions across
the chains and protocols indexed by Krystal. It reads public position data
through a server-side API and
never requests a wallet connection, signature, private key, or seed phrase.

## Features

- Discovers open CLMM positions across Krystal-supported chains and protocols
  for any public EVM address.
- Filters positions by chain and protocol while keeping portfolio totals global.
- Displays current liquidity value, token composition, price range, and
  unclaimed fees.
- Displays Krystal deposit, withdrawal, fee, APR, impermanent-loss, and PnL
  metrics in USD.
- Provides a Bangkok-time realized PnL calendar for closed positions during
  the latest 365 days.
- Uses Krystal's cached snapshot for fast initial loads, immediately
  revalidates it, and polls a fresh snapshot every 30 seconds while the tracker
  tab is visible and online.
- Requires no database, RPC endpoint, API key, wallet connection, or secret.

## Requirements

- Node.js 20 or newer
- npm
- Network access to `api.krystal.app`

## Setup

```bash
npm install
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `GET /api/portfolio?address={EVM_ADDRESS}&refresh={0|1}`

- Returns `200` with the serialized portfolio snapshot.
- Uses Krystal cached data by default; `refresh=1` requests fresh on-chain data.
- Returns `400` when the address is missing or invalid.
- Returns `502` when Krystal data cannot be loaded or validated.
- Always sends `Cache-Control: no-store`.

### `GET /api/portfolio-calendar?address={EVM_ADDRESS}&month={YYYY-MM}`

- Returns multi-chain closed CLMM positions grouped by Krystal `closedTime` in
  Bangkok time, including chain and protocol identity.
- Includes every day in the latest 365-day window, including the partial
  boundary months.
- Uses Krystal's aggregate PnL, deposit, withdrawal, and claimed-fee values.
- Always sends `Cache-Control: no-store`.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
