#!/usr/bin/env node
import { IntelMarketplace } from "./index.js";
import { buildHttp402Response, summarizePayments } from "./payment/x402.js";
import type { X402Payment } from "./types.js";

const mp = new IntelMarketplace();
const mode = process.argv[2] || "full";

async function demoPublish() {
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("  📝 DEMO: Analyst publishes paywalled analysis\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  const analyst = await mp.analysts.registerAnalyst({
    wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    displayName: "CryptoSage",
    affiliateCode: "SAGE",
    specializations: ["crypto"],
  });

  const listing = mp.listings.publishAnalysis(analyst, {
    marketPda: "7pYbqwrjNxFQ4tHSRnHqwjHSaeLkJSAk7FGx1rxAP6tq",
    marketQuestion: "Will BTC reach $110k before March 15, 2026?",
    marketCategory: "crypto",
    thesis: "BTC has broken above the $100k consolidation range with strong weekly closes. " +
      "On-chain data shows exchange outflows accelerating — historically a bullish signal. " +
      "The 200-day MA is at $78k and trending up. Institutional buying via ETF inflows averaged " +
      "$450M/day last week. CME futures show significant open interest build at $105k strikes. " +
      "My model shows 72% probability of hitting $110k. The 14-point gap from market price is your edge.",
    recommendedSide: "YES",
    confidenceScore: 72,
    priceSol: 0.01,
  });

  console.log("\nHTTP 402 response when buyer requests resource WITHOUT payment:");
  console.log(JSON.stringify(
    buildHttp402Response(listing.priceSol, listing.analystWallet),
    null, 2
  ));
}

async function demoBuy() {
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("  💰 DEMO: Buyer discovers and purchases via x402\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  const analyst = await mp.analysts.registerAnalyst({
    wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    displayName: "CryptoSage",
    affiliateCode: "SAGE",
    specializations: ["crypto"],
  });

  const listing = mp.listings.publishAnalysis(analyst, {
    marketPda: "7pYbqwrjNxFQ4tHSRnHqwjHSaeLkJSAk7FGx1rxAP6tq",
    marketQuestion: "Will BTC reach $110k before March 15, 2026?",
    marketCategory: "crypto",
    thesis: "BTC has broken above the $100k consolidation range with strong weekly closes. " +
      "On-chain data shows exchange outflows accelerating. The 200-day MA is at $78k. " +
      "Institutional buying via ETF inflows averaged $450M/day. My model: 72% probability. " +
      "The 14-point gap from current implied probability is your edge. Recommended: YES.",
    recommendedSide: "YES",
    confidenceScore: 72,
    priceSol: 0.01,
  });

  console.log("\nAvailable analyses:");
  console.log(mp.listings.formatListings(mp.listings.getListings()));

  const purchase = await mp.listings.purchaseAnalysis(
    listing.id,
    "BuyerAgent9rbVMeTH7gVZx4kVDwzLk"
  );

  const payments: X402Payment[] = [purchase.payment];
  console.log("\nPayment summary:", summarizePayments(payments));
}

async function demoReputation() {
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("  🏆 DEMO: Analyst reputation leaderboard\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  const analysts = [
    { wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", name: "CryptoSage", correct: 78, total: 100 },
    { wallet: "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd", name: "SportsMind", correct: 35, total: 45 },
    { wallet: "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq",  name: "TechOracle", correct: 18, total: 25 },
    { wallet: "BuyerWallet123456789abcdefghij12345",              name: "NewAnalyst",  correct: 3,  total: 8  },
  ];

  for (const a of analysts) {
    for (let i = 0; i < a.total; i++) {
      const outcome = i < a.correct ? "correct" : "incorrect";
      mp.reputation.recordPrediction(a.wallet, {
        id: `hist-${a.wallet.slice(0,4)}-${i}`,
        analystWallet: a.wallet,
        analystName: a.name,
        marketPda: "test",
        marketQuestion: `Historical market ${i}`,
        marketCategory: "crypto",
        thesis: "Historical analysis",
        recommendedSide: "YES",
        confidenceScore: 70,
        priceSol: 0.01,
        affiliateCode: "TEST",
        publishedAt: new Date().toISOString(),
        purchased: 0,
        outcome,
      });
    }
  }

  const leaderboard = mp.reputation.buildLeaderboard(
    analysts.map(a => ({ wallet: a.wallet, displayName: a.name }))
  );
  console.log(mp.reputation.formatLeaderboard(leaderboard));
}

switch (mode) {
  case "publish": demoPublish(); break;
  case "buy":     demoBuy();    break;
  case "reputation": demoReputation(); break;
  default:        mp.runDemo();
}
