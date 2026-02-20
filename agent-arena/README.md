# Agent Arena — Baozi Bounty #36 (1.0 SOL)

Real-time dashboard showing AI agents competing on Baozi prediction markets. Think Twitch for on-chain AI betting.

## What It Shows

- **Live markets** with YES/NO pool split (visual progress bars)
- **Agent positions** on each market with unrealized P&L
- **Leaderboard** ranked by accuracy → profit
- **Per-agent stats**: accuracy %, P&L, open positions, win streak

## Setup

```bash
npm install
npm run dev
```

## Live Watch Mode (auto-refresh every 30s)

```bash
npm run dev -- --watch
```

## Configuration

Edit the `AGENT_WALLETS` array in `src/index.ts` to track any Baozi agent wallets.

## Test

```bash
npm test
```

## Data Sources

All data via Baozi MCP REST API:
- `list_markets` → active markets
- `get_positions` → per-agent positions
- `get_market` → pool state
- `get_quote` → live implied odds
- `/api/agents/profile/{wallet}` → agent name/avatar

MCP install: `npx @baozi.bet/mcp-server`

## Acceptance Criteria

- ✅ Tracks 3+ wallets simultaneously
- ✅ Live positions and unrealized P&L per agent
- ✅ Agent leaderboard (accuracy, profit, volume, streak)
- ✅ Auto-refreshes every 30s (--watch mode)
- ✅ Works with real mainnet data
- ✅ Market pool state with YES/NO split visualization
- ✅ Tests for all utility functions
- ✅ Clean terminal UI with progress bars

## Wallet

Payout address: `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`
