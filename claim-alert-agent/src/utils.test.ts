import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isClosingSoon, detectOddsShift, formatAlertMessage } from './utils';
import { DEFAULT_ALERTS, type MarketSnapshot, type WalletConfig } from './types';

describe('DEFAULT_ALERTS', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_ALERTS.claimable).toBe(true);
    expect(DEFAULT_ALERTS.closingSoon).toBe(true);
    expect(DEFAULT_ALERTS.closingSoonHours).toBe(6);
    expect(DEFAULT_ALERTS.oddsShift).toBe(true);
    expect(DEFAULT_ALERTS.oddsShiftThreshold).toBe(10);
  });
});

describe('isClosingSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when closing within threshold', () => {
    expect(isClosingSoon('2026-02-19T15:00:00Z', 6)).toBe(true);
  });

  it('returns false when closing after threshold', () => {
    expect(isClosingSoon('2026-02-20T12:00:00Z', 6)).toBe(false);
  });

  it('returns false for already closed markets', () => {
    expect(isClosingSoon('2026-02-18T00:00:00Z', 6)).toBe(false);
  });

  it('returns false for undefined closing time', () => {
    expect(isClosingSoon(undefined, 6)).toBe(false);
  });
});

describe('detectOddsShift', () => {
  const baseSnapshot: MarketSnapshot = {
    pda: 'abc',
    question: 'Test?',
    yesOdds: 60,
    noOdds: 40,
    status: 'Active',
  };

  it('detects shift above threshold', () => {
    const previous = { ...baseSnapshot, yesOdds: 45 };
    const result = detectOddsShift(baseSnapshot, previous, 10);
    expect(result.shifted).toBe(true);
    expect(result.delta).toBe(15);
  });

  it('does not flag shift below threshold', () => {
    const previous = { ...baseSnapshot, yesOdds: 55 };
    const result = detectOddsShift(baseSnapshot, previous, 10);
    expect(result.shifted).toBe(false);
    expect(result.delta).toBe(5);
  });

  it('returns no shift for first-seen market', () => {
    const result = detectOddsShift(baseSnapshot, undefined, 10);
    expect(result.shifted).toBe(false);
    expect(result.delta).toBe(0);
  });

  it('detects exact threshold match', () => {
    const previous = { ...baseSnapshot, yesOdds: 50 };
    const result = detectOddsShift(baseSnapshot, previous, 10);
    expect(result.shifted).toBe(true);
    expect(result.delta).toBe(10);
  });
});

describe('formatAlertMessage', () => {
  const market: MarketSnapshot = {
    pda: 'abc',
    question: 'Will BTC hit 100k?',
    yesOdds: 65,
    noOdds: 35,
    status: 'Active',
  };

  it('formats claimable alert', () => {
    const msg = formatAlertMessage('claimable', market);
    expect(msg).toContain('💰');
    expect(msg).toContain('Will BTC hit 100k?');
  });

  it('formats closing soon alert', () => {
    const msg = formatAlertMessage('closing_soon', market);
    expect(msg).toContain('⏰');
    expect(msg).toContain('Closing soon');
  });

  it('formats odds shift with delta', () => {
    const msg = formatAlertMessage('odds_shift', market, { delta: 15.3 });
    expect(msg).toContain('📊');
    expect(msg).toContain('15.3%');
  });

  it('formats win alert', () => {
    const msg = formatAlertMessage('win', market);
    expect(msg).toContain('🎉');
    expect(msg).toContain('You won');
  });

  it('formats loss alert', () => {
    const msg = formatAlertMessage('loss', market);
    expect(msg).toContain('😔');
  });
});
