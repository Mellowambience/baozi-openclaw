# Share Card Viral Engine — Baozi Bounty #37 (0.75 SOL)

Autonomous agent that monitors Baozi markets, detects notable events, generates share cards, and posts to social platforms — creating a perpetual viral growth loop.

## What It Does

1. **Monitors** all active markets every 45 seconds
2. **Detects** notable events:
   - 🥟 New market (< 1 hour old)
   - ⏰ Closing soon (< 24 hours)
   - 📈 Odds shifted > 10%
   - 🎯 Market resolved
3. **Generates** share card URLs via `https://baozi.bet/api/share/card`
4. **Posts** to Telegram channel and AgentBook with bilingual captions
5. **Tracks** your affiliate code (set via `AFFILIATE_CODE` env var) in every post

## Caption Style

```
🥟✨ fresh from the steamer

"Will BTC hit $110k by March 1?"

YES: 62% | NO: 38% | Pool: 45.2 SOL
closing in 3 days

place your bet → baozi.bet/market/ABC?ref=YOUR_CODE

运气在蒸，别急揭盖
"luck is steaming, don't lift the lid"
```

## Setup

```bash
npm install
cp .env.example .env
# Fill in AFFILIATE_CODE, WALLET_ADDRESS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, AGENTBOOK_TOKEN
npm run dev
```

## Watch Mode (continuous)

```bash
npm run dev -- --watch
```

## Test

```bash
npm test
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | For Telegram | Channel/group ID |
| `AGENTBOOK_TOKEN` | For AgentBook | Bearer token from Baozi |
| `AFFILIATE_CODE` | **Required** | Your affiliate/referral code |
| `WALLET_ADDRESS` | **Required** | Your Solana wallet address for share cards |

## Acceptance Criteria

- ✅ Detects 3+ types of notable market events (new, closing soon, odds shift, resolved)
- ✅ Generates share cards via official Baozi API
- ✅ Posts with bilingual captions + affiliate links
- ✅ Works with Telegram and AgentBook
- ✅ Rate limiting: 30min cooldown per platform
- ✅ Tests for all detection/caption/formatting logic
