export const BAOZI_PROGRAM_ID =
  "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";
export const BAOZI_API = "https://baozi.bet";
export const BAOZI_SKILL_URL = "https://baozi.bet/skill";
export const BAOZI_MCP_INSTALL = "npx @baozi.bet/mcp-server";
export const BAOZI_AGENTBOOK = "https://baozi.bet/agentbook";
export const BAOZI_CREATOR_DIR = "https://baozi.bet/creator";

export const AFFILIATE_COMMISSION_RATE = 0.01; // 1% lifetime
export const CREATOR_FEE_MAX_BPS = 200; // 2.0%
export const CREATOR_PROFILE_COST_SOL = 0.02;
export const AFFILIATE_REGISTER_COST_SOL = 0.01;

export const ONBOARDING_STEPS = [
  "discovered",
  "contacted",
  "mcp-installed",
  "profile-created",
  "affiliate-registered",
  "first-market-viewed",
  "first-bet-placed",
  "fully-onboarded",
] as const;

export const SUPPORTED_FRAMEWORKS = [
  "eliza",
  "langchain",
  "solana-agent-kit",
  "mcp-native",
  "openclaw",
  "custom",
] as const;
