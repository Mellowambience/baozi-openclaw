# Baozi Claim & Alert Agent

Portfolio monitoring agent that watches Baozi wallets and sends Telegram notifications when action is needed.

## Alert Types

| Trigger | When |
|---------|------|
| 💰 Unclaimed Winnings | Market resolved, SOL ready to claim |
| ⏰ Closing Soon | Market you're in closes within N hours |
| ⬆️⬇️ Odds Shift | Odds moved ≥N% on your position |
| 🏁 Market Resolved | Win/loss notification with claim link |

## Commands

- `/watch <wallet>` — Start monitoring a Solana wallet
- `/unwatch <wallet>` — Stop monitoring
- `/status` — Show all monitored wallets
- `/check <wallet>` — Manual check now
- `/config` — View alert settings

## Setup

```bash
git clone https://github.com/Mellowambience/baozi-openclaw
cd claim-alert-agent
cp .env.example .env
npm install && npm run build && npm start
```

## Configuration

Default polling: every 15 minutes. Override with `POLL_INTERVAL_MINUTES` env var.

Default alert thresholds:
- Closing soon: 6 hours
- Odds shift: 15% change

## Solana Wallet

A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf

## License

MIT
