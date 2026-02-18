import TelegramBot from 'node-telegram-bot-api';

const BAOZI_API = 'https://baozi.bet';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES || '15') * 60 * 1000;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ═══════════════════════════════════════════════════════════════
// MARKET BOT SECTION (Bounty #9)
// ═══════════════════════════════════════════════════════════════

async function fetchMarkets(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params });
  const res = await fetch(`${BAOZI_API}/api/mcp/list_markets?${qs}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchQuote(marketPda: string, side: string = 'Yes', amount: number = 1.0) {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_quote?market=${marketPda}&side=${side}&amount=${amount}`);
  if (!res.ok) throw new Error(`Quote error: ${res.status}`);
  return res.json();
}

function formatOdds(yesPool: number, noPool: number): { yes: string; no: string } {
  const total = yesPool + noPool;
  if (total === 0) return { yes: '50.0', no: '50.0' };
  return {
    yes: ((yesPool / total) * 100).toFixed(1),
    no: ((noPool / total) * 100).toFixed(1),
  };
}

function formatPool(sol: number): string {
  return sol < 1 ? `${(sol * 1000).toFixed(0)} lamports` : `${sol.toFixed(2)} SOL`;
}

function timeUntil(timestamp: string | number): string {
  const ms = new Date(timestamp).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function buildMarketCard(market: any): string {
  const odds = formatOdds(market.yesPool || 0, market.noPool || 0);
  const pool = formatPool((market.yesPool || 0) + (market.noPool || 0));
  const closing = market.closingTime ? timeUntil(market.closingTime) : 'N/A';
  const layer = market.layer === 0 ? 'Official' : market.layer === 1 ? 'Lab' : 'Private';

  return [
    `📊 *${escapeMarkdown(market.question || 'Unknown')}*`,
    ``,
    `Yes: ${odds.yes}% | No: ${odds.no}%`,
    `Pool: ${pool}`,
    `Closes: ${closing}`,
    `Layer: ${layer}`,
    ``,
    `[View on Baozi](https://baozi.bet/market/${market.publicKey || market.pda || ''})`,
  ].join('\n');
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*\\[\\]()~`>#+\\-=|{}.!]/g, '\\$&');
}

// ─── Market Commands ───

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Markets + Alert Agent*',
    '',
    'Browse Solana prediction markets and monitor your wallets.',
    '',
    '*Market Commands:*',
    '/markets — Top active markets',
    '/markets crypto — Filter by category',
    '/hot — Hottest markets (most volume)',
    '/closing — Markets closing soon',
    '/odds <marketId> — Detailed odds',
    '',
    '*Alert Commands:*',
    '/watch <wallet> — Monitor a wallet',
    '/unwatch <wallet> — Stop monitoring',
    '/status — Show monitored wallets',
    '/check <wallet> — Manual check now',
    '/config — View/edit alert settings',
    '',
    '/help — Full command list',
    '',
    '_Read-only • Data from baozi.bet mainnet_',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Bot — All Commands*',
    '',
    '*Markets:*',
    '/markets [category] — List active markets',
    '/hot — Highest volume markets (24h)',
    '/closing — Markets closing within 24h',
    '/odds <marketId> — Detailed odds for a market',
    '',
    '*Categories:* crypto, sports, entertainment, politics, weather, technology',
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
    '/subscribe <cats> — Filter roundup categories',
    '/unsubscribe — Disable daily roundup',
    '',
    '[Visit Baozi](https://baozi.bet) to place bets!',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/markets\s*(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const category = match?.[1]?.trim() || '';

  try {
    const params: Record<string, string> = { layer: 'all', status: 'Active' };
    if (category) params.category = category;

    const data = await fetchMarkets(params);
    const markets = (data.markets || data || []).slice(0, 5);

    if (markets.length === 0) {
      bot.sendMessage(chatId, category ? `No active ${category} markets found.` : 'No active markets found.');
      return;
    }

    const header = category ? `📊 *Active ${escapeMarkdown(category)} Markets*` : '📊 *Active Markets*';

    for (let i = 0; i < markets.length; i++) {
      const card = buildMarketCard(markets[i]);
      const text = i === 0 ? `${header}\n\n${card}` : card;

      bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔗 View Market', url: `https://baozi.bet/market/${markets[i].publicKey || markets[i].pda || ''}` },
            { text: '🔄 Refresh', callback_data: `refresh_${markets[i].publicKey || markets[i].pda || ''}` },
          ]],
        },
      });
    }
  } catch (err) {
    bot.sendMessage(chatId, `Error fetching markets: ${(err as Error).message}`);
  }
});

