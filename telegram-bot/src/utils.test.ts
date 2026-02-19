import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActiveMarkets,
  sortByVolume,
  sortByClosing,
  filterByCategory,
  escapeMarkdown,
  formatPool,
  timeUntil,
  buildMarketCard,
  type Market,
} from './utils';

const mockMarkets: Market[] = [
  {
    publicKey: 'abc123',
    question: 'Will BTC hit 100k?',
    status: 'Active',
    isBettingOpen: true,
    totalPoolSol: 5.5,
    closingTime: '2026-03-01T00:00:00Z',
    yesPercent: 65.2,
    noPercent: 34.8,
    category: 'Crypto',
    layer: 'Main',
  },
  {
    publicKey: 'def456',
    question: 'Will ETH flip BTC?',
    status: 'Resolved',
    isBettingOpen: false,
    totalPoolSol: 2.1,
    closingTime: '2026-02-01T00:00:00Z',
    yesPercent: 10.0,
    noPercent: 90.0,
    category: 'Crypto',
    layer: 'Lab',
  },
  {
    publicKey: 'ghi789',
    question: 'Will it rain in NYC tomorrow?',
    status: 'Active',
    isBettingOpen: true,
    totalPoolSol: 0.005,
    closingTime: '2026-02-20T12:00:00Z',
    yesPercent: 70.0,
    noPercent: 30.0,
    category: 'Weather',
    layer: 'Lab',
  },
  {
    publicKey: 'jkl012',
    question: 'Sports event outcome',
    status: 'Active',
    isBettingOpen: false,
    totalPoolSol: 0,
    category: 'Sports',
    layer: 'Main',
  },
];

describe('getActiveMarkets', () => {
  it('filters markets by Active status or open betting', () => {
    const result = getActiveMarkets(mockMarkets);
    expect(result).toHaveLength(3);
    expect(result.every(m => m.status === 'Active' || m.isBettingOpen)).toBe(true);
  });

  it('returns empty array for no active markets', () => {
    const resolved = [{ ...mockMarkets[1], isBettingOpen: false }];
    expect(getActiveMarkets(resolved)).toHaveLength(0);
  });
});

describe('sortByVolume', () => {
  it('sorts markets by total pool descending', () => {
    const result = sortByVolume(mockMarkets);
    expect(result[0].totalPoolSol).toBe(5.5);
    expect(result[1].totalPoolSol).toBe(2.1);
  });

  it('does not mutate original array', () => {
    const original = [...mockMarkets];
    sortByVolume(mockMarkets);
    expect(mockMarkets).toEqual(original);
  });

  it('handles undefined totalPoolSol as 0', () => {
    const markets = [{ question: 'A' }, { question: 'B', totalPoolSol: 1 }] as Market[];
    const result = sortByVolume(markets);
    expect(result[0].totalPoolSol).toBe(1);
  });
});

describe('sortByClosing', () => {
  it('sorts markets by closing time ascending', () => {
    const result = sortByClosing(mockMarkets);
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(new Date(result[i].closingTime!).getTime())
        .toBeGreaterThanOrEqual(new Date(result[i - 1].closingTime!).getTime());
    }
  });

  it('excludes markets without closing time', () => {
    const result = sortByClosing(mockMarkets);
    expect(result.every(m => m.closingTime)).toBe(true);
  });
});

describe('filterByCategory', () => {
  it('filters by category field (case-insensitive)', () => {
    const result = filterByCategory(mockMarkets, 'crypto');
    expect(result).toHaveLength(2);
  });

  it('also matches question text', () => {
    const result = filterByCategory(mockMarkets, 'rain');
    expect(result).toHaveLength(1);
    expect(result[0].question).toContain('rain');
  });

  it('returns empty for no matches', () => {
    expect(filterByCategory(mockMarkets, 'nonexistent')).toHaveLength(0);
  });
});

describe('escapeMarkdown', () => {
  it('escapes Telegram markdown v2 special characters', () => {
    expect(escapeMarkdown('Hello *world*')).toBe('Hello \\*world\\*');
    expect(escapeMarkdown('test_underscore')).toBe('test\\_underscore');
    expect(escapeMarkdown('[link](url)')).toBe('\\[link\\]\\(url\\)');
  });

  it('handles plain text without escaping', () => {
    expect(escapeMarkdown('Hello world')).toBe('Hello world');
  });

  it('escapes all special chars', () => {
    const special = '_*[]()~`>#+\-=|{}.!\\';
    const result = escapeMarkdown(special);
    expect(result.length).toBeGreaterThan(special.length);
  });
});

describe('formatPool', () => {
  it('formats zero as "0 SOL"', () => {
    expect(formatPool(0)).toBe('0 SOL');
  });

  it('formats small amounts in lamports', () => {
    expect(formatPool(0.005)).toMatch(/lamports/);
  });

  it('formats normal amounts in SOL', () => {
    expect(formatPool(5.5)).toBe('5.50 SOL');
    expect(formatPool(0.01)).toBe('0.01 SOL');
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

  it('formats minutes only', () => {
    expect(timeUntil('2026-02-19T12:45:00Z')).toBe('45m');
  });
});

describe('buildMarketCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a formatted market card string', () => {
    const card = buildMarketCard(mockMarkets[0]);
    expect(card).toContain('Will BTC hit 100k');
    expect(card).toContain('65.2%');
    expect(card).toContain('5.50 SOL');
    expect(card).toContain('baozi.bet/market/abc123');
  });

  it('handles missing optional fields gracefully', () => {
    const card = buildMarketCard({ question: 'Test?', totalPoolSol: 0 } as Market);
    expect(card).toContain('Test');
    expect(card).toContain('0 SOL');
    expect(card).toContain('N/A');
  });
});
