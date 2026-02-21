// ── Deduplication Engine ─────────────────────────────────────────────────────
// Checks proposed markets against live Baozi markets to avoid duplicates.
// Uses keyword overlap + semantic similarity scoring.

import type { TrendingSignal, DeduplicationResult } from "../types.js";
import { BaoziClient } from "../utils/baozi-client.js";
import { DEFAULT_DEDUP_THRESHOLD } from "../utils/constants.js";

export interface LiveMarket {
  pda: string;
  question: string;
  keywords: string[];
  category: string;
}

export class DeduplicationChecker {
  private client: BaoziClient;
  private liveMarkets: LiveMarket[] = [];
  private lastFetchedAt?: Date;
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(client?: BaoziClient) {
    this.client = client || new BaoziClient();
  }

  // ── Fetch live markets ───────────────────────────────────────────────────

  async refreshLiveMarkets(): Promise<void> {
    const now = new Date();
    if (this.lastFetchedAt && now.getTime() - this.lastFetchedAt.getTime() < this.cacheTtlMs) {
      console.log("[Dedup] Using cached markets (" + this.liveMarkets.length + ")");
      return;
    }

    console.log("[Dedup] Fetching live markets from Baozi...");
    const result = await this.client.listMarkets("Lab", "Active");
    // In production: parse result.data.markets into LiveMarket[]
    // For demo: seed with realistic examples
    this.liveMarkets = [
      { pda: "7pYb...", question: "Will BTC reach $100k in 2026?", keywords: ["BTC", "Bitcoin", "100k"], category: "crypto" },
      { pda: "8qZc...", question: "Will ETH reach $5k before Q2 2026?", keywords: ["ETH", "Ethereum", "5k"], category: "crypto" },
      { pda: "9rMn...", question: "Will the NFL season end with Chiefs winning?", keywords: ["NFL", "Chiefs", "SuperBowl"], category: "sports" },
      { pda: "2xKp...", question: "Will OpenAI release GPT-5 before April 2026?", keywords: ["GPT5", "OpenAI", "release"], category: "technology" },
    ];
    this.lastFetchedAt = now;
    console.log("[Dedup] " + this.liveMarkets.length + " live markets cached");
  }

  // ── Check single signal ───────────────────────────────────────────────────

  async check(
    signal: TrendingSignal,
    threshold = DEFAULT_DEDUP_THRESHOLD
  ): Promise<DeduplicationResult> {
    await this.refreshLiveMarkets();

    let maxSimilarity = 0;
    let mostSimilarMarket: LiveMarket | undefined;

    for (const market of this.liveMarkets) {
      const sim = this.computeSimilarity(signal, market);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        mostSimilarMarket = market;
      }
    }

    if (maxSimilarity >= threshold) {
      return {
        isDuplicate: true,
        similarMarketPda: mostSimilarMarket?.pda,
        similarityScore: maxSimilarity,
        reason: "High overlap with existing market: " + mostSimilarMarket?.question?.slice(0, 60),
      };
    }

    return { isDuplicate: false, similarityScore: maxSimilarity };
  }

  // ── Similarity Scoring ────────────────────────────────────────────────────
  // Weighted combination of:
  // - Keyword overlap (Jaccard similarity)
  // - Category match
  // - Topic phrase overlap

  private computeSimilarity(signal: TrendingSignal, market: LiveMarket): number {
    // 1. Category match (0 or 0.3)
    const categoryMatch = signal.category === market.category ? 0.3 : 0;

    // 2. Keyword Jaccard similarity (0–0.5)
    const signalKw = new Set(signal.keywords.map((k) => k.toLowerCase()));
    const marketKw = new Set(market.keywords.map((k) => k.toLowerCase()));
    const intersection = new Set([...signalKw].filter((k) => marketKw.has(k)));
    const union = new Set([...signalKw, ...marketKw]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    const keywordScore = jaccard * 0.5;

    // 3. Topic phrase overlap (0–0.2)
    const signalWords = new Set(signal.topic.toLowerCase().split(/\s+/));
    const marketWords = new Set(market.question.toLowerCase().split(/\s+/));
    const phraseIntersection = new Set([...signalWords].filter((w) => marketWords.has(w) && w.length > 3));
    const phraseScore = Math.min(phraseIntersection.size / 5, 0.2);

    return categoryMatch + keywordScore + phraseScore;
  }

  // ── Batch check ────────────────────────────────────────────────────────────

  async checkBatch(
    signals: TrendingSignal[],
    threshold = DEFAULT_DEDUP_THRESHOLD
  ): Promise<Map<string, DeduplicationResult>> {
    await this.refreshLiveMarkets();
    const results = new Map<string, DeduplicationResult>();
    for (const signal of signals) {
      results.set(signal.id, await this.check(signal, threshold));
    }
    return results;
  }

  getLiveMarketCount(): number {
    return this.liveMarkets.length;
  }
}
