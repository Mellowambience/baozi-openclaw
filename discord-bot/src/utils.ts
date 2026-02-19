// Pure utility functions extracted for testability

export function formatOdds(yesPool: number, noPool: number): { yes: number; no: number } {
  const total = yesPool + noPool;
  if (total === 0) return { yes: 50, no: 50 };
  return { yes: (yesPool / total) * 100, no: (noPool / total) * 100 };
}

export function progressBar(pct: number, length: number = 15): string {
  const filled = Math.round((pct / 100) * length);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(length - filled);
}

export function timeUntil(timestamp: string | number): string {
  const ms = new Date(timestamp).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export function formatPool(sol: number): string {
  return sol < 0.01 ? '< 0.01 SOL' : `${sol.toFixed(2)} SOL`;
}
