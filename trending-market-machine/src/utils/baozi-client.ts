// Thin Baozi MCP wrapper
import { BAOZI_API } from "./constants.js";

export class BaoziClient {
  private baseUrl: string;
  constructor(baseUrl = BAOZI_API) { this.baseUrl = baseUrl; }

  private async callTool(name: string, args: Record<string, unknown>) {
    console.log("[MCP] " + name + "(" + JSON.stringify(args) + ")");
    return { success: true, data: { name, arguments: args } };
  }

  async listMarkets(layer = "Lab", status = "Active") {
    return this.callTool("list_markets", { layer, status });
  }
  async getMarket(pda: string) {
    return this.callTool("get_market", { market: pda });
  }
  async buildCreateMarket(params: {
    question: string;
    outcomes: string[];
    category: string;
    resolutionCriteria: string;
    resolutionDeadline: string;
    creatorWallet: string;
    affiliateCode?: string;
  }) {
    return this.callTool("build_create_market_transaction", {
      question: params.question,
      outcomes: params.outcomes,
      category: params.category,
      resolution_criteria: params.resolutionCriteria,
      resolution_deadline: params.resolutionDeadline,
      creator_wallet: params.creatorWallet,
      ...(params.affiliateCode && { affiliate_code: params.affiliateCode }),
    });
  }
  async buildCreateCreatorProfile(name: string, feeBps: number, wallet: string) {
    return this.callTool("build_create_creator_profile_transaction", {
      display_name: name, default_fee_bps: feeBps, creator_wallet: wallet,
    });
  }
  async buildRegisterAffiliate(code: string, wallet: string) {
    return this.callTool("build_register_affiliate_transaction", { code, owner_wallet: wallet });
  }

  async listActiveMarkets(): Promise<Response> {
    return fetch(this.baseUrl + "/api/markets?status=Active&layer=Lab");
  }
}

export const baozi = new BaoziClient();
