import { MarketEvent, EventType } from "./types";

const PROVERBS = [
  { zh: "运气在蒸，别急揭盖", en: "luck is steaming, don't lift the lid" },
  { zh: "包子虽小，馅儿实在", en: "the bun is small, but the filling is real" },
  { zh: "慢工出细活", en: "slow work produces fine craft" },
  { zh: "小小一笼，大大缘分", en: "small steamer, big fate" },
  { zh: "火候到了，自然熟", en: "when the heat is right, it cooks itself" },
];

export function randomProverb(): { zh: string; en: string } {
  return PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
}

export function formatPool(sol: number): string {
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k SOL`;
  return `${sol.toFixed(1)} SOL`;
}

export function formatOdds(yes: number, no: number): string {
  return `YES: ${(yes * 100).toFixed(0)}% | NO: ${(no * 100).toFixed(0)}%`;
}

export function timeUntil(isoString: string): string {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms < 0) return "closing now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)} days`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

/**
 * Detect notable events from a list of markets.
 * Compares current state with previous snapshot.
 */
export function detectEvents(
  markets: any[],
  prevSnapshot: Map<string, any>
): MarketEvent[] {
  const events: MarketEvent[] = [];
  const now = new Date();

  for (const m of markets) {
    const pda = m.pda ?? m.market_pda;
    const question = m.question ?? "";
    const yesPool = m.yes_pool ?? m.yesPool ?? 0;
    const noPool = m.no_pool ?? m.noPool ?? 0;
    const total = yesPool + noPool || 1;
    const yesOdds = yesPool / total;
    const noOdds = noPool / total;
    const closeTime = m.close_time ?? m.closeTime;
    const prev = prevSnapshot.get(pda);

    // New market (created < 1 hour ago)
    if (!prev && m.created_at) {
      const age = (now.getTime() - new Date(m.created_at).getTime()) / 3600000;
      if (age < 1) {
        events.push({ type: "new_market", marketPda: pda, question, yesOdds, noOdds, totalPool: total, closingAt: closeTime, detectedAt: now });
      }
    }

    // Closing soon (< 24 hours)
    if (closeTime) {
      const hoursLeft = (new Date(closeTime).getTime() - now.getTime()) / 3600000;
      if (hoursLeft > 0 && hoursLeft < 24 && (!prev || !prev.closingSoonFired)) {
        events.push({ type: "closing_soon", marketPda: pda, question, yesOdds, noOdds, totalPool: total, closingAt: closeTime, detectedAt: now });
      }
    }

    // Significant odds shift (> 10%)
    if (prev) {
      const shift = Math.abs(yesOdds - (prev.yesOdds ?? 0.5));
      if (shift > 0.1) {
        events.push({ type: "odds_shift", marketPda: pda, question, yesOdds, noOdds, totalPool: total, closingAt: closeTime, oddsShift: shift, detectedAt: now });
      }
    }

    // Resolved market
    if (m.resolved && m.outcome && (!prev || !prev.resolved)) {
      events.push({ type: "resolved", marketPda: pda, question, yesOdds, noOdds, totalPool: total, resolvedOutcome: m.outcome, detectedAt: now });
    }
  }

  return events;
}

/**
 * Build a social media caption for a market event
 */
export function buildCaption(event: MarketEvent, affiliateCode: string): string {
  const proverb = randomProverb();
  const marketUrl = `https://baozi.bet/market/${event.marketPda}?ref=${affiliateCode}`;
  const oddsStr = formatOdds(event.yesOdds, event.noOdds);
  const poolStr = formatPool(event.totalPool);

  let headline = "";
  let emoji = "🥟";

  switch (event.type) {
    case "new_market":
      headline = "fresh from the steamer";
      emoji = "🥟✨";
      break;
    case "large_bet":
      headline = `big money just moved — ${event.betAmount?.toFixed(1)} SOL dropped`;
      emoji = "💰";
      break;
    case "closing_soon":
      headline = `closing in ${timeUntil(event.closingAt!)} — last call`;
      emoji = "⏰";
      break;
    case "resolved":
      headline = `resolved: ${event.resolvedOutcome?.toUpperCase()} wins`;
      emoji = "🎯";
      break;
    case "odds_shift":
      headline = `odds shifted ${((event.oddsShift ?? 0) * 100).toFixed(0)}% — something's moving`;
      emoji = "📈";
      break;
  }

  return [
    `${emoji} ${headline}`,
    ``,
    `"${event.question}"`,
    ``,
    `${oddsStr} | Pool: ${poolStr}`,
    event.closingAt && event.type !== "resolved" ? `closing in ${timeUntil(event.closingAt)}` : "",
    ``,
    `place your bet → ${marketUrl}`,
    ``,
    `${proverb.zh}`,
    `"${proverb.en}"`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
