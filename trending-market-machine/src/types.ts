// ── Core Types — Trending Market Machine ────────────────────────────────────

export type TrendSource = "twitter" | "reddit" | "google_trends" | "crypto_social" | "news";

export type MarketCategory =
  | "crypto" | "sports" | "politics" | "entertainment"
  | "technology" | "finance" | "weather" | "other";

// ── Trending Signal ───────────────────────────────────────────────────────────

export interface TrendingSignal {
  id: string;
  source: TrendSource;
  topic: string;
  keywords: string[];
  score: number;          // 0–100 trending score
  velocity: number;       // rate of acceleration (posts/hour)
  category: MarketCategory;
  rawData: Record<string, unknown>;
  capturedAt: string;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

export interface DeduplicationResult {
  isDuplicate: boolean;
  similarMarketPda?: string;
  similarityScore?: number; // 0–1
  reason?: string;
}

// ── Market Proposal ────────────────────────────────────────────────────────────

export interface MarketProposal {
  id: string;
  trend: TrendingSignal;
  question: string;
  outcomes: string[];           // ["YES", "NO"] or race-style names
  resolutionCriteria: string;
  resolutionDeadline: string;   // ISO 8601
  category: MarketCategory;
  confidenceScore: number;      // 1–100: how good a market is this?
  dedupResult: DeduplicationResult;
  status: "pending" | "approved" | "rejected" | "created";
  marketPda?: string;           // set after on-chain creation
  createdAt: string;
}

// ── Market Creation ────────────────────────────────────────────────────────────

export interface MarketCreationResult {
  proposalId: string;
  marketPda: string;
  txSignature: string;
  question: string;
  category: MarketCategory;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface TrendingMachineConfig {
  minTrendScore: number;        // minimum score to propose a market (default 60)
  minConfidence: number;        // minimum proposal confidence (default 50)
  dedupSimilarityThreshold: number; // similarity above this = duplicate (default 0.8)
  maxProposalsPerRun: number;   // cap on proposals per cycle (default 10)
  creatorWallet: string;
  affiliateCode?: string;
}

// ── Run Report ────────────────────────────────────────────────────────────────

export interface RunReport {
  runAt: string;
  signalsFetched: number;
  signalsFiltered: number;
  deduplicatedOut: number;
  proposed: number;
  created: number;
  rejected: number;
  proposals: MarketProposal[];
  errors: string[];
}