bot.onText(/\/hot/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const data = await fetchMarkets({ status: 'Active', sort: 'volume', order: 'desc' });
    const markets = (data.markets || data || []).slice(0, 5);

    if (markets.length === 0) {
      bot.sendMessage(chatId, 'No hot markets right now.');
      return;
    }

    let text = '🔥 *Hottest Markets*\n';
    for (const m of markets) { text += `\n${buildMarketCard(m)}\n`; }
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/closing/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const data = await fetchMarkets({ status: 'Active', sort: 'closing', order: 'asc' });
    const markets = (data.markets || data || [])
      .filter((m: any) => {
        if (!m.closingTime) return false;
        const ms = new Date(m.closingTime).getTime() - Date.now();
        return ms > 0 && ms < 86400000;
      })
      .slice(0, 5);

    if (markets.length === 0) {
      bot.sendMessage(chatId, 'No markets closing within 24 hours.');
      return;
    }

    let text = '⏰ *Closing Soon (< 24h)*\n';
    for (const m of markets) { text += `\n${buildMarketCard(m)}\n`; }
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/odds\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const marketId = match?.[1]?.trim();

  if (!marketId) { bot.sendMessage(chatId, 'Usage: /odds <marketPda>'); return; }

  try {
    const [yesQuote, noQuote] = await Promise.all([
      fetchQuote(marketId, 'Yes', 1.0),
      fetchQuote(marketId, 'No', 1.0),
    ]);

    const text = [
      `📊 *Market Odds*`,
      ``,
      `PDA: \`${marketId.slice(0, 8)}...${marketId.slice(-4)}\``,
      ``,
      `*1 SOL bets:*`,
      `Yes → Expected payout: ${yesQuote.expected_payout?.toFixed(3) || 'N/A'} SOL`,
      `No  → Expected payout: ${noQuote.expected_payout?.toFixed(3) || 'N/A'} SOL`,
      ``,
      `Implied Yes: ${yesQuote.implied_odds ? (yesQuote.implied_odds * 100).toFixed(1) : 'N/A'}%`,
      `Implied No: ${noQuote.implied_odds ? (noQuote.implied_odds * 100).toFixed(1) : 'N/A'}%`,
      ``,
      `[View on Baozi](https://baozi.bet/market/${marketId})`,
    ].join('\n');

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error fetching odds: ${(err as Error).message}`);
  }
});

// ─── Inline Keyboard Callbacks ───

bot.on('callback_query', async (query) => {
  const data = query.data || '';
  if (data.startsWith('refresh_')) {
    const pda = data.replace('refresh_', '');
    try {
      const markets = await fetchMarkets({ status: 'Active' });
      const market = (markets.markets || markets || []).find((m: any) => (m.publicKey || m.pda) === pda);
      if (market) {
        const card = buildMarketCard(market);
        await bot.editMessageText(card, {
          chat_id: query.message?.chat.id,
          message_id: query.message?.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🔗 View Market', url: `https://baozi.bet/market/${pda}` },
              { text: '🔄 Refresh', callback_data: `refresh_${pda}` },
            ]],
          },
        });
      }
      bot.answerCallbackQuery(query.id, { text: 'Updated!' });
    } catch {
      bot.answerCallbackQuery(query.id, { text: 'Error refreshing' });
    }
  }
});

// ─── Daily Roundup ───

interface GroupConfig { chatId: number; hour: number; categories?: string[]; }
const groupConfigs: Map<number, GroupConfig> = new Map();

bot.onText(/\/setup\s+(\d{1,2}):?(\d{2})?/, (msg, match) => {
  const chatId = msg.chat.id;
  const hour = parseInt(match?.[1] || '9');
  if (hour < 0 || hour > 23) { bot.sendMessage(chatId, 'Hour must be 0-23.'); return; }
  groupConfigs.set(chatId, { chatId, hour });
  bot.sendMessage(chatId, `✅ Daily roundup set for ${hour}:00 UTC.\nUse /subscribe crypto,sports to filter.`);
});

bot.onText(/\/subscribe\s+(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const categories = match?.[1]?.split(',').map(c => c.trim()) || [];
  const config = groupConfigs.get(chatId) || { chatId, hour: 9 };
  config.categories = categories;
  groupConfigs.set(chatId, config);
  bot.sendMessage(chatId, `✅ Subscribed to: ${categories.join(', ')}`);
});

