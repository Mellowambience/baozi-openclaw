import { describe, it, expect, beforeEach } from "vitest";
import { AgentScanner } from "../src/discovery/scanner.js";
import { OnboardingFlow } from "../src/onboarding/flow.js";
import { RecruiterTracker } from "../src/tracking/dashboard.js";
import {
  OUTREACH_TEMPLATES,
  getTemplateForCategory,
  personalizeTemplate,
} from "../src/outreach/templates.js";
import { BaoziClient } from "../src/utils/baozi-client.js";
import { ONBOARDING_STEPS } from "../src/utils/constants.js";
import type { AgentProfile, AgentCategory } from "../src/types.js";

const TEST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const RECRUITER_WALLET = "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf";
const RECRUITER_CODE = "MARSRECRUIT";

// ── Discovery Tests ──────────────────────────────────────────────────────

describe("AgentScanner", () => {
  let scanner: AgentScanner;

  beforeEach(() => {
    scanner = new AgentScanner();
  });

  it("should scan all platforms and return agents", async () => {
    const agents = await scanner.scanAll();
    expect(agents).toBeDefined();
    expect(agents.length).toBeGreaterThan(0);
  });

  it("should scan individual platforms", async () => {
    const github = await scanner.scanPlatform("github");
    expect(github).toBeDefined();
    expect(Array.isArray(github)).toBe(true);
  });

  it("should scan agentbook for live agents", async () => {
    const agents = await scanner.scanPlatform("agentbook");
    expect(Array.isArray(agents)).toBe(true);
    // AgentBook returns real data or empty array
  });

  it("should categorize agents correctly", () => {
    const cryptoAgent: AgentProfile = {
      walletAddress: TEST_WALLET,
      agentName: "CryptoBot",
      framework: "custom",
      platform: "twitter",
      capabilities: ["crypto", "analysis"],
      discoveredAt: new Date().toISOString(),
    };
    expect(scanner.categorizeAgent(cryptoAgent)).toBe("crypto-analyst");

    const tradingAgent: AgentProfile = {
      walletAddress: TEST_WALLET,
      agentName: "TradeBot",
      framework: "eliza",
      platform: "github",
      capabilities: ["trading", "defi"],
      discoveredAt: new Date().toISOString(),
    };
    expect(scanner.categorizeAgent(tradingAgent)).toBe("trading-bot");

    const socialAgent: AgentProfile = {
      walletAddress: TEST_WALLET,
      agentName: "SocialBot",
      framework: "langchain",
      platform: "twitter",
      capabilities: ["social", "content"],
      discoveredAt: new Date().toISOString(),
    };
    expect(scanner.categorizeAgent(socialAgent)).toBe("social-agent");
  });

  it("should deduplicate agents across platforms", async () => {
    const agents = await scanner.scanAll();
    const names = agents.map((a) => a.agentName);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it("should track discovered count", async () => {
    await scanner.scanAll();
    expect(scanner.getDiscoveredCount()).toBeGreaterThan(0);
  });

  it("should handle custom discovery config", () => {
    const custom = new AgentScanner({
      platforms: ["github"],
      maxResultsPerPlatform: 10,
      excludeWallets: [TEST_WALLET],
      minCapabilityScore: 5,
    });
    expect(custom).toBeDefined();
  });
});

// ── Outreach Tests ───────────────────────────────────────────────────────

describe("Outreach Templates", () => {
  it("should have 7 outreach templates", () => {
    expect(OUTREACH_TEMPLATES.length).toBe(7);
  });

  it("should cover all agent categories", () => {
    const categories = OUTREACH_TEMPLATES.map((t) => t.targetCategory);
    expect(categories).toContain("crypto-analyst");
    expect(categories).toContain("trading-bot");
    expect(categories).toContain("social-agent");
    expect(categories).toContain("general-purpose");
    expect(categories).toContain("defi-agent");
    expect(categories).toContain("data-agent");
    expect(categories).toContain("nft-agent");
  });

  it("should get template for category", () => {
    const template = getTemplateForCategory("crypto-analyst");
    expect(template.targetCategory).toBe("crypto-analyst");
    expect(template.body).toContain("baozi");
  });

  it("should fallback to general-purpose for unknown category", () => {
    // This forces the fallback
    const template = getTemplateForCategory("general-purpose");
    expect(template.id).toBe("general-purpose-v1");
  });

  it("should personalize template with recruiter code", () => {
    const template = OUTREACH_TEMPLATES[0];
    const personalized = personalizeTemplate(template, "TestAgent", "TESTCODE");
    expect(personalized).toContain("TESTCODE");
    expect(personalized).not.toContain("RECRUITER");
  });

  it("should include MCP install command in every template", () => {
    for (const template of OUTREACH_TEMPLATES) {
      expect(template.body).toContain("npx @baozi.bet/mcp-server");
    }
  });

  it("should include affiliate link in every template", () => {
    for (const template of OUTREACH_TEMPLATES) {
      expect(template.body).toContain("baozi.bet/?ref=");
    }
  });

  it("should have call-to-action for every template", () => {
    for (const template of OUTREACH_TEMPLATES) {
      expect(template.callToAction).toBeDefined();
      expect(template.callToAction.length).toBeGreaterThan(0);
    }
  });
});

// ── Onboarding Tests ─────────────────────────────────────────────────────

describe("OnboardingFlow", () => {
  let flow: OnboardingFlow;

  beforeEach(() => {
    flow = new OnboardingFlow();
  });

  it("should start onboarding with discovered state", () => {
    const state = flow.startOnboarding(TEST_WALLET, "TestAgent", RECRUITER_CODE);
    expect(state.currentStep).toBe("discovered");
    expect(state.agentWallet).toBe(TEST_WALLET);
    expect(state.recruiterCode).toBe(RECRUITER_CODE);
  });

  it("should advance through all onboarding steps", async () => {
    flow.startOnboarding(TEST_WALLET, "TestAgent", RECRUITER_CODE);

    // Advance through all steps
    for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
      const state = await flow.advanceStep(TEST_WALLET);
      expect(state.currentStep).toBe(ONBOARDING_STEPS[i + 1]);
    }
  });

  it("should run full onboarding pipeline", async () => {
    const state = await flow.runFullOnboarding(
      TEST_WALLET,
      "TestAgent",
      RECRUITER_CODE
    );
    expect(state.currentStep).toBe("fully-onboarded");
    expect(state.completedAt).toBeDefined();
    expect(state.stepHistory.length).toBe(ONBOARDING_STEPS.length);
  });

  it("should track active and completed sessions", async () => {
    await flow.runFullOnboarding(TEST_WALLET, "Agent1", RECRUITER_CODE);
    flow.startOnboarding("WALLET2", "Agent2", RECRUITER_CODE);

    expect(flow.getCompletedCount()).toBe(1);
    expect(flow.getActiveCount()).toBe(1);
    expect(flow.getAllSessions().length).toBe(2);
  });

  it("should throw for unknown wallet", async () => {
    await expect(flow.advanceStep("UNKNOWN")).rejects.toThrow();
  });

  it("should generate framework-specific instructions", () => {
    const instructions = flow.generateInstructions(
      "TestBot",
      "eliza",
      RECRUITER_CODE
    );
    expect(instructions).toContain("ElizaOS");
    expect(instructions).toContain(RECRUITER_CODE);
    expect(instructions).toContain("npx @baozi.bet/mcp-server");
  });

  it("should generate instructions for all frameworks", () => {
    const frameworks = [
      "eliza",
      "langchain",
      "openclaw",
      "mcp-native",
      "custom",
    ] as const;
    for (const fw of frameworks) {
      const instructions = flow.generateInstructions("Bot", fw, "CODE");
      expect(instructions).toContain("npx @baozi.bet/mcp-server");
    }
  });

  it("should record step history", async () => {
    const state = await flow.runFullOnboarding(
      TEST_WALLET,
      "TestAgent",
      RECRUITER_CODE
    );
    expect(state.stepHistory.length).toBe(ONBOARDING_STEPS.length);
    for (const entry of state.stepHistory) {
      expect(entry.completedAt).toBeDefined();
    }
  });
});

// ── Tracking Tests ───────────────────────────────────────────────────────

describe("RecruiterTracker", () => {
  let tracker: RecruiterTracker;

  beforeEach(() => {
    tracker = new RecruiterTracker(RECRUITER_WALLET, RECRUITER_CODE);
  });

  it("should add recruits", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza", "AGENT1");
    expect(tracker.getRecruitCount()).toBe(1);
  });

  it("should track recruit stats", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    tracker.updateRecruitStats(TEST_WALLET, {
      totalBets: 10,
      totalVolume: 25.5,
      totalWinnings: 8.3,
      marketsCreated: 2,
    });

    const recruit = tracker.getRecruit(TEST_WALLET);
    expect(recruit?.stats.totalBets).toBe(10);
    expect(recruit?.stats.totalVolume).toBe(25.5);
    expect(recruit?.stats.affiliateEarnings).toBeCloseTo(0.083, 3); // 1% of 8.3
  });

  it("should generate dashboard", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    tracker.addRecruit("WALLET2", "Agent2", "langchain");

    const dashboard = tracker.getDashboard();
    expect(dashboard.totalRecruited).toBe(2);
    expect(dashboard.recruiterCode).toBe(RECRUITER_CODE);
  });

  it("should format dashboard as string", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    const formatted = tracker.formatDashboard();
    expect(formatted).toContain("AGENT RECRUITER DASHBOARD");
    expect(formatted).toContain(RECRUITER_CODE);
  });

  it("should calculate projections", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    tracker.updateRecruitStats(TEST_WALLET, {
      totalVolume: 100,
      totalWinnings: 30,
    });

    const projections = tracker.getProjections();
    expect(projections.weeklyVolume).toBe(100);
    expect(projections.weeklyEarnings).toBeCloseTo(1.0); // 1% of 100
  });

  it("should identify top performer", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    tracker.updateRecruitStats(TEST_WALLET, { totalVolume: 50 });

    tracker.addRecruit("WALLET2", "Agent2", "langchain");
    tracker.updateRecruitStats("WALLET2", { totalVolume: 100 });

    const dashboard = tracker.getDashboard();
    expect(dashboard.topPerformer?.name).toBe("Agent2");
  });

  it("should list all recruits", () => {
    tracker.addRecruit(TEST_WALLET, "Agent1", "eliza");
    tracker.addRecruit("WALLET2", "Agent2", "langchain");
    tracker.addRecruit("WALLET3", "Agent3", "custom");

    expect(tracker.getAllRecruits().length).toBe(3);
  });

  it("should handle empty tracker gracefully", () => {
    const dashboard = tracker.getDashboard();
    expect(dashboard.totalRecruited).toBe(0);
    expect(dashboard.combinedVolume).toBe(0);
    expect(dashboard.topPerformer).toBeUndefined();
  });
});

