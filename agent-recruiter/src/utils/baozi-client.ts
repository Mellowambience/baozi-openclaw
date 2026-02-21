// ── Baozi MCP Client ────────────────────────────────────────────────────────
// Wraps @baozi.bet/mcp-server tool calls for the Agent Recruiter.
// In production, this calls the MCP server. For testing, methods can be mocked.

import type { MCPToolCall, MCPToolResult } from "../types.js";

const BAOZI_API = "https://baozi.bet";
const PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";

export class BaoziClient {
  private baseUrl: string;

  constructor(baseUrl = BAOZI_API) {
    this.baseUrl = baseUrl;
  }

  // ── Market Discovery ──────────────────────────────────────────────────

  async listMarkets(
    layer: "Official" | "Lab" = "Lab",
    status: "Active" | "Closed" = "Active"
  ): Promise<MCPToolResult> {
    return this.callTool("list_markets", { layer, status });
  }

  async getMarket(marketPda: string): Promise<MCPToolResult> {
    return this.callTool("get_market", { market: marketPda });
  }

  async getQuote(
    marketPda: string,
    side: "Yes" | "No",
    amount: number
  ): Promise<MCPToolResult> {
    return this.callTool("get_quote", { market: marketPda, side, amount });
  }

  // ── Creator Profile ───────────────────────────────────────────────────

  async buildCreateCreatorProfile(
    displayName: string,
    defaultFeeBps: number,
    creatorWallet: string
  ): Promise<MCPToolResult> {
    return this.callTool("build_create_creator_profile_transaction", {
      display_name: displayName,
      default_fee_bps: defaultFeeBps,
      creator_wallet: creatorWallet,
    });
  }

  // ── Affiliate System ──────────────────────────────────────────────────

  async checkAffiliateCode(code: string): Promise<MCPToolResult> {
    return this.callTool("check_affiliate_code", { code });
  }

  async suggestAffiliateCodes(): Promise<MCPToolResult> {
    return this.callTool("suggest_affiliate_codes", {});
  }

  async buildRegisterAffiliate(
    code: string,
    ownerWallet: string
  ): Promise<MCPToolResult> {
    return this.callTool("build_register_affiliate_transaction", {
      code,
      owner_wallet: ownerWallet,
    });
  }

  async formatAffiliateLink(code: string): Promise<MCPToolResult> {
    return this.callTool("format_affiliate_link", { code });
  }

  async getAffiliateInfo(code: string): Promise<MCPToolResult> {
    return this.callTool("get_affiliate_info", { code });
  }

  async getMyAffiliates(wallet: string): Promise<MCPToolResult> {
    return this.callTool("get_my_affiliates", { wallet });
  }

  async getReferrals(code: string): Promise<MCPToolResult> {
    return this.callTool("get_referrals", { code });
  }

  async getAgentNetworkStats(wallet: string): Promise<MCPToolResult> {
    return this.callTool("get_agent_network_stats", { wallet });
  }

  // ── Betting ───────────────────────────────────────────────────────────

  async buildBetTransaction(
    marketPda: string,
    outcome: "yes" | "no",
    amountSol: number,
    userWallet: string,
    affiliateCode?: string
  ): Promise<MCPToolResult> {
    return this.callTool("build_bet_transaction", {
      market: marketPda,
      outcome,
      amount_sol: amountSol,
      user_wallet: userWallet,
      ...(affiliateCode && { affiliate_code: affiliateCode }),
    });
  }

  // ── Positions ─────────────────────────────────────────────────────────

  async getPositions(wallet: string): Promise<MCPToolResult> {
    return this.callTool("get_positions", { wallet });
  }

  // ── Share Cards ───────────────────────────────────────────────────────

  async generateShareCard(
    marketPda: string,
    wallet?: string,
    ref?: string
  ): Promise<string> {
    let url = `${this.baseUrl}/api/share/card?market=${marketPda}`;
    if (wallet) url += `&wallet=${wallet}`;
    if (ref) url += `&ref=${ref}`;
    return url;
  }

  // ── AgentBook ─────────────────────────────────────────────────────────

  async postToAgentBook(
    walletAddress: string,
    content: string,
    marketPda?: string
  ): Promise<Response> {
    const body: Record<string, string> = { walletAddress, content };
    if (marketPda) body.marketPda = marketPda;

    return fetch(`${this.baseUrl}/api/agentbook/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async getAgentBookPosts(
    sort: "recent" | "hot" | "top" = "recent",
    limit = 50
  ): Promise<Response> {
    return fetch(
      `${this.baseUrl}/api/agentbook/posts?sort=${sort}&limit=${limit}`
    );
  }

  // ── Agent Profiles (off-chain) ────────────────────────────────────────

  async getAgentProfile(wallet: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/agents/profile/${wallet}`);
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    // In production, this calls the MCP server via stdio/SSE.
    // For bounty demo, we construct the tool call payload.
    const toolCall: MCPToolCall = { name, arguments: args };
    console.log(`[MCP] ${name}(${JSON.stringify(args)})`);

    // Return the tool call structure for demonstration.
    // In a real deployment, this would be:
    //   const result = await mcpClient.callTool(name, args);
    return {
      success: true,
      data: toolCall,
    };
  }
}

export const baozi = new BaoziClient();
