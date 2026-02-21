import { describe, it, expect, beforeEach } from "vitest";
import { IntelMarketplace } from "../src/index.js";
import { ListingsManager } from "../src/marketplace/listings.js";
import { AnalystRegistry } from "../src/marketplace/analyst.js";
import { ReputationTracker } from "../src/reputation/tracker.js";
import {
  processX402Payment,
  verifyX402Receipt,
  buildHttp402Response,
  summarizePayments,
} from "../src/payment/x402.js";
import type { AnalystProfile, AnalysisListing } from "../src/types.js";

const ANALYST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const ANALYST_WALLET_2 = "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd";
const BUYER_WALLET = "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq";
const MARKET_PDA = "7pYbqwrjNxFQ4tHSRnHqwjHSaeLkJSAk7FGx1rxAP6tq";

const VALID_THESIS =
  "BTC has broken above the $100k consolidation range with strong weekly closes. " +
  "On-chain data shows exchange outflows accelerating — historically a bullish signal. " +
  "The 200-day MA is at $78k and trending up. Institutional buying via ETF inflows averaged " +
  "$450M/day last week. CME futures show significant open interest build at $105k strikes. " +
  "Key risk: macro CPI print could cause short-term volatility. Recommended: YES at 62%.";

function makeAnalystProfile(wallet = ANALYST_WALLET, code = "SAGE"): AnalystProfile {
  return {
    wallet,
    displayName: "CryptoSage",
    affiliateCode: code,
    specializations: ["crypto"],
    stats: {
      totalAnalyses: 0,
      correct: 0,
      accuracy: 0,
      avgConfidence: 0,
      totalSold: 0,
      revenueX402: 0,
      revenueAffiliate: 0,
    },
    registeredAt: new Date().toISOString(),
  };
}

// ── x402 Payment Tests ───────────────────────────────────────────────────

