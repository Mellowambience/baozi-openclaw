# Baozi Telegram Market Feed Bot

Read-only Telegram bot that brings Baozi prediction market data into Telegram groups. Browse markets, see live odds, and get daily roundups.

## Features

- `/markets [category]` — Browse active markets (crypto, sports, etc.)
- `/hot` — Hottest markets by volume
- `/closing` — Markets closing within 24 hours
- `/odds <marketPda>` — Detailed odds for a market
- `/setup <hour>` — Configure daily roundup time (UTC)
- `/subscribe <categories>` — Filter daily roundup by category
- Inline keyboard with View Market + Refresh buttons
- Daily automated roundup with top markets

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Clone and install:

```bash
git clone https://github.com/Mellowambience/baozi-openclaw
cd telegram-bot
cp .env.example .env
# Edit .env with your bot token
npm install
npm run build
npm start
```

## Deployment

### Render (Free Tier)
```yaml
# render.yaml
services:
  - type: worker
    name: baozi-telegram-bot
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
```

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/bot.js"]
```

## Data Source

All market data is fetched from baozi.bet public APIs (no authentication required for reads):
- `list_markets` — Active markets with filters
- `get_quote` / `get_race_quote` — Odds and pool sizes

## Solana Wallet

A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf

## License

MIT