bot.onText(/\/unsubscribe/, (msg) => {
  groupConfigs.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '✅ Daily roundup disabled.');
});

setInterval(async () => {
  const now = new Date();
  if (now.getUTCMinutes() !== 0) return;
  for (const [chatId, config] of groupConfigs) {
    if (config.hour !== now.getUTCHours()) continue;
    try {
      const data = await fetchMarkets({ status: 'Active', sort: 'volume', order: 'desc' });
      const markets = (data.markets || data || []).slice(0, 5);
      if (markets.length === 0) continue;
      let text = '🥟 *Daily Baozi Roundup*\n\n*Top Markets by Volume:*\n';
      for (let i = 0; i < markets.length; i++) {
        const m = markets[i];
        const odds = formatOdds(m.yesPool || 0, m.noPool || 0);
        const pool = formatPool((m.yesPool || 0) + (m.noPool || 0));
        text += `\n${i + 1}. ${escapeMarkdown(m.question || 'Unknown')}`;
        text += `\n   Yes ${odds.yes}% | No ${odds.no}% | ${pool}`;
      }
      text += '\n\n[Browse all markets](https://baozi.bet)';
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) { console.error(`Roundup error for ${chatId}:`, err); }
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════
// CLAIM & ALERT AGENT SECTION (Bounty #11)
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

interface MarketSnapshot {
  pda: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  status: string;
  closingTime?: string;
}

const watchlist: Map<string, WalletConfig> = new Map();
const previousSnapshots: Map<string, Map<string, MarketSnapshot>> = new Map();

async function getPositions(wallet: string) {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_positions?wallet=${wallet}`);
  if (!res.ok) throw new Error(`Positions error: ${res.status}`);
  return res.json();
}

async function getClaimable(wallet: string) {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_claimable?wallet=${wallet}`);
  if (!res.ok) throw new Error(`Claimable error: ${res.status}`);
  return res.json();
}

async function getResolutionStatus(marketPda: string) {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_resolution_status?market=${marketPda}`);
  if (!res.ok) throw new Error(`Resolution error: ${res.status}`);
  return res.json();
}

async function getQuote(marketPda: string, side: string) {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_quote?market=${marketPda}&side=${side}&amount=1`);
  if (!res.ok) return null;
  return res.json();
}

async function checkWallet(config: WalletConfig) {
  const { address, chatId, alerts } = config;
  const messages: string[] = [];

  try {
    if (alerts.claimable) {
      const claimable = await getClaimable(address);
      const items = claimable.claimable || claimable || [];
      const totalClaimable = Array.isArray(items) ? items.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) : 0;
      if (totalClaimable > 0) {
        const count = Array.isArray(items) ? items.length : 0;
        messages.push(`💰 *Unclaimed Winnings!*\nYou have ${totalClaimable.toFixed(3)} SOL unclaimed across ${count} market${count !== 1 ? 's' : ''}.\n[Claim at baozi.bet](https://baozi.bet/my-bets)`);
      }
    }

    const posData = await getPositions(address);
    const positions = posData.positions || posData || [];

    for (const pos of positions) {
      const pda = pos.marketPda || pos.pda || '';
      const question = pos.question || 'Unknown market';
      const side = pos.side || 'Yes';
      const amount = pos.amount || 0;

      if (alerts.closingSoon && pos.closingTime) {
        const msUntilClose = new Date(pos.closingTime).getTime() - Date.now();
        const hoursUntilClose = msUntilClose / 3600000;
        if (hoursUntilClose > 0 && hoursUntilClose <= alerts.closingSoonHours) {
          messages.push(`⏰ *Closing Soon!*\n"${question}" closes in ${hoursUntilClose.toFixed(1)}h.\nYour position: ${amount.toFixed(2)} SOL on ${side}\n[View market](https://baozi.bet/market/${pda})`);
        }
      }

      if (alerts.oddsShift) {
        const quote = await getQuote(pda, 'Yes');
        if (quote?.implied_odds != null) {
          const currentOdds = quote.implied_odds * 100;
          const walletSnapshots = previousSnapshots.get(address) || new Map();
          const prev = walletSnapshots.get(pda);
          if (prev) {
            const prevOdds = side === 'Yes' ? prev.yesOdds : prev.noOdds;
            const shift = Math.abs(currentOdds - prevOdds);
            if (shift >= alerts.oddsShiftThreshold) {
              const direction = currentOdds > prevOdds ? '⬆️' : '⬇️';
              messages.push(`${direction} *Odds Shift!*\n"${question}"\nYes: ${prevOdds.toFixed(1)}% → ${currentOdds.toFixed(1)}% (${currentOdds - prevOdds > 0 ? '+' : ''}${(currentOdds - prevOdds).toFixed(1)}%)\nYour position: ${amount.toFixed(2)} SOL on ${side}\n[View market](https://baozi.bet/market/${pda})`);
            }
          }
          walletSnapshots.set(pda, { pda, question, yesOdds: currentOdds, noOdds: 100 - currentOdds, status: pos.status || 'Active', closingTime: pos.closingTime });
          previousSnapshots.set(address, walletSnapshots);
        }
      }
    }

    for (const pos of positions) {
      if (pos.status === 'Resolved' || pos.status === 'ResolvedPending') {
        const pda = pos.marketPda || pos.pda || '';
        try {
          const resolution = await getResolutionStatus(pda);
          const won = (resolution.outcome === 'Yes' && pos.side === 'Yes') || (resolution.outcome === 'No' && pos.side === 'No');
          messages.push(`🏁 *Market Resolved!*\n"${pos.question || 'Unknown'}" resolved ${resolution.outcome || 'Unknown'}.\n${won ? '🎉 You won!' : '😞 You lost.'} Position: ${(pos.amount || 0).toFixed(2)} SOL on ${pos.side}.\n${won ? '[Claim winnings](https://baozi.bet/my-bets)' : ''}`);
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    console.error(`Error checking wallet ${address.slice(0, 8)}...:`, err);
  }

  for (const msg of messages) {
    try {
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
      await new Promise(r => setTimeout(r, 500));
    } catch (err) { console.error(`Error sending alert to ${chatId}:`, err); }
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
    `✅ Now monitoring \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``,
    '', 'Default alerts: claimable ✅, closing soon ✅ (6h), odds shift ✅ (15%)',
    `Polling every ${POLL_INTERVAL / 60000} minutes.`, '', 'Use /config to customize.',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/unwatch\s+([A-Za-z0-9]{32,44})/, (msg, match) => {
  const wallet = match?.[1] || '';
  watchlist.delete(wallet);
  previousSnapshots.delete(wallet);
  bot.sendMessage(msg.chat.id, `✅ Stopped monitoring \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``);
});

bot.onText(/\/status/, (msg) => {
  if (watchlist.size === 0) {
    bot.sendMessage(msg.chat.id, 'No wallets being monitored. Use /watch <wallet> to start.');
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
  if (count === 0) { bot.sendMessage(chatId, '✅ All good! No alerts for this wallet right now.'); }
});

bot.onText(/\/config/, (msg) => {
  const chatId = msg.chat.id;
  const configs = Array.from(watchlist.values()).filter(w => w.chatId === chatId);
  if (configs.length === 0) {
    bot.sendMessage(chatId, 'No wallets monitored in this chat. Use /watch <wallet> first.');
    return;
  }
  for (const config of configs) {
    bot.sendMessage(chatId, [
      `*Config for \`${config.address.slice(0, 6)}...${config.address.slice(-4)}\`*`,
      `Claimable alerts: ${config.alerts.claimable ? '✅' : '❌'}`,
      `Closing soon: ${config.alerts.closingSoon ? '✅' : '❌'} (${config.alerts.closingSoonHours}h)`,
      `Odds shift: ${config.alerts.oddsShift ? '✅' : '❌'} (${config.alerts.oddsShiftThreshold}% threshold)`,
      '', 'Adjust via /watch <wallet> (re-register).',
    ].join('\n'), { parse_mode: 'Markdown' });
  }
});

// ─── Alert Polling Loop ───

async function pollAll() {
  let totalAlerts = 0;
  for (const config of watchlist.values()) {
    totalAlerts += await checkWallet(config);
    await new Promise(r => setTimeout(r, 2000));
  }
  if (totalAlerts > 0) {
    console.log(`[${new Date().toISOString()}] Sent ${totalAlerts} alerts across ${watchlist.size} wallets`);
  }
}

setInterval(pollAll, POLL_INTERVAL);

// ═══════════════════════════════════════════════════════════════

console.log('🥟 Baozi Unified Bot running (Markets + Alerts)...');
