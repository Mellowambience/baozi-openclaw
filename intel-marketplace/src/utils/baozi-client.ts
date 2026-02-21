// Thin Baozi MCP wrapper — same pattern as agent-recruiter
import { BAOZI_API } from "./constants.js";

export class BaoziClient {
  private baseUrl: string;
  constructor(baseUrl = BAOZI_API) { this.baseUrl = baseUrl; }

  private async callTool(name: string, args: Record<string, unknown>) {
    console.log(`[MCP] ${name}(${JSON.stringify(args)})`);
    return { success: true, data: { name, arguments: args } };
  }

  async listMarkets(layer = "Lab", status = "Active") {
    return this.callTool("list_markets", { layer, status });
  }
  async getMarket(pda: string) {
    return this.callTool("get_market", { market: pda });
  }
  async getQuote(pda: string, side: string, amount: number) {
    return this.callTool("get_quote", { market: pda, side, amount });
  }
  async getPositions(wallet: string) {
    return this.callTool("get_positions", { wallet });
  }
  async buildBetTransaction(pda: string, outcome: string, amount: number, wallet: string, affiliateCode?: string) {
    return this.callTool("build_bet_transaction", {
      market: pda, outcome, amount_sol: amount, user_wallet: wallet,
      ...(affiliateCode && { affiliate_code: affiliateCode }),
    });
  }
  async buildRegisterAffiliate(code: string, wallet: string) {
    return this.callTool("build_register_affiliate_transaction", { code, owner_wallet: wallet });
  }
  async checkAffiliateCode(code: string) {
    return this.callTool("check_affiliate_code", { code });
  }
  async getAffiliateInfo(code: string) {
    return this.callTool("get_affiliate_info", { code });
  }
  async buildCreateCreatorProfile(name: string, feeBps: number, wallet: string) {
    return this.callTool("build_create_creator_profile_transaction", {
      display_name: name, default_fee_bps: feeBps, creator_wallet: wallet,
    });
  }
  async getResolutionStatus(pda: string) {
    return this.callTool("get_resolution_status", { market: pda });
  }
  async getMarketsAwaitingResolution() {
    return this.callTool("get_markets_awaiting_resolution", {});
  }
  async generateShareCard(pda: string, wallet?: string, ref?: string) {
    let url = `${this.baseUrl}/api/share/card?market=${pda}`;
    if (wallet) url += `&wallet=${wallet}`;
    if (ref) url += `&ref=${ref}`;
    return url;
  }

  // Off-chain APIs
  async listActiveMarkets(): Promise<Response> {
    return fetch(`${this.baseUrl}/api/markets?status=Active&layer=Lab`);
  }
  async getAgentProfile(wallet: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/agents/profile/${wallet}`);
  }
}

export const baozi = new BaoziClient();
