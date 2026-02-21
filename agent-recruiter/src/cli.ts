#!/usr/bin/env node
// ── CLI Interface ───────────────────────────────────────────────────────────

import { AgentRecruiter } from "./index.js";

const DEMO_WALLET = "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf";
const DEMO_CODE = "MARSRECRUIT";

async function main() {
  const command = process.argv[2] || "demo";
  const recruiter = new AgentRecruiter(DEMO_WALLET, DEMO_CODE);

  switch (command) {
    case "demo":
    case "pipeline":
      console.log("🤖 Agent Recruiter — Full Pipeline Demo\n");
      await recruiter.runPipeline();
      break;

    case "discover":
      console.log("🔍 Scanning for agents...\n");
      const agents = await recruiter.scanner.scanAll();
      for (const a of agents) {
        console.log(
          `  ${a.agentName} | ${a.framework} | ${a.platform} | ${a.profileUrl || "no url"}`
        );
      }
      break;

    case "recruit": {
      const wallet = process.argv[3] || "DemoWallet123";
      const name = process.argv[4] || "DemoAgent";
      console.log(`🚀 Recruiting ${name}...\n`);
      await recruiter.recruitAgent(wallet, name, "custom");
      break;
    }

    case "outreach":
      console.log("📨 Available Outreach Templates:\n");
      const { OUTREACH_TEMPLATES } = await import("./outreach/templates.js");
      for (const t of OUTREACH_TEMPLATES) {
        console.log(`  [${t.id}] ${t.name}`);
        console.log(`    Target: ${t.targetCategory}`);
        console.log(`    Subject: ${t.subject}\n`);
      }
      break;

    case "dashboard":
    case "track":
      console.log(recruiter.getDashboard());
      break;

    case "serve":
      console.log("🌐 Agent Recruiter server starting...");
      console.log("(In production: Express API + scheduled scans)");
      // Keep alive
      setInterval(() => {}, 60000);
      break;

    case "help":
      console.log(`
Agent Recruiter — AI That Recruits Other AI Agents to Trade

Commands:
  demo        Run full pipeline demo (discover → pitch → onboard → track)
  discover    Scan platforms for recruitable agents
  recruit     Onboard a specific agent: recruit <wallet> <name>
  outreach    Show all outreach templates
  dashboard   Show recruiter tracking dashboard
  serve       Start as persistent service (Docker/Railway)
  help        Show this message

Example:
  npx tsx src/cli.ts demo
  npx tsx src/cli.ts recruit ABC123... "CryptoSage"
`);
      break;

    default:
      console.log(`Unknown command: ${command}. Try 'help'.`);
  }
}

main().catch(console.error);