describe("x402 Payment Layer", () => {
  it("should process a simulated payment", async () => {
    const payment = await processX402Payment({
      resource: "listing-abc-123",
      amountSol: 0.01,
      recipientWallet: ANALYST_WALLET,
      payerWallet: BUYER_WALLET,
      description: "Test analysis",
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBeDefined();
    expect(payment.status).toBe("simulated");
    expect(payment.amountSol).toBe(0.01);
    expect(payment.buyerWallet).toBe(BUYER_WALLET);
    expect(payment.analystWallet).toBe(ANALYST_WALLET);
  });

  it("should verify simulated payment receipt", async () => {
    const payment = await processX402Payment({
      resource: "listing-abc-123",
      amountSol: 0.01,
      recipientWallet: ANALYST_WALLET,
      payerWallet: BUYER_WALLET,
      description: "Test",
    });

    const receipt = await verifyX402Receipt(payment);
    expect(receipt.verified).toBe(true);
    expect(receipt.paymentId).toBe(payment.id);
  });

  it("should reject payment below minimum amount", async () => {
    await expect(
      processX402Payment({
        resource: "listing-abc",
        amountSol: 0.0001, // below X402_MIN_PRICE_SOL
        recipientWallet: ANALYST_WALLET,
        payerWallet: BUYER_WALLET,
        description: "Test",
      })
    ).rejects.toThrow("out of range");
  });

  it("should reject payment above maximum amount", async () => {
    await expect(
      processX402Payment({
        resource: "listing-abc",
        amountSol: 5.0, // above X402_MAX_PRICE_SOL
        recipientWallet: ANALYST_WALLET,
        payerWallet: BUYER_WALLET,
        description: "Test",
      })
    ).rejects.toThrow("out of range");
  });

  it("should build correct HTTP 402 response", () => {
    const response = buildHttp402Response(0.01, ANALYST_WALLET);
    expect(response.statusCode).toBe(402);
    expect(response.body.x402Version).toBe(1);
    expect(response.body.accepts[0].network).toBe("solana-mainnet");
    expect(response.body.accepts[0].maxAmountRequired).toBe("0.01");
    expect(response.body.accepts[0].payTo).toBe(ANALYST_WALLET);
  });

  it("should summarize payment history", async () => {
    const p1 = await processX402Payment({
      resource: "a", amountSol: 0.01, recipientWallet: ANALYST_WALLET,
      payerWallet: BUYER_WALLET, description: "Test 1",
    });
    const p2 = await processX402Payment({
      resource: "b", amountSol: 0.02, recipientWallet: ANALYST_WALLET,
      payerWallet: BUYER_WALLET, description: "Test 2",
    });

    const summary = summarizePayments([p1, p2]);
    expect(summary.total).toBe(2);
    expect(summary.simulated).toBe(2);
    expect(summary.totalSol).toBeCloseTo(0.03, 5);
  });

  it("should assign unique IDs to each payment", async () => {
    const payments = await Promise.all([
      processX402Payment({ resource: "a", amountSol: 0.01, recipientWallet: ANALYST_WALLET, payerWallet: BUYER_WALLET, description: "T1" }),
      processX402Payment({ resource: "b", amountSol: 0.01, recipientWallet: ANALYST_WALLET, payerWallet: BUYER_WALLET, description: "T2" }),
      processX402Payment({ resource: "c", amountSol: 0.01, recipientWallet: ANALYST_WALLET, payerWallet: BUYER_WALLET, description: "T3" }),
    ]);
    const ids = payments.map(p => p.id);
    expect(new Set(ids).size).toBe(3);
  });
});

// ── Analyst Registry Tests ────────────────────────────────────────────────

describe("AnalystRegistry", () => {
  let registry: AnalystRegistry;

  beforeEach(() => { registry = new AnalystRegistry(); });

  it("should register analyst with MCP tool calls", async () => {
    const analyst = await registry.registerAnalyst({
      wallet: ANALYST_WALLET,
      displayName: "CryptoSage",
      affiliateCode: "SAGE",
      bio: "DeFi analyst",
      specializations: ["crypto"],
    });

    expect(analyst.wallet).toBe(ANALYST_WALLET);
    expect(analyst.affiliateCode).toBe("SAGE");
    expect(analyst.stats.totalAnalyses).toBe(0);
  });

  it("should retrieve registered analyst", async () => {
    await registry.registerAnalyst({
      wallet: ANALYST_WALLET,
      displayName: "CryptoSage",
      affiliateCode: "SAGE",
    });

    const found = registry.getAnalyst(ANALYST_WALLET);
    expect(found?.wallet).toBe(ANALYST_WALLET);
  });

  it("should list all analysts", async () => {
    await registry.registerAnalyst({ wallet: ANALYST_WALLET, displayName: "Agent1", affiliateCode: "A1" });
    await registry.registerAnalyst({ wallet: ANALYST_WALLET_2, displayName: "Agent2", affiliateCode: "A2" });

    expect(registry.getAllAnalysts().length).toBe(2);
  });

  it("should update analyst stats", async () => {
    await registry.registerAnalyst({ wallet: ANALYST_WALLET, displayName: "CryptoSage", affiliateCode: "SAGE" });
    registry.updateStats(ANALYST_WALLET, { totalSold: 10, revenueX402: 0.1 });

    const analyst = registry.getAnalyst(ANALYST_WALLET);
    expect(analyst?.stats.totalSold).toBe(10);
    expect(analyst?.stats.revenueX402).toBe(0.1);
  });

  it("should format analyst card", async () => {
    const analyst = await registry.registerAnalyst({
      wallet: ANALYST_WALLET,
      displayName: "CryptoSage",
      affiliateCode: "SAGE",
    });
    const card = registry.formatAnalystCard(analyst);
    expect(card).toContain("CryptoSage");
    expect(card).toContain("SAGE");
  });
});

// ── Listings Manager Tests ────────────────────────────────────────────────

describe("ListingsManager", () => {
  let manager: ListingsManager;
  let analyst: AnalystProfile;

  beforeEach(() => {
    manager = new ListingsManager();
    analyst = makeAnalystProfile();
  });

  it("should publish a valid analysis", () => {
    const listing = manager.publishAnalysis(analyst, {
      marketPda: MARKET_PDA,
      marketQuestion: "Will BTC hit $110k?",
      marketCategory: "crypto",
      thesis: VALID_THESIS,
      recommendedSide: "YES",
      confidenceScore: 72,
      priceSol: 0.01,
    });

    expect(listing.id).toBeDefined();
    expect(listing.analystWallet).toBe(ANALYST_WALLET);
    expect(listing.affiliateCode).toBe("SAGE");
    expect(listing.outcome).toBe("pending");
    expect(listing.purchased).toBe(0);
  });

  it("should reject thesis below minimum length", () => {
    expect(() =>
      manager.publishAnalysis(analyst, {
        marketPda: MARKET_PDA,
        marketQuestion: "Test?",
        marketCategory: "crypto",
        thesis: "Too short",
        recommendedSide: "YES",
        confidenceScore: 70,
        priceSol: 0.01,
      })
    ).toThrow("Thesis too short");
  });

  it("should reject confidence score out of range", () => {
    expect(() =>
      manager.publishAnalysis(analyst, {
        marketPda: MARKET_PDA,
        marketQuestion: "Test?",
        marketCategory: "crypto",
        thesis: VALID_THESIS,
        recommendedSide: "YES",
        confidenceScore: 150,
        priceSol: 0.01,
      })
    ).toThrow("Confidence must be");
  });

  it("should filter listings by category", () => {
    manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "BTC?", marketCategory: "crypto", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 70, priceSol: 0.01 });
    manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Chiefs?", marketCategory: "sports", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 65, priceSol: 0.008 });

    const crypto = manager.getListings({ category: "crypto" });
    const sports = manager.getListings({ category: "sports" });
    expect(crypto.length).toBe(1);
    expect(sports.length).toBe(1);
  });

  it("should filter by minimum confidence", () => {
    manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q1?", marketCategory: "crypto", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 50, priceSol: 0.01 });
    manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q2?", marketCategory: "crypto", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 80, priceSol: 0.01 });

    const highConf = manager.getListings({ minConfidence: 70 });
    expect(highConf.length).toBe(1);
    expect(highConf[0].confidenceScore).toBe(80);
  });

  it("should process purchase via x402", async () => {
    const listing = manager.publishAnalysis(analyst, {
      marketPda: MARKET_PDA, marketQuestion: "Will BTC hit $110k?",
      marketCategory: "crypto", thesis: VALID_THESIS,
      recommendedSide: "YES", confidenceScore: 72, priceSol: 0.01,
    });

    const purchase = await manager.purchaseAnalysis(listing.id, BUYER_WALLET);

    expect(purchase.listingId).toBe(listing.id);
    expect(purchase.buyerWallet).toBe(BUYER_WALLET);
    expect(purchase.payment.status).toBe("simulated");
    expect(purchase.analysis.affiliateCode).toBe("SAGE");
  });

  it("should increment purchase count after sale", async () => {
    const listing = manager.publishAnalysis(analyst, {
      marketPda: MARKET_PDA, marketQuestion: "BTC?", marketCategory: "crypto",
      thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 72, priceSol: 0.01,
    });

    expect(listing.purchased).toBe(0);
    await manager.purchaseAnalysis(listing.id, BUYER_WALLET);
    expect(listing.purchased).toBe(1);
  });

  it("should throw on purchase of unknown listing", async () => {
    await expect(
      manager.purchaseAnalysis("nonexistent-id", BUYER_WALLET)
    ).rejects.toThrow("Listing not found");
  });

  it("should track buyer purchases", async () => {
    const l1 = manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q1?", marketCategory: "crypto", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 72, priceSol: 0.01 });
    const l2 = manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q2?", marketCategory: "sports", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 65, priceSol: 0.008 });

    await manager.purchaseAnalysis(l1.id, BUYER_WALLET);
    await manager.purchaseAnalysis(l2.id, BUYER_WALLET);

    expect(manager.getBuyerPurchases(BUYER_WALLET).length).toBe(2);
    expect(manager.hasBuyerPurchased(BUYER_WALLET, l1.id)).toBe(true);
    expect(manager.hasBuyerPurchased(BUYER_WALLET, l2.id)).toBe(true);
  });

  it("should track total revenue", async () => {
    const l1 = manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q?", marketCategory: "crypto", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 72, priceSol: 0.01 });
    const l2 = manager.publishAnalysis(analyst, { marketPda: MARKET_PDA, marketQuestion: "Q2?", marketCategory: "sports", thesis: VALID_THESIS, recommendedSide: "YES", confidenceScore: 65, priceSol: 0.02 });

    await manager.purchaseAnalysis(l1.id, BUYER_WALLET);
    await manager.purchaseAnalysis(l2.id, BUYER_WALLET);

    expect(manager.getTotalRevenue()).toBeCloseTo(0.03, 5);
  });
});

