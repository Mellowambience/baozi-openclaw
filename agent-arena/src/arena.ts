import { AgentStats, MarketState, ArenaSnapshot, Position } from "./types";
import {
  fetchActiveMarkets,
  fetchPositions,
  fetchMarket,
  fetchQuote,
  fetchAgentProfile,
  formatOdds,
  progressBar,
  formatPnl,
  formatSol,
  timeUntil,
} from "./utils";

/**
 * Build the full arena snapshot for a set of agent wallets
 */
export async function buildArenaSnapshot(wallets: string[]): Promise<ArenaSnapshot> {
  // Fetch all agent profiles and positions in parallel
  const [profiles, positionsArr, activeMarkets] = await Promise.all([
    Promise.all(wallets.map((w) => fetchAgentProfile(w).then((p) => ({ wallet: w, ...p })))),
    Promise.all(wallets.map((w) => fetchPositions(w).then((ps) => ({ wallet: w, positions: ps })))),
    fetchActiveMarkets(),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.wallet, p]));
  const posMap = new Map(positionsArr.map((p) => [p.wallet, p.positions]));

  // Build per-agent stats
  const agentStats: AgentStats[] = await Promise.all(
    wallets.map(async (wallet) => {
      const profile = profileMap.get(wallet)!;
      const rawPositions = posMap.get(wallet) ?? [];

      // Map raw positions to typed positions with live odds
      const openPositions: Position[] = await Promise.all(
        rawPositions
          .filter((p: any) => !p.claimed && !p.resolved)
          .map(async (p: any) => {
            const impliedOdds = await fetchQuote(p.market_pda ?? p.marketPda, p.side ?? "Yes", p.amount ?? 0);
            const unrealizedPnl =
              (p.side === "Yes" ? impliedOdds : 1 - impliedOdds) * (p.amount ?? 0) - (p.amount ?? 0);
            return {
              marketPda: p.market_pda ?? p.marketPda ?? "",
              marketQuestion: p.question ?? "Unknown market",
              side: (p.side ?? "Yes") as "Yes" | "No",
              amount: p.amount ?? 0,
              currentOdds: impliedOdds,
              unrealizedPnl,
              closingAt: p.close_time ?? p.closeTime,
            } as Position;
          })
      );

      const resolved = rawPositions.filter((p: any) => p.resolved || p.claimed);
      const correct = resolved.filter((p: any) => p.outcome === p.side);
      const solWagered = openPositions.reduce((s, p) => s + p.amount, 0);
      const solWon = correct.reduce((s: number, p: any) => s + (p.payout ?? 0), 0);
      const solLost = resolved
        .filter((p: any) => p.outcome !== p.side)
        .reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

      // Streak
      let streak = 0;
      for (let i = resolved.length - 1; i >= 0; i--) {
        const p = resolved[i] as any;
        if (p.outcome === p.side) streak++;
        else break;
      }

      return {
        wallet,
        name: profile.name,
        openPositions,
        totalWagered: solWagered,
        solWon,
        solLost,
        accuracy: resolved.length > 0 ? correct.length / resolved.length : 0,
        totalResolved: resolved.length,
        correctResolved: correct.length,
        streak,
      } as AgentStats;
    })
  );

  // Rank agents by accuracy then profit
  agentStats.sort((a, b) => b.accuracy - a.accuracy || b.solWon - a.solWon);
  agentStats.forEach((a, i) => (a.rank = i + 1));

  // Build per-market state with all agent positions overlaid
  const marketMap = new Map<string, MarketState>();
  for (const { wallet, positions } of positionsArr) {
    const profile = profileMap.get(wallet)!;
    for (const pos of positions) {
      const pda = pos.market_pda ?? pos.marketPda;
      if (!pda) continue;
      if (!marketMap.has(pda)) {
        const m = activeMarkets.find((am: any) => am.pda === pda || am.market_pda === pda);
        const yesPool = m?.yes_pool ?? m?.yesPool ?? 0;
        const noPool = m?.no_pool ?? m?.noPool ?? 0;
        const total = yesPool + noPool || 1;
        marketMap.set(pda, {
          pda,
          question: m?.question ?? pos.question ?? "Unknown market",
          yesPool,
          noPool,
          totalPool: total,
          yesOdds: yesPool / total,
          noOdds: noPool / total,
          closingAt: m?.close_time ?? m?.closeTime ?? "",
          layer: m?.layer ?? "Lab",
          agentPositions: [],
        });
      }
      const ms = marketMap.get(pda)!;
      const unrealizedPnl =
        (pos.side === "Yes" ? ms.yesOdds : ms.noOdds) * (pos.amount ?? 0) - (pos.amount ?? 0);
      ms.agentPositions.push({
        wallet,
        name: profile.name,
        side: pos.side ?? "Yes",
        amount: pos.amount ?? 0,
        pnl: unrealizedPnl,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    agents: agentStats,
    markets: Array.from(marketMap.values()),
  };
}

/**
 * Render arena snapshot as terminal UI
 */
export function renderArena(snapshot: ArenaSnapshot): void {
  const { agents, markets } = snapshot;

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║           AGENT ARENA — Live Competition              ║");
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║  ${new Date(snapshot.timestamp).toUTCString().padEnd(52)}║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  // Markets section
  console.log("\n📊 ACTIVE MARKETS");
  if (markets.length === 0) {
    console.log("   No active markets with agent activity found.");
  }
  for (const m of markets.slice(0, 5)) {
    console.log(`\n  ┌─ ${m.question.slice(0, 60)}`);
    console.log(`  │  Pool: ${formatSol(m.totalPool)} | YES: ${formatOdds(m.yesOdds)} ${progressBar(m.yesOdds, 16)} NO: ${formatOdds(m.noOdds)}`);
    console.log(`  │  Closes: ${m.closingAt ? timeUntil(m.closingAt) : "unknown"} | Layer: ${m.layer}`);
    for (const ap of m.agentPositions) {
      console.log(`  │  🤖 ${ap.name.padEnd(16)} → ${ap.amount.toFixed(3)} SOL on ${ap.side.padEnd(3)} (P&L: ${formatPnl(ap.pnl)})`);
    }
  }

  // Leaderboard section
  console.log("\n🏆 AGENT LEADERBOARD");
  console.log("  Rank | Agent                | Accuracy | P&L       | Positions | Streak");
  console.log("  ─────────────────────────────────────────────────────────────────────────");
  for (const a of agents) {
    const acc = `${(a.accuracy * 100).toFixed(1)}%`.padEnd(8);
    const pnl = formatPnl(a.solWon - a.solLost).padEnd(10);
    const pos = String(a.openPositions.length).padEnd(9);
    const streak = `${a.streak}🔥`.padEnd(6);
    console.log(`  #${String(a.rank).padEnd(4)} | ${a.name.slice(0, 20).padEnd(20)} | ${acc} | ${pnl} | ${pos} | ${streak}`);
  }
}
