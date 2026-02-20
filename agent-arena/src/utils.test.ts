import { describe, it, expect } from "vitest";
import { formatOdds, progressBar, formatPnl, formatSol, timeUntil } from "./utils";

describe("formatOdds", () => {
  it("formats 0.5 as 50.0%", () => {
    expect(formatOdds(0.5)).toBe("50.0%");
  });
  it("formats 0.625 as 62.5%", () => {
    expect(formatOdds(0.625)).toBe("62.5%");
  });
});

describe("progressBar", () => {
  it("full bar is all filled", () => {
    const bar = progressBar(1.0, 10);
    expect(bar).toBe("[██████████]");
  });
  it("empty bar is all empty", () => {
    const bar = progressBar(0.0, 10);
    expect(bar).toBe("[░░░░░░░░░░]");
  });
  it("50% fills half", () => {
    const bar = progressBar(0.5, 10);
    expect(bar).toBe("[█████░░░░░]");
  });
});

describe("formatPnl", () => {
  it("positive shows + prefix", () => {
    expect(formatPnl(1.5)).toBe("+1.500 SOL");
  });
  it("negative shows negative", () => {
    expect(formatPnl(-0.3)).toBe("-0.300 SOL");
  });
});

describe("formatSol", () => {
  it("formats to 3 decimal places", () => {
    expect(formatSol(45.2)).toBe("45.200 SOL");
  });
});

describe("timeUntil", () => {
  it("returns closed for past date", () => {
    const past = new Date(Date.now() - 5000).toISOString();
    expect(timeUntil(past)).toBe("closed");
  });
  it("returns hours format", () => {
    const future = new Date(Date.now() + 3 * 3600000).toISOString();
    expect(timeUntil(future)).toMatch(/h/);
  });
});
