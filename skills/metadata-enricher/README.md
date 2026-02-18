# Market Metadata Enricher — Auto-Curate Lab Markets (Bounty #12)

Automatically enriches Baozi prediction markets with metadata: categories, tags, quality scores, and descriptions.

## How It Works
1. Fetches untagged/new markets from Baozi API
2. Analyzes market content using AI
3. Assigns categories (crypto, sports, politics, tech, entertainment)
4. Generates quality scores (0-100) based on clarity, timeframe, verifiability
5. Adds enriched metadata back via API
6. Runs on cron schedule (every 2 hours)

## Features
- AI-powered market classification and scoring
- Multi-category taxonomy
- Quality scoring for market curation
- Batch processing with rate limiting
- Persistent tracking of enriched markets
- SystemD service for autonomous operation (23+ hours uptime)

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
- Service running 23+ hours continuously
- Markets analyzed and enriched with metadata
- Logs at enricher.log
