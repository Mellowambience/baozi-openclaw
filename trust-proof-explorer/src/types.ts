export type ResolutionTier = 1 | 2 | 3;

export interface ResolutionProof {
  marketPda: string;
  question: string;
  outcome: string;
  tier: ResolutionTier;
  tierLabel: string;
  evidenceSources: string[];
  ipfsHash?: string;
  ipfsUrl?: string;
  onChainTx?: string;
  solscanUrl?: string;
  squadsProposal?: string;
  resolvedBy: string;
  resolvedAt: string;
  closeTime: string;
  resolutionTimeMs: number;
  disputeWindowHours: number;
  challengesFiled: number;
  category?: string;
  layer: string;
}

export interface OracleStats {
  totalResolved: number;
  avgResolutionTimeHours: number;
  byTier: Record<ResolutionTier, { count: number; avgTimeHours: number }>;
  disputeRate: number;
  trustScore: number;
  overturnedCount: number;
}
