// ── Trending Market Machine — Main Orchestrator ──────────────────────────────
// Monitors trending topics and auto-creates Baozi Labs prediction markets.

export { SignalAggregator, TwitterTrendAdapter, RedditTrendAdapter, GoogleTrendsAdapter, CryptoSocialAdapter } from "./trending/signals.js";
export { DeduplicationChecker } from "./dedup/checker.js";
export { MarketProposer } from "./markets/proposer.js";
export { MarketCreator } from "./markets/creator.js";
export { BaoziClient } from "./utils/baozi-client.js";
export * from "./types.js";

import { SignalAggregator } from "./trending/signals.js";
import { DeduplicationChecker } from "./dedup/checker.js";
import { MarketProposer } from "./markets/proposer.js";
import { MarketCreator } from "./markets/creator.js";
import { BaoziClient } from "./utils/baozi-client.js";
import type { TrendingMachineConfig, RunReport } from "./types.js";
import { DEFAULT_MIN_TREND_SCORE, DEFAULT_MIN_CONFIDENCE, DEFAULT_MAX_PROPOSALS } from "./utils/constants.js";

export class TrendingMarketMachine {
  private signals: SignalAggregator;
  private dedup: DeduplicationChecker;
  private proposer: MarketProposer;
  private creator: MarketCreator;
  private config: TrendingMachineConfig;

  constructor(config: TrendingMachineConfig) {
    this.config = {
      minTrendScore: DEFAULT_MIN_TREND_SCORE,
      minConfidence: DEFAULT_MIN_CONFIDENCE,
      maxProposalsPerRun: DEFAULT_MAX_PROPOSALS,
      dedupSimilarityThreshold: 0.8,
      ...config,
    };
    const client = new BaoziClient();
    this.signals = new SignalAggregator();
    this.dedup = new DeduplicationChecker(client);
    this.proposer = new MarketProposer();
    this.creator = new MarketCreator(this.config, client);
  }

  // ── Full pipeline run ─────────────────────────────────────────────────────

  async run(): Promise<RunReport> {
    const runAt = new Date().toISOString();
    const errors: string[] = [];

    console.log("═══════════════════════════════════════════════════════");
    console.log("  Trending Market Machine — Run starting at " + runAt.slice(0, 16));
    console.log("═══════════════════════════════════════════════════════");

    // Step 1: Fetch trending signals
    console.log("\n[Step 1] Fetching trending signals from all sources...");
    const allSignals = await this.signals.fetchAll(5);
    console.log("[Step 1] Fetched " + allSignals.length + " unique signals");
    console.log(this.signals.formatSignals(allSignals));

    // Step 2: Filter by trend score
    const filteredSignals = this.signals.filterByScore(allSignals, this.config.minTrendScore);
    console.log("[Step 2] After score filter (>=" + this.config.minTrendScore + "): " + filteredSignals.length + " signals");

    // Step 3: Deduplication check against live markets
    console.log("\n[Step 3] Running deduplication against live Baozi markets...");
    const dedupResults = await this.dedup.checkBatch(filteredSignals, this.config.dedupSimilarityThreshold);
    const dedupedOut = [...dedupResults.values()].filter((d) => d.isDuplicate).length;
    console.log("[Step 3] Deduplicated: " + dedupedOut + " signals (similar markets exist)");

    // Step 4: Generate market proposals
    console.log("\n[Step 4] Generating market proposals...");
    const proposals = this.proposer.proposeBatch(
      filteredSignals,
      dedupResults,
      this.config.maxProposalsPerRun
    );
    console.log("[Step 4] Generated " + proposals.length + " proposals:");
    console.log(this.proposer.formatProposals(proposals));

    // Step 5: Auto-approve and create
    console.log("[Step 5] Auto-approving proposals (min confidence: " + this.config.minConfidence + ")...");
    const approvedCount = this.creator.autoApprove(proposals, this.config.minConfidence);

    console.log("[Step 5] Creating approved markets on-chain...");
    const created = await this.creator.createApproved(proposals);

    // Step 6: Report
    const report: RunReport = {
      runAt,
      signalsFetched: allSignals.length,
      signalsFiltered: filteredSignals.length,
      deduplicatedOut: dedupedOut,
      proposed: proposals.length,
      created: created.length,
      rejected: proposals.length - created.length,
      proposals,
      errors,
    };

    this.printReport(report);
    return report;
  }

  private printReport(report: RunReport): void {
    const bar = "═".repeat(55);
    console.log("\n╔" + bar + "╗");
    console.log("║  TRENDING MARKET MACHINE — RUN REPORT                ║");
    console.log("╠" + bar + "╣");
    console.log("║  Signals fetched:     " + String(report.signalsFetched).padEnd(33) + " ║");
    console.log("║  After score filter:  " + String(report.signalsFiltered).padEnd(33) + " ║");
    console.log("║  Deduped out:         " + String(report.deduplicatedOut).padEnd(33) + " ║");
    console.log("║  Proposed:            " + String(report.proposed).padEnd(33) + " ║");
    console.log("║  Created on-chain:    " + String(report.created).padEnd(33) + " ║");
    console.log("║  Rejected:            " + String(report.rejected).padEnd(33) + " ║");
    if (report.errors.length > 0) {
      console.log("║  Errors:              " + String(report.errors.length).padEnd(33) + " ║");
    }
    console.log("╚" + bar + "╝\n");

    if (report.created > 0) {
      console.log("Markets created this run:");
      for (const p of report.proposals.filter((p) => p.status === "created")) {
        console.log("  ✅ " + p.question.slice(0, 60) + " [" + p.category + "]");
        console.log("     PDA: " + (p.marketPda || "").slice(0, 20) + "...");
      }
    }
  }
}
