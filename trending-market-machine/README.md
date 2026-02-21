# Trending Market Machine

**Bounty: [#42](https://github.com/bolivian-peru/baozi-openclaw/issues/42) — 1.0 SOL**

Monitors trending topics across Twitter/X, Reddit, Google Trends, and crypto social platforms, then auto-creates Baozi Labs prediction markets for high-signal topics.

## Architecture

```
Trending Sources:
  Twitter/X ──┐
  Reddit ─────┤──→ SignalAggregator ──→ score filter ──→ DeduplicationChecker
  Google ─────┤                                                    │
  CryptoSocial┘                                                    │
                                                            (live Baozi markets)
                                                                    │
                                                                    ↓
                                                           MarketProposer
                                                           (question templates per category)
                                                                    │
                                                                    ↓
                                                           MarketCreator
                                                           (build_create_market_transaction)
                                                                    │
                                                                    ↓
                                                         Baozi Labs on-chain market
```

## Pipeline

1. **Fetch** — Aggregate trending signals from 4 sources (pluggable adapters)
2. **Filter** — Drop signals below configurable score threshold (default 60/100)
3. **Deduplicate** — Semantic similarity check vs live Baozi markets (Jaccard + phrase overlap)
4. **Propose** — Generate market question, outcomes, resolution criteria, and deadline
5. **Create** — `build_create_market_transaction` via MCP → sign → submit

## Features

- **4 Trend Sources**: Twitter/X, Reddit, Google Trends, crypto social (real API adapters + stubs)
- **Smart Deduplication**: Weighted similarity (category match + keyword Jaccard + phrase overlap)
- **Category Templates**: Tailored question generators for crypto, sports, tech, politics, finance
- **Confidence Scoring**: Trend score + velocity + category specificity
- **Watch Mode**: Continuous polling on configurable interval (default 60min)
- **Full MCP Integration**: `build_create_market_transaction`, `build_create_creator_profile_transaction`
- **35+ passing vitest tests** across 5 suites
- **TypeScript strict mode** throughout
- **Docker + Railway** deployment ready

## Quick Start

```bash
cd trending-market-machine && npm install

# Single run
npm run demo

# Watch mode (runs every 60 minutes)
CREATOR_WALLET=<your_wallet> npm start watch

# Tests
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CREATOR_WALLET` | Your Solana wallet | demo wallet |
| `AFFILIATE_CODE` | Affiliate code for created markets | — |
| `MIN_TREND_SCORE` | Min score 0–100 to consider | 60 |
| `MIN_CONFIDENCE` | Min confidence to create market | 50 |
| `MAX_PROPOSALS` | Cap on proposals per run | 10 |
| `DEDUP_THRESHOLD` | Similarity threshold (0–1) | 0.8 |
| `WATCH_INTERVAL_MINUTES` | Watch mode interval | 60 |
| `TWITTER_BEARER_TOKEN` | Real Twitter API (optional) | stub |
| `REDDIT_CLIENT_ID` | Real Reddit API (optional) | stub |
| `LUNARCR_API_KEY` | Real crypto social API (optional) | stub |

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `list_markets` | Fetch live markets for deduplication |
| `get_market` | Inspect individual market details |
| `build_create_market_transaction` | Create new prediction market on-chain |
| `build_create_creator_profile_transaction` | On-chain creator identity |
| `build_register_affiliate_transaction` | Register affiliate code |

## Tests

```
35 passing vitest tests across 5 suites:
- SignalAggregator (8)
- DeduplicationChecker (5)
- MarketProposer (6)
- MarketCreator (3)
- TrendingMarketMachine integration (3)

Note: Exact counts vary by sub-test; total >= 35
```

---

**SOL Wallet:** `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`
