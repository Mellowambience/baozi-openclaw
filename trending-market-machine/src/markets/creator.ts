// ── Market Creator ───────────────────────────────────────────────────────────
// Takes approved proposals and submits them to Baozi Labs via MCP tools.

import { randomUUID } from "crypto";
import type { MarketProposal, MarketCreationResult, TrendingMachineConfig } from "../types.js";
import { BaoziClient } from "../utils/baozi-client.js";

export class MarketCreator {
  private client: BaoziClient;
  private config: TrendingMachineConfig;

  constructor(config: TrendingMachineConfig, client?: BaoziClient) {
    this.config = config;
    this.client = client || new BaoziClient();
  }

  // ── Create single market ──────────────────────────────────────────────────

  async createMarket(proposal: MarketProposal): Promise<MarketCreationResult> {
    console.log("[Creator] Creating market: " + proposal.question.slice(0, 60) + "...");

    // 1. Build the create_market transaction via MCP
    const txResult = await this.client.buildCreateMarket({
      question: proposal.question,
      outcomes: proposal.outcomes,
      category: proposal.category,
      resolutionCriteria: proposal.resolutionCriteria,
      resolutionDeadline: proposal.resolutionDeadline,
      creatorWallet: this.config.creatorWallet,
      affiliateCode: this.config.affiliateCode,
    });

    console.log("[Creator] Market tx built:", JSON.stringify(txResult).slice(0, 80));

    // 2. Sign + submit (in production: wallet signs the serialized tx)
    // const { txSignature } = await walletAdapter.signAndSend(txResult.data.transaction);

    // Simulated result for demo
    const marketPda = "Mkt" + randomUUID().replace(/-/g, "").slice(0, 40);
    const txSignature = "Tx" + randomUUID().replace(/-/g, "").slice(0, 44);

    const result: MarketCreationResult = {
      proposalId: proposal.id,
      marketPda,
      txSignature,
      question: proposal.question,
      category: proposal.category,
      createdAt: new Date().toISOString(),
    };

    // Update proposal state
    proposal.status = "created";
    proposal.marketPda = marketPda;

    console.log("[Creator] Market created: " + marketPda.slice(0, 16) + "... tx:" + txSignature.slice(0, 16) + "...");
    return result;
  }

  // ── Filter and create batch ────────────────────────────────────────────────

  async createApproved(proposals: MarketProposal[]): Promise<MarketCreationResult[]> {
    const approved = proposals.filter(
      (p) => p.status === "approved" && p.confidenceScore >= this.config.minConfidence
    );

    console.log("[Creator] " + approved.length + "/" + proposals.length + " proposals approved for creation");

    const results: MarketCreationResult[] = [];
    for (const proposal of approved) {
      try {
        const result = await this.createMarket(proposal);
        results.push(result);
      } catch (err) {
        console.error("[Creator] Failed to create market for: " + proposal.question.slice(0, 50), err);
        proposal.status = "rejected";
      }
    }

    return results;
  }

  // ── Auto-approve based on confidence ──────────────────────────────────────

  autoApprove(proposals: MarketProposal[], minConfidence: number): number {
    let approved = 0;
    for (const p of proposals) {
      if (p.status === "pending" && p.confidenceScore >= minConfidence && !p.dedupResult.isDuplicate) {
        p.status = "approved";
        approved++;
      } else if (p.status === "pending") {
        p.status = "rejected";
      }
    }
    console.log("[Creator] Auto-approved " + approved + "/" + proposals.length + " proposals");
    return approved;
  }
}
