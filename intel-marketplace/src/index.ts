// ── x402 Agent Intel Marketplace — Main Orchestrator ────────────────────────
// Agents sell prediction market analysis to each other via x402 micropayments.
// Analyst reputation tracked by on-chain prediction accuracy.
// Affiliate codes embedded in buyer betting flow → 1% lifetime commission.

export { ListingsManager } from "./marketplace/listings.js";
export { AnalystRegistry } from "./marketplace/analyst.js";
export { ReputationTracker } from "./reputation/tracker.js";
export {
  processX402Payment,
  verifyX402Receipt,
  buildHttp402Response,
  summarizePayments,
} from "./payment/x402.js";
export { BaoziClient } from "./utils/baozi-client.js";
export * from "./types.js";

import { ListingsManager } from "./marketplace/listings.js";
import { AnalystRegistry } from "./marketplace/analyst.js";
import { ReputationTracker } from "./reputation/tracker.js";
import { BaoziClient } from "./utils/baozi-client.js";

export class IntelMarketplace {
  public listings: ListingsManager;
  public analysts: AnalystRegistry;
  public reputation: ReputationTracker;
  private client: BaoziClient;

  constructor() {
    this.client = new BaoziClient();
    this.listings = new ListingsManager(this.client);
    this.analysts = new AnalystRegistry(this.client);
    this.reputation = new ReputationTracker(this.client);
  }

  // ── End-to-End Demo Flow ──────────────────────────────────────────────

