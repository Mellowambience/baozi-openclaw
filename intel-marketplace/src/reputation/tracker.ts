// ── Analyst Reputation Tracker ─────────────────────────────────────────────
// Tracks prediction accuracy from on-chain market outcomes.
// Reputation is the new credential.

import type {
  AnalystProfile,
  AnalystStats,
  ReputationScore,
  ReputationTier,
  PredictionRecord,
  AnalysisListing,
} from "../types.js";
import { REPUTATION_TIERS } from "../utils/constants.js";
import { BaoziClient } from "../utils/baozi-client.js";

export class ReputationTracker {
  private client: BaoziClient;
  private predictions: Map<string, PredictionRecord[]> = new Map(); // wallet → records

  constructor(client?: BaoziClient) {
    this.client = client || new BaoziClient();
  }

  // ── Record Prediction ──────────────────────────────────────────────────

  recordPrediction(
    analystWallet: string,
    listing: AnalysisListing
  ): PredictionRecord {
    const record: PredictionRecord = {
      listingId: listing.id,
      marketPda: listing.marketPda,
      question: listing.marketQuestion,
      recommendedSide: listing.recommendedSide,
      confidenceScore: listing.confidenceScore,
      outcome: listing.outcome || "pending",
      predictedAt: listing.publishedAt,
      resolvedAt: listing.resolvedAt,
    };

    const existing = this.predictions.get(analystWallet) || [];
    existing.push(record);
    this.predictions.set(analystWallet, existing);
    return record;
  }

  // ── Resolve Outcome ────────────────────────────────────────────────────
  // Called after market resolves on-chain (Grandma Mei oracle or manual)

  async resolveFromChain(
    analystWallet: string,
    listingId: string,
    marketPda: string
  ): Promise<"correct" | "incorrect" | "pending"> {
    console.log(
      `[Reputation] Checking on-chain resolution for market: ${marketPda}`
    );

    const status = await this.client.getResolutionStatus(marketPda);
    console.log(`[Reputation] Resolution status:`, status);

    // In production: parse status.data.outcome and compare to analyst recommendation
    // For demo: return "pending" (market not yet resolved)
    return "pending";
  }

  updateOutcome(
    analystWallet: string,
    listingId: string,
    outcome: "correct" | "incorrect"
  ): void {
    const records = this.predictions.get(analystWallet) || [];
    const record = records.find((r) => r.listingId === listingId);
    if (record) {
      record.outcome = outcome;
      record.resolvedAt = new Date().toISOString();
      console.log(
        `[Reputation] ${analystWallet.slice(0, 8)}...: ${listingId} → ${outcome}`
      );
    }
  }

  // ── Compute Reputation ─────────────────────────────────────────────────

  computeReputation(
    analystWallet: string,
    displayName: string
  ): ReputationScore {
    const records = this.predictions.get(analystWallet) || [];
    const resolved = records.filter((r) => r.outcome !== "pending");
    const correct = resolved.filter((r) => r.outcome === "correct");

    const accuracy = resolved.length > 0 ? correct.length / resolved.length : 0;
    const tier = this.computeTier(records.length, accuracy);

    // Compute streak (consecutive correct from most recent)
    let streak = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].outcome === "correct") streak++;
      else break;
    }

    return {
      wallet: analystWallet,
      displayName,
      accuracy,
      totalPredictions: records.length,
      streak,
      tier,
      recentPredictions: records.slice(-10).reverse(),
    };
  }

  computeTier(totalPredictions: number, accuracy: number): ReputationTier {
    if (
      totalPredictions >= REPUTATION_TIERS.grandmaster.minPredictions &&
      accuracy >= REPUTATION_TIERS.grandmaster.minAccuracy
    ) return "grandmaster";

    if (
      totalPredictions >= REPUTATION_TIERS.oracle.minPredictions &&
      accuracy >= REPUTATION_TIERS.oracle.minAccuracy
    ) return "oracle";

    if (
      totalPredictions >= REPUTATION_TIERS.expert.minPredictions &&
      accuracy >= REPUTATION_TIERS.expert.minAccuracy
    ) return "expert";

    if (totalPredictions >= REPUTATION_TIERS.analyst.minPredictions) return "analyst";
    if (totalPredictions >= REPUTATION_TIERS.apprentice.minPredictions) return "apprentice";
    return "unranked";
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  computeStats(analystWallet: string): AnalystStats {
    const records = this.predictions.get(analystWallet) || [];
    const resolved = records.filter((r) => r.outcome !== "pending");
    const correct = resolved.filter((r) => r.outcome === "correct");
    const accuracy = resolved.length > 0 ? correct.length / resolved.length : 0;
    const avgConfidence =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.confidenceScore, 0) / records.length
        : 0;

    return {
      totalAnalyses: records.length,
      correct: correct.length,
      accuracy,
      avgConfidence,
      totalSold: 0, // updated by marketplace
      revenueX402: 0,
      revenueAffiliate: 0,
    };
  }

  // ── Leaderboard ────────────────────────────────────────────────────────

  buildLeaderboard(
    analysts: Array<{ wallet: string; displayName: string }>
  ): ReputationScore[] {
    return analysts
      .map((a) => this.computeReputation(a.wallet, a.displayName))
      .sort((a, b) => {
        // Sort by tier first, then accuracy, then total predictions
        const tierOrder = [
          "grandmaster", "oracle", "expert", "analyst", "apprentice", "unranked",
        ];
        const tierDiff =
          tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
        if (tierDiff !== 0) return tierDiff;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalPredictions - a.totalPredictions;
      });
  }

  // ── Formatted Output ───────────────────────────────────────────────────

  formatLeaderboard(scores: ReputationScore[]): string {
    const TIER_EMOJI: Record<ReputationTier, string> = {
      grandmaster: "🏆",
      oracle: "🔮",
      expert: "⭐",
      analyst: "📊",
      apprentice: "🌱",
      unranked: "❓",
    };

    let out = `
${"═".repeat(60)}
`;
    out += `  🎯 ANALYST REPUTATION LEADERBOARD
`;
    out += `${"═".repeat(60)}
`;
    out += `  Rank  Analyst           Tier         Acc    Picks
`;
    out += `${"─".repeat(60)}
`;

    scores.forEach((s, i) => {
      const acc = (s.accuracy * 100).toFixed(1).padStart(5);
      const picks = String(s.totalPredictions).padStart(5);
      const tier = `${TIER_EMOJI[s.tier]} ${s.tier}`.padEnd(14);
      const name = s.displayName.slice(0, 16).padEnd(17);
      out += `  ${String(i + 1).padStart(4)}  ${name} ${tier} ${acc}%  ${picks}
`;
    });

    out += `${"═".repeat(60)}
`;
    return out;
  }

  getRecords(wallet: string): PredictionRecord[] {
    return this.predictions.get(wallet) || [];
  }
}
