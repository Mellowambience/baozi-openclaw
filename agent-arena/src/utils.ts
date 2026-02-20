import { AgentStats, Position, MarketState } from "./types";

const BAOZI_API = "https://baozi.bet/api";

export function formatOdds(odds: number): string {
  return `${(odds * 100).toFixed(1)}%`;
}

export function progressBar(ratio: number, width: number = 20): string {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
}

export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toFixed(3)} SOL`;
}

export function formatSol(amount: number): string {
  return `${amount.toFixed(3)} SOL`;
}

export function timeUntil(isoString: string): string {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms < 0) return "closed";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function fetchAgentProfile(wallet: string): Promise<{ name: string; avatar?: string }> {
  try {
    const res = await fetch(`${BAOZI_API}/agents/profile/${wallet}`);
    if (!res.ok) return { name: wallet.slice(0, 8) + "..." };
    const d = (await res.json()) as any;
    return { name: d?.name ?? wallet.slice(0, 8) + "...", avatar: d?.avatar };
  } catch {
    return { name: wallet.slice(0, 8) + "..." };
  }
}

export async function fetchActiveMarkets(): Promise<any[]> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/list_markets?status=Active`);
    if (!res.ok) return [];
    const d = (await res.json()) as any;
    return d?.markets ?? d?.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchPositions(wallet: string): Promise<any[]> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/get_positions?wallet=${wallet}`);
    if (!res.ok) return [];
    const d = (await res.json()) as any;
    return d?.positions ?? d?.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchMarket(pda: string): Promise<any | null> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/get_market?market=${pda}`);
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

export async function fetchQuote(pda: string, side: string, amount: number): Promise<number> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/get_quote?market=${pda}&side=${side}&amount=${amount}`);
    if (!res.ok) return 0.5;
    const d = (await res.json()) as any;
    return d?.impliedOdds ?? d?.odds ?? 0.5;
  } catch {
    return 0.5;
  }
}
