import { buildArenaSnapshot, renderArena } from "./arena";

// Example agent wallets to track
// In production: load from config file or env
const AGENT_WALLETS = [
  "A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf", // AetherRose agent
  // Add more agent wallets here
  "7Q2afV64in6N6SeZsAAB81TKnScBYy3NS3NxNEsCG4dh",
  "DRpbCBMxVnDK7maPGv7wNtcBGvoHy3b2enqCsJfBg3k",
];

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

async function run(loop: boolean = false) {
  console.log("🎮 Starting Agent Arena...");
  console.log(`   Tracking ${AGENT_WALLETS.length} agent wallets`);
  console.log(`   Refresh interval: ${REFRESH_INTERVAL_MS / 1000}s`);

  const tick = async () => {
    try {
      const snapshot = await buildArenaSnapshot(AGENT_WALLETS);
      renderArena(snapshot);
    } catch (err) {
      console.error("Arena tick failed:", err);
    }
  };

  await tick();

  if (loop) {
    setInterval(tick, REFRESH_INTERVAL_MS);
  }
}

run(process.argv.includes("--watch")).catch(console.error);
