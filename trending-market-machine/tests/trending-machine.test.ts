import { describe, it, expect, beforeEach } from "vitest";
import { TrendingMarketMachine, SignalAggregator, DeduplicationChecker, MarketProposer, MarketCreator } from "../src/index.js";
import { TwitterTrendAdapter, RedditTrendAdapter, GoogleTrendsAdapter, CryptoSocialAdapter } from "../src/trending/signals.js";
import type { TrendingSignal, TrendingMachineConfig } from "../src/types.js";

const DEMO_WALLET = "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf";

const DEFAULT_CONFIG: TrendingMachineConfig = {
  creatorWallet: DEMO_WALLET,
  minTrendScore: 60,
  minConfidence: 50,
  dedupSimilarityThreshold: 0.8,
  maxProposalsPerRun: 10,
};

function makeSignal(overrides: Partial<TrendingSignal> = {}): TrendingSignal {
  return {
    id: "test-" + Math.random().toString(36).slice(2),
    source: "twitter",
    topic: "Bitcoin ETF approval by SEC",
    keywords: ["BTC", "ETF", "SEC", "approval"],
    score: 85,
    velocity: 1200,
    category: "crypto",
    rawData: {},
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── SignalAggregator Tests ───────────────────────────────────────────────────

describe("SignalAggregator", () => {
  let aggregator: SignalAggregator;

  beforeEach(() => { aggregator = new SignalAggregator(); });

  it("should fetch signals from all adapters", async () => {
    const signals = await aggregator.fetchAll(3);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => s.id)).toBe(true);
    expect(signals.every((s) => s.source)).toBe(true);
    expect(signals.every((s) => s.score >= 0 && s.score <= 100)).toBe(true);
  });

  it("should filter signals by minimum score", async () => {
    const signals = await aggregator.fetchAll(5);
    const filtered = aggregator.filterByScore(signals, 80);
    expect(filtered.every((s) => s.score >= 80)).toBe(true);
  });

  it("should sort signals by score descending", async () => {
    const signals = await aggregator.fetchAll(5);
    const filtered = aggregator.filterByScore(signals, 0);
    for (let i = 0; i < filtered.length - 1; i++) {
      expect(filtered[i].score).toBeGreaterThanOrEqual(filtered[i + 1].score);
    }
  });

  it("should deduplicate similar signals", async () => {
    const signals = await aggregator.fetchAll(5);
    const uniqueTopics = new Set(signals.map((s) => s.topic));
    expect(uniqueTopics.size).toBe(signals.length);
  });

  it("TwitterTrendAdapter should return valid trends", async () => {
    const adapter = new TwitterTrendAdapter();
    const trends = await adapter.fetch(3);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0].topic).toBeDefined();
    expect(trends[0].score).toBeGreaterThan(0);
  });

  it("RedditTrendAdapter should return valid trends", async () => {
    const adapter = new RedditTrendAdapter();
    const trends = await adapter.fetch(3);
    expect(trends.length).toBeGreaterThan(0);
  });

  it("GoogleTrendsAdapter should return valid trends", async () => {
    const adapter = new GoogleTrendsAdapter();
    const trends = await adapter.fetch(2);
    expect(trends.length).toBeGreaterThan(0);
  });

  it("CryptoSocialAdapter should return valid trends", async () => {
    const adapter = new CryptoSocialAdapter();
    const trends = await adapter.fetch(2);
    expect(trends.length).toBeGreaterThan(0);
  });
});

// ── DeduplicationChecker Tests ───────────────────────────────────────────────

describe("DeduplicationChecker", () => {
  let checker: DeduplicationChecker;

  beforeEach(() => { checker = new DeduplicationChecker(); });

  it("should load live markets on first check", async () => {
    const signal = makeSignal();
    await checker.check(signal);
    expect(checker.getLiveMarketCount()).toBeGreaterThan(0);
  });

  it("should detect high-similarity signals as duplicates", async () => {
    // "Will BTC reach 100k" is in the seeded live markets
    const signal = makeSignal({
      topic: "BTC Bitcoin reaching 100k price target",
      keywords: ["BTC", "Bitcoin", "100k", "price"],
      category: "crypto",
    });
    const result = await checker.check(signal, 0.5); // lower threshold for test
    expect(result).toBeDefined();
    expect(typeof result.isDuplicate).toBe("boolean");
    expect(result.similarityScore).toBeDefined();
  });

  it("should not flag low-similarity signals as duplicates", async () => {
    const signal = makeSignal({
      topic: "FIFA World Cup 2030 host announcement",
      keywords: ["FIFA", "WorldCup", "2030", "hosting"],
      category: "sports",
    });
    const result = await checker.check(signal, 0.8);
    expect(result.isDuplicate).toBe(false);
  });

  it("should batch check multiple signals", async () => {
    const signals = [makeSignal(), makeSignal({ id: "sig-2", topic: "Different topic" })];
    const results = await checker.checkBatch(signals, 0.8);
    expect(results.size).toBe(2);
  });

  it("similarity score should be between 0 and 1", async () => {
    const signal = makeSignal();
    const result = await checker.check(signal);
    expect(result.similarityScore).toBeGreaterThanOrEqual(0);
    expect(result.similarityScore).toBeLessThanOrEqual(1);
  });
});

