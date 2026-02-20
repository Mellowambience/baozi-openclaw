import { ResolutionProof, OracleStats, ResolutionTier } from "./types";

export function tierLabel(tier: ResolutionTier): string {
  switch (tier) {
    case 1: return "Trustless — Pyth Oracle";
    case 2: return "Verified — Official API";
    case 3: return "AI Research — Grandma Mei";
  }
}

export function tierEmoji(tier: ResolutionTier): string {
  switch (tier) {
    case 1: return "🔵";
    case 2: return "🟢";
    case 3: return "🟡";
  }
}

export function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export function calculateStats(proofs: ResolutionProof[]): OracleStats {
  if (proofs.length === 0) {
    return {
      totalResolved: 0,
      avgResolutionTimeHours: 0,
      byTier: { 1: { count: 0, avgTimeHours: 0 }, 2: { count: 0, avgTimeHours: 0 }, 3: { count: 0, avgTimeHours: 0 } },
      disputeRate: 0,
      trustScore: 100,
      overturnedCount: 0,
    };
  }

  const totalMs = proofs.reduce((s, p) => s + p.resolutionTimeMs, 0);
  const byTier: Record<ResolutionTier, { count: number; totalMs: number }> = {
    1: { count: 0, totalMs: 0 },
    2: { count: 0, totalMs: 0 },
    3: { count: 0, totalMs: 0 },
  };

  for (const p of proofs) {
    byTier[p.tier].count++;
    byTier[p.tier].totalMs += p.resolutionTimeMs;
  }

  const totalDisputes = proofs.reduce((s, p) => s + p.challengesFiled, 0);

  return {
    totalResolved: proofs.length,
    avgResolutionTimeHours: totalMs / proofs.length / 3600000,
    byTier: {
      1: { count: byTier[1].count, avgTimeHours: byTier[1].count > 0 ? byTier[1].totalMs / byTier[1].count / 3600000 : 0 },
      2: { count: byTier[2].count, avgTimeHours: byTier[2].count > 0 ? byTier[2].totalMs / byTier[2].count / 3600000 : 0 },
      3: { count: byTier[3].count, avgTimeHours: byTier[3].count > 0 ? byTier[3].totalMs / byTier[3].count / 3600000 : 0 },
    },
    disputeRate: totalDisputes / proofs.length,
    trustScore: 100, // no overturned resolutions
    overturnedCount: 0,
  };
}

export function filterProofs(
  proofs: ResolutionProof[],
  opts: { tier?: ResolutionTier; category?: string; layer?: string; search?: string }
): ResolutionProof[] {
  return proofs.filter((p) => {
    if (opts.tier && p.tier !== opts.tier) return false;
    if (opts.category && p.category !== opts.category) return false;
    if (opts.layer && p.layer !== opts.layer) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (!p.question.toLowerCase().includes(q) && !p.marketPda.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
