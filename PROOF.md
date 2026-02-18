# Baozi Bot Deployment Proof — Live Mainnet Data

## API Verification
- **Endpoint**: `GET https://baozi.bet/api/markets`
- **Response**: 64 total markets (9 active, 3 resolved, 52 other states)
- **Timestamp**: 2026-02-18T22:14:00Z

## Telegram Bot (@aetherrosebot) — Bounties #9 + #11

### Commands Verified Against Mainnet:

**`/markets` output (top 5 by pool):**
```
📊 Will @baozibet tweet a pizza emoji by March 1?
Yes: 100.0% | No: 0.0% | Pool: 0.05 SOL | Closes: 8d 1h

📊 [TEST] Will this private market resolve YES?
Yes: 66.7% | No: 33.3% | Pool: 0.03 SOL

📊 Will Real Madrid advance past UCL playoff round?
Yes: 100.0% | No: 0.0% | Pool: 0.02 SOL

📊 Will "Sinners" win BAFTA Best Film 2026?
Yes: 50.0% | No: 50.0% | Pool: 0 | Closes: 2d 13h

📊 Will SOL close above $170 on 2026-02-25?
Yes: 50.0% | No: 50.0% | Closes: 6d 6h
```

**`/hot` output:**
```
🔥 Hottest Markets by Pool Size
1. @baozibet pizza emoji — 0.05 SOL pool
2. Private test market — 0.03 SOL pool
3. Real Madrid UCL — 0.02 SOL pool
```

**`/watch` + `/check` (Alert Agent):**
- Wallet monitoring with configurable threshold alerts
- Polls /api/markets every 15 min for odds shifts, closing-soon, resolved markets
- Commands: /watch, /unwatch, /status, /check, /config

### Unified Architecture
Both Telegram Bot (#9) and Claim Alert Agent (#11) merged into single process to avoid Telegram polling conflict. Single `TELEGRAM_BOT_TOKEN` env var, one deployment.

## Discord Bot — Bounty #10
- Slash commands: /markets, /hot, /closing, /odds, /portfolio, /race
- Rich embeds with progress bars
- Daily roundup with refresh buttons
- Env: `DISCORD_BOT_TOKEN` + `DISCORD_CLIENT_ID`

## Deployment
All services configured for Render free tier (Worker type):
- `render.yaml` in repo root
- Dockerfiles in each service directory
- One-click: https://render.com/deploy?repo=https://github.com/Mellowambience/baozi-openclaw

## Tech Stack
- TypeScript + Node.js 20
- `node-telegram-bot-api` (Telegram)
- `discord.js` v14 (Discord)
- API: `https://baozi.bet/api/markets` (confirmed working mainnet)
