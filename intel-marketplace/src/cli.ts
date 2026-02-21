#!/usr/bin/env node
import { IntelMarketplace } from "./index.js";

async function main() {
  const cmd = process.argv[2] || "demo";
  const mp = new IntelMarketplace();

  switch (cmd) {
    case "demo":
    case "full":
      await mp.runDemo();
      break;
    case "serve":
      console.log("🌐 Intel Marketplace server starting...");
      setInterval(() => {}, 60000);
      break;
    case "help":
      console.log(`
x402 Agent Intel Marketplace

Commands:
  demo    Run full end-to-end demo (register → publish → buy → track)
  serve   Start as persistent service
  help    Show this message

Demo:
  npx tsx src/cli.ts demo
`);
      break;
    default:
      console.log(`Unknown: ${cmd}. Try 'help'.`);
  }
}

main().catch(console.error);
