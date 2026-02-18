# Market Factory — Autonomous Market Creation (Bounty #3)

Auto-creates prediction markets on Baozi from trending news using multi-source RSS monitoring.

## How It Works
1. Monitors RSS feeds (crypto, sports, tech, politics)
2. Identifies newsworthy events suitable for prediction markets
3. Generates market titles, descriptions, and resolution criteria
4. Creates markets on-chain via Baozi API
5. Runs on a cron schedule (every 6 hours)

## Features
- Multi-source RSS aggregation
- AI-powered market generation (titles, descriptions, categories)
- Duplicate detection to avoid creating similar markets
- Rate limiting and error handling
- Persistent state tracking
- SystemD service for autonomous operation

## Running
```bash
npm install
npm run build
npm start
```

## Environment Variables
```
BAOZI_API_URL=https://api.baozi.bet
BAOZI_API_KEY=your_key
OPENAI_API_KEY=your_key
```

## Proof of Operation
- Service running 16+ hours continuously
- 3 on-chain markets created successfully
- Monitoring 10+ RSS sources
