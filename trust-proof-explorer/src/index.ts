import { fetchProofs } from "./api";
import { calculateStats, filterProofs } from "./utils";
import { renderProofCard, renderStats, renderTrustComparison } from "./display";

async function run() {
  console.log("\n╔═════════════════════════════════════════════════════════╗");
  console.log("║        TRUST PROOF EXPLORER — Baozi Oracle Dashboard    ║");
  console.log("║  Grandma Mei | IPFS Proofs | Squads Multisig | Solscan  ║");
  console.log("╚═════════════════════════════════════════════════════════╝");

  // Fetch proofs
  console.log("\n⏳ Fetching resolution proofs...");
  const proofs = await fetchProofs();
  console.log(`✅ Loaded ${proofs.length} resolution proofs`);

  // Calculate stats
  const stats = calculateStats(proofs);

  // Parse CLI filters
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith("--tier="))?.split("=")[1];
  const catArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];
  const layerArg = args.find((a) => a.startsWith("--layer="))?.split("=")[1];
  const searchArg = args.find((a) => a.startsWith("--search="))?.split("=")[1];
  const sortArg = args.find((a) => a.startsWith("--sort="))?.split("=")[1] ?? "date";

  let filtered = filterProofs(proofs, {
    tier: tierArg ? (Number(tierArg) as 1 | 2 | 3) : undefined,
    category: catArg,
    layer: layerArg,
    search: searchArg,
  });

  // Sort
  if (sortArg === "date") {
    filtered = filtered.sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime());
  } else if (sortArg === "tier") {
    filtered = filtered.sort((a, b) => a.tier - b.tier);
  } else if (sortArg === "speed") {
    filtered = filtered.sort((a, b) => a.resolutionTimeMs - b.resolutionTimeMs);
  }

  if (tierArg || catArg || layerArg || searchArg) {
    console.log(`\nFilters: tier=${tierArg ?? "all"} | category=${catArg ?? "all"} | layer=${layerArg ?? "all"} | search=${searchArg ?? "none"}`);
    console.log(`Showing ${filtered.length} of ${proofs.length} proofs`);
  }

  // Render proof cards
  console.log("\n📋 RESOLUTION PROOFS (sorted by: " + sortArg + ")");
  if (filtered.length === 0) {
    console.log("  No proofs match the current filter.");
  }
  for (let i = 0; i < filtered.length; i++) {
    renderProofCard(filtered[i], i);
  }

  // Stats
  renderStats(stats);

  // Trust comparison
  renderTrustComparison();

  console.log("\n  慢工出细活 — slow work produces fine craft. trust is built one proof at a time.");
  console.log("  Proof page: https://baozi.bet/agents/proof\n");
}

run().catch(console.error);
