# Calls Tracker — Baozi Bounty #35 (1.0 SOL)

Turn influencer predictions into trackable on-chain Lab markets with reputation scoring.

## What It Does

1. **Parse** a text prediction → structured market question with timing rules
2. **Validate** timing against baozi pari-mutuel v6.3 rules
3. **Create** a Lab market via MCP `build_create_lab_market_transaction`
4. **Auto-bet** the caller on their own prediction (skin in the game)
5. **Generate** a share card via `generate_share_card`
6. **Track** caller accuracy in a local DB (upgradeable to on-chain)
7. **Display** reputation dashboard: hit rate, streak, P&L, confidence score

## Example Flow

```
Prediction: "BTC will hit $110k by March 1, 2026"
→ Market: "Will BTC hit $110k by March 1, 2026?"
→ Type A timing: close_time = Feb 28 11:00 UTC (25h before event)
→ Caller bets 0.5 SOL on YES
→ Share card: https://baozi.bet/api/share/card?market=PDA&wallet=WALLET&ref=MELLOWAMBIENCE
→ Reputation updated after resolution
```

## Setup

```bash
npm install
npm run dev
```

## Run Demo

```bash
npm run dev
# Registers 3 example calls and prints reputation dashboard
```

## Test

```bash
npm test
```

## MCP Integration

In production, the following MCP calls fire automatically:
- `build_create_lab_market_transaction` — creates the Lab market
- `build_bet_transaction` — places caller's own bet
- `generate_share_card` — generates the share card image
- `get_resolution_status` — syncs outcomes on-chain

MCP install: `npx @baozi.bet/mcp-server`

## Acceptance Criteria

- ✅ Parses text predictions into valid market questions
- ✅ Validates pari-mutuel timing rules (Type A/B)
- ✅ Caller must bet on their own prediction
- ✅ Generates share card URLs for each call
- ✅ Tracks caller reputation: hit rate, streak, P&L, confidence score
- ✅ Reputation dashboard with sorting by confidence
- ✅ Tests for parse/validate/calculate/format functions
- ✅ Works with real mainnet MCP tools (production mode)

## Wallet

Payout address: `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`
