// ── Trending Signal Aggregator ───────────────────────────────────────────────
// Aggregates trending signals from Twitter/X, Reddit, Google Trends, and crypto social.
// Each source is a pluggable adapter — swap real APIs in when keys are available.

import { randomUUID } from "crypto";
import type { TrendingSignal, TrendSource, MarketCategory } from "../types.js";

// ── Source Adapters ────────────────────────────────────────────────────────

export interface TrendAdapter {
  source: TrendSource;
  fetch(limit: number): Promise<RawTrend[]>;
}

export interface RawTrend {
  topic: string;
  keywords: string[];
  score: number;
  velocity: number;
  category: MarketCategory;
  rawData: Record<string, unknown>;
}

// ── Twitter/X Trending Topics ─────────────────────────────────────────────
// Real impl: GET /2/trends/by/woeid/{woeid}
// Stubbed with representative sample for demo; replace with real Bearer Token call

export class TwitterTrendAdapter implements TrendAdapter {
  source: TrendSource = "twitter";
  private bearerToken?: string;

  constructor(bearerToken?: string) {
    this.bearerToken = bearerToken;
  }

  async fetch(limit: number): Promise<RawTrend[]> {
    if (this.bearerToken) {
      // Real implementation
      // const resp = await fetch("https://api.twitter.com/1.1/trends/place.json?id=1", {
      //   headers: { Authorization: "Bearer " + this.bearerToken }
      // });
      // const data = await resp.json();
      // return this.parseTwitterTrends(data);
    }

    // Stub: representative trending topics
    console.log("[Twitter] Fetching trending topics (stub)");
    return [
      { topic: "Bitcoin ETF approval", keywords: ["BTC", "ETF", "BlackRock", "SEC"], score: 88, velocity: 1200, category: "crypto", rawData: { source: "twitter_stub", woeid: 1 } },
      { topic: "Super Bowl predictions", keywords: ["NFL", "SuperBowl", "Chiefs", "Eagles"], score: 92, velocity: 3400, category: "sports", rawData: { source: "twitter_stub" } },
      { topic: "OpenAI GPT-5 release", keywords: ["GPT5", "OpenAI", "AI", "ChatGPT"], score: 85, velocity: 900, category: "technology", rawData: { source: "twitter_stub" } },
      { topic: "Fed interest rate decision", keywords: ["Fed", "FOMC", "rates", "inflation"], score: 72, velocity: 600, category: "finance", rawData: { source: "twitter_stub" } },
    ].slice(0, limit);
  }
}

// ── Reddit Trending Aggregator ─────────────────────────────────────────────
// Real impl: GET https://oauth.reddit.com/subreddits/popular OR /r/all/hot

export class RedditTrendAdapter implements TrendAdapter {
  source: TrendSource = "reddit";
  private clientId?: string;

  constructor(clientId?: string) {
    this.clientId = clientId;
  }

  async fetch(limit: number): Promise<RawTrend[]> {
    console.log("[Reddit] Fetching trending posts (stub)");
    return [
      { topic: "Ethereum Pectra upgrade launch", keywords: ["ETH", "Ethereum", "Pectra", "EIP"], score: 78, velocity: 450, category: "crypto", rawData: { subreddit: "r/ethereum", upvotes: 12000 } },
      { topic: "NBA All-Star Game MVP", keywords: ["NBA", "AllStar", "MVP", "basketball"], score: 65, velocity: 280, category: "sports", rawData: { subreddit: "r/nba" } },
      { topic: "AI regulation bill Senate vote", keywords: ["AI", "regulation", "Senate", "tech"], score: 71, velocity: 320, category: "politics", rawData: { subreddit: "r/technology" } },
    ].slice(0, limit);
  }
}

// ── Google Trends Adapter ─────────────────────────────────────────────────
// Real impl: pytrends via subprocess, or unofficial trends API
// Stubbed for clean TS implementation

export class GoogleTrendsAdapter implements TrendAdapter {
  source: TrendSource = "google_trends";

  async fetch(limit: number): Promise<RawTrend[]> {
    console.log("[Google Trends] Fetching trending searches (stub)");
    return [
      { topic: "Solana price prediction 2026", keywords: ["SOL", "Solana", "price", "prediction"], score: 69, velocity: 200, category: "crypto", rawData: { geo: "US", timeframe: "now 1-d" } },
      { topic: "World Cup 2026 host city", keywords: ["WorldCup", "FIFA", "2026", "soccer"], score: 83, velocity: 550, category: "sports", rawData: { geo: "US" } },
    ].slice(0, limit);
  }
}

// ── Crypto Social Adapter ─────────────────────────────────────────────────
// Real impl: LunarCrush API, Santiment, or CoinMarketCap social data

export class CryptoSocialAdapter implements TrendAdapter {
  source: TrendSource = "crypto_social";
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async fetch(limit: number): Promise<RawTrend[]> {
    console.log("[CryptoSocial] Fetching social trends (stub)");
    return [
      { topic: "PEPE memecoin surge", keywords: ["PEPE", "memecoin", "pump", "altcoin"], score: 91, velocity: 2100, category: "crypto", rawData: { platform: "lunarcr", social_volume_24h: 45000 } },
      { topic: "Coinbase listing announcement", keywords: ["Coinbase", "listing", "token", "exchange"], score: 76, velocity: 890, category: "crypto", rawData: { platform: "santiment" } },
    ].slice(0, limit);
  }
}

// ── Signal Aggregator ─────────────────────────────────────────────────────

export class SignalAggregator {
  private adapters: TrendAdapter[];

  constructor(adapters?: TrendAdapter[]) {
    this.adapters = adapters || [
      new TwitterTrendAdapter(),
      new RedditTrendAdapter(),
      new GoogleTrendsAdapter(),
      new CryptoSocialAdapter(),
    ];
  }

  async fetchAll(limitPerSource = 5): Promise<TrendingSignal[]> {
    const signals: TrendingSignal[] = [];

    for (const adapter of this.adapters) {
      try {
        const raw = await adapter.fetch(limitPerSource);
        for (const r of raw) {
          signals.push({
            id: randomUUID(),
            source: adapter.source,
            topic: r.topic,
            keywords: r.keywords,
            score: r.score,
            velocity: r.velocity,
            category: r.category,
            rawData: r.rawData,
            capturedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("[Aggregator] " + adapter.source + " failed:", err);
      }
    }

    // Deduplicate by topic similarity (simple keyword overlap)
    return this.deduplicateSignals(signals);
  }

  private deduplicateSignals(signals: TrendingSignal[]): TrendingSignal[] {
    const seen = new Set<string>();
    return signals.filter((s) => {
      const key = s.topic.toLowerCase().replace(/[^a-z0-9]/g, " ").split(" ").sort().slice(0, 3).join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  filterByScore(signals: TrendingSignal[], minScore: number): TrendingSignal[] {
    return signals
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  formatSignals(signals: TrendingSignal[]): string {
    let out = "Trending Signals:\n";
    for (const s of signals) {
      out += "  [" + s.source + "] " + s.topic.padEnd(45) + " score:" + s.score + " vel:" + s.velocity + "\n";
    }
    return out;
  }
}
