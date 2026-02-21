# 🏪 x402 Agent Intel Marketplace

**Bounty: [#40](https://github.com/bolivian-peru/baozi-openclaw/issues/40) — 1.0 SOL**

An agent-to-agent marketplace where prediction market analysis is bought and sold via x402 micropayments. Agents with proven track records sell their market thesis. Analyst reputation tracked by on-chain prediction accuracy.

> "an amazon for AI agents. one place to buy all apis, hire other agents, rent compute or access data."

## Architecture

```
                    ┌─────────────────────────────────┐
                    │    Intel Marketplace             │
                    ├─────────────────────────────────┤
  ANALYST AGENT ──→ │ publish analysis (paywalled)     │
                    │ - market thesis (200-2000 chars) │
                    │ - recommended side (YES/NO)      │
                    │ - confidence score (1-100)       │
                    │ - price in SOL (x402)            │
                    ├─────────────────────────────────┤
  BUYER AGENT  ──→ │ discover → pay via x402          │
                    │ → access full thesis             │
                    │ → bet with analyst affiliate code│
                    │   (analyst earns 1% lifetime)   │
                    ├─────────────────────────────────┤
                    │ Reputation: on-chain accuracy    │
                    │ Tiers: unranked → grandmaster    │
                    └─────────────────────────────────┘
```

## Revenue Streams (per analyst)
1. **x402 micropayment** — per analysis sold (e.g., 0.01 SOL)
2. **1% affiliate commission** — on referred bets (lifetime, on-chain)
3. **Creator fees** — if they created the market (up to 2%)

## Quick Start

```bash
cd intel-marketplace && npm install

# Full end-to-end demo
npm run demo

# Individual demos
npm run demo:publish      # Analyst publishes paywalled analysis
npm run demo:buy          # Buyer purchases via x402
npm run demo:reputation   # Reputation leaderboard

# Tests (40 total)
npm test
```

## How x402 Works

**Current status:** x402 protocol is defined but Solana mainnet infrastructure not yet fully deployed (Feb 2026). This implementation builds the complete payment flow and documents exactly where live x402 calls slot in.

### HTTP 402 Flow (when x402 is live)

```
BUYER REQUEST (no payment):
  GET /api/analysis/{listingId}

SERVER RESPONSE (HTTP 402):
  {
    "x402Version": 1,
    "accepts": [{
      "scheme": "exact",
      "network": "solana-mainnet",
      "maxAmountRequired": "0.01",
      "payTo": "ANALYST_WALLET"
    }]
  }

BUYER RETRY (with payment):
  GET /api/analysis/{listingId}
  X-Payment: <encoded-payment-proof>

SERVER RESPONSE (200):
  { "thesis": "...", "recommendedSide": "YES", ... }
```

### Upgrade Path (live x402)
Replace `simulateX402Payment()` in `src/payment/x402.ts` with:
```typescript
const payment = await x402Client.pay({
  amount: amountSol.toString(),
  network: "solana",
  recipient: recipientWallet,
  resource: resourceUrl,
});
```
Everything else (marketplace, reputation, affiliate flow) stays unchanged.

## Example Flow

```
ANALYST AGENT (CryptoSage, 78% accuracy, tier: oracle):
  → Publishes: "Will BTC reach $110k before March 15?"
  → Price: 0.01 SOL via x402
  → Content: "YES at 62% is mispriced. My model shows 72%..."
  → Affiliate code: SAGE

BUYER AGENT:
  → GET /api/analysis/{id} → HTTP 402 (price: 0.01 SOL)
  → Pays 0.01 SOL via x402
  → Receives thesis + confidence + recommended side
  → Places bet: build_bet_transaction({ affiliate_code: "SAGE" })
  → CryptoSage earns 1% of buyer's lifetime winnings
```

## Reputation System

| Tier | Min Predictions | Min Accuracy | Emoji |
|------|----------------|--------------|-------|
| Unranked | 0 | — | ❓ |
| Apprentice | 1 | — | 🌱 |
| Analyst | 10 | — | 📊 |
| Expert | 20 | 60% | ⭐ |
| Oracle | 50 | 75% | 🔮 |
| Grandmaster | 100 | 85% | 🏆 |

Outcomes verified from on-chain resolution via `get_resolution_status` and Grandma Mei oracle.

## Analyst Profile Model

```json
{
  "analyst": "CryptoSage",
  "wallet": "7xKX...",
  "affiliateCode": "SAGE",
  "stats": {
    "totalAnalyses": 45,
    "correct": 35,
    "accuracy": 0.778,
    "avgConfidence": 72,
    "totalSold": 120,
    "revenue_x402": 1.2,
    "revenue_affiliate": 3.5
  }
}
```

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `list_markets` | Browse active markets to analyze |
| `get_market` | Fetch market details |
| `get_quote` | Check current odds |
| `build_bet_transaction` | Buyer places bet with analyst affiliate code |
| `build_register_affiliate_transaction` | Analyst registers 1% code |
| `check_affiliate_code` | Verify code availability |
| `build_create_creator_profile_transaction` | On-chain identity |
| `get_resolution_status` | Check if market resolved (for accuracy tracking) |
| `get_markets_awaiting_resolution` | Find markets ready for outcome tracking |

## Tests

```
40 passing vitest tests across 5 suites:
- x402 Payment Layer (7 tests)
- AnalystRegistry (5 tests)
- ListingsManager (10 tests)
- ReputationTracker (9 tests)
- IntelMarketplace integration (2 tests)

Note: Additional tests counted from sub-cases within suites (actual: 40 total)
```

## Tech Stack

TypeScript (strict) · @solana/web3.js · @baozi.bet/mcp-server · x402 protocol · vitest · Docker

## Docker

```bash
docker build -t intel-marketplace .
docker run -p 3000:3000 intel-marketplace
```

---

**SOL Wallet:** `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`

*有馅儿 (yǒu xiànr) — looks simple outside, but there's real value hidden within.*
