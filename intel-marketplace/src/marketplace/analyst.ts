// ── Analyst Registry ────────────────────────────────────────────────────────
// Manages analyst registration, on-chain profile, and affiliate codes.

import type { AnalystProfile, MarketCategory } from "../types.js";
import { BaoziClient } from "../utils/baozi-client.js";

export class AnalystRegistry {
  private analysts: Map<string, AnalystProfile> = new Map();
  private client: BaoziClient;

  constructor(client?: BaoziClient) {
    this.client = client || new BaoziClient();
  }

  // ── Register Analyst ───────────────────────────────────────────────────

  async registerAnalyst(params: {
    wallet: string;
    displayName: string;
    affiliateCode: string;
    bio?: string;
    specializations?: MarketCategory[];
  }): Promise<AnalystProfile> {
    console.log(`[Registry] Registering analyst: ${params.displayName}`);

    // 1. Check affiliate code availability
    const check = await this.client.checkAffiliateCode(params.affiliateCode);
    console.log(`[Registry] Affiliate code check:`, check);

    // 2. Build CreatorProfile on-chain
    const profileTx = await this.client.buildCreateCreatorProfile(
      params.displayName,
      50, // 0.5% default creator fee
      params.wallet
    );
    console.log(
      `[Registry] CreatorProfile tx ready — user signs to create on-chain identity`
    );

    // 3. Build affiliate registration
    const affiliateTx = await this.client.buildRegisterAffiliate(
      params.affiliateCode,
      params.wallet
    );
    console.log(
      `[Registry] Affiliate code registration tx ready — user signs to earn 1% lifetime`
    );

    const profile: AnalystProfile = {
      wallet: params.wallet,
      displayName: params.displayName,
      affiliateCode: params.affiliateCode,
      bio: params.bio,
      specializations: params.specializations || [],
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

    this.analysts.set(params.wallet, profile);
    return profile;
  }

  getAnalyst(wallet: string): AnalystProfile | undefined {
    return this.analysts.get(wallet);
  }

  getAllAnalysts(): AnalystProfile[] {
    return Array.from(this.analysts.values());
  }

  updateStats(
    wallet: string,
    updates: Partial<AnalystProfile["stats"]>
  ): void {
    const analyst = this.analysts.get(wallet);
    if (!analyst) return;
    Object.assign(analyst.stats, updates);
  }

  formatAnalystCard(analyst: AnalystProfile): string {
    const acc = (analyst.stats.accuracy * 100).toFixed(1);
    return (
      `╔${"═".repeat(50)}╗
` +
      `║  ${analyst.displayName.padEnd(47)} ║
` +
      `║  Wallet: ${analyst.wallet.slice(0, 8)}...${analyst.wallet.slice(-4).padEnd(33)} ║
` +
      `║  Code: ${analyst.affiliateCode.padEnd(42)} ║
` +
      `║  Accuracy: ${acc}% | ${analyst.stats.totalAnalyses} analyses | ${analyst.stats.totalSold} sold`.padEnd(51) + `║
` +
      `║  x402 Rev: ${analyst.stats.revenueX402.toFixed(4)} SOL | Affiliate: ${analyst.stats.revenueAffiliate.toFixed(4)} SOL`.padEnd(51) + `║
` +
      `╚${"═".repeat(50)}╝`
    );
  }
}
