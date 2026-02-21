// ── Core Types — x402 Agent Intel Marketplace ───────────────────────────────

// ── Analysts ────────────────────────────────────────────────────────────────

export interface AnalystProfile {
  wallet: string;
  displayName: string;
  affiliateCode: string;
  bio?: string;
  specializations: MarketCategory[];
  stats: AnalystStats;
  registeredAt: string;
}

export interface AnalystStats {
  totalAnalyses: number;
  correct: number;
  accuracy: number;       // 0–1
  avgConfidence: number;  // 0–100
  totalSold: number;
  revenueX402: number;    // SOL from micropayments
  revenueAffiliate: number; // SOL from 1% lifetime commissions
}

export type MarketCategory =
  | "crypto"
  | "sports"
  | "politics"
  | "entertainment"
  | "technology"
  | "finance"
  | "weather"
  | "other";

// ── Analysis Listings ────────────────────────────────────────────────────────

export interface AnalysisListing {
  id: string;
  analystWallet: string;
  analystName: string;
  marketPda: string;
  marketQuestion: string;
  marketCategory: MarketCategory;
  thesis: string;             // 200–2000 chars
  recommendedSide: "YES" | "NO" | string; // race outcome name
  confidenceScore: number;    // 1–100
  priceSol: number;           // x402 price
  affiliateCode: string;      // analyst's code for referred bets
  publishedAt: string;
  expiresAt?: string;
  purchased: number;          // times sold
  outcome?: "correct" | "incorrect" | "pending";
  resolvedAt?: string;
}

// ── x402 Payment ─────────────────────────────────────────────────────────────

export type X402PaymentStatus =
  | "pending"
  | "simulated"   // x402 not yet fully deployed — documented simulation
  | "completed"
  | "failed"
  | "refunded";

export interface X402Payment {
  id: string;
  buyerWallet: string;
  analystWallet: string;
  listingId: string;
  amountSol: number;
  status: X402PaymentStatus;
  createdAt: string;
  completedAt?: string;
  txSignature?: string; // on-chain evidence when real x402 deployed
}

// ── Purchase Records ─────────────────────────────────────────────────────────

export interface PurchaseRecord {
  listingId: string;
  buyerWallet: string;
  payment: X402Payment;
  analysis: AnalysisListing;
  accessGrantedAt: string;
}

// ── Reputation ────────────────────────────────────────────────────────────────

export interface ReputationScore {
  wallet: string;
  displayName: string;
  accuracy: number;
  totalPredictions: number;
  streak: number;           // consecutive correct
  tier: ReputationTier;
  recentPredictions: PredictionRecord[];
}

export type ReputationTier =
  | "unranked"
  | "apprentice"    // <10 predictions
  | "analyst"       // 10+ predictions, any accuracy
  | "expert"        // 20+ predictions, ≥60% accuracy
  | "oracle"        // 50+ predictions, ≥75% accuracy
  | "grandmaster";  // 100+ predictions, ≥85% accuracy

export interface PredictionRecord {
  listingId: string;
  marketPda: string;
  question: string;
  recommendedSide: string;
  confidenceScore: number;
  outcome: "correct" | "incorrect" | "pending";
  predictedAt: string;
  resolvedAt?: string;
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export interface MarketplaceState {
  listings: AnalysisListing[];
  analysts: AnalystProfile[];
  purchases: PurchaseRecord[];
  payments: X402Payment[];
}

export interface ListingFilter {
  category?: MarketCategory;
  minConfidence?: number;
  maxPrice?: number;
  analystMinAccuracy?: number;
  analystTier?: ReputationTier;
  status?: "active" | "expired" | "resolved";
}
