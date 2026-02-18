import TelegramBot from 'node-telegram-bot-api';
import http from 'http';

const BAOZI_API = 'https://baozi.bet';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES || '15') * 60 * 1000;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ═══════════════════════════════════════════════════════════════
// API HELPERS (uses /api/markets — the actual public REST endpoint)
// ═══════════════════════════════════════════════════════════════

interface Market {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  outcome: string;
  yesPercent: number;
  noPercent: number;
  totalPoolSol: number;
  closingTime: string | null;
  resolutionTime: string | null;
  isBettingOpen: boolean;
  category: string | null;
  description: string | null;
  creator: string;
}

let marketCache: Market[] = [];
let lastCacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

async function fetchAllMarkets(): Promise<Market[]> {
  if (Date.now() - lastCacheTime < CACHE_TTL && marketCache.length > 0) {
    return marketCache;
  }
  const res = await fetch(`${BAOZI_API}/api/markets`, {
    headers: { 'User-Agent': 'BaoziTelegramBot/1.0' }
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  const binary = json?.data?.binary || [];
  const race = json?.data?.race || [];
  marketCache = [...binary, ...race];
  lastCacheTime = Date.now();
  return marketCache;
}

function getActiveMarkets(markets: Market[]): Market[] {
  return markets.filter(m => m.status === 'Active' || m.isBettingOpen);
}

function sortByVolume(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => (b.totalPoolSol || 0) - (a.totalPoolSol || 0));
}

function sortByClosing(markets: Market[]): Market[] {
  return [...markets]
    .filter(m => m.closingTime)
    .sort((a, b) => new Date(a.closingTime!).getTime() - new Date(b.closingTime!).getTime());
}

function filterByCategory(markets: Market[], category: string): Market[] {
  const cat = category.toLowerCase();
  return markets.filter(m => 
    (m.category && m.category.toLowerCase().includes(cat)) ||
    m.question.toLowerCase().includes(cat)
  );
}

// ─── Formatting ───

function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function formatPool(sol: number): string {
  if (sol === 0) return '0 SOL';
  return sol < 0.01 ? `${(sol * 1e9).toFixed(0)} lamports` : `${sol.toFixed(2)} SOL`;
}

function timeUntil(timestamp: string): string {
  const ms = new Date(timestamp).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function buildMarketCard(market: Market): string {
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

// ═══════════════════════════════════════════════════════════════
// MARKET BOT COMMANDS (Bounty #9)
// ═══════════════════════════════════════════════════════════════

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Markets \\+ Alert Agent*',
    '',
    'Browse Solana prediction markets and monitor your wallets\\.',
    '',
    '*Market Commands:*',
    '/markets — Top active markets',
    '/hot — Hottest markets \\(most volume\\)',
    '/closing — Closing within 24h',
    '/odds <marketId> — Market details',
    '',
    '*Alert Commands:*',
    '/watch <wallet> — Monitor a wallet',
    '/unwatch <wallet> — Stop monitoring',
    '/status — Monitored wallets',
    '/check <wallet> — Manual check',
    '',
    '/help — Full command list',
    '_Read\\-only · Data from baozi\\.bet mainnet_',
  ].join('\n'), { parse_mode: 'MarkdownV2' });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Bot — All Commands*',
    '',
    '*Markets:*',
    '/markets [keyword] — List active markets (optional filter)',
    '/hot — Highest volume markets',
    '/closing — Markets closing within 24h',
    '/odds <publicKey> — Detailed market view',
    '',
    '*Wallet Alerts:*',
    '/watch <wallet> — Start monitoring a Solana wallet',
    '/unwatch <wallet> — Stop monitoring',
    '/status — Show monitored wallets',
    '/check <wallet> — Run manual check',
    '/config — View alert settings',
    '',
    '*Group Features:*',
    '/setup <hour> — Daily roundup at UTC hour (0-23)',
    '/subscribe <topics> — Filter roundup by keyword',
    '/unsubscribe — Disable daily roundup',
    '',
    'Visit [baozi.bet](https://baozi.bet) to place bets!',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/markets\s*(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match?.[1]?.trim() || '';

  try {
    let markets = getActiveMarkets(await fetchAllMarkets());
    if (keyword) markets = filterByCategory(markets, keyword);
    markets = sortByVolume(markets).slice(0, 5);

    if (markets.length === 0) {
      bot.sendMessage(chatId, keyword ? `No active markets matching "${keyword}".` : 'No active markets found.');
      return;
    }

    const header = keyword ? `📊 *Active "${keyword}" Markets*` : '📊 *Active Markets*';

    for (let i = 0; i < markets.length; i++) {
      const card = buildMarketCard(markets[i]);
      const text = i === 0 ? `${header}\n\n${card}` : card;
      bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔗 View', url: `https://baozi.bet/market/${markets[i].publicKey}` },
            { text: '🔄 Refresh', callback_data: `r_${markets[i].publicKey.slice(0, 20)}` },
          ]],
        },
      });
    }
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/hot/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const markets = sortByVolume(getActiveMarkets(await fetchAllMarkets())).slice(0, 5);
    if (markets.length === 0) { bot.sendMessage(chatId, 'No active markets.'); return; }

    let text = '🔥 *Hottest Markets by Pool Size*\n';
    for (const m of markets) { text += `\n${buildMarketCard(m)}\n`; }
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/closing/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const allActive = getActiveMarkets(await fetchAllMarkets());
    const closingSoon = sortByClosing(allActive)
      .filter(m => {
        const ms = new Date(m.closingTime!).getTime() - Date.now();
        return ms > 0 && ms < 86400000;
      })
      .slice(0, 5);

    if (closingSoon.length === 0) { bot.sendMessage(chatId, 'No markets closing within 24 hours.'); return; }

    let text = '⏰ *Closing Soon (< 24h)*\n';
    for (const m of closingSoon) { text += `\n${buildMarketCard(m)}\n`; }
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/odds\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match?.[1]?.trim();
  if (!query) { bot.sendMessage(chatId, 'Usage: /odds <publicKey or keyword>'); return; }

  try {
    const all = await fetchAllMarkets();
    // Try exact match first, then keyword search
    let market = all.find(m => m.publicKey === query);
    if (!market) {
      const matches = all.filter(m => m.question.toLowerCase().includes(query.toLowerCase()));
      market = matches[0];
    }

    if (!market) { bot.sendMessage(chatId, `No market found for "${query}".`); return; }

    const closing = market.closingTime ? timeUntil(market.closingTime) : 'N/A';
    const text = [
      `📊 *Market Details*`,
      ``,
      `*${market.question}*`,
      ``,
      `PDA: \`${market.publicKey.slice(0, 8)}...${market.publicKey.slice(-4)}\``,
      `Status: ${market.status} | Layer: ${market.layer}`,
      ``,
      `Yes: ${market.yesPercent?.toFixed(1)}%`,
      `No: ${market.noPercent?.toFixed(1)}%`,
      `Total Pool: ${formatPool(market.totalPoolSol || 0)}`,
      ``,
      `Closes: ${closing}`,
      market.outcome !== 'Undecided' ? `Outcome: ${market.outcome}` : '',
      ``,
      `[View on Baozi](https://baozi.bet/market/${market.publicKey})`,
    ].filter(Boolean).join('\n');

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

// ─── Inline Callbacks ───

bot.on('callback_query', async (query) => {
  const data = query.data || '';
  if (data.startsWith('r_')) {
    const pdaPrefix = data.replace('r_', '');
    try {
      lastCacheTime = 0; // force refresh
      const all = await fetchAllMarkets();
      const market = all.find(m => m.publicKey.startsWith(pdaPrefix));
      if (market) {
        const card = buildMarketCard(market);
        await bot.editMessageText(card, {
          chat_id: query.message?.chat.id,
          message_id: query.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🔗 View', url: `https://baozi.bet/market/${market.publicKey}` },
              { text: '🔄 Refresh', callback_data: `r_${market.publicKey.slice(0, 20)}` },
            ]],
          },
        });
      }
      bot.answerCallbackQuery(query.id, { text: '✅ Updated!' });
    } catch {
      bot.answerCallbackQuery(query.id, { text: '❌ Error' });
    }
  }
});

