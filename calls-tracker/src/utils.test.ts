import { describe, it, expect } from "vitest";
import { parsePrediction, validateTiming, calculateReputation, formatReputation } from "./utils";
import { Call } from "./types";

describe("parsePrediction", () => {
  it("returns null for too-short input", () => {
    expect(parsePrediction("hi")).toBeNull();
  });

  it("parses a BTC prediction", () => {
    const result = parsePrediction("BTC will hit $110k by March 1, 2026");
    expect(result).not.toBeNull();
    expect(result!.question).toContain("?");
    expect(result!.dataSource).toContain("CoinGecko");
  });

  it("handles already-question format", () => {
    const result = parsePrediction("Will BTC reach $100k?");
    expect(result!.question).toBe("Will BTC reach $100k?");
  });
});

describe("validateTiming", () => {
  it("rejects past close time", () => {
    const past = new Date(Date.now() - 1000);
    const r = validateTiming({ question: "test?", type: "A", closeTime: past, dataSource: "x", resolutionCriteria: "x" });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("future");
  });

  it("rejects Type A with < 24h gap", () => {
    const close = new Date(Date.now() + 2 * 3600 * 1000);
    const event = new Date(Date.now() + 3 * 3600 * 1000);
    const r = validateTiming({ question: "test?", type: "A", closeTime: close, eventTime: event, dataSource: "x", resolutionCriteria: "x" });
    expect(r.valid).toBe(false);
  });

  it("accepts valid Type A timing", () => {
    const event = new Date(Date.now() + 48 * 3600 * 1000);
    const close = new Date(event.getTime() - 25 * 3600 * 1000);
    const r = validateTiming({ question: "test?", type: "A", closeTime: close, eventTime: event, dataSource: "x", resolutionCriteria: "x" });
    expect(r.valid).toBe(true);
  });
});

describe("calculateReputation", () => {
  const mockCalls: Call[] = [
    { id: "1", caller: "Alice", predictionText: "BTC up", marketQuestion: "Will BTC go up?", marketType: "A", closeTime: new Date(), dataSource: "CoinGecko", resolutionCriteria: "x", betAmount: 0.5, side: "Yes", status: "resolved", outcome: "win", createdAt: new Date() },
    { id: "2", caller: "Alice", predictionText: "ETH up", marketQuestion: "Will ETH go up?", marketType: "A", closeTime: new Date(), dataSource: "CoinGecko", resolutionCriteria: "x", betAmount: 0.5, side: "Yes", status: "resolved", outcome: "loss", createdAt: new Date() },
    { id: "3", caller: "Alice", predictionText: "SOL up", marketQuestion: "Will SOL go up?", marketType: "A", closeTime: new Date(), dataSource: "CoinGecko", resolutionCriteria: "x", betAmount: 0.5, side: "Yes", status: "created", createdAt: new Date() },
  ];

  it("calculates hit rate correctly", () => {
    const rep = calculateReputation(mockCalls);
    expect(rep.hitRate).toBe(0.5);
  });

  it("counts pending calls", () => {
    const rep = calculateReputation(mockCalls);
    expect(rep.pendingCalls).toBe(1);
  });

  it("calculates streak from end", () => {
    // last resolved is a loss, so streak = 0
    const rep = calculateReputation(mockCalls);
    expect(rep.streak).toBe(0);
  });
});

describe("formatReputation", () => {
  it("renders a readable string", () => {
    const calls: Call[] = [
      { id: "1", caller: "Bob", predictionText: "x", marketQuestion: "x?", marketType: "A", closeTime: new Date(), dataSource: "x", resolutionCriteria: "x", betAmount: 1, side: "Yes", status: "resolved", outcome: "win", createdAt: new Date() },
    ];
    const rep = { caller: "Bob", totalCalls: 1, correctCalls: 1, pendingCalls: 0, solWagered: 1, solWon: 1.8, solLost: 0, hitRate: 1, streak: 1, longestStreak: 1, confidenceScore: 50, calls, walletAddress: undefined };
    const str = formatReputation(rep);
    expect(str).toContain("Bob");
    expect(str).toContain("100.0%");
  });
});
