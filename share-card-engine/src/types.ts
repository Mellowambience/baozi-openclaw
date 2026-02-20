export type EventType =
  | "new_market"
  | "large_bet"
  | "closing_soon"
  | "resolved"
  | "odds_shift";

export interface MarketEvent {
  type: EventType;
  marketPda: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  totalPool: number;
  closingAt?: string;
  resolvedOutcome?: string;
  betAmount?: number;
  oddsShift?: number;
  detectedAt: Date;
}

export interface ShareCard {
  marketPda: string;
  question: string;
  imageUrl: string;
  marketUrl: string;
  affiliateCode: string;
}

export interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}
