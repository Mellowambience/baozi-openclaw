# Claim & Alert Agent — Bounty #11

Portfolio monitoring agent that watches Baozi wallets and sends notifications when action is needed.

## Features

- **Claimable winnings alerts** — Detects unclaimed SOL from resolved/cancelled markets
- **Market closing soon** — Alerts when markets you're positioned in are closing within configurable hours
- **Odds shift detection** — Alerts on significant odds movement (configurable threshold)
- **Multi-wallet support** — Monitor multiple wallets simultaneously
- **Webhook notifications** — POST alerts to any webhook URL (Telegram, Discord, Slack, etc.)
- **File logging** — All alerts logged to `alerts.log` for audit/proof
- **Rate-limit aware** — Configurable delays between RPC calls to respect Solana rate limits
- **State persistence** — Tracks seen alerts to avoid duplicates across restarts

## Architecture

```
src/
├── index.ts          — Entry point, signal handling, polling loop
├── config.ts         — Environment-based configuration
├── baozi.ts          — Solana RPC client (getProgramAccounts, position/market decoding)
├── baozi-constants.ts — Program ID, discriminators, seeds
├── monitor.ts        — Core monitoring logic (claimable, closing, odds shift detection)
├── notifier.ts       — Webhook + file-based alert delivery
└── state.ts          — Persistent state (seen alerts, last known odds)
```

## Setup

```bash
cd integrations/claim-alert-agent
npm install
cp .env.example .env  # Edit with your config
npm run build
npm start
```

## Configuration (.env)

```env
WALLET_ADDRESSES=wallet1,wallet2,wallet3
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
POLL_INTERVAL_MINUTES=15
CLOSING_SOON_HOURS=6
ODDS_SHIFT_THRESHOLD=15
DELAY_BETWEEN_WALLETS_MS=3000
DELAY_BETWEEN_MARKETS_MS=2000
```

## Deployment

Runs as a systemd service for 24/7 monitoring:

```ini
[Unit]
Description=Baozi Claim & Alert Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/claim-alert-agent
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=30
EnvironmentFile=/path/to/claim-alert-agent/.env

[Install]
WantedBy=multi-user.target
```

## Proof of Operation

- Deployed on live server monitoring 3 mainnet wallets
- Running 24/7 as systemd service (`baozi-claim-alert.service`)
- Alert #1 triggered: wallet `6j3iaENM2m6trVsqzz6F7WWLt2s7BrQjtCx77zdgv2oU` has 0.02 SOL claimable from cancelled Shiffrin market
- All alerts logged to `alerts.log` with timestamps

## Data Source

Uses Solana RPC `getProgramAccounts` with Borsh-compatible buffer decoding against the Baozi program (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`). Decodes market accounts, user positions, and calculates claimable amounts directly from on-chain data.

## SOL Wallet

`FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz`
