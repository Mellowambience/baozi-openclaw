import TelegramBot from 'node-telegram-bot-api';

const BAOZI_API = 'https://baozi.bet';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES || '15') * 60 * 1000;

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

// State
const watchlist: Map<string, WalletConfig> = new Map();
const previousSnapshots: Map<string, Map<string, MarketSnapshot>> = new Map();
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ─── API ───

async function getPositions(wallet: string): Promise<any> {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_positions?wallet=${wallet}`);
  if (!res.ok) throw new Error(`Positions error: ${res.status}`);
  return res.json();
}

async function getClaimable(wallet: string): Promise<any> {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_claimable?wallet=${wallet}`);
  if (!res.ok) throw new Error(`Claimable error: ${res.status}`);
  return res.json();
}

async function getResolutionStatus(marketPda: string): Promise<any> {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_resolution_status?market=${marketPda}`);
  if (!res.ok) throw new Error(`Resolution error: ${res.status}`);
  return res.json();
}

async function getQuote(marketPda: string, side: string): Promise<any> {
  const res = await fetch(`${BAOZI_API}/api/mcp/get_quote?market=${marketPda}&side=${side}&amount=1`);
  if (!res.ok) return null;
  return res.json();
}

// ─── Alert Logic ───

async function checkWallet(config: WalletConfig): Promise<number> {
  const { address, chatId, alerts } = config;
  const messages: string[] = [];

  try {
    // 1. Check claimable winnings
    if (alerts.claimable) {
      const claimable = await getClaimable(address);
      const items = claimable.claimable || claimable || [];
      const totalClaimable = Array.isArray(items) 
        ? items.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) 
        : 0;

      if (totalClaimable > 0) {
        const count = Array.isArray(items) ? items.length : 0;
        messages.push(
          `\ud83d\udcb0 *Unclaimed Winnings!*\n` +
          `You have ${totalClaimable.toFixed(3)} SOL unclaimed across ${count} market${count !== 1 ? 's' : ''}.\n` +
          `[Claim at baozi.bet](https://baozi.bet/my-bets)`
        );
      }
    }

    // 2. Check positions for closing soon + odds shifts
    const posData = await getPositions(address);
    const positions = posData.positions || posData || [];

    for (const pos of positions) {
      const pda = pos.marketPda || pos.pda || '';
      const question = pos.question || 'Unknown market';
      const side = pos.side || 'Yes';
      const amount = pos.amount || 0;

      // Closing soon
      if (alerts.closingSoon && pos.closingTime) {
        const ms = new Date(pos.closingTime).getTime() - Date.now();
        const hoursLeft = ms / 3600000;
        if (hoursLeft > 0 && hoursLeft < alerts.closingSoonHours) {
          messages.push(
            `\u23f0 *Closing Soon!*\n` +
            `"${question}" closes in ${hoursLeft.toFixed(1)}h.\n` +
            `Your ${side} position: ${amount.toFixed(2)} SOL\n` +
            `[View market](https://baozi.bet/market/${pda})`
          );
        }
      }

      // Odds shift
      if (alerts.oddsShift) {
        const quote = await getQuote(pda, 'Yes');
        if (quote?.implied_odds != null) {
          const currentOdds = quote.implied_odds * 100;
          const walletSnapshots = previousSnapshots.get(address) || new Map();
          const prev = walletSnapshots.get(pda);

          if (prev) {
            const shift = Math.abs(currentOdds - prev.yesOdds);
            if (shift >= alerts.oddsShiftThreshold) {
              const direction = currentOdds > prev.yesOdds ? '\u2b06\ufe0f' : '\u2b07\ufe0f';
              messages.push(
                `${direction} *Odds Shift Alert!*\n` +
                `"${question}"\n` +
                `Yes odds: ${prev.yesOdds.toFixed(1)}% → ${currentOdds.toFixed(1)}% (${shift > 0 ? '+' : ''}${(currentOdds - prev.yesOdds).toFixed(1)}%)\n` +
                `[View market](https://baozi.bet/market/${pda})`
              );
            }
          }

          // Update snapshot
          const snapshots = previousSnapshots.get(address) || new Map<string, MarketSnapshot>();
          snapshots.set(pda, {
            pda,
            question,
            yesOdds: currentOdds,
            noOdds: 100 - currentOdds,
            status: pos.status || 'Active',
            closingTime: pos.closingTime,
          });
          previousSnapshots.set(address, snapshots);
        }
      }

      // Check if resolved
      if (pos.status === 'Resolved' || pos.status === 'Closed') {
        try {
          const resolution = await getResolutionStatus(pda);
          const won = (resolution.outcome === 'Yes' && pos.side === 'Yes') ||
                      (resolution.outcome === 'No' && pos.side === 'No');

          messages.push(
            `\ud83c\udfc1 *Market Resolved!*\n` +
            `"${pos.question || 'Unknown'}" resolved ${resolution.outcome || 'Unknown'}.\n` +
            `${won ? '\ud83c\udf89 You won!' : '\ud83d\ude1e You lost.'} Position: ${(pos.amount || 0).toFixed(2)} SOL on ${pos.side}.\n` +
            (won ? `[Claim winnings](https://baozi.bet/my-bets)` : '')
          );
        } catch {
          // Resolution check failed, skip
        }
      }
    }
  } catch (err) {
    console.error(`[${address.slice(0, 6)}] Alert check error:`, err);
  }

  // Send all messages
  for (const msg of messages) {
    await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  }

  return messages.length;
}

