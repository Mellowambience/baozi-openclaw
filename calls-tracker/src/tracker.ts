import * as fs from "fs";
import * as path from "path";
import { Call, CallerReputation, MarketParams } from "./types";
import {
  parsePrediction,
  validateTiming,
  calculateReputation,
  formatReputation,
  fetchResolutionStatus,
} from "./utils";

const DB_PATH = path.join(process.cwd(), "calls-db.json");

interface DB {
  calls: Call[];
  nextId: number;
}

function loadDb(): DB {
  if (!fs.existsSync(DB_PATH)) {
    return { calls: [], nextId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DB;
  } catch {
    return { calls: [], nextId: 1 };
  }
}

function saveDb(db: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Register a new prediction call.
 * In production: would trigger MCP build_create_lab_market_transaction.
 */
export function registerCall(
  caller: string,
  predictionText: string,
  betAmount: number = 0.1,
  walletAddress?: string,
  overrideParams?: Partial<MarketParams>
): { call: Call; shareCardUrl: string } | { error: string } {
  const params = parsePrediction(predictionText);
  if (!params) {
    return { error: "Could not parse prediction into a structured market question." };
  }

  const finalParams: MarketParams = { ...params, ...overrideParams };
  const validation = validateTiming(finalParams);
  if (!validation.valid) {
    return { error: `Timing validation failed: ${validation.error}` };
  }

  const db = loadDb();
  const call: Call = {
    id: `call-${db.nextId++}`,
    caller,
    walletAddress,
    predictionText,
    marketQuestion: finalParams.question,
    marketType: finalParams.type,
    closeTime: finalParams.closeTime,
    eventTime: finalParams.eventTime,
    measurementStart: finalParams.measurementStart,
    dataSource: finalParams.dataSource,
    resolutionCriteria: finalParams.resolutionCriteria,
    betAmount,
    side: "Yes", // caller bets on their own prediction
    status: "created",
    createdAt: new Date(),
  };

  // In production: call MCP build_create_lab_market_transaction
  // Then call MCP build_bet_transaction for caller's own bet
  // Then call MCP generate_share_card
  // Simulated:
  call.marketPda = `MOCK_PDA_${call.id}`;

  db.calls.push(call);
  saveDb(db);

  // Share card URL (real API endpoint)
  const shareCardUrl = walletAddress
    ? `https://baozi.bet/api/share/card?market=${call.marketPda}&wallet=${walletAddress}&ref=MELLOWAMBIENCE`
    : `https://baozi.bet/api/share/card?market=${call.marketPda}&ref=MELLOWAMBIENCE`;

  return { call, shareCardUrl };
}

/**
 * Get reputation for a caller
 */
export function getReputation(caller: string): CallerReputation | null {
  const db = loadDb();
  const calls = db.calls.filter((c) => c.caller === caller);
  if (calls.length === 0) return null;
  return calculateReputation(calls);
}

/**
 * Print the full reputation dashboard
 */
export function printDashboard(): void {
  const db = loadDb();
  if (db.calls.length === 0) {
    console.log("No calls registered yet.");
    return;
  }

  // Group by caller
  const callerMap = new Map<string, Call[]>();
  for (const call of db.calls) {
    const arr = callerMap.get(call.caller) ?? [];
    arr.push(call);
    callerMap.set(call.caller, arr);
  }

  // Sort by confidence score descending
  const reps = Array.from(callerMap.entries())
    .map(([, calls]) => calculateReputation(calls))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║    CALLS TRACKER — REPUTATION BOARD   ║");
  console.log("╚═══════════════════════════════════════╝");

  reps.forEach((rep, i) => {
    console.log(`\n  #${i + 1} ${formatReputation(rep)}`);
  });

  console.log(`\n  Total calls tracked: ${db.calls.length}`);
}

/**
 * Sync resolution status from on-chain for all pending calls
 */
export async function syncResolutions(): Promise<void> {
  const db = loadDb();
  let updated = 0;
  for (const call of db.calls) {
    if (call.status !== "created" || !call.marketPda) continue;
    const status = await fetchResolutionStatus(call.marketPda);
    if (status?.resolved) {
      call.status = "resolved";
      call.outcome = status.outcome === call.side ? "win" : "loss";
      updated++;
    }
  }
  if (updated > 0) {
    saveDb(db);
    console.log(`Synced ${updated} resolutions.`);
  }
}
