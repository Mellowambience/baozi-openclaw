// ── Recruiter Tracking Dashboard ────────────────────────────────────────────
// Monitors recruited agents: activity, volume, affiliate earnings.

import type {
  RecruitedAgent,
  RecruitStats,
  RecruiterDashboard,
} from "../types.js";
import { BaoziClient } from "../utils/baozi-client.js";
import { AFFILIATE_COMMISSION_RATE } from "../utils/constants.js";

export class RecruiterTracker {
  private client: BaoziClient;
  private recruits: Map<string, RecruitedAgent> = new Map();
  private recruiterWallet: string;
  private recruiterCode: string;

  constructor(
    recruiterWallet: string,
    recruiterCode: string,
    client?: BaoziClient
  ) {
    this.recruiterWallet = recruiterWallet;
    this.recruiterCode = recruiterCode;
    this.client = client || new BaoziClient();
  }

  // ── Register Recruit ──────────────────────────────────────────────────

  addRecruit(
    wallet: string,
    name: string,
    framework: RecruitedAgent["framework"],
    affiliateCode?: string
  ): RecruitedAgent {
    const recruit: RecruitedAgent = {
      wallet,
      name,
      onboardedAt: new Date().toISOString(),
      affiliateCode,
      framework,
      stats: {
        totalBets: 0,
        totalVolume: 0,
        totalWinnings: 0,
        affiliateEarnings: 0,
        marketsCreated: 0,
      },
    };

    this.recruits.set(wallet, recruit);
    console.log(`[Tracker] Added recruit: ${name} (${wallet.slice(0, 8)}...)`);
    return recruit;
  }

  // ── Update Stats ──────────────────────────────────────────────────────

  async refreshStats(): Promise<void> {
    console.log(`[Tracker] Refreshing stats for ${this.recruits.size} recruits...`);

    for (const [wallet, recruit] of this.recruits) {
      try {
        // Check positions via MCP
        const positions = await this.client.getPositions(wallet);
        console.log(`[Tracker] ${recruit.name}: positions fetched`);

        // In production: parse positions to update stats
        // For now, track via affiliate system
        const affiliateInfo = await this.client.getReferrals(
          this.recruiterCode
        );
        console.log(`[Tracker] Affiliate referrals:`, affiliateInfo);
      } catch (err) {
        console.error(`[Tracker] Failed to refresh ${recruit.name}:`, err);
      }
    }
  }

  updateRecruitStats(wallet: string, stats: Partial<RecruitStats>): void {
    const recruit = this.recruits.get(wallet);
    if (!recruit) return;

    Object.assign(recruit.stats, stats);

    // Recalculate affiliate earnings
    recruit.stats.affiliateEarnings =
      recruit.stats.totalWinnings * AFFILIATE_COMMISSION_RATE;
    recruit.stats.lastActive = new Date().toISOString();
  }

  // ── Dashboard ─────────────────────────────────────────────────────────

  getDashboard(): RecruiterDashboard {
    const recruits = Array.from(this.recruits.values());
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const combinedVolume = recruits.reduce(
      (sum, r) => sum + r.stats.totalVolume,
      0
    );
    const totalAffiliateEarnings = recruits.reduce(
      (sum, r) => sum + r.stats.affiliateEarnings,
      0
    );
    const activeRecruits = recruits.filter(
      (r) => r.stats.lastActive && new Date(r.stats.lastActive) > weekAgo
    ).length;

    const weeklyVolume = recruits.reduce((sum, r) => {
      if (r.stats.lastActive && new Date(r.stats.lastActive) > weekAgo) {
        return sum + r.stats.totalVolume;
      }
      return sum;
    }, 0);

    const topPerformer = recruits.reduce(
      (best, r) =>
        r.stats.totalVolume > (best?.stats.totalVolume || 0) ? r : best,
      undefined as RecruitedAgent | undefined
    );

    return {
      recruiterWallet: this.recruiterWallet,
      recruiterCode: this.recruiterCode,
      totalRecruited: recruits.length,
      activeRecruits,
      combinedVolume,
      totalAffiliateEarnings,
      recruits,
      weeklyVolume,
      topPerformer,
    };
  }

  // ── Formatted Output ──────────────────────────────────────────────────

  formatDashboard(): string {
    const d = this.getDashboard();

    let output = `
╔══════════════════════════════════════════════════════════════╗
║              AGENT RECRUITER DASHBOARD                       ║
╠══════════════════════════════════════════════════════════════╣
║  Recruiter: ${d.recruiterWallet.slice(0, 12)}...                         ║
║  Code: ${d.recruiterCode.padEnd(20)}                         ║
╠══════════════════════════════════════════════════════════════╣
║  Total Recruited:    ${String(d.totalRecruited).padStart(6)}                             ║
║  Active (7d):        ${String(d.activeRecruits).padStart(6)}                             ║
║  Combined Volume:    ${d.combinedVolume.toFixed(2).padStart(6)} SOL                     ║
║  Weekly Volume:      ${d.weeklyVolume.toFixed(2).padStart(6)} SOL                     ║
║  Affiliate Earnings: ${d.totalAffiliateEarnings.toFixed(4).padStart(6)} SOL              ║
╠══════════════════════════════════════════════════════════════╣
║  RECRUITED AGENTS                                            ║
╠══════════════════════════════════════════════════════════════╣`;

    for (const r of d.recruits) {
      output += `
║  ${r.name.padEnd(20)} | ${r.framework.padEnd(12)} | ${r.stats.totalVolume.toFixed(2)} SOL | ${r.stats.totalBets} bets`;
    }

    if (d.topPerformer) {
      output += `
╠══════════════════════════════════════════════════════════════╣
║  🏆 Top Performer: ${d.topPerformer.name}                    ║
║     Volume: ${d.topPerformer.stats.totalVolume.toFixed(2)} SOL | Bets: ${d.topPerformer.stats.totalBets}              ║`;
    }

    output += `
╚══════════════════════════════════════════════════════════════╝`;

    return output;
  }

  // ── Projections ───────────────────────────────────────────────────────

  getProjections(): {
    weeklyVolume: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    yearlyEarnings: number;
  } {
    const d = this.getDashboard();
    const avgVolumePerRecruit =
      d.totalRecruited > 0 ? d.combinedVolume / d.totalRecruited : 0;
    const weeklyVolume = d.totalRecruited * avgVolumePerRecruit;
    const weeklyEarnings = weeklyVolume * AFFILIATE_COMMISSION_RATE;

    return {
      weeklyVolume,
      weeklyEarnings,
      monthlyEarnings: weeklyEarnings * 4.33,
      yearlyEarnings: weeklyEarnings * 52,
    };
  }

  // ── Access ────────────────────────────────────────────────────────────

  getRecruit(wallet: string): RecruitedAgent | undefined {
    return this.recruits.get(wallet);
  }

  getAllRecruits(): RecruitedAgent[] {
    return Array.from(this.recruits.values());
  }

  getRecruitCount(): number {
    return this.recruits.size;
  }
}
