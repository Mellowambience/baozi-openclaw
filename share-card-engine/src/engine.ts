import { MarketEvent } from "./types";
import { detectEvents, buildCaption } from "./utils";
import { generateShareCard, postToTelegram, postToAgentBook } from "./poster";

const BAOZI_API = "https://baozi.bet/api";
const POLL_INTERVAL_MS = 45_000; // 45 seconds

let prevSnapshot = new Map<string, any>();
let posted = 0;

async function fetchMarkets(): Promise<any[]> {
  try {
    const res = await fetch(`${BAOZI_API}/mcp/list_markets?status=Active`);
    if (!res.ok) return [];
    const d = (await res.json()) as any;
    return d?.markets ?? d?.data ?? [];
  } catch {
    return [];
  }
}

async function processEvent(event: MarketEvent): Promise<void> {
  console.log(`\n\U0001f514 Event detected: [${event.type}] ${event.question.slice(0, 60)}`);

  // Generate share card
  const card = await generateShareCard(event);
  console.log(`   Share card URL: ${card.imageUrl}`);

  // Build caption
  const caption = buildCaption(event, card.affiliateCode);
  console.log(`   Caption preview: ${caption.slice(0, 80)}...`);

  // Post to all configured platforms
  const results = await Promise.all([
    postToTelegram(card, caption),
    postToAgentBook(card, caption),
  ]);

  for (const r of results) {
    if (r.success) {
      console.log(`   \u2705 Posted to ${r.platform} (id: ${r.postId})`);
      posted++;
    } else if (r.error !== "Rate limited (30min cooldown)") {
      console.log(`   \u26a0\ufe0f  ${r.platform}: ${r.error}`);
    }
  }
}

export async function runEngine(loop: boolean = false): Promise<void> {
  console.log("\U0001f680 Share Card Viral Engine starting...");
  console.log(`   Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`   Platforms: Telegram, AgentBook`);
  console.log(`   Affiliate: ${process.env.AFFILIATE_CODE ?? "(set AFFILIATE_CODE env var)"}`);

  const tick = async () => {
    const markets = await fetchMarkets();
    console.log(`\n[${new Date().toISOString()}] Scanning ${markets.length} markets...`);

    const events = detectEvents(markets, prevSnapshot);
    console.log(`   ${events.length} notable events found`);

    // Update snapshot
    prevSnapshot = new Map(markets.map((m: any) => [m.pda ?? m.market_pda, m]));

    // Process events
    for (const event of events) {
      await processEvent(event);
    }

    if (events.length === 0) {
      console.log("   No notable events \u2014 watching...");
    }

    console.log(`   Total posts sent: ${posted}`);
  };

  await tick();

  if (loop) {
    setInterval(tick, POLL_INTERVAL_MS);
  }
}
