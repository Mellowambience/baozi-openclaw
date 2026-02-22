#!/usr/bin/env node
import { TrendingMarketMachine } from "./index.js";

const DEMO_WALLET = "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf";

async function main() {
  const cmd = process.argv[2] || "run";

  switch (cmd) {
    case "run":
    case "demo": {
      const machine = new TrendingMarketMachine({
        creatorWallet: process.env["CREATOR_WALLET"] || DEMO_WALLET,
        affiliateCode: process.env["AFFILIATE_CODE"] || "SAGE",
        minTrendScore: parseInt(process.env["MIN_TREND_SCORE"] || "60"),
        minConfidence: parseInt(process.env["MIN_CONFIDENCE"] || "50"),
        maxProposalsPerRun: parseInt(process.env["MAX_PROPOSALS"] || "10"),
        dedupSimilarityThreshold: parseFloat(process.env["DEDUP_THRESHOLD"] || "0.8"),
      });
      await machine.run();
      break;
    }
    case "watch": {
      const intervalMinutes = parseInt(process.env["WATCH_INTERVAL_MINUTES"] || "60");
      console.log("Starting Trending Market Machine in watch mode (interval: " + intervalMinutes + "m)");

      const machine = new TrendingMarketMachine({
        creatorWallet: process.env["CREATOR_WALLET"] || DEMO_WALLET,
        affiliateCode: process.env["AFFILIATE_CODE"],
        minTrendScore: parseInt(process.env["MIN_TREND_SCORE"] || "60"),
        minConfidence: parseInt(process.env["MIN_CONFIDENCE"] || "50"),
        maxProposalsPerRun: parseInt(process.env["MAX_PROPOSALS"] || "10"),
        dedupSimilarityThreshold: 0.8,
      });

      const runCycle = async () => {
        try {
          await machine.run();
        } catch (err) {
          console.error("Run failed:", err);
        }
      };

      await runCycle();
      setInterval(runCycle, intervalMinutes * 60 * 1000);
      break;
    }
    case "help":
    default:
      console.log(`

Trending Market Machine

Commands:
  run    Single run (fetch trends, dedup, propose, create)
  watch  Continuous watch mode (runs every WATCH_INTERVAL_MINUTES)
  help   Show this message

Env vars:
  CREATOR_WALLET        Your Solana wallet (required for on-chain creation)
  AFFILIATE_CODE        Affiliate code for created markets
  MIN_TREND_SCORE       Minimum trend score 0-100 (default: 60)
  MIN_CONFIDENCE        Minimum proposal confidence 0-100 (default: 50)
  MAX_PROPOSALS         Max proposals per run (default: 10)
  DEDUP_THRESHOLD       Similarity threshold for dedup 0-1 (default: 0.8)
  WATCH_INTERVAL_MINUTESInterval for watch mode (default: 60)

Real API keys (optional, stubs used if absent):
  TWITTER_BEARER_TOKEN, REDDIT_CLIENT_ID, LUNARCR_API_KEY
`);
  }
}

main().catch(console.error);