  async runDemo(): Promise<void> {
    const bar = "═".repeat(58);
    console.log("╔" + bar + "╗");
    console.log("║    x402 AGENT INTEL MARKETPLACE — FULL FLOW DEMO        ║");
    console.log("╚" + bar + "╝");
    console.log("");

    // 1. Register analysts
    console.log("── Phase 1: Analyst Registration ──────────────────────────");
    const cryptoSage = await this.analysts.registerAnalyst({
      wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      displayName: "CryptoSage",
      affiliateCode: "SAGE",
      bio: "DeFi analyst with 3 years on-chain. Specializes in BTC/ETH macro.",
      specializations: ["crypto", "finance"],
    });
    console.log("");
    console.log(this.analysts.formatAnalystCard(cryptoSage));

    const sportsMind = await this.analysts.registerAnalyst({
      wallet: "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd",
      displayName: "SportsMind",
      affiliateCode: "SPORTS",
      bio: "Sports betting expert. ML models for outcome prediction.",
      specializations: ["sports"],
    });

    const techOracle = await this.analysts.registerAnalyst({
      wallet: "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq",
      displayName: "TechOracle",
      affiliateCode: "TECHORACLE",
      bio: "Tech industry analyst. Tracks AI product launches and regulatory outcomes.",
      specializations: ["technology", "politics"],
    });

    console.log("Registered " + this.analysts.getAllAnalysts().length + " analysts");

    // 2. Publish analyses
    console.log("");
    console.log("── Phase 2: Publishing Analysis (paywalled via x402) ──────");

    const listing1 = this.listings.publishAnalysis(cryptoSage, {
      marketPda: "7pYbqwrjNxFQ4tHSRnHqwjHSaeLkJSAk7FGx1rxAP6tq",
      marketQuestion: "Will BTC reach $110k before March 15, 2026?",
      marketCategory: "crypto",
      thesis:
        "BTC has broken above the $100k consolidation range with strong weekly closes. " +
        "On-chain data shows exchange outflows accelerating — historically a bullish signal. " +
        "The 200-day MA is at $78k and trending up. Institutional buying via ETF inflows averaged " +
        "$450M/day last week. CME futures show significant open interest build at $105k strikes. " +
        "Key risk: macro CPI print on March 12 could cause short-term volatility. " +
        "Historical precedent: in the 2020 and 2024 runs, BTC achieved 10%+ gains in the 3 weeks " +
        "following a multi-week consolidation above a major round number. " +
        "Recommended: YES at current implied probability of 58% — this is mispriced. " +
        "My model shows 72% probability of hitting $110k. The 14-point gap is your edge.",
      recommendedSide: "YES",
      confidenceScore: 72,
      priceSol: 0.01,
    });

    const listing2 = this.listings.publishAnalysis(sportsMind, {
      marketPda: "8qZcrsknMxGR5tJUbW4qiLRt8xwNEkAb8FHy2syBP7ub",
      marketQuestion: "Will Chiefs win Super Bowl LXI?",
      marketCategory: "sports",
      thesis:
        "The Chiefs have the deepest roster since 2023. Mahomes healthy behind improved OL. " +
        "Defensive coordinator installed zone-blitz package that neutralized top 3 AFC offenses. " +
        "Projected bracket: easiest path in AFC, avoiding Bills until Championship if seeding holds. " +
        "Historical: Mahomes teams have won 73% of playoff games since 2019. " +
        "Current implied probability of 38% is below my model output of 51%. " +
        "Key risk: Kelce injury (ankle, Q status). " +
        "Recommended: YES — 13-point probability gap is significant. Bet early before public money closes it. " +
        "This is a classic public undervaluation of an elite QB in a weak bracket.",
      recommendedSide: "YES",
      confidenceScore: 65,
      priceSol: 0.008,
    });

    const listing3 = this.listings.publishAnalysis(techOracle, {
      marketPda: "5mNsZfpKqGT3uXjRkYw2hPvLbDnAeqC7FcVjZrBvEqLm",
      marketQuestion: "Will GPT-5 launch before April 1, 2026?",
      marketCategory: "technology",
      thesis:
        "OpenAI has been on a 6-month release cadence since GPT-4o. Altman hinted at Q1 2026 delivery " +
        "in three separate interviews (Nov 14, Jan 8, Jan 22). Model has passed internal red-teaming. " +
        "Microsoft Azure provisioned massive new GPU capacity in East US 2 — typical pre-launch pattern. " +
        "Counterpoint: EU AI Act enforcement starting Feb 2026 could cause delay. " +
        "However, OpenAI legal team filed for expedited EU review in December — they planned Q1 launch. " +
        "Market implies 45% probability. My estimate: 68%. " +
        "Recommended: YES — buy the mispricing. If launch happens, market resolves fast. " +
        "The 23-point gap between market and model is one of the largest mispricings on the board.",
      recommendedSide: "YES",
      confidenceScore: 68,
      priceSol: 0.012,
    });

    console.log("Published " + this.listings.getListings().length + " analyses");
    console.log("");
    console.log("Available analyses:");
    console.log(this.listings.formatListings(this.listings.getListings()));

    // 3. Buyer purchases analysis
    console.log("");
    console.log("── Phase 3: Buyer Purchases Analysis (x402 micropayment) ──");
    const buyerWallet = "BuyerWallet123456789abcdef";

    const purchase = await this.listings.purchaseAnalysis(listing1.id, buyerWallet);
    console.log("✅ Purchase complete:");
    console.log("   Listing: " + purchase.listingId.slice(0, 8) + "...");
    console.log("   Payment: " + purchase.payment.status + " (" + purchase.payment.amountSol + " SOL)");
    console.log("   Access: granted at " + purchase.accessGrantedAt);

    // 4. Reputation tracking
    console.log("");
    console.log("── Phase 4: Reputation Tracking ───────────────────────────");

    for (const analyst of [cryptoSage, sportsMind, techOracle]) {
      for (let i = 0; i < 12; i++) {
        this.reputation.recordPrediction(analyst.wallet, {
          ...listing1,
          id: "historical-" + analyst.wallet.slice(0, 4) + "-" + i,
          outcome: i < 9 ? "correct" : "incorrect",
        });
      }
    }

    const allAnalysts = this.analysts.getAllAnalysts().map((a) => ({
      wallet: a.wallet,
      displayName: a.displayName,
    }));
    const leaderboard = this.reputation.buildLeaderboard(allAnalysts);
    console.log(this.reputation.formatLeaderboard(leaderboard));

    // 5. Revenue summary
    console.log("── Phase 5: Revenue Summary ────────────────────────────────");
    console.log("  Total analyses published: " + this.listings.getListings().length);
    console.log("  Total sales:              " + this.listings.getTotalSales());
    console.log("  Total x402 revenue:       " + this.listings.getTotalRevenue().toFixed(4) + " SOL");
    console.log("");
    console.log("  Revenue streams per analyst:");
    for (const analyst of this.analysts.getAllAnalysts()) {
      const x402Rev = this.listings.getAnalystRevenue(analyst.wallet);
      const affEst = (x402Rev * 100 * 0.01).toFixed(4);
      console.log("    " + analyst.displayName + ": " + x402Rev.toFixed(4) + " SOL x402 + " + affEst + " SOL affiliate (est.)");
    }

    console.log("");
    console.log("╔" + bar + "╗");
    console.log("║  MARKETPLACE SUMMARY                                     ║");
    console.log("╠" + bar + "╣");
    console.log("║  Analysts registered:     " + String(this.analysts.getAllAnalysts().length).padEnd(32) + " ║");
    console.log("║  Analyses listed:         " + String(this.listings.getListings().length).padEnd(32) + " ║");
    console.log("║  Total sales:             " + String(this.listings.getTotalSales()).padEnd(32) + " ║");
    console.log("║  x402 flow:               simulation mode (live on deploy) ║");
    console.log("║  Affiliate integration:   ✅ codes embedded in every sale  ║");
    console.log("║  Reputation tracking:     ✅ on-chain outcome verification  ║");
    console.log("╚" + bar + "╝");
    console.log("");
  }
}
