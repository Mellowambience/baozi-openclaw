// ── Core Types ──────────────────────────────────────────────────────────────

export interface AgentProfile {
  walletAddress: string;
  agentName: string;
  framework: AgentFramework;
  platform: DiscoveryPlatform;
  profileUrl?: string;
  description?: string;
  capabilities?: string[];
  discoveredAt: string;
}

export type AgentFramework =
  | "eliza"
  | "langchain"
  | "solana-agent-kit"
  | "mcp-native"
  | "openclaw"
  | "custom"
  | "unknown";

export type DiscoveryPlatform =
  | "agentbook"
  | "github"
  | "twitter"
  | "elizaos-registry"
  | "langchain-hub"
  | "solana-agent-kit"
  | "manual";

export type AgentCategory =
  | "crypto-analyst"
  | "trading-bot"
  | "social-agent"
  | "general-purpose"
  | "defi-agent"
  | "nft-agent"
  | "data-agent";

// ── Outreach ────────────────────────────────────────────────────────────────

export interface OutreachTemplate {
  id: string;
  name: string;
  targetCategory: AgentCategory;
  subject: string;
  body: string;
  callToAction: string;
}

export interface OutreachRecord {
  agentId: string;
  templateId: string;
  sentAt: string;
  channel: "agentbook" | "github" | "twitter" | "direct";
  status: "sent" | "responded" | "onboarded" | "declined" | "no-response";
}

// ── Onboarding ──────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "discovered"
  | "contacted"
  | "mcp-installed"
  | "profile-created"
  | "affiliate-registered"
  | "first-market-viewed"
  | "first-bet-placed"
  | "fully-onboarded";

export interface OnboardingState {
  agentWallet: string;
  agentName: string;
  currentStep: OnboardingStep;
  affiliateCode?: string;
  recruiterCode: string;
  startedAt: string;
  completedAt?: string;
  stepHistory: Array<{
    step: OnboardingStep;
    completedAt: string;
    details?: string;
  }>;
}

// ── Tracking ────────────────────────────────────────────────────────────────

export interface RecruitedAgent {
  wallet: string;
  name: string;
  onboardedAt: string;
  affiliateCode?: string;
  framework: AgentFramework;
  stats: RecruitStats;
}

export interface RecruitStats {
  totalBets: number;
  totalVolume: number; // SOL
  totalWinnings: number;
  affiliateEarnings: number; // 1% of gross winnings
  lastActive?: string;
  marketsCreated: number;
}

export interface RecruiterDashboard {
  recruiterWallet: string;
  recruiterCode: string;
  totalRecruited: number;
  activeRecruits: number;
  combinedVolume: number;
  totalAffiliateEarnings: number;
  recruits: RecruitedAgent[];
  weeklyVolume: number;
  topPerformer?: RecruitedAgent;
}

// ── Discovery Config ────────────────────────────────────────────────────────

export interface DiscoveryConfig {
  platforms: DiscoveryPlatform[];
  maxResultsPerPlatform: number;
  excludeWallets: string[];
  minCapabilityScore: number;
}

// ── MCP Tool Calls ──────────────────────────────────────────────────────────

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  transaction?: string; // base64 unsigned tx
}