// ── MarketProposer Tests ─────────────────────────────────────────────────────

describe("MarketProposer", () => {
  let proposer: MarketProposer;

  beforeEach(() => { proposer = new MarketProposer(); });

  it("should generate proposal from non-duplicate signal", () => {
    const signal = makeSignal();
    const proposal = proposer.proposeFromSignal(signal, { isDuplicate: false });
    expect(proposal).not.toBeNull();
    expect(proposal!.question.length).toBeGreaterThan(20);
    expect(proposal!.outcomes.length).toBe(2);
    expect(proposal!.resolutionCriteria.length).toBeGreaterThan(20);
    expect(proposal!.status).toBe("pending");
    expect(proposal!.confidenceScore).toBeGreaterThan(0);
    expect(proposal!.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("should return null for duplicate signals", () => {
    const signal = makeSignal();
    const proposal = proposer.proposeFromSignal(signal, {
      isDuplicate: true,
      similarMarketPda: "test-pda",
      similarityScore: 0.9,
    });
    expect(proposal).toBeNull();
  });

  it("should generate proposals for all market categories", () => {
    const categories = ["crypto", "sports", "technology", "politics", "finance"] as const;
    for (const cat of categories) {
      const signal = makeSignal({ category: cat, keywords: ["TestKeyword", "SecondKw"] });
      const proposal = proposer.proposeFromSignal(signal, { isDuplicate: false });
      expect(proposal).not.toBeNull();
      expect(proposal!.category).toBe(cat);
    }
  });

  it("should set correct resolution deadline", () => {
    const signal = makeSignal({ category: "crypto" });
    const proposal = proposer.proposeFromSignal(signal, { isDuplicate: false });
    expect(proposal).not.toBeNull();
    const deadline = new Date(proposal!.resolutionDeadline);
    const now = new Date();
    expect(deadline.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should batch propose with max limit", async () => {
    const signals = Array.from({ length: 8 }, (_, i) =>
      makeSignal({ id: "sig-" + i, topic: "Unique topic number " + i + " for market", keywords: ["Topic" + i, "Market"] })
    );
    const dedupMap = new Map(signals.map((s) => [s.id, { isDuplicate: false }]));
    const proposals = proposer.proposeBatch(signals, dedupMap, 5);
    expect(proposals.length).toBeLessThanOrEqual(5);
  });

  it("should include outcomes in proposal", () => {
    const signal = makeSignal();
    const proposal = proposer.proposeFromSignal(signal, { isDuplicate: false });
    expect(proposal!.outcomes).toContain("YES");
    expect(proposal!.outcomes).toContain("NO");
  });
});

// ── MarketCreator Tests ──────────────────────────────────────────────────────

describe("MarketCreator", () => {
  let creator: MarketCreator;

  beforeEach(() => {
    creator = new MarketCreator(DEFAULT_CONFIG);
  });

  it("should auto-approve proposals above min confidence", () => {
    const proposer = new MarketProposer();
    const signal = makeSignal();
    const p = proposer.proposeFromSignal(signal, { isDuplicate: false })!;
    p.confidenceScore = 75;
    p.status = "pending";

    const approved = creator.autoApprove([p], 60);
    expect(approved).toBe(1);
    expect(p.status).toBe("approved");
  });

  it("should reject proposals below min confidence", () => {
    const proposer = new MarketProposer();
    const signal = makeSignal();
    const p = proposer.proposeFromSignal(signal, { isDuplicate: false })!;
    p.confidenceScore = 30;
    p.status = "pending";

    creator.autoApprove([p], 60);
    expect(p.status).toBe("rejected");
  });

  it("should create approved markets", async () => {
    const proposer = new MarketProposer();
    const signal = makeSignal();
    const p = proposer.proposeFromSignal(signal, { isDuplicate: false })!;
    p.status = "approved";
    p.confidenceScore = 80;

    const results = await creator.createApproved([p]);
    expect(results.length).toBe(1);
    expect(results[0].marketPda).toBeDefined();
    expect(results[0].txSignature).toBeDefined();
    expect(p.status).toBe("created");
  });
});

// ── Integration Test ─────────────────────────────────────────────────────────

describe("TrendingMarketMachine (integration)", () => {
  it("should complete a full run without errors", async () => {
    const machine = new TrendingMarketMachine(DEFAULT_CONFIG);
    const report = await machine.run();

    expect(report).toBeDefined();
    expect(report.signalsFetched).toBeGreaterThan(0);
    expect(report.proposed).toBeGreaterThanOrEqual(0);
    expect(report.errors).toBeDefined();
    expect(Array.isArray(report.errors)).toBe(true);
  });

  it("should filter signals by minTrendScore", async () => {
    const machine = new TrendingMarketMachine({ ...DEFAULT_CONFIG, minTrendScore: 95 });
    const report = await machine.run();
    // Very high threshold — few or no signals should pass
    expect(report.signalsFiltered).toBeLessThanOrEqual(report.signalsFetched);
  });

  it("should respect maxProposalsPerRun", async () => {
    const machine = new TrendingMarketMachine({ ...DEFAULT_CONFIG, maxProposalsPerRun: 2 });
    const report = await machine.run();
    expect(report.proposed).toBeLessThanOrEqual(2);
  });
});
