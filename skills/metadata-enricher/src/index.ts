import cron from 'node-cron';
import { BaoziAPI, Market } from './baozi-api';
import { Enricher } from './enricher';
import { signMessage } from './signer';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(__dirname, '..', 'enricher.log');
const STATE_FILE = path.join(__dirname, '..', 'analyzed-markets.json');

function log(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// Track which markets we've already analyzed
function loadAnalyzedMarkets(): Set<string> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return new Set(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return new Set();
}

function saveAnalyzedMarkets(analyzed: Set<string>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify([...analyzed], null, 2));
}

const api = new BaoziAPI();
const enricher = new Enricher();
let analyzedMarkets = loadAnalyzedMarkets();
let postCount = 0;
let commentCount = 0;

const POST_COOLDOWN_MS = 30 * 60 * 1000; // 30 min AgentBook cooldown
const COMMENT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hr comment cooldown
let lastPostTime = 0;
let lastCommentTime = 0;

async function analyzeNewMarkets() {
  log('🔍 Checking for markets to analyze...');

  const markets = await api.getAllMarkets();
  const unanalyzed = markets.filter(m => !analyzedMarkets.has(m.publicKey));

  if (unanalyzed.length === 0) {
    log('No new markets to analyze');
    return;
  }

  log(`Found ${unanalyzed.length} markets to analyze`);

  for (const market of unanalyzed) {
    const metadata = enricher.analyzeMarket(market);
    const now = Date.now();

    // Post to AgentBook if cooldown allows
    if (now - lastPostTime >= POST_COOLDOWN_MS) {
      const post = enricher.formatAsPost(market, metadata);
      const success = await api.postToAgentBook(post, market.publicKey);
      if (success) {
        postCount++;
        lastPostTime = now;
        log(`📝 AgentBook post #${postCount} for "${market.question.substring(0, 50)}..." — Quality: ${metadata.qualityScore}/5`);
      }
      // Wait a bit between actions
      await sleep(5000);
    }

    // Comment on market if cooldown allows
    if (now - lastCommentTime >= COMMENT_COOLDOWN_MS) {
      const comment = enricher.formatAsComment(market, metadata);
      const messageText = `Enricher analysis for ${market.publicKey} at ${Date.now()}`;
      const { signature, message } = signMessage(messageText);
      
      const success = await api.commentOnMarket(market.publicKey, comment, signature, message);
      if (success) {
        commentCount++;
        lastCommentTime = Date.now();
        log(`💬 Comment #${commentCount} on "${market.question.substring(0, 50)}..."`);
      }
      await sleep(5000);
    }

    // Mark as analyzed
    analyzedMarkets.add(market.publicKey);
    saveAnalyzedMarkets(analyzedMarkets);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('🔬 Metadata Enricher starting...');
  log(`Wallet: ${config.walletAddress}`);
  log(`Poll interval: ${config.pollIntervalMinutes}m`);
  log(`Previously analyzed: ${analyzedMarkets.size} markets`);

  // Initial analysis
  await analyzeNewMarkets();

  // Poll every 45 minutes for new markets (offset from pundit's 30min cooldown)
  cron.schedule('15,45 * * * *', async () => {
    log('⏰ Scheduled analysis trigger');
    await analyzeNewMarkets();
  });

  log('✅ Cron scheduled. Running...');

  process.on('SIGINT', () => {
    log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}, Analyzed: ${analyzedMarkets.size}`);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}, Analyzed: ${analyzedMarkets.size}`);
    process.exit(0);
  });
}

main().catch(err => {
  log(`💥 Fatal: ${err}`);
  process.exit(1);
});
