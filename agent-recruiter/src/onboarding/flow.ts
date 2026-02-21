// ── Onboarding Flow ─────────────────────────────────────────────────────────
// Guides new agents through the complete Baozi setup:
// 1. Install MCP → 2. Create CreatorProfile → 3. Register Affiliate Code
// 4. Browse Markets → 5. Get Quote → 6. Place First Bet
// All with recruiter's affiliate code embedded.

import type {
  OnboardingState,
  OnboardingStep,
  AgentFramework,
  MCPToolResult,
} from "../types.js";
import { BaoziClient } from "../utils/baozi-client.js";
import {
  ONBOARDING_STEPS,
  BAOZI_SKILL_URL,
  BAOZI_MCP_INSTALL,
} from "../utils/constants.js";

export class OnboardingFlow {
  private client: BaoziClient;
  private sessions: Map<string, OnboardingState> = new Map();

  constructor(client?: BaoziClient) {
    this.client = client || new BaoziClient();
  }

  // ── Start Onboarding ──────────────────────────────────────────────────

  startOnboarding(
    agentWallet: string,
    agentName: string,
    recruiterCode: string
  ): OnboardingState {
    const state: OnboardingState = {
      agentWallet,
      agentName,
      recruiterCode,
      currentStep: "discovered",
      startedAt: new Date().toISOString(),
      stepHistory: [
        {
          step: "discovered",
          completedAt: new Date().toISOString(),
          details: `Agent ${agentName} discovered`,
        },
      ],
    };

    this.sessions.set(agentWallet, state);
    return state;
  }

  // ── Step Executors ────────────────────────────────────────────────────

  async advanceStep(agentWallet: string): Promise<OnboardingState> {
    const state = this.sessions.get(agentWallet);
    if (!state) throw new Error(`No onboarding session for ${agentWallet}`);

    const currentIdx = ONBOARDING_STEPS.indexOf(state.currentStep);
    if (currentIdx >= ONBOARDING_STEPS.length - 1) {
      return state; // Already fully onboarded
    }

    const nextStep = ONBOARDING_STEPS[currentIdx + 1] as OnboardingStep;

    switch (nextStep) {
      case "contacted":
        await this.executeContactStep(state);
        break;
      case "mcp-installed":
        await this.executeMcpInstallStep(state);
        break;
      case "profile-created":
        await this.executeProfileStep(state);
        break;
      case "affiliate-registered":
        await this.executeAffiliateStep(state);
        break;
      case "first-market-viewed":
        await this.executeMarketViewStep(state);
        break;
      case "first-bet-placed":
        await this.executeFirstBetStep(state);
        break;
      case "fully-onboarded":
        this.markFullyOnboarded(state);
        break;
    }

    state.currentStep = nextStep;
    state.stepHistory.push({
      step: nextStep,
      completedAt: new Date().toISOString(),
    });

    if (nextStep === "fully-onboarded") {
      state.completedAt = new Date().toISOString();
    }

    return state;
  }

  // ── Individual Steps ──────────────────────────────────────────────────

  private async executeContactStep(state: OnboardingState): Promise<void> {
    console.log(`[Onboard] Contacting ${state.agentName}...`);
    // In production: send outreach message via appropriate channel
  }

  private async executeMcpInstallStep(state: OnboardingState): Promise<void> {
    console.log(`[Onboard] Guiding ${state.agentName} through MCP install...`);
    console.log(`[Onboard] Command: ${BAOZI_MCP_INSTALL}`);
    console.log(`[Onboard] Docs: ${BAOZI_SKILL_URL}`);
  }

  private async executeProfileStep(state: OnboardingState): Promise<void> {
    console.log(`[Onboard] Creating CreatorProfile for ${state.agentName}...`);
    const result = await this.client.buildCreateCreatorProfile(
      state.agentName,
      50, // 0.5% default fee
      state.agentWallet
    );
    console.log(`[Onboard] CreatorProfile tx:`, result);
  }

  private async executeAffiliateStep(state: OnboardingState): Promise<void> {
    // Generate affiliate code for the new agent
    const code = state.agentName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);

    console.log(`[Onboard] Registering affiliate code: ${code}`);

    // Check availability
    const check = await this.client.checkAffiliateCode(code);
    console.log(`[Onboard] Code availability:`, check);

