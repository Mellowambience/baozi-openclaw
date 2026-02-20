import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomProverb, formatPool, formatOdds, timeUntil, buildCaption, detectEvents } from "./utils";

describe("randomProverb", () => {
  it("returns an object with zh and en", () => {
    const p = randomProverb();
    expect(p).toHaveProperty("zh");
    expect(p).toHaveProperty("en");
    expect(p.zh.length).toBeGreaterThan(0);
  });
});

describe("formatPool", () => {
  it("formats small amounts", () => {
    expect(formatPool(45.2)).toBe("45.2 SOL");
  });
  it("formats large amounts with k", () => {
    expect(formatPool(1500)).toBe("1.5k SOL");
  });
});

describe("formatOdds", () => {
  it("formats 60/40 split", () => {
    expect(formatOdds(0.6, 0.4)).toBe("YES: 60% | NO: 40%");
  });
});

describe("timeUntil", () => {
  it("returns closed for past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(timeUntil(past)).toBe("closing now");
  });
  it("returns days for far future", () => {
    const future = new Date(Date.now() + 5 * 24 * 3600000).toISOString();
    expect(timeUntil(future)).toContain("days");
  });
});

describe("buildCaption", () => {
  it("includes market URL with affiliate code", () => {
    const event = { type: "new_market" as const, marketPda: "TEST123", question: "Will BTC hit $100k?", yesOdds: 0.6, noOdds: 0.4, totalPool: 10, detectedAt: new Date() };
    const caption = buildCaption(event, "MYCODE");
    expect(caption).toContain("MYCODE");
    expect(caption).toContain("baozi.bet/market/TEST123");
  });
  it("includes proverb", () => {
    const event = { type: "closing_soon" as const, marketPda: "TEST123", question: "Will BTC hit $100k?", yesOdds: 0.6, noOdds: 0.4, totalPool: 10, closingAt: new Date(Date.now() + 3600000).toISOString(), detectedAt: new Date() };
    const caption = buildCaption(event, "MYCODE");
    expect(caption.length).toBeGreaterThan(50);
  });
});

describe("detectEvents", () => {
  it("detects odds shift > 10%", () => {
    const markets = [{ pda: "ABC", question: "test?", yes_pool: 70, no_pool: 30, close_time: new Date(Date.now() + 48*3600000).toISOString() }];
    const prev = new Map([["ABC", { yesOdds: 0.5 }]]);
    const events = detectEvents(markets, prev);
    expect(events.some((e) => e.type === "odds_shift")).toBe(true);
  });

  it("detects closing soon", () => {
    const markets = [{ pda: "XYZ", question: "test?", yes_pool: 50, no_pool: 50, close_time: new Date(Date.now() + 12*3600000).toISOString() }];
    const events = detectEvents(markets, new Map());
    expect(events.some((e) => e.type === "closing_soon")).toBe(true);
  });
});
