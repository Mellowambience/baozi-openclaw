// Pure utility functions extracted for testability

export interface Market {
  publicKey?: string;
  question: string;
  status?: string;
  isBettingOpen?: boolean;
  totalPoolSol?: number;
  closingTime?: string;
  yesPercent?: number;
  noPercent?: number;
  category?: string;
  layer?: string;
  yesPool?: number;
  noPool?: number;
}

export function getActiveMarkets(markets: Market[]): Market[] {
  return markets.filter(m => m.status === 'Active' || m.isBettingOpen);
}

export function sortByVolume(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => (b.totalPoolSol || 0) - (a.totalPoolSol || 0));
}

export function sortByClosing(markets: Market[]): Market[] {
  return [...markets]
    .filter(m => m.closingTime)
    .sort((a, b) => new Date(a.closingTime!).getTime() - new Date(b.closingTime!).getTime());
}

export function filterByCategory(markets: Market[], category: string): Market[] {
  const cat = category.toLowerCase();
  return markets.filter(m =>
    (m.category && m.category.toLowerCase().includes(cat)) ||
    m.question.toLowerCase().includes(cat)
  );
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function formatPool(sol: number): string {
  if (sol === 0) return '0 SOL';
  return sol < 0.01 ? `${(sol * 1e9).toFixed(0)} lamports` : `${sol.toFixed(2)} SOL`;
}

export function timeUntil(timestamp: string): string {
  const ms = new Date(timestamp).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function buildMarketCard(market: Market): string {
  const closing = market.closingTime ? timeUntil(market.closingTime) : 'N/A';
  const pda = market.publicKey || '';

  return [
    `📊 *${escapeMarkdown(market.question || 'Unknown')}*`,
    ``,
    `Yes: ${market.yesPercent?.toFixed(1) || '50.0'}% | No: ${market.noPercent?.toFixed(1) || '50.0'}%`,
    `Pool: ${formatPool(market.totalPoolSol || 0)}`,
    `Closes: ${closing} | ${market.layer || 'Lab'}`,
    ``,
    `[View on Baozi](https://baozi.bet/market/${pda})`,
  ].join('\n');
}
