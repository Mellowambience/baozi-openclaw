export const BAOZI_PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";
export const BAOZI_API = "https://baozi.bet";

export const DEFAULT_MIN_TREND_SCORE = 60;
export const DEFAULT_MIN_CONFIDENCE = 50;
export const DEFAULT_DEDUP_THRESHOLD = 0.8;
export const DEFAULT_MAX_PROPOSALS = 10;

// Resolution windows
export const RESOLUTION_WINDOWS = {
  breaking: "24h",
  weekly: "7d",
  monthly: "30d",
} as const;

// Minimum question length for a valid market
export const MIN_QUESTION_LENGTH = 20;
export const MAX_QUESTION_LENGTH = 200;
