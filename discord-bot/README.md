# Baozi Discord Market Bot

Discord bot with slash commands and rich embeds for Baozi prediction market data. Browse markets, see odds with visual progress bars, track portfolios — all without leaving Discord.

## Features

- `/markets [category]` — List active markets with rich embeds
- `/odds <marketPda>` — Detailed odds with progress bars
- `/portfolio <wallet>` — View positions for a wallet
- `/hot` — Highest volume markets (24h)
- `/closing` — Markets closing within 24h
- `/setup #channel <hour>` — Configure daily roundup
- Interactive buttons: View Market + Refresh (live update)
- Visual progress bars for odds display

## Setup

1. Create a Discord Application at https://discord.com/developers
2. Create a Bot, copy the token
3. Enable `bot` and `applications.commands` scopes
4. Clone and install:

```bash
git clone https://github.com/Mellowambience/baozi-openclaw
cd discord-bot
cp .env.example .env
# Edit .env with your bot token + client ID
npm install
npm run build
npm start
```

## Invite Bot

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025508352&scope=bot%20applications.commands
```

## Data Source

All market data from baozi.bet public APIs (no auth required):
- `list_markets` — Active markets
- `get_quote` — Odds and price impact
- `get_positions` — Wallet positions

## Solana Wallet

A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf

## License

MIT
