/**
 * Market Reader Service
 *
 * Reads market data from Baozi via MCP tools and the HTTP API.
 * Provides normalized market data for the analysis engine.
 */
import { execMcpTool, execMcpToolHttp } from "./mcp-client.js";
import type { Market, MarketOutcome, McpResult, Quote, RaceMarket } from "../types/index.js";

export interface MarketReaderConfig {
  useHttp?: boolean;
  httpProxyUrl?: string;
}

export class MarketReader {
  private config: MarketReaderConfig;

  constructor(config: MarketReaderConfig = {}) {
    this.config = config;
  }

  private async callMcp(tool: string, params: Record<string, any>): Promise<McpResult> {
    if (this.config.useHttp) {
      return execMcpToolHttp(tool, params, this.config.httpProxyUrl);
    }
    return execMcpTool(tool, params);
  }

  /**
   * List active markets with optional filters.
   */
  async listMarkets(options: {
    status?: string;
    layer?: string;
    query?: string;
    limit?: number;
  } = {}): Promise<Market[]> {
    const result = await this.callMcp("list_markets", {
      status: options.status || "active",
      layer: options.layer || "all",
      query: options.query,
      limit: options.limit || 50,
    });

    if (!result.success || !result.data) {
      console.error("Failed to list markets:", result.error);
      return [];
    }

    return this.parseMarkets(result.data);
  }

  /**
   * List race markets (multi-outcome).
   */
  async listRaceMarkets(options: {
    status?: string;
    limit?: number;
  } = {}): Promise<RaceMarket[]> {
    const result = await this.callMcp("list_race_markets", {
      status: options.status || "active",
      limit: options.limit || 20,
    });

    if (!result.success || !result.data) {
      console.error("Failed to list race markets:", result.error);
      return [];
    }

    return this.parseMarkets(result.data) as RaceMarket[];
  }

  /**
   * Get detailed quote for a market (implied probabilities + price impact).
   */
  async getQuote(marketPda: string, side: string, amount: number): Promise<Quote | null> {
    const result = await this.callMcp("get_quote", {
      market_pda: marketPda,
      side,
      amount,
    });

    if (!result.success || !result.data) {
      return null;
    }

    return this.parseQuote(result.data, marketPda, side, amount);
  }

  /**
   * Get race market quote (multi-outcome).
   */
  async getRaceQuote(
    marketPda: string,
    outcomeIndex: number,
    amount: number
  ): Promise<Quote | null> {
    const result = await this.callMcp("get_race_quote", {
      market_pda: marketPda,
      outcome_index: outcomeIndex,
      amount,
    });

    if (!result.success || !result.data) {
      return null;
    }

    return this.parseQuote(result.data, marketPda, `outcome_${outcomeIndex}`, amount);
  }

  /**
   * Get market details by PDA.
   */
  async getMarketDetails(marketPda: string): Promise<Market | null> {
    const result = await this.callMcp("get_market", {
      market_pda: marketPda,
    });

    if (!result.success || !result.data) {
      return null;
    }

    const markets = this.parseMarkets(result.data);
    return markets[0] || null;
  }

  /**
   * Fetch markets closing soon (within given hours).
   */
  async getClosingSoon(withinHours: number = 24): Promise<Market[]> {
    const markets = await this.listMarkets({ status: "active", limit: 100 });
    const cutoff = new Date(Date.now() + withinHours * 60 * 60 * 1000);
    return markets.filter((m) => new Date(m.closingTime) <= cutoff);
  }

  /**
   * Fetch markets sorted by pool size (volume proxy).
   */
  async getTopByVolume(limit: number = 10): Promise<Market[]> {
    const markets = await this.listMarkets({ status: "active", limit: 100 });
    return markets.sort((a, b) => b.pool.total - a.pool.total).slice(0, limit);
  }

  /**
   * Parse raw MCP data into typed Market objects.
   */
  private parseMarkets(data: any): Market[] {
    // MCP returns content array with text items
    const text = this.extractText(data);
    if (!text) return [];

    try {
      // Try direct JSON parse
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => this.normalizeMarket(m));
      }
      if (parsed.markets && Array.isArray(parsed.markets)) {
        return parsed.markets.map((m: any) => this.normalizeMarket(m));
      }
      // Single market
      return [this.normalizeMarket(parsed)];
    } catch {
      // If not JSON, try to extract market data from text
      return this.parseMarketsFromText(text);
    }
  }

  private normalizeMarket(raw: any): Market {
    const outcomes: MarketOutcome[] = [];

    if (raw.outcomes && Array.isArray(raw.outcomes)) {
      for (let i = 0; i < raw.outcomes.length; i++) {
        const o = raw.outcomes[i];
        outcomes.push({
          index: i,
          label: o.label || o.name || (i === 0 ? "Yes" : "No"),
          probability: o.probability || o.implied_probability || 0,
          pool: o.pool || o.pool_amount || 0,
        });
      }
    } else if (raw.yes_pool !== undefined && raw.no_pool !== undefined) {
      const total = (raw.yes_pool || 0) + (raw.no_pool || 0);
      outcomes.push(
        {
          index: 0,
          label: "Yes",
          probability: total > 0 ? raw.yes_pool / total : 0.5,
          pool: raw.yes_pool,
        },
        {
          index: 1,
          label: "No",
          probability: total > 0 ? raw.no_pool / total : 0.5,
          pool: raw.no_pool,
        }
      );
    } else {
      outcomes.push(
        { index: 0, label: "Yes", probability: 0.5, pool: 0 },
        { index: 1, label: "No", probability: 0.5, pool: 0 }
      );
    }

    const totalPool = outcomes.reduce((sum, o) => sum + o.pool, 0);

    return {
      id: raw.id || raw.market_id || raw.pda || "",
      pda: raw.pda || raw.market_pda || raw.id || "",
      question: raw.question || raw.title || "",
      status: raw.status || "active",
      layer: raw.layer || "official",
      category: raw.category || raw.tag || undefined,
      closingTime: raw.closing_time || raw.closingTime || raw.close_time || "",
      createdAt: raw.created_at || raw.createdAt || "",
      pool: { total: totalPool, outcomes: outcomes.map((o) => o.pool) },
      outcomes,
      volume: raw.volume || totalPool,
      creator: raw.creator || raw.creator_wallet || undefined,
    };
  }

  private parseQuote(data: any, marketPda: string, side: string, amount: number): Quote {
    const text = this.extractText(data);
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : data;
    } catch {
      parsed = {};
    }

    return {
      marketPda,
      side,
      amount,
      avgPrice: parsed.avg_price || parsed.averagePrice || 0,
      priceImpact: parsed.price_impact || parsed.priceImpact || 0,
      estimatedShares: parsed.estimated_shares || parsed.estimatedShares || 0,
      impliedProbability: parsed.implied_probability || parsed.impliedProbability || 0,
    };
  }

  private extractText(data: any): string | null {
    if (typeof data === "string") return data;
    if (data?.content && Array.isArray(data.content)) {
      const textItems = data.content.filter((c: any) => c.type === "text");
      return textItems.map((c: any) => c.text).join("\n") || null;
    }
    if (data?.text) return data.text;
    return JSON.stringify(data);
  }

  private parseMarketsFromText(text: string): Market[] {
    // Fallback: try to find JSON embedded in text output
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const arr = JSON.parse(jsonMatch[0]);
        return arr.map((m: any) => this.normalizeMarket(m));
      } catch {
        // no-op
      }
    }
    return [];
  }
}
