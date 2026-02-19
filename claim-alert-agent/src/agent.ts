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

async function getPositions(wallet: string) {
  // Uses REST MCP endpoint (not direct Solana RPC) — fast and sufficient for alert polling
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

// ─── Alert Logic ───

async function checkWallet(config: WalletConfig) {
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
        // Try to build claim transaction via MCP for one-tap claiming
        try {
          const claimRes = await fetch(
            `${BAOZI_API}/api/mcp/build_claim_winnings_transaction?wallet=${encodeURIComponent(address)}`
          );
          if (claimRes.ok) {
            const claimData = await claimRes.json() as any;
            const txBase64 = claimData?.data?.transaction || claimData?.transaction;
            if (txBase64) {
              console.log(`[Agent] Claim tx ready for ${address}: ${txBase64.substring(0, 32)}...`);
              // Transaction is ready — user signs and broadcasts via baozi.bet
              // Future: wire to wallet adapter for fully autonomous claiming
            }
          }
        } catch (claimErr) {
          console.warn('[Agent] Could not build claim tx:', claimErr);
        }
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
        const msUntilClose = new Date(pos.closingTime).getTime() - Date.now();
        const hoursUntilClose = msUntilClose / 3600000;

        if (hoursUntilClose > 0 && hoursUntilClose <= alerts.closingSoonHours) {
          messages.push(
            `\u23f0 *Closing Soon!*\n` +
            `"${question}" closes in ${hoursUntilClose.toFixed(1)}h.\n` +
            `Your position: ${amount.toFixed(2)} SOL on ${side}\n` +
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
            const prevOdds = side === 'Yes' ? prev.yesOdds : prev.noOdds;
            const shift = Math.abs(currentOdds - prevOdds);

            if (shift >= alerts.oddsShiftThreshold) {
              const direction = currentOdds > prevOdds ? '\u2b06\ufe0f' : '\u2b07\ufe0f';
              messages.push(
                `${direction} *Odds Shift!*\n` +
                `"${question}"\n` +
                `Yes: ${prevOdds.toFixed(1)}% \u2192 ${currentOdds.toFixed(1)}% (${shift > 0 ? '+' : ''}${(currentOdds - prevOdds).toFixed(1)}%)\n` +
                `Your position: ${amount.toFixed(2)} SOL on ${side}\n` +
                `[View market](https://baozi.bet/market/${pda})`
              );
            }
          }

          // Update snapshot
          walletSnapshots.set(pda, {
            pda,
            question,
            yesOdds: currentOdds,
            noOdds: 100 - currentOdds,
            status: pos.status || 'Active',
            closingTime: pos.closingTime,
          });
          previousSnapshots.set(address, walletSnapshots);
        }
      }
    }

    // 3. Check for resolved markets
    for (const pos of positions) {
      if (pos.status === 'Resolved' || pos.status === 'ResolvedPending') {
        const pda = pos.marketPda || pos.pda || '';
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
        } catch { /* skip if resolution fetch fails */ }
      }
    }

  } catch (err) {
    console.error(`Error checking wallet ${address.slice(0, 8)}...:`, err);
  }

  // Send alerts
  for (const msg of messages) {
    try {
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    } catch (err) {
      console.error(`Error sending alert to ${chatId}:`, err);
    }
  }

  return messages.length;
}

// ─── Commands ───

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, [
    '\ud83d\udd14 *Baozi Claim & Alert Agent*',
    '',
    'Monitor your Baozi wallets for:',
    '\u2022 Unclaimed winnings (claim reminders)',
    '\u2022 Markets closing soon',
    '\u2022 Significant odds shifts',
    '\u2022 Market resolutions (win/loss)',
    '',
    '*Commands:*',
    '/watch <wallet> — Start monitoring a wallet',
    '/unwatch <wallet> — Stop monitoring',
    '/status — Show monitored wallets',
    '/check <wallet> — Manual check now',
    '/config — View/edit alert settings',
    '/help — This message',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/watch\s+([A-Za-z0-9]{32,44})/, (msg, match) => {
  const wallet = match?.[1] || '';
  const chatId = msg.chat.id;

  watchlist.set(wallet, {
    address: wallet,
    chatId,
    alerts: {
      claimable: true,
      closingSoon: true,
      closingSoonHours: 6,
      oddsShift: true,
      oddsShiftThreshold: 15,
    },
  });

  bot.sendMessage(chatId, [
    `\u2705 Now monitoring \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``,
    '',
    'Default alerts: claimable \u2705, closing soon \u2705 (6h), odds shift \u2705 (15%)',
    `Polling every ${POLL_INTERVAL / 60000} minutes.`,
    '',
    'Use /config to customize.',
  ].join('\n'), { parse_mode: 'Markdown' });
});

bot.onText(/\/unwatch\s+([A-Za-z0-9]{32,44})/, (msg, match) => {
  const wallet = match?.[1] || '';
  watchlist.delete(wallet);
  previousSnapshots.delete(wallet);
  bot.sendMessage(msg.chat.id, `\u2705 Stopped monitoring \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\``);
});

bot.onText(/\/status/, (msg) => {
  if (watchlist.size === 0) {
    bot.sendMessage(msg.chat.id, 'No wallets being monitored. Use /watch <wallet> to start.');
    return;
  }

  const lines = Array.from(watchlist.values()).map(w => 
    `\u2022 \`${w.address.slice(0, 6)}...${w.address.slice(-4)}\``
  );

  bot.sendMessage(msg.chat.id, `*Monitored Wallets:*\n${lines.join('\n')}\n\nPolling every ${POLL_INTERVAL / 60000} min.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/check\s+([A-Za-z0-9]{32,44})/, async (msg, match) => {
  const wallet = match?.[1] || '';
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
