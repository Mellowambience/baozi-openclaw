// ── Market Proposer ──────────────────────────────────────────────────────────
// Converts trending signals into structured market proposals.
// Generates market questions, outcomes, resolution criteria, and deadlines.

import { randomUUID } from "crypto";
import type {
  TrendingSignal,
  MarketProposal,
  DeduplicationResult,
  MarketCategory,
} from "../types.js";
import { MIN_QUESTION_LENGTH, MAX_QUESTION_LENGTH } from "../utils/constants.js";

// ── Question Templates ────────────────────────────────────────────────────

const TEMPLATES: Record<MarketCategory, (topic: string, keywords: string[]) => {
  question: string; outcomes: string[]; resolutionCriteria: string; windowDays: number;
}> = {
  crypto: (topic, kw) => ({
    question: "Will " + kw[0] + " " + extractAction(topic) + "?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if " + topic.toLowerCase() + " occurs within the window as reported by CoinGecko, CoinMarketCap, or major crypto news outlets.",
    windowDays: 30,
  }),
  sports: (topic, kw) => ({
    question: "Will " + (kw[1] || kw[0]) + " " + extractSportsOutcome(topic) + "?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if the outcome occurs as reported by ESPN, AP Sports, or official league sources.",
    windowDays: 14,
  }),
  technology: (topic, kw) => ({
    question: "Will " + kw[0] + " " + extractTechAction(topic) + "?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if announced via official company blog, press release, or tech publication (TechCrunch, The Verge, Ars Technica).",
    windowDays: 60,
  }),
  politics: (topic, kw) => ({
    question: "Will " + extractPoliticsSubject(topic, kw) + " pass or be enacted?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if the legislation passes or the political outcome occurs as confirmed by AP, Reuters, or official government sources.",
    windowDays: 90,
  }),
  finance: (topic, kw) => ({
    question: "Will the " + (kw[0] || "Fed") + " " + extractFinanceAction(topic) + "?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if the financial outcome occurs as reported by Bloomberg, Reuters, or official central bank communications.",
    windowDays: 30,
  }),
  entertainment: (topic, kw) => ({
    question: "Will " + (kw[0] || topic) + " achieve its predicted outcome?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES as reported by Billboard, Box Office Mojo, or major entertainment outlets.",
    windowDays: 30,
  }),
  weather: (topic, kw) => ({
    question: "Will " + (kw[0] || "the event") + " occur as forecasted?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES based on NOAA, Weather.com, or official meteorological agency data.",
    windowDays: 7,
  }),
  other: (topic, kw) => ({
    question: "Will the following occur: " + topic.slice(0, 80) + "?",
    outcomes: ["YES", "NO"],
    resolutionCriteria: "Resolved YES if the event occurs as confirmed by multiple credible news sources.",
    windowDays: 30,
  }),
};

function extractAction(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes("reach") || lower.includes("hit")) return "reach its target price";
  if (lower.includes("surge") || lower.includes("pump")) return "continue its upward trend";
  if (lower.includes("crash") || lower.includes("drop")) return "fall below key support";
  if (lower.includes("etf")) return "ETF approval happen";
  if (lower.includes("listing")) return "listing be announced";
  return "achieve its trending prediction";
}

function extractSportsOutcome(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes("win") || lower.includes("champion")) return "win the championship";
  if (lower.includes("mvp")) return "win the MVP award";
  if (lower.includes("prediction")) return "exceed predictions";
  return "achieve its season objective";
}

function extractTechAction(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes("release") || lower.includes("launch")) return "launch before the deadline";
  if (lower.includes("regulation") || lower.includes("ban")) return "face regulatory action";
  if (lower.includes("upgrade")) return "complete the upgrade successfully";
  return "achieve its announced milestone";
}

function extractPoliticsSubject(topic: string, kw: string[]): string {
  return kw.slice(0, 2).join(" ") + " legislation";
}

function extractFinanceAction(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes("rate") || lower.includes("cut")) return "cut interest rates";
  if (lower.includes("hike") || lower.includes("raise")) return "raise interest rates";
  if (lower.includes("hold") || lower.includes("pause")) return "hold rates steady";
  return "take the expected action";
}

// ── Proposer ─────────────────────────────────────────────────────────────────

export class MarketProposer {
  proposeFromSignal(
    signal: TrendingSignal,
    dedupResult: DeduplicationResult
  ): MarketProposal | null {
    if (dedupResult.isDuplicate) {
      console.log("[Proposer] Skipping duplicate: " + signal.topic.slice(0, 50));
      return null;
    }

    const template = TEMPLATES[signal.category];
    const { question, outcomes, resolutionCriteria, windowDays } = template(
      signal.topic,
      signal.keywords
    );

    // Validate question length
    if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
      console.log("[Proposer] Question length invalid (" + question.length + "): " + question.slice(0, 50));
      return null;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + windowDays);

    // Confidence score: combination of trend score + velocity + category specificity
    const confidence = Math.min(
      Math.round(signal.score * 0.6 + Math.log1p(signal.velocity) * 5 + 10),
      100
    );

    const proposal: MarketProposal = {
      id: randomUUID(),
      trend: signal,
      question,
      outcomes,
      resolutionCriteria,
      resolutionDeadline: deadline.toISOString(),
      category: signal.category,
      confidenceScore: confidence,
      dedupResult,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    console.log("[Proposer] Proposed: \"" + question.slice(0, 60) + "\"... (conf:" + confidence + ")");
    return proposal;
  }

  proposeBatch(
    signals: TrendingSignal[],
    dedupResults: Map<string, DeduplicationResult>,
    maxProposals: number
  ): MarketProposal[] {
    const proposals: MarketProposal[] = [];

    for (const signal of signals) {
      if (proposals.length >= maxProposals) break;
      const dedup = dedupResults.get(signal.id) || { isDuplicate: false };
      const proposal = this.proposeFromSignal(signal, dedup);
      if (proposal) proposals.push(proposal);
    }

    return proposals;
  }

  formatProposals(proposals: MarketProposal[]): string {
    if (proposals.length === 0) return "  (no proposals)\n";
    let out = "";
    for (const p of proposals) {
      const status = p.dedupResult.isDuplicate ? "DUP" : "NEW";
      out += "  [" + status + "] " + p.question.slice(0, 55).padEnd(55) + " conf:" + p.confidenceScore + " " + p.category + "\n";
    }
    return out;
  }
}
