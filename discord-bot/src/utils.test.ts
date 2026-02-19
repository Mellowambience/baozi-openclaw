import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatOdds, progressBar, timeUntil, formatPool } from './utils';

describe('formatOdds', () => {
  it('calculates percentage from pools', () => {
    const result = formatOdds(75, 25);
    expect(result.yes).toBe(75);
    expect(result.no).toBe(25);
  });

  it('returns 50/50 for zero pools', () => {
    const result = formatOdds(0, 0);
    expect(result.yes).toBe(50);
    expect(result.no).toBe(50);
  });

  it('handles uneven pools', () => {
    const result = formatOdds(1, 3);
    expect(result.yes).toBe(25);
    expect(result.no).toBe(75);
  });

  it('handles large numbers', () => {
    const result = formatOdds(1000000, 1000000);
    expect(result.yes).toBe(50);
    expect(result.no).toBe(50);
  });
});

describe('progressBar', () => {
  it('renders full bar at 100%', () => {
    const bar = progressBar(100, 10);
    expect(bar).toBe('\u2588'.repeat(10));
  });

  it('renders empty bar at 0%', () => {
    const bar = progressBar(0, 10);
    expect(bar).toBe('\u2591'.repeat(10));
  });

  it('renders half bar at 50%', () => {
    const bar = progressBar(50, 10);
    expect(bar.length).toBe(10);
    expect(bar).toBe('\u2588'.repeat(5) + '\u2591'.repeat(5));
  });

  it('uses default length of 15', () => {
    const bar = progressBar(50);
    expect(bar.length).toBe(15);
  });
});

describe('timeUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Closed" for past timestamps', () => {
    expect(timeUntil('2026-02-18T00:00:00Z')).toBe('Closed');
  });

  it('formats days and hours', () => {
    expect(timeUntil('2026-02-22T00:00:00Z')).toBe('2d 12h');
  });

  it('formats hours and minutes', () => {
    expect(timeUntil('2026-02-19T15:30:00Z')).toBe('3h 30m');
  });

  it('accepts numeric timestamp', () => {
    const future = new Date('2026-02-20T12:00:00Z').getTime();
    expect(timeUntil(future)).toBe('1d 0h');
  });
});

describe('formatPool', () => {
  it('formats amounts below 0.01 as "< 0.01 SOL"', () => {
    expect(formatPool(0.005)).toBe('< 0.01 SOL');
    expect(formatPool(0)).toBe('< 0.01 SOL');
  });

  it('formats normal amounts', () => {
    expect(formatPool(5.5)).toBe('5.50 SOL');
    expect(formatPool(0.01)).toBe('0.01 SOL');
    expect(formatPool(100)).toBe('100.00 SOL');
  });
});
