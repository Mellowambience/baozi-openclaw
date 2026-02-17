# Telegram Market Feed Bot — Bounty #9

Read-only Telegram bot that brings Baozi prediction market data into Telegram groups. Browse markets, see live odds, get daily roundups — all linking back to baozi.bet.

## Features

- **`/markets`** — Top active markets with inline View buttons
- **`/markets <keyword>`** — Filter markets by category or keyword
- **`/odds <id>`** — Detailed odds, pool size, status, closing time
- **`/hot`** — Highest volume markets
- **`/closing`** — Markets closing within 24h
- **`/subscribe HH:MM`** — Daily roundup at your preferred time
- **`/unsubscribe`** — Stop daily updates
- **Inline keyboards** — View Market (link to baozi.bet), Share, Refresh buttons
- **Daily roundup cron** — Automated market summaries per-group at configurable times
- **60s response cache** — Protects against RPC rate limits

## Architecture

```
src/
├── bot.ts    — Main bot logic (grammY), commands, callbacks, cron
└── baozi.ts  — REST API client (baozi.bet/api/markets)
```

Uses the **Baozi REST API** (`https://baozi.bet/api/markets`) for market data — no heavy RPC calls needed. Supports both binary and race market types.

## Setup

```bash
cd integrations/telegram-market-bot
npm install
cp .env.example .env  # Add your TELEGRAM_BOT_TOKEN
npm run build
npm start
```

## Configuration (.env)

```env
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
```

## Deployment

Running as a systemd service:

```ini
[Unit]
Description=Baozi Telegram Market Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/telegram-market-bot
ExecStart=/usr/bin/node dist/bot.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/path/to/telegram-market-bot/.env

[Install]
WantedBy=multi-user.target
```

## Proof of Operation

- Bot: [@baozi_markets_bot](https://t.me/baozi_markets_bot)
- Running 24/7 as systemd service
- Active in 2 Telegram groups with real mainnet market data
- `/markets` returns 4+ active markets with pool sizes, odds, and inline buttons
- `/hot` returns top markets by volume
- All data sourced live from Baozi mainnet

## SOL Wallet

`FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz`
