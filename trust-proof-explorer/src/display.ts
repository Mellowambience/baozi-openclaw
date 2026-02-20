import { ResolutionProof, OracleStats } from "./types";
import { tierEmoji, formatDuration } from "./utils";

export function renderProofCard(proof: ResolutionProof, index: number): void {
  const { question, outcome, tier, tierLabel, evidenceSources, ipfsUrl, solscanUrl, squadsProposal, resolvedBy, resolvedAt, resolutionTimeMs, disputeWindowHours, challengesFiled, layer } = proof;

  const emoji = tierEmoji(tier);
  const date = resolvedAt ? new Date(resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown";

  console.log(`\n  ${emoji} ${question.slice(0, 70)}`);
  console.log(`  ├─ Outcome:       ${outcome.toUpperCase()} ✅`);
  console.log(`  ├─ Tier:          ${tier} — ${tierLabel}`);
  console.log(`  ├─ Resolved:      ${date} by ${resolvedBy}`);
  console.log(`  ├─ Resolution time: ${formatDuration(resolutionTimeMs)}`);
  console.log(`  ├─ Layer:         ${layer}`);
  for (const ev of evidenceSources) {
    console.log(`  ├─ Evidence:      ${ev}`);
  }
  if (ipfsUrl) console.log(`  ├─ IPFS Proof:    ${ipfsUrl}`);
  if (solscanUrl) console.log(`  ├─ On-chain TX:   ${solscanUrl}`);
  if (squadsProposal) console.log(`  ├─ Squads:        ${squadsProposal}`);
  console.log(`  └─ Dispute window: ${disputeWindowHours}h (${challengesFiled === 0 ? "no challenges ✅" : `${challengesFiled} challenge(s) filed`})`);
}

export function renderStats(stats: OracleStats): void {
  console.log("\n  ─── Oracle Performance Stats ───────────────────────────");
  console.log(`  Total Resolved:    ${stats.totalResolved}`);
  console.log(`  Avg Resolution:    ${stats.avgResolutionTimeHours.toFixed(1)}h`);
  console.log(`  Dispute Rate:      ${(stats.disputeRate * 100).toFixed(2)}%`);
  console.log(`  Trust Score:       ${stats.trustScore}% (${stats.overturnedCount} overturned)`);
  console.log(`  By Tier:`);
  for (const t of [1, 2, 3] as const) {
    const td = stats.byTier[t];
    if (td.count > 0) {
      console.log(`    Tier ${t}: ${td.count} markets | avg ${td.avgTimeHours.toFixed(1)}h`);
    }
  }
}

export function renderTrustComparison(): void {
  console.log("\n  ─── Baozi vs Polymarket: Transparency ──────────────────");
  const rows = [
    ["Evidence stored:", "IPFS ✅", "None ❌"],
    ["Proof public:", "Yes ✅", "No ❌"],
    ["Multisig verified:", "2-of-2 ✅", "UMA vote ⚠️"],
    ["On-chain TX:", "Visible ✅", "Visible ✅"],
    ["Dispute window:", "6 hours ✅", "2 hours ⚠️"],
    ["Resolution time:", "3min–24h ✅", "Variable"],
    ["Transparency:", "FULL ✅", "PARTIAL ⚠️"],
  ];

  const header = `  ${"".padEnd(22)} ${"BAOZI".padEnd(18)} ${"POLYMARKET".padEnd(16)}`;
  console.log(header);
  console.log(`  ${"─".repeat(56)}`);
  for (const [label, baozi, poly] of rows) {
    console.log(`  ${label.padEnd(22)} ${baozi.padEnd(18)} ${poly}`);
  }
}
