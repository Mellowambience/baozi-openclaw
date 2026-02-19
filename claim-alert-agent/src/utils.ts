// Pure utility functions for Claim & Alert Agent
import type { MarketSnapshot } from './types';

export function isClosingSoon(closingTime: string | undefined, thresholdHours: number): boolean {
  if (!closingTime) return false;
  const ms = new Date(closingTime).getTime() - Date.now();
  return ms > 0 && ms <= thresholdHours * 3600000;
}

export function detectOddsShift(
  current: MarketSnapshot,
  previous: MarketSnapshot | undefined,
  threshold: number
): { shifted: boolean; delta: number } {
  if (!previous) return { shifted: false, delta: 0 };
  const delta = Math.abs(current.yesOdds - previous.yesOdds);
  return { shifted: delta >= threshold, delta };
}

export function formatAlertMessage(
  type: 'claimable' | 'closing_soon' | 'odds_shift' | 'win' | 'loss',
  market: MarketSnapshot,
  extra?: Record<string, unknown>
): string {
  const emoji: Record<string, string> = {
    claimable: '💰',
    closing_soon: '⏰',
    odds_shift: '📊',
    win: '🎉',
    loss: '😔',
  };
  const prefix = emoji[type] || '🔔';
  switch (type) {
    case 'claimable':
      return `${prefix} Claimable winnings on: ${market.question}`;
    case 'closing_soon':
      return `${prefix} Closing soon: ${market.question}`;
    case 'odds_shift':
      return `${prefix} Odds shifted by ${(extra?.delta as number)?.toFixed(1)}% on: ${market.question}`;
    case 'win':
      return `${prefix} You won! Market resolved: ${market.question}`;
    case 'loss':
      return `${prefix} Market resolved (loss): ${market.question}`;
    default:
      return `🔔 Alert: ${market.question}`;
  }
}
