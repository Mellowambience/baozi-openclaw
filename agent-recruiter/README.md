# 🤖 Agent Recruiter — AI That Onboards Other Agents to Trade

**Bounty: [#41](https://github.com/bolivian-peru/baozi-openclaw/issues/41) — 1.0 SOL**

An AI agent whose sole purpose is to discover other AI agents, explain Baozi prediction markets, walk them through setup, and earn 1% lifetime affiliate commission on everything the recruited agent does.

> agents recruiting agents. the viral loop that never stops.

## Architecture

```
Agent Recruiter Pipeline
│
├─ 🔍 Discovery (scanner.ts)
│   ├─ AgentBook — active Baozi agents
│   ├─ GitHub — ElizaOS / LangChain / Solana Agent Kit repos
│   ├─ Twitter/X — AI agent accounts discussing crypto
│   ├─ ElizaOS Registry — plugin-capable agents
│   ├─ LangChain Hub — tool-calling agents
│   └─ Solana Agent Kit — already on-chain agents
│
├─ 📨 Outreach (templates.ts)
│   ├─ Crypto Analyst → "Monetize your predictions"
│   ├─ Trading Bot → "Add prediction markets to strategy"
│   ├─ Social Agent → "Create markets, earn fees"
│   ├─ DeFi Agent → "Solana-native, no API keys"
│   ├─ Data/Research → "Your research can earn money"
│   ├─ NFT Agent → "Predict collections, earn fees"
│   └─ General Purpose → "69 tools, zero API keys"
│
├─ 🚀 Onboarding (flow.ts)
│   ├─ Step 1: Install MCP (npx @baozi.bet/mcp-server)
│   ├─ Step 2: Create CreatorProfile (on-chain identity)
│   ├─ Step 3: Register Affiliate Code (1% lifetime)
│   ├─ Step 4: Browse Markets (list_markets)
│   ├─ Step 5: Get Quote (check odds)
│   └─ Step 6: Place First Bet (with recruiter's code)
│
└─ 📊 Tracking (dashboard.ts)
    ├─ Total agents onboarded
    ├─ Combined volume generated
    ├─ Affiliate earnings accumulated
    ├─ Most active recruits
    └─ Revenue projections
```

## Quick Start

```bash
# Install
cd agent-recruiter && npm install

# Run full pipeline demo
npm run demo

# Individual demos
npm run demo:recruit   # Recruit a single agent
npm run demo:track     # View tracking dashboard

# CLI
npx tsx src/cli.ts demo        # Full pipeline
npx tsx src/cli.ts discover    # Scan for agents
npx tsx src/cli.ts outreach    # View pitch templates
npx tsx src/cli.ts dashboard   # Tracking dashboard
npx tsx src/cli.ts recruit <wallet> <name>  # Recruit specific agent
```

## How It Works

```
Agent Recruiter (affiliate code: MARSRECRUIT)
  │
  ├─→ Discovers Agent B (via ElizaOS, LangChain, Twitter, AgentBook)
  │     → Sends tailored pitch based on agent type
  │     → Provides: setup instructions + affiliate link
  │     → Agent B registers with ref=MARSRECRUIT
  │     → Agent B places first bet
  │     → Recruiter earns 1% of Agent B's lifetime gross winnings
  │
  ├─→ Discovers Agent C...
  │     → Same flow, different pitch template
  │     → Recruiter earns 1% of Agent C's lifetime too
  │
  └─→ Portfolio: 50 recruited agents × avg 10 SOL/week volume
        = 500 SOL/week volume × 1% = 5 SOL/week passive income
```

## Features

### ✅ Agent Discovery (6 platforms)
- **AgentBook** — scans Baozi's own agent social board for active agents
- **GitHub** — finds repos using ElizaOS, LangChain, Solana Agent Kit
- **Twitter/X** — monitors AI agent accounts in crypto space
- **ElizaOS Registry** — agents with plugin infrastructure
- **LangChain Hub** — tool-calling agents
- **Solana Agent Kit** — agents already on Solana

### ✅ Outreach Templates (7 variants)
Personalized pitches for each agent type:
| Template | Target | Key Hook |
|----------|--------|----------|
| Crypto Analyst | Crypto analysis agents | "Monetize your predictions" |
| Trading Bot | DeFi/trading bots | "Add prediction markets to strategy" |
| Social Agent | Social media agents | "Create markets, earn creator fees" |
| DeFi Agent | Solana DeFi agents | "Native integration, no API keys" |
| Data Agent | Research agents | "Your research can earn money" |
| NFT Agent | NFT collection agents | "Predict drops, earn fees" |
| General Purpose | Any MCP-capable agent | "69 tools, zero API keys" |

### ✅ Onboarding Flow (5 steps)
Complete guided setup using real MCP tools:
1. `npx @baozi.bet/mcp-server` — install
2. `build_create_creator_profile_transaction` — on-chain identity
3. `build_register_affiliate_transaction` — 1% lifetime earnings
4. `list_markets` → `get_quote` — browse and check odds
5. `build_bet_transaction` — first bet with recruiter's code

Framework-specific instructions for ElizaOS, LangChain, OpenClaw, and generic MCP.

### ✅ Tracking Dashboard
```
╔══════════════════════════════════════════════════════════════╗
║              AGENT RECRUITER DASHBOARD                       ║
╠══════════════════════════════════════════════════════════════╣
║  Total Recruited:         3                                  ║
║  Active (7d):             3                                  ║
║  Combined Volume:    149.70 SOL                              ║
║  Weekly Volume:      149.70 SOL                              ║
║  Affiliate Earnings: 0.4910 SOL                              ║
╠══════════════════════════════════════════════════════════════╣
║  🏆 Top Performer: SportsPredictoor (89.0 SOL, 42 bets)     ║
╚══════════════════════════════════════════════════════════════╝
```

### ✅ All Affiliate Links Use Recruiter Code
Every onboarded agent's first bet (and all future bets) flow through the recruiter's affiliate code. 1% lifetime commission on gross winnings.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `list_markets` | Browse active markets |
| `get_quote` | Check odds before betting |
| `build_bet_transaction` | Place bets with affiliate code |
| `build_create_creator_profile_transaction` | Create on-chain identity |
| `build_register_affiliate_transaction` | Register affiliate code |
| `check_affiliate_code` | Verify code availability |
| `format_affiliate_link` | Generate referral URLs |
| `get_positions` | Track recruit activity |
| `get_referrals` | Monitor affiliate earnings |
| `get_agent_network_stats` | Network-level stats |
| `generate_share_card` | Viral market cards |

## Tech Stack

- **TypeScript** — strict mode, full types
- **@solana/web3.js** — Solana interaction
- **@baozi.bet/mcp-server** — 69 prediction market tools
- **vitest** — 35 tests
- **Docker** — production deployment

## Tests

```bash
npm test
# 35 tests across 5 suites:
# - AgentScanner (7 tests)
# - Outreach Templates (8 tests)
# - OnboardingFlow (8 tests)
# - RecruiterTracker (8 tests)
# - BaoziClient (9 tests)
```

## Docker Deployment

```bash
docker build -t agent-recruiter .
docker run -p 3000:3000 agent-recruiter
```

## Why This Bounty Matters

Every other bounty builds a TOOL. This bounty builds a **DISTRIBUTION CHANNEL**.

One recruiter agent onboarding 10 agents/week who each generate 5 SOL/week volume = 50 SOL/week new volume. 10 recruiter agents = 500 SOL/week. That's real protocol revenue.

The affiliate system makes this self-sustaining: the recruiter earns 1% forever.

---

**SOL Wallet:** `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`

*一笼包子，一桌人情 — one basket of buns, a whole table of affection.*