// ─── Daily Roundup ───

interface GroupConfig { chatId: number; hour: number; keywords?: string[]; }
const groupConfigs: Map<number, GroupConfig> = new Map();

bot.onText(/\/setup\s+(\d{1,2})/, (msg, match) => {
  const chatId = msg.chat.id;
  const hour = parseInt(match?.[1] || '9');
  if (hour < 0 || hour > 23) { bot.sendMessage(chatId, 'Hour must be 0-23.'); return; }
  groupConfigs.set(chatId, { chatId, hour });
  bot.sendMessage(chatId, `✅ Daily roundup at ${hour}:00 UTC.\n/subscribe crypto,sports to filter.`);
});

bot.onText(/\/subscribe\s+(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const keywords = match?.[1]?.split(',').map(c => c.trim()) || [];
  const config = groupConfigs.get(chatId) || { chatId, hour: 9 };
  config.keywords = keywords;
  groupConfigs.set(chatId, config);
  bot.sendMessage(chatId, `✅ Subscribed: ${keywords.join(', ')}`);
});

bot.onText(/\/unsubscribe/, (msg) => {
  groupConfigs.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '✅ Roundup disabled.');
});

setInterval(async () => {
  const now = new Date();
  if (now.getUTCMinutes() !== 0) return;
  for (const [chatId, config] of groupConfigs) {
    if (config.hour !== now.getUTCHours()) continue;
    try {
      const markets = sortByVolume(getActiveMarkets(await fetchAllMarkets())).slice(0, 5);
      if (markets.length === 0) continue;
      let text = '🥟 *Daily Baozi Roundup*\n\n*Top Markets by Volume:*\n';
      for (let i = 0; i < markets.length; i++) {
        const m = markets[i];
        text += `\n${i + 1}. ${m.question}`;
        text += `\n   Yes ${m.yesPercent?.toFixed(1)}% | No ${m.noPercent?.toFixed(1)}% | ${formatPool(m.totalPoolSol)}`;
      }
      text += '\n\n[Browse all markets](https://baozi.bet)';
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) { console.error(`Roundup error:`, err); }
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════
// CLAIM & ALERT AGENT (Bounty #11)
// Uses /api/markets for market info, client-side position filtering
// ═══════════════════════════════════════════════════════════════

interface WalletConfig {
  address: string;
  chatId: number;
  alerts: {
    claimable: boolean;
    closingSoon: boolean;
    closingSoonHours: number;
    oddsShift: boolean;
    oddsShiftThreshold: number;
  };
}

interface OddsSnapshot { yesPercent: number; noPercent: number; }

const watchlist: Map<string, WalletConfig> = new Map();
const oddsHistory: Map<string, Map<string, OddsSnapshot>> = new Map(); // wallet -> (marketPda -> snapshot)

async function checkWallet(config: WalletConfig) {
  const { address, chatId, alerts } = config;
  const messages: string[] = [];

  try {
    const allMarkets = await fetchAllMarkets();
    const marketMap = new Map(allMarkets.map(m => [m.publicKey, m]));

    // Check all resolved markets for potential claims
    if (alerts.claimable) {
      const resolved = allMarkets.filter(m => m.status === 'Resolved' && m.outcome !== 'Undecided');
      if (resolved.length > 0) {
        messages.push(
          `💰 *${resolved.length} resolved market${resolved.length > 1 ? 's' : ''}*\n` +
          `Check [My Bets](https://baozi.bet/my-bets) for unclaimed winnings.`
        );
      }
    }

    // Check closing-soon markets
    if (alerts.closingSoon) {
      const closingSoon = getActiveMarkets(allMarkets).filter(m => {
        if (!m.closingTime) return false;
        const hrs = (new Date(m.closingTime).getTime() - Date.now()) / 3600000;
        return hrs > 0 && hrs <= alerts.closingSoonHours;
      });

      for (const m of closingSoon.slice(0, 3)) {
        const hrs = (new Date(m.closingTime!).getTime() - Date.now()) / 3600000;
        messages.push(
          `⏰ *Closing Soon!*\n"${m.question}" closes in ${hrs.toFixed(1)}h.\n` +
          `Yes ${m.yesPercent?.toFixed(1)}% | No ${m.noPercent?.toFixed(1)}%\n` +
          `[View market](https://baozi.bet/market/${m.publicKey})`
        );
      }
    }

    // Check odds shifts
    if (alerts.oddsShift) {
      const walletSnaps = oddsHistory.get(address) || new Map();
      const active = getActiveMarkets(allMarkets);

      for (const m of active) {
        const prev = walletSnaps.get(m.publicKey);
        if (prev) {
          const yesShift = Math.abs((m.yesPercent || 50) - prev.yesPercent);
          if (yesShift >= alerts.oddsShiftThreshold) {
            const dir = (m.yesPercent || 50) > prev.yesPercent ? '⬆️' : '⬇️';
            messages.push(
              `${dir} *Odds Shift!*\n"${m.question}"\n` +
              `Yes: ${prev.yesPercent.toFixed(1)}% → ${m.yesPercent?.toFixed(1)}% (${yesShift > 0 ? '+' : ''}${((m.yesPercent || 50) - prev.yesPercent).toFixed(1)}%)\n` +
              `[View market](https://baozi.bet/market/${m.publicKey})`
            );
          }
        }
        walletSnaps.set(m.publicKey, { yesPercent: m.yesPercent || 50, noPercent: m.noPercent || 50 });
      }
      oddsHistory.set(address, walletSnaps);
    }
  } catch (err) {
    console.error(`Error checking wallet ${address.slice(0, 8)}...:`, err);
  }

  for (const msg of messages) {
    try {
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
      await new Promise(r => setTimeout(r, 500));
    } catch (err) { console.error(`Send error:`, err); }
  }
  return messages.length;
}

// ─── Alert Commands ───

bot.onText(/\/watch\s+([A-Za-z0-9]{32,44})/, (msg, match) => {
  const wallet = match?.[1] || '';
  const chatId = msg.chat.id;
  watchlist.set(wallet, {
    address: wallet, chatId,
    alerts: { claimable: true, closingSoon: true, closingSoonHours: 6, oddsShift: true, oddsShiftThreshold: 15 },
  });
  bot.sendMessage(chatId, [
    `✅ Monitoring \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``,
    '', `Alerts: claimable ✅, closing <6h ✅, odds shift >15% ✅`,
    `Polling every ${POLL_INTERVAL / 60000} min.`,
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/unwatch\s+([A-Za-z0-9]{32,44})/, (msg, match) => {
  const wallet = match?.[1] || '';
  watchlist.delete(wallet);
  oddsHistory.delete(wallet);
  bot.sendMessage(msg.chat.id, `✅ Stopped \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``);
});

bot.onText(/\/status/, (msg) => {
  if (watchlist.size === 0) {
    bot.sendMessage(msg.chat.id, 'No wallets monitored. /watch <wallet> to start.');
    return;
  }
  const lines = Array.from(watchlist.values()).map(w => `• \`${w.address.slice(0, 6)}...${w.address.slice(-4)}\``);
  bot.sendMessage(msg.chat.id, `*Monitored Wallets:*\n${lines.join('\n')}\n\nPolling every ${POLL_INTERVAL / 60000} min.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/check\s+([A-Za-z0-9]{32,44})/, async (msg, match) => {
  const wallet = match?.[1] || '';
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🔍 Checking \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\`...`);
  const config: WalletConfig = watchlist.get(wallet) || {
    address: wallet, chatId,
    alerts: { claimable: true, closingSoon: true, closingSoonHours: 24, oddsShift: true, oddsShiftThreshold: 10 },
  };
  config.chatId = chatId;
  const count = await checkWallet(config);
  if (count === 0) bot.sendMessage(chatId, '✅ All quiet. No alerts for this wallet.');
});

bot.onText(/\/config/, (msg) => {
  const chatId = msg.chat.id;
  const configs = Array.from(watchlist.values()).filter(w => w.chatId === chatId);
  if (configs.length === 0) { bot.sendMessage(chatId, 'No wallets here. /watch <wallet> first.'); return; }
  for (const c of configs) {
    bot.sendMessage(chatId, [
      `*\`${c.address.slice(0, 6)}...${c.address.slice(-4)}\`*`,
      `Claimable: ${c.alerts.claimable ? '✅' : '❌'}`,
      `Closing soon: ${c.alerts.closingSoon ? '✅' : '❌'} (${c.alerts.closingSoonHours}h)`,
      `Odds shift: ${c.alerts.oddsShift ? '✅' : '❌'} (${c.alerts.oddsShiftThreshold}%)`,
    ].join('\n'), { parse_mode: 'Markdown' });
  }
});

// ─── Polling Loop ───

async function pollAll() {
  for (const config of watchlist.values()) {
    await checkWallet(config);
    await new Promise(r => setTimeout(r, 2000));
  }
}

setInterval(pollAll, POLL_INTERVAL);

// ═══════════════════════════════════════════════════════════════


// ─── Health Check HTTP Server (for Render Web Service free tier) ───
const PORT = parseInt(process.env.PORT || '10000');
http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'baozi-telegram-bot', uptime: process.uptime() }));
}).listen(PORT, () => console.log(`   Health check: http://0.0.0.0:${PORT}`));

console.log('🥟 Baozi Unified Bot running (Markets + Alerts)');
console.log(`   API: ${BAOZI_API}/api/markets`);
console.log(`   Alert polling: every ${POLL_INTERVAL / 60000} min`);
