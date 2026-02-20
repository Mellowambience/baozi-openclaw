import { MarketEvent, ShareCard, PostResult } from "./types";
import { buildCaption } from "./utils";

const BAOZI_API = "https://baozi.bet/api";
const AFFILIATE_CODE = process.env.AFFILIATE_CODE;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const AGENTBOOK_TOKEN = process.env.AGENTBOOK_TOKEN;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

// Rate limiting: one post per platform per 30 minutes
const lastPost = new Map<string, number>();
const COOLDOWN_MS = 30 * 60 * 1000;

function isRateLimited(platform: string): boolean {
  const last = lastPost.get(platform) ?? 0;
  return Date.now() - last < COOLDOWN_MS;
}

function markPosted(platform: string): void {
  lastPost.set(platform, Date.now());
}

/**
 * Generate a share card via Baozi API
 */
export async function generateShareCard(event: MarketEvent): Promise<ShareCard> {
  if (!AFFILIATE_CODE) throw new Error("AFFILIATE_CODE env var required");
  if (!WALLET_ADDRESS) throw new Error("WALLET_ADDRESS env var required");

  const affiliateCode = AFFILIATE_CODE;
  const cardUrl = `${BAOZI_API}/share/card?market=${event.marketPda}&wallet=${WALLET_ADDRESS}&ref=${affiliateCode}`;
  const marketUrl = `https://baozi.bet/market/${event.marketPda}?ref=${affiliateCode}`;

  try {
    const res = await fetch(cardUrl);
    if (res.ok) {
      return {
        marketPda: event.marketPda,
        question: event.question,
        imageUrl: cardUrl,
        marketUrl,
        affiliateCode,
      };
    }
  } catch {
    // fallback
  }

  return {
    marketPda: event.marketPda,
    question: event.question,
    imageUrl: cardUrl, // URL still valid even if prefetch fails
    marketUrl,
    affiliateCode,
  };
}

/**
 * Post to Telegram channel
 */
export async function postToTelegram(card: ShareCard, caption: string): Promise<PostResult> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { platform: "telegram", success: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set" };
  }
  if (isRateLimited("telegram")) {
    return { platform: "telegram", success: false, error: "Rate limited (30min cooldown)" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: card.imageUrl,
        caption: caption.slice(0, 1024),
        parse_mode: "HTML",
      }),
    });
    const data = (await res.json()) as any;
    if (data.ok) {
      markPosted("telegram");
      return { platform: "telegram", success: true, postId: String(data.result?.message_id) };
    }
    return { platform: "telegram", success: false, error: data.description };
  } catch (e: any) {
    return { platform: "telegram", success: false, error: e.message };
  }
}

/**
 * Post to AgentBook
 */
export async function postToAgentBook(card: ShareCard, caption: string): Promise<PostResult> {
  if (!AGENTBOOK_TOKEN) {
    return { platform: "agentbook", success: false, error: "AGENTBOOK_TOKEN not set" };
  }
  if (isRateLimited("agentbook")) {
    return { platform: "agentbook", success: false, error: "Rate limited (30min cooldown)" };
  }

  try {
    const res = await fetch(`${BAOZI_API}/agentbook/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENTBOOK_TOKEN}`,
      },
      body: JSON.stringify({
        content: caption,
        image_url: card.imageUrl,
        market_pda: card.marketPda,
        affiliate_code: card.affiliateCode,
      }),
    });
    const data = (await res.json()) as any;
    if (res.ok) {
      markPosted("agentbook");
      return { platform: "agentbook", success: true, postId: data?.id };
    }
    return { platform: "agentbook", success: false, error: data?.error ?? "Unknown error" };
  } catch (e: any) {
    return { platform: "agentbook", success: false, error: e.message };
  }
}
