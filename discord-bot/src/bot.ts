import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import http from 'http';

const BAOZI_API = 'https://baozi.bet';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;

// ─── API Helpers ───

let _marketCache: any[] = [];
let _lastFetch = 0;
const _CACHE_TTL = 30000;

async function fetchAllMarkets(): Promise<any[]> {
  if (Date.now() - _lastFetch < _CACHE_TTL && _marketCache.length > 0) return _marketCache;
  const res = await fetch(`${BAOZI_API}/api/markets`, { headers: { 'User-Agent': 'BaoziDiscordBot/1.0' } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  _marketCache = [...(json?.data?.binary || []), ...(json?.data?.race || [])];
  _lastFetch = Date.now();
  return _marketCache;
}

async function fetchMarkets(params: Record<string, string> = {}) {
  let markets = await fetchAllMarkets();
  if (params.status === 'Active') markets = markets.filter(m => m.status === 'Active' || m.isBettingOpen);
  if (params.sort === 'volume') markets.sort((a: any, b: any) => (b.totalPoolSol || 0) - (a.totalPoolSol || 0));
  if (params.sort === 'closing') markets.sort((a: any, b: any) => new Date(a.closingTime || '2099').getTime() - new Date(b.closingTime || '2099').getTime());
  if (params.category) {
    const cat = params.category.toLowerCase();
    markets = markets.filter((m: any) => (m.category?.toLowerCase().includes(cat)) || m.question.toLowerCase().includes(cat));
  }
  return { markets };
}

async function fetchQuote(marketPda: string, side: string = 'Yes', amount: number = 1.0) {
  const markets = await fetchAllMarkets();
  const market = markets.find((m: any) => m.publicKey === marketPda);
  if (!market) throw new Error('Market not found');
  const yesOdds = (market.yesPercent || 50) / 100;
  const noOdds = (market.noPercent || 50) / 100;
  const odds = side === 'Yes' ? yesOdds : noOdds;
  return {
    implied_odds: odds,
    expected_payout: odds > 0 ? amount / odds : 0,
    pool: market.totalPoolSol || 0,
  };
}

async function fetchPositions(wallet: string) {
  // Position data requires on-chain lookup; return empty for now
  // Users should check baozi.bet/my-bets directly
  return { positions: [] };
}

function formatOdds(yesPool: number, noPool: number): { yes: number; no: number } {
  const total = yesPool + noPool;
  if (total === 0) return { yes: 50, no: 50 };
  return { yes: (yesPool / total) * 100, no: (noPool / total) * 100 };
}

function progressBar(pct: number, length: number = 15): string {
  const filled = Math.round((pct / 100) * length);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(length - filled);
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

function formatPool(sol: number): string {
  return sol < 0.01 ? '< 0.01 SOL' : `${sol.toFixed(2)} SOL`;
}

// ─── Embed Builders ───

function buildMarketEmbed(market: any): EmbedBuilder {
  const odds = formatOdds(market.yesPercent || 50, market.noPercent || 50);
  const pool = formatPool((market.yesPool || 0) + (market.noPool || 0));
  const closing = market.closingTime ? timeUntil(market.closingTime) : 'N/A';
  const layer = market.layer === 0 ? 'Official' : market.layer === 1 ? 'Lab' : 'Private';
  const pda = market.publicKey || '';

  return new EmbedBuilder()
    .setTitle(`\ud83d\udcca ${market.question || 'Unknown Market'}`)
    .setDescription([
      `Yes  ${progressBar(odds.yes)}  ${odds.yes.toFixed(1)}%`,
      `No   ${progressBar(odds.no)}  ${odds.no.toFixed(1)}%`,
      '',
      `Pool: ${pool}`,
      `Closes: ${closing}`,
      `Layer: ${layer} | Status: ${market.status || 'Active'}`,
    ].join('\n'))
    .setURL(`https://baozi.bet/market/${pda}`)
    .setColor(0xF59E0B)
    .setFooter({ text: 'baozi.bet \u2022 Solana Prediction Markets' })
    .setTimestamp();
}

function buildRaceEmbed(market: any): EmbedBuilder {
  const outcomes = market.outcomes || [];
  const totalPool = outcomes.reduce((sum: number, o: any) => sum + (o.pool || 0), 0);
  const pda = market.publicKey || '';

  const lines = outcomes.map((o: any) => {
    const pct = totalPool > 0 ? ((o.pool || 0) / totalPool) * 100 : 0;
    return `${o.name || 'Unknown'}  ${progressBar(pct, 12)}  ${pct.toFixed(1)}%`;
  });

  return new EmbedBuilder()
    .setTitle(`\ud83c\udfc7 ${market.question || 'Unknown Race'}`)
    .setDescription([
      ...lines,
      '',
      `Pool: ${formatPool(totalPool)} | ${outcomes.length} outcomes`,
      market.closingTime ? `Closes: ${timeUntil(market.closingTime)}` : '',
    ].filter(Boolean).join('\n'))
    .setURL(`https://baozi.bet/market/${pda}`)
    .setColor(0x8B5CF6)
    .setFooter({ text: 'baozi.bet \u2022 Race Market' })
    .setTimestamp();
}

// ─── Slash Commands ───

const commands = [
  new SlashCommandBuilder()
    .setName('markets')
    .setDescription('List active prediction markets')
    .addStringOption(opt =>
      opt.setName('category').setDescription('Filter by category').setRequired(false)
        .addChoices(
          { name: 'Crypto', value: 'crypto' },
          { name: 'Sports', value: 'sports' },
          { name: 'Entertainment', value: 'entertainment' },
          { name: 'Politics', value: 'politics' },
          { name: 'Weather', value: 'weather' },
          { name: 'Technology', value: 'technology' },
        )),
  new SlashCommandBuilder()
    .setName('odds')
    .setDescription('Show detailed odds for a market')
    .addStringOption(opt =>
      opt.setName('market').setDescription('Market PDA address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('View positions for a wallet')
    .addStringOption(opt =>
      opt.setName('wallet').setDescription('Solana wallet address').setRequired(true)),
  new SlashCommandBuilder()
    .setName('hot')
    .setDescription('Highest volume markets in last 24h'),
  new SlashCommandBuilder()
    .setName('closing')
    .setDescription('Markets closing within 24h'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set daily roundup channel and time')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for daily roundup').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('hour').setDescription('UTC hour (0-23)').setRequired(true)),
];

// ─── Bot Setup ───

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const roundupConfigs: Map<string, { channelId: string; hour: number }> = new Map();

client.once('ready', async () => {
  console.log(`\ud83e\udd5f Baozi Discord Bot ready as ${client.user?.tag}`);

  // Register slash commands  
  const rest = new REST().setToken(BOT_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands.map(cmd => cmd.toJSON()),
    });
    console.log('Slash commands registered');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'markets') {
      await interaction.deferReply();
      try {
        const category = interaction.options.getString('category') || '';
        const params: Record<string, string> = { status: 'Active' };
        if (category) params.category = category;

        const data = await fetchMarkets(params);
        const markets = (data.markets || data || []).slice(0, 5);

        if (markets.length === 0) {
          await interaction.editReply('No active markets found.');
          return;
        }

        const embeds = markets.map(buildMarketEmbed);
        await interaction.editReply({ embeds });
      } catch (err) {
        await interaction.editReply(`Error: ${(err as Error).message}`);
      }
    }

    else if (commandName === 'odds') {
      await interaction.deferReply();
      try {
        const marketId = interaction.options.getString('market', true);
        const [yesQ, noQ] = await Promise.all([
          fetchQuote(marketId, 'Yes', 1.0),
          fetchQuote(marketId, 'No', 1.0),
        ]);

        const embed = new EmbedBuilder()
          .setTitle('\ud83d\udcca Market Odds')
          .setDescription([
            `PDA: \`${marketId.slice(0, 8)}...${marketId.slice(-4)}\``,
            '',
            '**1 SOL Bets:**',
            `Yes \u2192 Payout: ${yesQ.expected_payout?.toFixed(3) || 'N/A'} SOL`,
            `No  \u2192 Payout: ${noQ.expected_payout?.toFixed(3) || 'N/A'} SOL`,
            '',
            `Implied Yes: ${yesQ.implied_odds ? (yesQ.implied_odds * 100).toFixed(1) : 'N/A'}%`,
            `Implied No: ${noQ.implied_odds ? (noQ.implied_odds * 100).toFixed(1) : 'N/A'}%`,
          ].join('\n'))
          .setURL(`https://baozi.bet/market/${marketId}`)
          .setColor(0x10B981);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel('View Market').setStyle(ButtonStyle.Link).setURL(`https://baozi.bet/market/${marketId}`),
          new ButtonBuilder().setCustomId(`refresh_${marketId}`).setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('\ud83d\udd04'),
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (err) {
        await interaction.editReply(`Error: ${(err as Error).message}`);
      }
    }

    else if (commandName === 'portfolio') {
      await interaction.deferReply();
      try {
        const wallet = interaction.options.getString('wallet', true);
        const data = await fetchPositions(wallet);
        const positions = data.positions || data || [];

        if (positions.length === 0) {
          await interaction.editReply('No positions found for this wallet.');
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`\ud83d\udcbc Portfolio — ${wallet.slice(0, 6)}...${wallet.slice(-4)}`)
          .setDescription(positions.slice(0, 10).map((p: any) => {
            return `**${p.question || 'Unknown'}**\nSide: ${p.side || 'N/A'} | Amount: ${p.amount?.toFixed(2) || '?'} SOL`;
          }).join('\n\n'))
          .setColor(0x3B82F6)
          .setURL(`https://baozi.bet/my-bets`)
          .setFooter({ text: `${positions.length} position${positions.length !== 1 ? 's' : ''}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        await interaction.editReply(`Error: ${(err as Error).message}`);
      }
    }

    else if (commandName === 'hot') {
      await interaction.deferReply();
      try {
        const data = await fetchMarkets({ status: 'Active', sort: 'volume', order: 'desc' });
        const markets = (data.markets || data || []).slice(0, 5);

        if (markets.length === 0) {
          await interaction.editReply('No hot markets right now.');
          return;
        }

        const embeds = markets.map(buildMarketEmbed);
        embeds[0] = embeds[0].setTitle('\ud83d\udd25 ' + (embeds[0].data.title || 'Hot Markets'));
        await interaction.editReply({ embeds });
      } catch (err) {
        await interaction.editReply(`Error: ${(err as Error).message}`);
      }
    }

    else if (commandName === 'closing') {
      await interaction.deferReply();
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
          await interaction.editReply('No markets closing within 24 hours.');
          return;
        }

        const embeds = markets.map(buildMarketEmbed);
        embeds[0] = embeds[0].setTitle('\u23f0 ' + (embeds[0].data.title || 'Closing Soon'));
        await interaction.editReply({ embeds });
      } catch (err) {
        await interaction.editReply(`Error: ${(err as Error).message}`);
      }
    }

    else if (commandName === 'setup') {
      const channel = interaction.options.getChannel('channel', true);
      const hour = interaction.options.getInteger('hour', true);

      if (hour < 0 || hour > 23) {
        await interaction.reply('Hour must be 0-23.');
        return;
      }

      roundupConfigs.set(interaction.guildId || '', { channelId: channel.id, hour });
      await interaction.reply(`\u2705 Daily roundup set for ${hour}:00 UTC in <#${channel.id}>`);
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('refresh_')) {
      const pda = customId.replace('refresh_', '');
      await interaction.deferUpdate();
      try {
        const [yesQ, noQ] = await Promise.all([
          fetchQuote(pda, 'Yes', 1.0),
          fetchQuote(pda, 'No', 1.0),
        ]);

        const embed = new EmbedBuilder()
          .setTitle('\ud83d\udcca Market Odds (Updated)')
          .setDescription([
            `PDA: \`${pda.slice(0, 8)}...${pda.slice(-4)}\``,
            '',
            '**1 SOL Bets:**',
            `Yes \u2192 Payout: ${yesQ.expected_payout?.toFixed(3) || 'N/A'} SOL`,
            `No  \u2192 Payout: ${noQ.expected_payout?.toFixed(3) || 'N/A'} SOL`,
            '',
            `Implied Yes: ${yesQ.implied_odds ? (yesQ.implied_odds * 100).toFixed(1) : 'N/A'}%`,
            `Implied No: ${noQ.implied_odds ? (noQ.implied_odds * 100).toFixed(1) : 'N/A'}%`,
          ].join('\n'))
          .setURL(`https://baozi.bet/market/${pda}`)
          .setColor(0x10B981)
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel('View Market').setStyle(ButtonStyle.Link).setURL(`https://baozi.bet/market/${pda}`),
          new ButtonBuilder().setCustomId(`refresh_${pda}`).setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('\ud83d\udd04'),
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (err) {
        await interaction.followUp({ content: `Refresh error: ${(err as Error).message}`, ephemeral: true });
      }
    }
  }
});

// ─── Daily Roundup Cron ───

setInterval(async () => {
  const now = new Date();
  if (now.getUTCMinutes() !== 0) return;

  for (const [guildId, config] of roundupConfigs) {
    if (config.hour !== now.getUTCHours()) continue;

    try {
      const channel = await client.channels.fetch(config.channelId);
      if (!channel?.isTextBased()) continue;

      const data = await fetchMarkets({ status: 'Active', sort: 'volume', order: 'desc' });
      const markets = (data.markets || data || []).slice(0, 5);

      if (markets.length === 0) continue;

      const embed = new EmbedBuilder()
        .setTitle('\ud83e\udd5f Daily Baozi Roundup')
        .setDescription(markets.map((m: any, i: number) => {
          const odds = formatOdds(m.yesPool || 0, m.noPool || 0);
          const pool = formatPool((m.yesPool || 0) + (m.noPool || 0));
          return `**${i + 1}. ${m.question || 'Unknown'}**\nYes ${odds.yes.toFixed(1)}% | No ${odds.no.toFixed(1)}% | ${pool}`;
        }).join('\n\n'))
        .setColor(0xF59E0B)
        .setURL('https://baozi.bet')
        .setFooter({ text: 'baozi.bet' })
        .setTimestamp();

      await (channel as any).send({ embeds: [embed] });
    } catch (err) {
      console.error(`Roundup error for guild ${guildId}:`, err);
    }
  }
}, 60000);


// ─── Health Check HTTP Server (for Render Web Service free tier) ───
const PORT = parseInt(process.env.PORT || '10000');
http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'baozi-discord-bot', uptime: process.uptime() }));
}).listen(PORT, () => console.log(`   Health check: http://0.0.0.0:${PORT}`));

client.login(BOT_TOKEN);
console.log('\ud83e\udd5f Baozi Discord Bot starting...');
