import { describe, it, expect } from "vitest";
import { tierLabel, tierEmoji, formatDuration, calculateStats, filterProofs } from "./utils";
import { ResolutionProof } from "./types";

const mockProof = (overrides: Partial<ResolutionProof> = {}): ResolutionProof => ({
  marketPda: "ABC", question: "test?", outcome: "YES", tier: 2, tierLabel: "Verified",
  evidenceSources: ["NFL"], resolvedBy: "Grandma Mei", resolvedAt: "2026-02-15T00:00:00Z",
  closeTime: "2026-02-15T00:00:00Z", resolutionTimeMs: 7200000,
  disputeWindowHours: 6, challengesFiled: 0, layer: "Official", ...overrides,
});

describe("tierLabel", () => {
  it("tier 1 is Trustless", () => expect(tierLabel(1)).toContain("Trustless"));
  it("tier 2 is Verified", () => expect(tierLabel(2)).toContain("Verified"));
  it("tier 3 is AI Research", () => expect(tierLabel(3)).toContain("AI Research"));
});

describe("tierEmoji", () => {
  it("returns emoji for each tier", () => {
    expect(tierEmoji(1)).toBe("🔵");
    expect(tierEmoji(2)).toBe("🟢");
    expect(tierEmoji(3)).toBe("🟡");
  });
});

describe("formatDuration", () => {
  it("formats minutes", () => expect(formatDuration(3 * 60000)).toBe("3m"));
  it("formats hours", () => expect(formatDuration(2.5 * 3600000)).toBe("2h 30m"));
  it("formats days", () => expect(formatDuration(2 * 24 * 3600000)).toBe("2d 0h"));
});

describe("calculateStats", () => {
  it("returns zeros for empty array", () => {
    const stats = calculateStats([]);
    expect(stats.totalResolved).toBe(0);
    expect(stats.trustScore).toBe(100);
  });

  it("calculates avg resolution time", () => {
    const proofs = [mockProof({ resolutionTimeMs: 3600000 }), mockProof({ resolutionTimeMs: 7200000 })];
    const stats = calculateStats(proofs);
    expect(stats.avgResolutionTimeHours).toBe(1.5);
  });

  it("calculates trust score as 100 with no overturned", () => {
    const stats = calculateStats([mockProof()]);
    expect(stats.trustScore).toBe(100);
  });
});

describe("filterProofs", () => {
  const proofs = [
    mockProof({ tier: 1, category: "Crypto", layer: "Official", question: "BTC up?" }),
    mockProof({ tier: 2, category: "Sports", layer: "Lab", question: "Eagles win?" }),
    mockProof({ tier: 3, category: "Crypto", layer: "Official", question: "ETH flip?" }),
  ];

  it("filters by tier", () => {
    expect(filterProofs(proofs, { tier: 1 })).toHaveLength(1);
  });

  it("filters by category", () => {
    expect(filterProofs(proofs, { category: "Crypto" })).toHaveLength(2);
  });

  it("filters by search query", () => {
    expect(filterProofs(proofs, { search: "eagles" })).toHaveLength(1);
  });

  it("no filter returns all", () => {
    expect(filterProofs(proofs, {})).toHaveLength(3);
  });
});
