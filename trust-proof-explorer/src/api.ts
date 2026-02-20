import { ResolutionProof, ResolutionTier } from "./types";
import { tierLabel } from "./utils";

const BAOZI_API = "https://baozi.bet/api";

/**
 * Fetch all resolution proofs from the Baozi API
 */
export async function fetchProofs(): Promise<ResolutionProof[]> {
  try {
    const res = await fetch(`${BAOZI_API}/agents/proofs`);
    if (!res.ok) {
      console.warn(`Proofs API returned ${res.status}. Using demo data.`);
      return getDemoProofs();
    }
    const data = (await res.json()) as any;
    const raw: any[] = data?.proofs ?? data?.data ?? data ?? [];

    return raw.map((r: any): ResolutionProof => {
      const tier = (r.tier ?? 2) as ResolutionTier;
      const closeMs = new Date(r.close_time ?? r.closeTime ?? r.resolved_at).getTime();
      const resolvedMs = new Date(r.resolved_at ?? r.resolvedAt ?? r.close_time).getTime();
      return {
        marketPda: r.market_pda ?? r.marketPda ?? "",
        question: r.question ?? "Unknown",
        outcome: r.outcome ?? "Unknown",
        tier,
        tierLabel: tierLabel(tier),
        evidenceSources: r.evidence_sources ?? r.evidenceSources ?? [r.data_source ?? "manual"],
        ipfsHash: r.ipfs_hash ?? r.ipfsHash,
        ipfsUrl: r.ipfs_hash ? `https://ipfs.io/ipfs/${r.ipfs_hash}` : undefined,
        onChainTx: r.on_chain_tx ?? r.onChainTx ?? r.tx_signature,
        solscanUrl: r.on_chain_tx ? `https://solscan.io/tx/${r.on_chain_tx}` : undefined,
        squadsProposal: r.squads_proposal ?? r.squadsProposal,
        resolvedBy: r.resolved_by ?? r.resolvedBy ?? "Grandma Mei",
        resolvedAt: r.resolved_at ?? r.resolvedAt ?? "",
        closeTime: r.close_time ?? r.closeTime ?? "",
        resolutionTimeMs: Math.max(0, resolvedMs - closeMs),
        disputeWindowHours: r.dispute_window_hours ?? 6,
        challengesFiled: r.challenges_filed ?? 0,
        category: r.category,
        layer: r.layer ?? "Lab",
      };
    });
  } catch (e) {
    console.warn("Failed to fetch proofs:", e);
    return getDemoProofs();
  }
}

/**
 * Demo proofs when API is unavailable (for testing/demo)
 */
function getDemoProofs(): ResolutionProof[] {
  return [
    {
      marketPda: "SuperBowlLX2026",
      question: "Will the Philadelphia Eagles win Super Bowl LX?",
      outcome: "YES",
      tier: 2,
      tierLabel: "Verified — Official API",
      evidenceSources: ["NFL.com final score", "ESPN game summary"],
      ipfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ipfsUrl: "https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      onChainTx: "5VERTiAmMmDPcSMdM3dSPBGLDNJbxA7YMuDfiqvHSYzR",
      solscanUrl: "https://solscan.io/tx/5VERTiAmMmDPcSMdM3dSPBGLDNJbxA7YMuDfiqvHSYzR",
      squadsProposal: "https://squads.so/proposal/eagles-superbowl",
      resolvedBy: "Grandma Mei",
      resolvedAt: "2026-02-15T06:15:00Z",
      closeTime: "2026-02-15T04:00:00Z",
      resolutionTimeMs: 8100000,
      disputeWindowHours: 6,
      challengesFiled: 0,
      category: "Sports",
      layer: "Official",
    },
    {
      marketPda: "BTCPrice100kFeb2026",
      question: "Will BTC exceed $100,000 at the Feb 10 Pyth snapshot?",
      outcome: "YES",
      tier: 1,
      tierLabel: "Trustless — Pyth Oracle",
      evidenceSources: ["Pyth Network SOL/BTC price feed — on-chain verified"],
      onChainTx: "3hE7GbP4CvNqJtS8DkzXmYrFvABwLHi1NpMsQcTuZPd",
      solscanUrl: "https://solscan.io/tx/3hE7GbP4CvNqJtS8DkzXmYrFvABwLHi1NpMsQcTuZPd",
      resolvedBy: "Pyth Oracle (automated)",
      resolvedAt: "2026-02-10T16:03:22Z",
      closeTime: "2026-02-10T16:00:00Z",
      resolutionTimeMs: 202000,
      disputeWindowHours: 6,
      challengesFiled: 0,
      category: "Crypto",
      layer: "Official",
    },
    {
      marketPda: "ETHFlipBTC2026",
      question: "Will ETH market cap surpass BTC by end of Q1 2026?",
      outcome: "NO",
      tier: 3,
      tierLabel: "AI Research — Grandma Mei",
      evidenceSources: ["CoinGecko market cap data Feb 2026", "CoinMarketCap historical API"],
      ipfsHash: "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB5LpJe95",
      ipfsUrl: "https://ipfs.io/ipfs/QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB5LpJe95",
      onChainTx: "9xKpLz2MnBvGcRhQdTyFwYqAjDsHuCfEiV7NtXmPbSr",
      solscanUrl: "https://solscan.io/tx/9xKpLz2MnBvGcRhQdTyFwYqAjDsHuCfEiV7NtXmPbSr",
      squadsProposal: "https://squads.so/proposal/eth-flip-btc-q1",
      resolvedBy: "Grandma Mei",
      resolvedAt: "2026-03-31T10:30:00Z",
      closeTime: "2026-03-31T00:00:00Z",
      resolutionTimeMs: 37800000,
      disputeWindowHours: 6,
      challengesFiled: 0,
      category: "Crypto",
      layer: "Official",
    },
  ];
}
