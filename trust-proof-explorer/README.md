# Trust Proof Explorer — Baozi Bounty #43 (0.75 SOL)

A verifiable oracle transparency dashboard showcasing every Baozi market resolution with full evidence trails — IPFS proofs, Squads multisig proposals, and Solscan transaction links.

## What It Shows

For each resolved market:
- Question + outcome
- Resolution tier (Trustless/Verified/AI Research)
- Evidence sources with links
- IPFS proof hashes (clickable)
- On-chain transaction → Solscan
- Squads multisig proposal (Tier 2/3)
- Dispute window + challenges filed
- Resolution speed

Plus:
- Oracle performance stats (total resolved, avg time by tier, dispute rate, trust score)
- Baozi vs Polymarket transparency comparison table

## Setup

```bash
npm install
npm run dev
```

## Filter Options

```bash
# Filter by tier
npm run dev -- --tier=1       # Trustless (Pyth)
npm run dev -- --tier=2       # Verified (Official API)
npm run dev -- --tier=3       # AI Research (Grandma Mei)

# Filter by category
npm run dev -- --category=Crypto
npm run dev -- --category=Sports

# Filter by layer
npm run dev -- --layer=Official
npm run dev -- --layer=Lab

# Search by question or PDA
npm run dev -- --search=BTC

# Sort options: date (default), tier, speed
npm run dev -- --sort=speed
```

## Test

```bash
npm test
```

## Data Source

```
GET https://baozi.bet/api/agents/proofs
```

Also references: `get_resolution_status`, `get_disputed_markets`, `get_markets_awaiting_resolution` MCP tools.

## Acceptance Criteria

- ✅ Fetches real resolution proofs from `https://baozi.bet/api/agents/proofs`
- ✅ Displays evidence, IPFS links, Solscan tx links, Squads proposals
- ✅ Oracle stats: total resolved, avg time, dispute rate, trust score
- ✅ Filter by tier, category, layer + search
- ✅ Sort by date, tier, resolution speed
- ✅ Trust comparison: Baozi vs Polymarket transparency table
- ✅ Demo data fallback when API unavailable
- ✅ Tests for all utility functions

## Wallet

Payout address: `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`
