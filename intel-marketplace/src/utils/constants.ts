export const BAOZI_PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";
export const BAOZI_API = "https://baozi.bet";

export const AFFILIATE_COMMISSION_RATE = 0.01; // 1% lifetime
export const MIN_THESIS_LENGTH = 200;
export const MAX_THESIS_LENGTH = 2000;
export const MIN_CONFIDENCE = 1;
export const MAX_CONFIDENCE = 100;

// x402 — protocol not yet fully deployed on Solana mainnet (Feb 2026)
// Simulation mode: we build the full payment flow architecture and document
// where real x402 calls will slot in once the protocol matures.
// See: https://www.x402.org/
export const X402_MODE: "simulation" | "live" = "simulation";
export const X402_MIN_PRICE_SOL = 0.001;
export const X402_MAX_PRICE_SOL = 1.0;

export const REPUTATION_TIERS = {
  unranked:    { minPredictions: 0,  minAccuracy: 0 },
  apprentice:  { minPredictions: 1,  minAccuracy: 0 },
  analyst:     { minPredictions: 10, minAccuracy: 0 },
  expert:      { minPredictions: 20, minAccuracy: 0.6 },
  oracle:      { minPredictions: 50, minAccuracy: 0.75 },
  grandmaster: { minPredictions: 100, minAccuracy: 0.85 },
} as const;
