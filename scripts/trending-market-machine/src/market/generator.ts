// Convert trending topics into properly-structured market questions
// Follows Baozi pari-mutuel timing rules v6.3
import { CONFIG, type TrendingTopic, type MarketQuestion } from "../config.ts";

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

// Crypto-specific market generators
function generateCryptoMarket(topic: TrendingTopic): MarketQuestion | null {
  const meta = topic.metadata;
  const symbol = (meta.symbol as string)?.toUpperCase();
  const rank = meta.marketCapRank as number | undefined;
  const priceChange = meta.priceChangePercent24h as number | undefined;

  if (!symbol) return null;

  // Don't create price prediction markets — continuous observable price means
  // no real uncertainty at close time. Bad for pari-mutuel.
  // Instead: adoption metrics, volume, rank movement.

  const now = new Date();

  // Market cap rank movement (Type B — measurement period)
  if (rank && rank > 10 && rank <= 100) {
    const targetRank = Math.max(1, rank - 10);
    const measureStart = new Date(now.getTime() + 7 * DAYS);
    const measureEnd = new Date(now.getTime() + 14 * DAYS);
    const closingTime = new Date(measureStart.getTime() - 1 * HOURS);

    return {
      question: `Will ${symbol} enter CoinGecko's top ${targetRank} by market cap during the week of ${formatDate(measureStart)}?`,
      description: `${topic.title}. Currently ranked #${rank}. Measurement period: ${formatDate(measureStart)} to ${formatDate(measureEnd)}. Resolution based on CoinGecko market cap ranking snapshot at end of measurement period.`,
      marketType: "boolean",
      category: "crypto",
      closingTime,
      resolutionTime: new Date(measureEnd.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "CoinGecko market cap rankings",
      dataSourceUrl: `https://www.coingecko.com/en/coins/${meta.coinId}`,
      tags: ["crypto", symbol.toLowerCase(), "market-cap", "trending"],
      trendSource: topic,
      timingType: "B",
      measurementStart: measureStart,
      measurementEnd: measureEnd,
      backupSource: "CoinMarketCap market cap rankings",
    };
  }

  // Volume-based market for trending coins with big price moves (Type B)
  if (priceChange && Math.abs(priceChange) > 15) {
    const direction = priceChange > 0 ? "maintain" : "recover";
    const measureStart = new Date(now.getTime() + 3 * DAYS);
    const measureEnd = new Date(now.getTime() + 7 * DAYS);
    const closingTime = new Date(measureStart.getTime() - 1 * HOURS);

    return {
      question: `Will ${symbol} 24h trading volume on CoinGecko exceed $100M during ${formatDate(measureStart)} to ${formatDate(measureEnd)}?`,
      description: `${symbol} is trending with ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}% price change in 24h. This market asks whether trading interest will ${direction} elevated volume. Resolution: highest single-day 24h volume during measurement period per CoinGecko.`,
      marketType: "boolean",
      category: "crypto",
      closingTime,
      resolutionTime: new Date(measureEnd.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "CoinGecko trading volume",
      dataSourceUrl: `https://www.coingecko.com/en/coins/${meta.coinId}`,
      tags: ["crypto", symbol.toLowerCase(), "volume", "trending"],
      trendSource: topic,
      timingType: "B",
      measurementStart: measureStart,
      measurementEnd: measureEnd,
      backupSource: "CoinMarketCap trading volume",
    };
  }

  return null;
}

// Tech/general news market generators
function generateNewsMarket(topic: TrendingTopic): MarketQuestion | null {
  const title = topic.title.toLowerCase();

  // Product launch detection
  if (title.match(/\b(launch|release|announce|unveil|reveal|introduce|debut)\b/)) {
    const eventTime = new Date(Date.now() + 14 * DAYS);
    const closingTime = new Date(eventTime.getTime() - 24 * HOURS);

    return {
      question: `Will the product/feature mentioned in "${truncate(topic.title, 80)}" be publicly available within 14 days?`,
      description: `Trending news: "${topic.title}". Source: ${topic.source}. Resolves YES if the product/feature/announcement becomes publicly available or officially confirmed within 14 days of market creation.`,
      marketType: "boolean",
      category: "economic", // closest Baozi standard category for tech
      closingTime,
      resolutionTime: new Date(eventTime.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "Official press release or product page",
      dataSourceUrl: topic.url || "",
      tags: ["tech", "launch", "product"],
      trendSource: topic,
      timingType: "A",
      eventTime,
      backupSource: "TechCrunch / The Verge coverage",
    };
  }

  // Acquisition/merger detection
  if (title.match(/\b(acquire|merger|buy|takeover|deal)\b/)) {
    const eventTime = new Date(Date.now() + 14 * DAYS);
    const closingTime = new Date(eventTime.getTime() - 24 * HOURS);

    return {
      question: `Will the deal in "${truncate(topic.title, 80)}" be officially confirmed within 14 days?`,
      description: `Trending: "${topic.title}". Source: ${topic.source}. Resolves YES if the acquisition/merger/deal is officially confirmed by involved companies within 14 days.`,
      marketType: "boolean",
      category: "economic",
      closingTime,
      resolutionTime: new Date(eventTime.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "Official company press releases (SEC filings if public)",
      dataSourceUrl: topic.url || "",
      tags: ["business", "acquisition"],
      trendSource: topic,
      timingType: "A",
      eventTime,
      backupSource: "Bloomberg / Reuters coverage",
    };
  }

  // High-engagement HN stories — will engagement sustain? (Type B)
  const hnPoints = topic.metadata.points as number | undefined;
  if (topic.source === "hackernews" && hnPoints && hnPoints > 300) {
    const measureStart = new Date(Date.now() + 3 * DAYS);
    const measureEnd = new Date(Date.now() + 7 * DAYS);
    const closingTime = new Date(measureStart.getTime() - 1 * HOURS);

    return {
      question: `Will "${truncate(topic.title, 60)}" (HN story) receive over 500 points by ${formatDate(measureEnd)}?`,
      description: `Currently at ${hnPoints} points on HackerNews. Resolves based on final point count visible at ${topic.url} at end of measurement period.`,
      marketType: "boolean",
      category: "economic", // tech news = economic in Baozi
      closingTime,
      resolutionTime: new Date(measureEnd.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "HackerNews story page (news.ycombinator.com)",
      dataSourceUrl: topic.url || "",
      tags: ["hackernews", "engagement"],
      trendSource: topic,
      timingType: "B",
      measurementStart: measureStart,
      measurementEnd: measureEnd,
      backupSource: "HackerNews API (hacker-news.firebaseio.com)",
    };
  }

  return null;
}

// Sports market generators
function generateSportsMarket(topic: TrendingTopic): MarketQuestion | null {
  const title = topic.title;

  if (title.match(/\b(vs|versus|play|match|game|championship|final|semifinal|playoff)\b/i)) {
    const eventTime = new Date(Date.now() + 5 * DAYS);
    const closingTime = new Date(eventTime.getTime() - 24 * HOURS);

    return {
      question: `Based on "${truncate(title, 80)}" — will the favored team/player win?`,
      description: `Sports news: "${title}". Source: ${topic.source}. Binary market on the outcome. Resolves based on official results.`,
      marketType: "boolean",
      category: "sports",
      closingTime,
      resolutionTime: new Date(eventTime.getTime() + CONFIG.DEFAULT_RESOLUTION_BUFFER_SECONDS * 1000),
      dataSource: "ESPN / official league results",
      dataSourceUrl: topic.url || "https://www.espn.com",
      tags: ["sports", "competition"],
      trendSource: topic,
      timingType: "A",
      eventTime,
      backupSource: "Official league website",
    };
  }

  return null;
}

export function generateMarketQuestion(topic: TrendingTopic): MarketQuestion | null {
  switch (topic.category) {
    case "crypto":
      return generateCryptoMarket(topic);
    case "sports":
      return generateSportsMarket(topic);
    default:
      return generateNewsMarket(topic);
  }
}

export function generateBatch(topics: TrendingTopic[]): MarketQuestion[] {
  return topics
    .sort((a, b) => b.score - a.score)
    .map(generateMarketQuestion)
    .filter((q): q is MarketQuestion => q !== null);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
