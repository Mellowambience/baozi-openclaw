import { Call, CallerReputation, MarketParams } from "./types";

const BAOZI_API = "https://baozi.bet/api";

/**
 * Parse a free-text prediction into structured market parameters.
 * Returns null if the prediction cannot be structured.
 */
export function parsePrediction(text: string): MarketParams | null {
  // Normalize
  const t = text.trim();
  if (t.length < 10) return null;

  // Detect timeframe keywords
  const datePatterns = [
    /by\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
    /before\s+(\w+\s+\d{1,2})/i,
    /within\s+(\d+)\s+(hours?|days?|weeks?|months?)/i,
    /end of\s+(\w+)/i,
  ];

  // Detect asset mentions
  const assetKeywords = ["BTC", "ETH", "SOL", "bitcoin", "ethereum", "solana"];
  const hasAsset = assetKeywords.some((k) =>
    t.toLowerCase().includes(k.toLowerCase())
  );

  // Detect price targets
  const priceMatch = t.match(/\$\s*[\d,]+(?:k|K|m|M)?/);

  // Determine data source
  let dataSource = "manual review";
  if (hasAsset) dataSource = "CoinGecko price API";
  if (t.toLowerCase().includes("nfl") || t.toLowerCase().includes("super bowl"))
    dataSource = "NFL official API";
  if (t.toLowerCase().includes("nba")) dataSource = "NBA official API";
  if (t.toLowerCase().includes("election")) dataSource = "AP News";

  // Build question
  const question = t.endsWith("?") ? t : `Will ${t}?`;

  // Default: Type A (event-based), close 25h before event
  const now = new Date();
  const eventTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default
  const closeTime = new Date(eventTime.getTime() - 25 * 60 * 60 * 1000);

  return {
    question,
    type: "A",
    closeTime,
    eventTime,
    dataSource,
    resolutionCriteria: `Resolves YES if: ${t}. Data source: ${dataSource}.`,
  };
}

/**
 * Validate timing rules per baozi pari-mutuel v6.3
 */
export function validateTiming(params: MarketParams): {
  valid: boolean;
  error?: string;
} {
  const now = new Date();
  if (params.closeTime <= now) {
    return { valid: false, error: "Close time must be in the future" };
  }
  if (params.type === "A" && params.eventTime) {
    const diff =
      (params.eventTime.getTime() - params.closeTime.getTime()) / (1000 * 3600);
    if (diff < 24) {
      return {
        valid: false,
        error: `Type A: close_time must be >= 24h before event_time (currently ${diff.toFixed(1)}h)`,
      };
    }
  }
  if (params.type === "B" && params.measurementStart) {
    if (params.closeTime >= params.measurementStart) {
      return {
        valid: false,
        error: "Type B: close_time must be before measurement_start",
      };
    }
  }
  return { valid: true };
}

/**
 * Calculate reputation score from call history
 */
export function calculateReputation(calls: Call[]): CallerReputation {
  const resolved = calls.filter((c) => c.status === "resolved");
  const correct = resolved.filter((c) => c.outcome === "win");
  const pending = calls.filter((c) => c.status !== "resolved");

  const solWagered = calls.reduce((sum, c) => sum + c.betAmount, 0);
  const solWon = resolved
    .filter((c) => c.outcome === "win")
    .reduce((sum, c) => sum + c.betAmount * 1.8, 0); // approx payout
  const solLost = resolved
    .filter((c) => c.outcome === "loss")
    .reduce((sum, c) => sum + c.betAmount, 0);

  const hitRate = resolved.length > 0 ? correct.length / resolved.length : 0;

  // Streak: count consecutive wins from most recent
  let streak = 0;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i].outcome === "win") streak++;
    else break;
  }

  // Longest streak
  let longestStreak = 0;
  let cur = 0;
  for (const c of resolved) {
    if (c.outcome === "win") {
      cur++;
      longestStreak = Math.max(longestStreak, cur);
    } else {
      cur = 0;
    }
  }

  // Confidence-weighted score (volume + accuracy)
  const confidenceScore =
    resolved.length >= 5
      ? hitRate * 100 * (1 + Math.log10(resolved.length) / 10)
      : hitRate * 50;

  return {
    caller: calls[0]?.caller ?? "unknown",
    walletAddress: calls[0]?.walletAddress,
    totalCalls: calls.length,
    correctCalls: correct.length,
    pendingCalls: pending.length,
    solWagered,
    solWon,
    solLost,
    hitRate,
    streak,
    longestStreak,
    confidenceScore,
    calls,
  };
}

/**
 * Format a reputation display string
 */
export function formatReputation(rep: CallerReputation): string {
  const pnl = rep.solWon - rep.solLost;
  const pnlStr = pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2);
  const hitPct = (rep.hitRate * 100).toFixed(1);

  return [
    `═══════════════════════════════════════`,
    `  CALLER REPUTATION: ${rep.caller}`,
    `═══════════════════════════════════════`,
    `  Hit Rate:      ${hitPct}% (${rep.correctCalls}/${rep.totalCalls - rep.pendingCalls} resolved)`,
    `  Streak:        ${rep.streak} consecutive wins`,
    `  Best Streak:   ${rep.longestStreak}`,
    `  SOL Wagered:   ${rep.solWagered.toFixed(3)} SOL`,
    `  Net P&L:       ${pnlStr} SOL`,
    `  Confidence:    ${rep.confidenceScore.toFixed(1)}/100`,
    `  Pending Calls: ${rep.pendingCalls}`,
    `═══════════════════════════════════════`,
  ].join("\n");
}

/**
 * Fetch markets from baozi API
 */
export async function fetchMarkets(layer?: string): Promise<any[]> {
  try {
    const url = `${BAOZI_API}/mcp/list_markets${layer ? `?layer=${layer}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return data?.markets ?? data?.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch resolution status for a market
 */
export async function fetchResolutionStatus(marketPda: string): Promise<any> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/get_resolution_status?market=${marketPda}`);
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}