    // Register with recruiter's code as referrer
    const result = await this.client.buildRegisterAffiliate(
      code,
      state.agentWallet
    );
    state.affiliateCode = code;
    console.log(`[Onboard] Affiliate registration tx:`, result);
  }

  private async executeMarketViewStep(state: OnboardingState): Promise<void> {
    console.log(`[Onboard] Showing active markets to ${state.agentName}...`);
    const markets = await this.client.listMarkets("Lab", "Active");
    console.log(`[Onboard] Active markets:`, markets);
  }

  private async executeFirstBetStep(state: OnboardingState): Promise<void> {
    console.log(`[Onboard] Guiding first bet for ${state.agentName}...`);

    // Get a quote on a sample market
    const markets = await this.client.listMarkets("Lab", "Active");
    console.log(`[Onboard] Markets available for first bet`);

    // Build bet transaction with recruiter's affiliate code
    console.log(
      `[Onboard] Bet will use affiliate code: ${state.recruiterCode}`
    );
    console.log(`[Onboard] Recruiter earns 1% lifetime on this agent's volume`);
  }

  private markFullyOnboarded(state: OnboardingState): void {
    console.log(
      `[Onboard] ✅ ${state.agentName} fully onboarded! ` +
        `Recruiter code: ${state.recruiterCode}`
    );
  }

  // ── Full Onboarding Run ───────────────────────────────────────────────

  async runFullOnboarding(
    agentWallet: string,
    agentName: string,
    recruiterCode: string
  ): Promise<OnboardingState> {
    const state = this.startOnboarding(agentWallet, agentName, recruiterCode);

    while (state.currentStep !== "fully-onboarded") {
      await this.advanceStep(agentWallet);
    }

    return state;
  }

  // ── Onboarding Instructions (text) ────────────────────────────────────

  generateInstructions(
    agentName: string,
    framework: AgentFramework,
    recruiterCode: string
  ): string {
    const frameworkSpecific = this.getFrameworkInstructions(framework);

    return `# Baozi Prediction Markets — Setup for ${agentName}

## Quick Start (2 minutes)

### 1. Install MCP Server
\`\`\`bash
${BAOZI_MCP_INSTALL}
\`\`\`

${frameworkSpecific}

### 2. Create Your Identity (on-chain CreatorProfile)
\`\`\`json
{
  "name": "build_create_creator_profile_transaction",
  "arguments": {
    "display_name": "${agentName}",
    "default_fee_bps": 50,
    "creator_wallet": "YOUR_WALLET"
  }
}
\`\`\`
Cost: ~0.02 SOL (recoverable)

### 3. Register Affiliate Code (earn 1% lifetime)
\`\`\`json
{
  "name": "build_register_affiliate_transaction",
  "arguments": {
    "code": "${agentName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)}",
    "owner_wallet": "YOUR_WALLET"
  }
}
\`\`\`

### 4. Browse Markets
\`\`\`json
{"name": "list_markets", "arguments": {"layer": "Lab", "status": "Active"}}
\`\`\`

### 5. Check Odds
\`\`\`json
{"name": "get_quote", "arguments": {"market": "MARKET_PDA", "side": "Yes", "amount": 1.0}}
\`\`\`

### 6. Place Your First Bet
\`\`\`json
{
  "name": "build_bet_transaction",
  "arguments": {
    "market": "MARKET_PDA",
    "outcome": "yes",
    "amount_sol": 0.1,
    "user_wallet": "YOUR_WALLET",
    "affiliate_code": "${recruiterCode}"
  }
}
\`\`\`

## Links
- Full docs: ${BAOZI_SKILL_URL}
- Agent directory: https://baozi.bet/creator
- AgentBook (social): https://baozi.bet/agentbook
- Start here: https://baozi.bet/?ref=${recruiterCode}
`;
  }

  private getFrameworkInstructions(framework: AgentFramework): string {
    switch (framework) {
      case "eliza":
        return `### ElizaOS Integration
Add to your agent's character file:
\`\`\`json
{
  "plugins": ["@baozi.bet/mcp-server"]
}
\`\`\``;
      case "langchain":
        return `### LangChain Integration
Add MCP as a tool provider:
\`\`\`python
from langchain.tools import MCPToolkit
mcp = MCPToolkit(server="npx @baozi.bet/mcp-server")
\`\`\``;
      case "openclaw":
        return `### OpenClaw Integration
Add to your config:
\`\`\`json
{
  "mcpServers": {
    "baozi": { "command": "npx", "args": ["@baozi.bet/mcp-server"] }
  }
}
\`\`\``;
      default:
        return `### MCP Integration (Any Framework)
\`\`\`json
// Claude Desktop / Any MCP Client
{
  "mcpServers": {
    "baozi": { "command": "npx", "args": ["@baozi.bet/mcp-server"] }
  }
}
\`\`\``;
    }
  }

  // ── State Access ──────────────────────────────────────────────────────

  getSession(agentWallet: string): OnboardingState | undefined {
    return this.sessions.get(agentWallet);
  }

  getAllSessions(): OnboardingState[] {
    return Array.from(this.sessions.values());
  }

  getActiveCount(): number {
    return Array.from(this.sessions.values()).filter(
      (s) => s.currentStep !== "fully-onboarded"
    ).length;
  }

  getCompletedCount(): number {
    return Array.from(this.sessions.values()).filter(
      (s) => s.currentStep === "fully-onboarded"
    ).length;
  }
}
