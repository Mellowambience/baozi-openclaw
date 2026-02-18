import TelegramBot from 'node-telegram-bot-api';

const BAOZI_API = 'https://baozi.bet';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── Helpers ───

async function fetchMarkets(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params });
  // Use the MCP server's list_markets endpoint or direct API
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
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ─── Commands ───

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Market Bot*',
    '',
    'Browse Solana prediction markets from baozi.bet right here in Telegram.',
    '',
    '*Commands:*',
    '/markets — Top active markets',
    '/markets crypto — Filter by category',
    '/hot — Hottest markets (most volume)',
    '/closing — Markets closing soon',
    '/odds <marketId> — Detailed odds',
    '/help — This message',
    '',
    '_Read-only • Data from baozi.bet mainnet_',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '🥟 *Baozi Market Bot — Commands*',
    '',
    '/markets [category] — List active markets',
    '/hot — Highest volume markets (24h)',
    '/closing — Markets closing within 24h',
    '/odds <marketId> — Detailed odds for a market',
    '/help — Show this message',
    '',
    '*Categories:* crypto, sports, entertainment, politics, weather, technology',
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
      bot.sendMessage(chatId, category 
        ? `No active ${category} markets found.` 
        : 'No active markets found.');
      return;
    }

    const header = category 
      ? `📊 *Active ${escapeMarkdown(category)} Markets*` 
      : '📊 *Active Markets*';

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
    for (const m of markets) {
      text += `\n${buildMarketCard(m)}\n`;
    }

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
        return ms > 0 && ms < 86400000; // within 24h
      })
      .slice(0, 5);

    if (markets.length === 0) {
      bot.sendMessage(chatId, 'No markets closing within 24 hours.');
      return;
    }

    let text = '⏰ *Closing Soon (< 24h)*\n';
    for (const m of markets) {
      text += `\n${buildMarketCard(m)}\n`;
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${(err as Error).message}`);
  }
});

bot.onText(/\/odds\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const marketId = match?.[1]?.trim();

  if (!marketId) {
    bot.sendMessage(chatId, 'Usage: /odds <marketPda>');
    return;
  }

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
      const market = (markets.markets || markets || []).find(
        (m: any) => (m.publicKey || m.pda) === pda
      );

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

interface GroupConfig {
  chatId: number;
  hour: number;
  categories?: string[];
}

const groupConfigs: Map<number, GroupConfig> = new Map();

bot.onText(/\/setup\s+(\d{1,2}):?(\d{2})?/, (msg, match) => {
  const chatId = msg.chat.id;
  const hour = parseInt(match?.[1] || '9');

  if (hour < 0 || hour > 23) {
    bot.sendMessage(chatId, 'Hour must be 0-23. Example: /setup 09');
    return;
  }

  groupConfigs.set(chatId, { chatId, hour });
  bot.sendMessage(chatId, `✅ Daily roundup set for ${hour}:00 UTC in this chat.\nUse /subscribe crypto,sports to filter categories.`);
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
  bot.sendMessage(msg.chat.id, '✅ Daily roundup disabled for this chat.');
});

// Roundup cron (check every minute)
setInterval(async () => {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  if (minute !== 0) return; // Only fire on the hour

  for (const [chatId, config] of groupConfigs) {
    if (config.hour !== hour) continue;

    try {
      const data = await fetchMarkets({ status: 'Active', sort: 'volume', order: 'desc' });
      const markets = (data.markets || data || []).slice(0, 5);

      if (markets.length === 0) continue;

      let text = '🥟 *Daily Baozi Roundup*\n\n';
      text += '*Top Markets by Volume:*\n';

      for (let i = 0; i < markets.length; i++) {
        const m = markets[i];
        const odds = formatOdds(m.yesPool || 0, m.noPool || 0);
        const pool = formatPool((m.yesPool || 0) + (m.noPool || 0));
        text += `\n${i + 1}. ${escapeMarkdown(m.question || 'Unknown')}`;
        text += `\n   Yes ${odds.yes}% | No ${odds.no}% | ${pool}`;
      }

      text += '\n\n[Browse all markets](https://baozi.bet)';

      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`Roundup error for ${chatId}:`, err);
    }
  }
}, 60000);

console.log('🥟 Baozi Telegram Bot running...');