// ─── Bot Commands ───

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `\ud83e\udd5f *Baozi Claim & Alert Agent*\n\n` +
    `Monitor your Baozi prediction market positions.\n\n` +
    `*Commands:*\n` +
    `/watch <wallet> — Start monitoring a wallet\n` +
    `/unwatch <wallet> — Stop monitoring\n` +
    `/check <wallet> — Immediate check\n` +
    `/config — Show current alert config`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/watch (.+)/, (msg, match) => {
  const wallet = match?.[1]?.trim() || '';
  if (!wallet) {
    bot.sendMessage(msg.chat.id, 'Usage: /watch <solana-wallet-address>');
    return;
  }

  watchlist.set(wallet, {
    address: wallet,
    chatId: msg.chat.id,
    alerts: { claimable: true, closingSoon: true, closingSoonHours: 24, oddsShift: true, oddsShiftThreshold: 10 },
  });

  bot.sendMessage(msg.chat.id,
    `\u2705 Watching \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\`\n` +
    `Default alerts: claimable \u2705, closing soon \u2705 (24h), odds shift \u2705 (10%)`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/unwatch (.+)/, (msg, match) => {
  const wallet = match?.[1]?.trim() || '';
  if (watchlist.delete(wallet)) {
    bot.sendMessage(msg.chat.id, `\u274c Stopped watching \`${wallet.slice(0, 6)}...\``, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(msg.chat.id, 'Wallet not found in watchlist.');
  }
});

bot.onText(/\/check (.+)/, async (msg, match) => {
  const wallet = match?.[1]?.trim() || '';
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `\ud83d\udd0d Checking \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\`...`);

  const config: WalletConfig = watchlist.get(wallet) || {
    address: wallet,
    chatId,
    alerts: { claimable: true, closingSoon: true, closingSoonHours: 24, oddsShift: true, oddsShiftThreshold: 10 },
  };
  config.chatId = chatId; // Ensure alerts go to requesting chat

  const count = await checkWallet(config);
  if (count === 0) {
    bot.sendMessage(chatId, '\u2705 All good! No alerts for this wallet right now.');
  }
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
      `Claimable alerts: ${config.alerts.claimable ? '\u2705' : '\u274c'}`,
      `Closing soon: ${config.alerts.closingSoon ? '\u2705' : '\u274c'} (${config.alerts.closingSoonHours}h)`,
      `Odds shift: ${config.alerts.oddsShift ? '\u2705' : '\u274c'} (${config.alerts.oddsShiftThreshold}% threshold)`,
      '',
      'Adjust via /watch <wallet> (re-register) or edit config JSON.',
    ].join('\n'), { parse_mode: 'Markdown' });
  }
});

// ─── Polling Loop ───

async function pollAll() {
  let totalAlerts = 0;
  for (const config of watchlist.values()) {
    totalAlerts += await checkWallet(config);
    await new Promise(r => setTimeout(r, 2000)); // Space out API calls
  }
  if (totalAlerts > 0) {
    console.log(`[${new Date().toISOString()}] Sent ${totalAlerts} alerts across ${watchlist.size} wallets`);
  }
}

setInterval(pollAll, POLL_INTERVAL);

console.log(`\ud83d\udd14 Baozi Claim & Alert Agent running — polling every ${POLL_INTERVAL / 60000} min`);