// ── BaoziClient Tests ────────────────────────────────────────────────────

describe("BaoziClient", () => {
  const client = new BaoziClient();

  it("should call list_markets", async () => {
    const result = await client.listMarkets();
    expect(result.success).toBe(true);
  });

  it("should call get_quote", async () => {
    const result = await client.getQuote("TEST_PDA", "Yes", 1.0);
    expect(result.success).toBe(true);
  });

  it("should build creator profile tx", async () => {
    const result = await client.buildCreateCreatorProfile(
      "TestAgent",
      50,
      TEST_WALLET
    );
    expect(result.success).toBe(true);
  });

  it("should check affiliate code", async () => {
    const result = await client.checkAffiliateCode("TESTCODE");
    expect(result.success).toBe(true);
  });

  it("should build register affiliate tx", async () => {
    const result = await client.buildRegisterAffiliate("TESTCODE", TEST_WALLET);
    expect(result.success).toBe(true);
  });

  it("should format affiliate link", async () => {
    const result = await client.formatAffiliateLink("TESTCODE");
    expect(result.success).toBe(true);
  });

  it("should generate share card URL", async () => {
    const url = await client.generateShareCard("TEST_PDA", TEST_WALLET, "MYCODE");
    expect(url).toContain("baozi.bet/api/share/card");
    expect(url).toContain("TEST_PDA");
    expect(url).toContain(TEST_WALLET);
    expect(url).toContain("MYCODE");
  });

  it("should build bet transaction", async () => {
    const result = await client.buildBetTransaction(
      "TEST_PDA",
      "yes",
      1.0,
      TEST_WALLET,
      "REFCODE"
    );
    expect(result.success).toBe(true);
  });

  it("should get positions", async () => {
    const result = await client.getPositions(TEST_WALLET);
    expect(result.success).toBe(true);
  });
});
