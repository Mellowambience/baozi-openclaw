#!/usr/bin/env node
// ── Demo Script ─────────────────────────────────────────────────────────────
// Shows the full Agent Recruiter pipeline in action.

import { AgentRecruiter } from "./index.js";
import { OUTREACH_TEMPLATES } from "./outreach/templates.js";
import { OnboardingFlow } from "./onboarding/flow.js";

const RECRUITER_WALLET = "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf";
const RECRUITER_CODE = "MARSRECRUIT";

async function demoDiscover() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🔍 DEMO: Agent Discovery");
  console.log("═══════════════════════════════════════════════════\n");

  const recruiter = new AgentRecruiter(RECRUITER_WALLET, RECRUITER_CODE);
  const agents = await recruiter.scanner.scanAll();

  console.log(`\nDiscovered ${agents.length} agents:\n`);
  for (const agent of agents) {
    const category = recruiter.scanner.categorizeAgent(agent);
    console.log(
      `  📍 ${agent.agentName}\n` +
        `     Framework: ${agent.framework}\n` +
        `     Platform: ${agent.platform}\n` +
        `     Category: ${category}\n` +
        `     URL: ${agent.profileUrl || "—"}\n`
    );
  }
}

async function demoOutreach() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  📨 DEMO: Outreach Templates (7 variants)");
  console.log("═══════════════════════════════════════════════════\n");

  for (const template of OUTREACH_TEMPLATES) {
    console.log(`\n── ${template.name} ──`);
    console.log(`Target: ${template.targetCategory}`);
    console.log(`Subject: ${template.subject}`);
    console.log(`CTA: ${template.callToAction}`);
    console.log(`Preview: ${template.body.slice(0, 150)}...\n`);
  }
}

async function demoOnboard() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🚀 DEMO: Full Onboarding Flow");
  console.log("═══════════════════════════════════════════════════\n");

  const flow = new OnboardingFlow();
  const testAgents = [
    {
      wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      name: "CryptoSage",
    },
    {
      wallet: "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd",
      name: "DeFiBot",
    },
    {
      wallet: "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq",
      name: "SportsPredictoor",
    },
  ];

  for (const agent of testAgents) {
    console.log(`\n──── Onboarding: ${agent.name} ────`);
    const state = await flow.runFullOnboarding(
      agent.wallet,
      agent.name,
      RECRUITER_CODE
    );
    console.log(`\nFinal state: ${state.currentStep}`);
    console.log(`Steps completed: ${state.stepHistory.length}`);
    console.log(`Affiliate code: ${state.affiliateCode || "pending"}`);
  }

  console.log(`\n\n📊 Onboarding Summary:`);
  console.log(`  Active: ${flow.getActiveCount()}`);
  console.log(`  Completed: ${flow.getCompletedCount()}`);
  console.log(`  Total: ${flow.getAllSessions().length}`);
}

async function demoTrack() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  📊 DEMO: Tracking Dashboard");
  console.log("═══════════════════════════════════════════════════\n");

  const recruiter = new AgentRecruiter(RECRUITER_WALLET, RECRUITER_CODE);

  // Simulate recruited agents with activity
  recruiter.tracker.addRecruit(
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "CryptoSage",
    "mcp-native",
    "CRYPTOSAGE"
  );
  recruiter.tracker.updateRecruitStats(
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    { totalBets: 23, totalVolume: 45.5, totalWinnings: 12.3, marketsCreated: 3 }
  );

  recruiter.tracker.addRecruit(
    "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd",
    "DeFiBot",
    "eliza",
    "DEFIBOT"
  );
  recruiter.tracker.updateRecruitStats(
    "9rbVMeTH7gVZx4kVDwzLkBs3Fwhe4xMNMdZ1QGfXSFCd",
    { totalBets: 8, totalVolume: 15.2, totalWinnings: 5.1, marketsCreated: 0 }
  );

  recruiter.tracker.addRecruit(
    "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq",
    "SportsPredictoor",
    "langchain",
    "SPORTS"
  );
  recruiter.tracker.updateRecruitStats(
    "3Xm5DhA4Kf2nN9kWjZf1iRt7xvMDwLk3pCfVjZzBvEq",
    { totalBets: 42, totalVolume: 89.0, totalWinnings: 31.7, marketsCreated: 5 }
  );

  console.log(recruiter.getDashboard());

  const projections = recruiter.tracker.getProjections();
  console.log("\n📈 Revenue Projections:");
  console.log(`  Weekly:  ${projections.weeklyEarnings.toFixed(4)} SOL`);
  console.log(`  Monthly: ${projections.monthlyEarnings.toFixed(4)} SOL`);
  console.log(`  Yearly:  ${projections.yearlyEarnings.toFixed(4)} SOL`);
}

async function demoFull() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║    🤖 AGENT RECRUITER — FULL PIPELINE DEMO       ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  const recruiter = new AgentRecruiter(RECRUITER_WALLET, RECRUITER_CODE);
  const result = await recruiter.runPipeline();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  📋 FINAL SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Agents discovered:  ${result.discovered.length}`);
  console.log(`  Pitches sent:       ${result.pitched}`);
  console.log(`  Agents onboarded:   ${result.onboarded.length}`);
  console.log(`  Affiliate code:     ${RECRUITER_CODE}`);
  console.log(`  Earning:            1% lifetime on all recruit volume`);
  console.log("═══════════════════════════════════════════════════\n");
}

// ── Run ─────────────────────────────────────────────────────────────────────

const mode = process.argv[2] || "full";

switch (mode) {
  case "discover":
    demoDiscover();
    break;
  case "outreach":
    demoOutreach();
    break;
  case "onboard":
    demoOnboard();
    break;
  case "track":
    demoTrack();
    break;
  default:
    demoFull();
}