// ── Reputation Tracker Tests ──────────────────────────────────────────────

describe("ReputationTracker", () => {
  let tracker: ReputationTracker;

  function makeListing(outcome: "correct" | "incorrect" | "pending" = "pending"): AnalysisListing {
    return {
      id: Math.random().toString(),
      analystWallet: ANALYST_WALLET,
      analystName: "CryptoSage",
      marketPda: MARKET_PDA,
      marketQuestion: "Will BTC hit $110k?",
      marketCategory: "crypto",
      thesis: VALID_THESIS,
      recommendedSide: "YES",
      confidenceScore: 72,
      priceSol: 0.01,
      affiliateCode: "SAGE",
      publishedAt: new Date().toISOString(),
      purchased: 0,
      outcome,
    };
  }

  beforeEach(() => { tracker = new ReputationTracker(); });

  it("should record predictions", () => {
    tracker.recordPrediction(ANALYST_WALLET, makeListing("pending"));
    tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));

    const records = tracker.getRecords(ANALYST_WALLET);
    expect(records.length).toBe(2);
  });

  it("should compute accuracy correctly", () => {
    for (let i = 0; i < 8; i++) tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));
    for (let i = 0; i < 2; i++) tracker.recordPrediction(ANALYST_WALLET, makeListing("incorrect"));

    const score = tracker.computeReputation(ANALYST_WALLET, "CryptoSage");
    expect(score.accuracy).toBeCloseTo(0.8, 2);
    expect(score.totalPredictions).toBe(10);
  });

  it("should assign correct tiers", () => {
    expect(tracker.computeTier(0, 0)).toBe("unranked");
    expect(tracker.computeTier(5, 0)).toBe("apprentice");
    expect(tracker.computeTier(15, 0.3)).toBe("analyst");
    expect(tracker.computeTier(25, 0.65)).toBe("expert");
    expect(tracker.computeTier(55, 0.8)).toBe("oracle");
    expect(tracker.computeTier(110, 0.9)).toBe("grandmaster");
  });

  it("should compute win streak correctly", () => {
    tracker.recordPrediction(ANALYST_WALLET, makeListing("incorrect"));
    tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));
    tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));
    tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));

    const score = tracker.computeReputation(ANALYST_WALLET, "CryptoSage");
    expect(score.streak).toBe(3);
  });

  it("should update outcome after resolution", () => {
    const listing = makeListing("pending");
    tracker.recordPrediction(ANALYST_WALLET, listing);
    tracker.updateOutcome(ANALYST_WALLET, listing.id, "correct");

    const records = tracker.getRecords(ANALYST_WALLET);
    expect(records[0].outcome).toBe("correct");
  });

  it("should build sorted leaderboard", () => {
    const analysts = [
      { wallet: ANALYST_WALLET, displayName: "CryptoSage" },
      { wallet: ANALYST_WALLET_2, displayName: "SportsMind" },
    ];

    // CryptoSage: 100 predictions, 85% accuracy → grandmaster
    for (let i = 0; i < 100; i++)
      tracker.recordPrediction(ANALYST_WALLET, makeListing(i < 85 ? "correct" : "incorrect"));

    // SportsMind: 15 predictions, any accuracy → analyst
    for (let i = 0; i < 15; i++)
      tracker.recordPrediction(ANALYST_WALLET_2, { ...makeListing("correct"), analystWallet: ANALYST_WALLET_2 });

    const lb = tracker.buildLeaderboard(analysts);
    expect(lb[0].wallet).toBe(ANALYST_WALLET);
    expect(lb[0].tier).toBe("grandmaster");
    expect(lb[1].tier).toBe("analyst");
  });

  it("should format leaderboard as string", () => {
    tracker.recordPrediction(ANALYST_WALLET, makeListing("correct"));
    const lb = tracker.buildLeaderboard([{ wallet: ANALYST_WALLET, displayName: "CryptoSage" }]);
    const formatted = tracker.formatLeaderboard(lb);
    expect(formatted).toContain("ANALYST REPUTATION LEADERBOARD");
    expect(formatted).toContain("CryptoSage");
  });
});

// ── Integration Test ──────────────────────────────────────────────────────

describe("IntelMarketplace (integration)", () => {
  it("should run full end-to-end demo without errors", async () => {
    const mp = new IntelMarketplace();
    await expect(mp.runDemo()).resolves.not.toThrow();
  });

  it("should maintain affiliate code chain through purchase", async () => {
    const mp = new IntelMarketplace();

    const analyst = await mp.analysts.registerAnalyst({
      wallet: ANALYST_WALLET,
      displayName: "CryptoSage",
      affiliateCode: "SAGE",
    });

    const listing = mp.listings.publishAnalysis(analyst, {
      marketPda: MARKET_PDA, marketQuestion: "BTC $110k?",
      marketCategory: "crypto", thesis: VALID_THESIS,
      recommendedSide: "YES", confidenceScore: 75, priceSol: 0.01,
    });

    const purchase = await mp.listings.purchaseAnalysis(listing.id, BUYER_WALLET);

    // Affiliate code flows through: analyst registers it, buyer embeds it in their bet
    expect(purchase.analysis.affiliateCode).toBe("SAGE");
    expect(listing.affiliateCode).toBe("SAGE");
  });
});
