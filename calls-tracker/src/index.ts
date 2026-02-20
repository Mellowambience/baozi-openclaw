import { registerCall, getReputation, printDashboard, syncResolutions } from "./tracker";

async function demo() {
  console.log("\n🎯 CALLS TRACKER — Demo\n");

  // Example call 1: BTC price prediction
  console.log("📝 Registering Call 1: BTC prediction...");
  const r1 = registerCall(
    "CryptoInfluencer",
    "BTC will hit $110k by March 1, 2026",
    0.5,
    "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf"
  );
  if ("error" in r1) {
    console.log("❌", r1.error);
  } else {
    console.log("✅ Call registered:", r1.call.id);
    console.log("   Market:", r1.call.marketQuestion);
    console.log("   Close:", r1.call.closeTime.toISOString());
    console.log("   Bet:", r1.call.betAmount, "SOL on", r1.call.side);
    console.log("   Share card:", r1.shareCardUrl);
    console.log("   PDA:", r1.call.marketPda);
  }

  // Example call 2: Sports prediction
  console.log("\n📝 Registering Call 2: Sports prediction...");
  const r2 = registerCall(
    "SportsAnalyst",
    "The Eagles will win the next Super Bowl",
    0.25,
    undefined
  );
  if ("error" in r2) {
    console.log("❌", r2.error);
  } else {
    console.log("✅ Call registered:", r2.call.id);
    console.log("   Market:", r2.call.marketQuestion);
  }

  // Example call 3: ETH prediction
  console.log("\n📝 Registering Call 3: ETH prediction...");
  const r3 = registerCall(
    "CryptoInfluencer",
    "ETH will flip BTC market cap by end of March 2026",
    1.0,
    "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf"
  );
  if ("error" in r3) {
    console.log("❌", r3.error);
  } else {
    console.log("✅ Call registered:", r3.call.id);
    console.log("   Market:", r3.call.marketQuestion);
  }

  // Sync resolutions (hits live API)
  console.log("\n🔄 Syncing resolutions from on-chain...");
  await syncResolutions();

  // Print dashboard
  printDashboard();

  // Get individual reputation
  const rep = getReputation("CryptoInfluencer");
  if (rep) {
    console.log("\n📊 CryptoInfluencer reputation loaded.");
    console.log("   Hit rate:", (rep.hitRate * 100).toFixed(1) + "%");
  }
}

demo().catch(console.error);
