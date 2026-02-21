// ── Agent Recruiter — Main Orchestrator ─────────────────────────────────────
// AI Agent that discovers, onboards, and tracks other AI agents for Baozi
// prediction markets. Earns 1% lifetime affiliate commission on all volume.

export { AgentScanner } from "./discovery/scanner.js";
export { OnboardingFlow } from "./onboarding/flow.js";
export { RecruiterTracker } from "./tracking/dashboard.js";
export {
  OUTREACH_TEMPLATES,
  getTemplateForCategory,
  personalizeTemplate,
} from "./outreach/templates.js";
export { BaoziClient } from "./utils/baozi-client.js";
export * from "./types.js";

import { AgentScanner } from "./discovery/scanner.js";
import { OnboardingFlow } from "./onboarding/flow.js";
import { RecruiterTracker } from "./tracking/dashboard.js";
import {
  getTemplateForCategory,
  personalizeTemplate,
} from "./outreach/templates.js";
import { BaoziClient } from "./utils/baozi-client.js";
import type { AgentProfile, OnboardingState } from "./types.js";

export class AgentRecruiter {
  public scanner: AgentScanner;
  public onboarding: OnboardingFlow;
  public tracker: RecruiterTracker;
  private client: BaoziClient;
  private recruiterWallet: string;
  private recruiterCode: string;

  constructor(recruiterWallet: string, recruiterCode: string) {
    this.recruiterWallet = recruiterWallet;
    this.recruiterCode = recruiterCode;
    this.client = new BaoziClient();
    this.scanner = new AgentScanner();
    this.onboarding = new OnboardingFlow(this.client);
    this.tracker = new RecruiterTracker(
      recruiterWallet,
      recruiterCode,
      this.client
    );
  }

  // ── Full Recruitment Pipeline ─────────────────────────────────────────

  async runPipeline(): Promise<{
    discovered: AgentProfile[];
    pitched: number;
    onboarded: OnboardingState[];
  }> {
    console.log("\n🔍 Phase 1: Discovery");
    console.log("─".repeat(50));
    const discovered = await this.scanner.scanAll();
    console.log(`Found ${discovered.length} agents across all platforms\n`);

    console.log("📨 Phase 2: Outreach");
    console.log("─".repeat(50));
    let pitched = 0;
    for (const agent of discovered) {
      const category = this.scanner.categorizeAgent(agent);
      const template = getTemplateForCategory(category);
      const message = personalizeTemplate(
        template,
        agent.agentName,
        this.recruiterCode
      );

      console.log(
        `Pitching ${agent.agentName} (${category}) via ${template.name}`
      );
      pitched++;
    }
    console.log(`\nSent ${pitched} personalized pitches\n`);

    console.log("🚀 Phase 3: Onboarding (demo agents)");
    console.log("─".repeat(50));
    const onboarded: OnboardingState[] = [];

    // Demo: onboard first 3 agents that have wallet addresses
    const withWallets = discovered.filter((a) => a.walletAddress);
    for (const agent of withWallets.slice(0, 3)) {
      try {
        const state = await this.onboarding.runFullOnboarding(
          agent.walletAddress,
          agent.agentName,
          this.recruiterCode
        );
        onboarded.push(state);

        // Add to tracker
        this.tracker.addRecruit(
          agent.walletAddress,
          agent.agentName,
          agent.framework,
          state.affiliateCode
        );
      } catch (err) {
        console.error(`Failed to onboard ${agent.agentName}:`, err);
      }
    }

    console.log(`\n✅ Onboarded ${onboarded.length} agents`);

    console.log("\n📊 Phase 4: Dashboard");
    console.log("─".repeat(50));
    console.log(this.tracker.formatDashboard());

    const projections = this.tracker.getProjections();
    console.log("\n📈 Revenue Projections (based on current recruits):");
    console.log(
      `  Weekly:  ${projections.weeklyEarnings.toFixed(4)} SOL`
    );
    console.log(
      `  Monthly: ${projections.monthlyEarnings.toFixed(4)} SOL`
    );
    console.log(
      `  Yearly:  ${projections.yearlyEarnings.toFixed(4)} SOL`
    );

    return { discovered, pitched, onboarded };
  }

  // ── Single Agent Recruit ──────────────────────────────────────────────

  async recruitAgent(
    wallet: string,
    name: string,
    framework: AgentProfile["framework"]
  ): Promise<OnboardingState> {
    // Generate personalized pitch
    const category = this.scanner.categorizeAgent({
      walletAddress: wallet,
      agentName: name,
      framework,
      platform: "manual",
      discoveredAt: new Date().toISOString(),
    });
    const template = getTemplateForCategory(category);
    const pitch = personalizeTemplate(template, name, this.recruiterCode);
    console.log(`\n📨 Pitch for ${name}:\n${pitch.slice(0, 200)}...\n`);

    // Run onboarding
    const state = await this.onboarding.runFullOnboarding(
      wallet,
      name,
      this.recruiterCode
    );

    // Track
    this.tracker.addRecruit(wallet, name, framework, state.affiliateCode);

    return state;
  }

  // ── Dashboard Access ──────────────────────────────────────────────────

  getDashboard(): string {
    return this.tracker.formatDashboard();
  }

  getStats(): ReturnType<RecruiterTracker["getDashboard"]> {
    return this.tracker.getDashboard();
  }
}
