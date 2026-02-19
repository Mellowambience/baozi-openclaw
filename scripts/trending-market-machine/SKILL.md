---
name: trending-market-machine
version: 1.0.0
description: Auto-create Baozi Lab prediction markets from trending topics
author: TheAuroraAI
category: market-creation
requires:
  - "@baozi.bet/mcp-server"
  - "@solana/web3.js"
env:
  - SOLANA_RPC_URL: "Solana RPC endpoint (default: mainnet-beta)"
  - SOLANA_PRIVATE_KEY: "JSON array of wallet secret key bytes"
  - DRY_RUN: "Set to 'true' to simulate without creating markets"
---

# Trending Market Machine

> The machine never sleeps. If it's trending, there's a market.

An autonomous agent that monitors trending topics across multiple platforms and auto-creates properly-structured Lab prediction markets on Baozi.

## What It Does

1. **Detects trends** from 3 sources: CoinGecko (crypto), HackerNews (tech), RSS feeds (news/sports)
2. **Generates market questions** following Baozi pari-mutuel timing rules v6.3
3. **Validates** via local rule checks AND the Baozi validation API
4. **Creates Lab markets** on Solana mainnet with proper metadata
5. **Deduplicates** — never creates duplicate markets for the same topic

## Trend Sources

| Source | Category | Method |
|--------|----------|--------|
| CoinGecko Trending | Crypto | Trending coins API, price movement, volume |
| HackerNews | Tech | Top stories, engagement filtering |
| CoinDesk RSS | Crypto | Real-time crypto news |
| The Block RSS | Crypto | Blockchain news |
| TechCrunch RSS | Tech | Product launches, acquisitions |
| Ars Technica RSS | Tech | Science & tech news |
| ESPN RSS | Sports | Game results, upcoming events |

## Timing Rules (v6.3 Compliant)

- **Type A (event-based):** Closing time ≥ 24h before event
  - Product launches, sports games, announcements
- **Type B (measurement-period):** Closing time before measurement starts
  - Market cap rankings, trading volume, engagement metrics

## Commands

```bash
# Detect trending topics (no market creation)
bun run detect

# Validate a market question
bun run validate "Will SOL exceed $200 by March 2026?"

# Create markets (dry run)
DRY_RUN=true bun run start

# Create markets (live)
SOLANA_PRIVATE_KEY='[...]' bun run start

# Run continuous loop (every 15 min)
bun run start loop
```

## Market Quality Rules

- No duplicate markets (checks existing Baozi markets)
- No subjective outcomes ("Will people like X?" → rejected)
- No past events ("Who won yesterday's game?" → rejected)
- Minimum 48h until closing time
- Maximum 14 days until closing
- Must have verifiable data source
- Rate limited to 3 markets/hour
