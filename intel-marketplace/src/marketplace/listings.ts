// ── Marketplace Listings ────────────────────────────────────────────────────
// Analysts publish paywalled analysis. Buyers discover and purchase via x402.

import { randomUUID } from "crypto";
import type {
  AnalysisListing,
  AnalystProfile,
  PurchaseRecord,
  ListingFilter,
  MarketCategory,
} from "../types.js";
import { processX402Payment, verifyX402Receipt } from "../payment/x402.js";
import { BaoziClient } from "../utils/baozi-client.js";
import {
  MIN_THESIS_LENGTH,
  MAX_THESIS_LENGTH,
  MIN_CONFIDENCE,
  MAX_CONFIDENCE,
  AFFILIATE_COMMISSION_RATE,
} from "../utils/constants.js";

export class ListingsManager {
  private client: BaoziClient;
  private listings: Map<string, AnalysisListing> = new Map();
  private purchases: Map<string, PurchaseRecord[]> = new Map(); // buyerWallet → records
  private analystSales: Map<string, number> = new Map();

  constructor(client?: BaoziClient) {
    this.client = client || new BaoziClient();
  }

  // ── Publish Analysis ───────────────────────────────────────────────────

  publishAnalysis(
    analyst: AnalystProfile,
    params: {
      marketPda: string;
      marketQuestion: string;
      marketCategory: MarketCategory;
      thesis: string;
      recommendedSide: "YES" | "NO" | string;
      confidenceScore: number;
      priceSol: number;
      expiresAt?: string;
    }
  ): AnalysisListing {
    // Validate thesis
    if (params.thesis.length < MIN_THESIS_LENGTH) {
      throw new Error(
        `Thesis too short: ${params.thesis.length} chars (min ${MIN_THESIS_LENGTH})`
      );
    }
    if (params.thesis.length > MAX_THESIS_LENGTH) {
      throw new Error(
        `Thesis too long: ${params.thesis.length} chars (max ${MAX_THESIS_LENGTH})`
      );
    }

    // Validate confidence
    if (
      params.confidenceScore < MIN_CONFIDENCE ||
      params.confidenceScore > MAX_CONFIDENCE
    ) {
      throw new Error(
        `Confidence must be ${MIN_CONFIDENCE}–${MAX_CONFIDENCE}, got ${params.confidenceScore}`
      );
    }

    const listing: AnalysisListing = {
      id: randomUUID(),
      analystWallet: analyst.wallet,
      analystName: analyst.displayName,
      marketPda: params.marketPda,
      marketQuestion: params.marketQuestion,
      marketCategory: params.marketCategory,
      thesis: params.thesis,
      recommendedSide: params.recommendedSide,
      confidenceScore: params.confidenceScore,
      priceSol: params.priceSol,
      affiliateCode: analyst.affiliateCode,
      publishedAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      purchased: 0,
      outcome: "pending",
    };

    this.listings.set(listing.id, listing);
    console.log(
      `[Marketplace] Published: "${params.marketQuestion.slice(0, 50)}..." ` +
        `by ${analyst.displayName} — ${params.priceSol} SOL — confidence: ${params.confidenceScore}`
    );
    return listing;
  }

  // ── Discover Listings ──────────────────────────────────────────────────

  getListings(filter?: ListingFilter): AnalysisListing[] {
    let results = Array.from(this.listings.values());

    // Filter by active markets only (not expired)
    const now = new Date();
    results = results.filter(
      (l) => !l.expiresAt || new Date(l.expiresAt) > now
    );

    if (!filter) return results;

    if (filter.category) {
      results = results.filter((l) => l.marketCategory === filter.category);
    }
    if (filter.minConfidence !== undefined) {
      results = results.filter(
        (l) => l.confidenceScore >= filter.minConfidence!
      );
    }
    if (filter.maxPrice !== undefined) {
      results = results.filter((l) => l.priceSol <= filter.maxPrice!);
    }

    // Sort by confidence desc, then price asc
    results.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore)
        return b.confidenceScore - a.confidenceScore;
      return a.priceSol - b.priceSol;
    });

    return results;
  }

  getListing(id: string): AnalysisListing | undefined {
    return this.listings.get(id);
  }

  // ── Purchase Analysis (x402 flow) ──────────────────────────────────────

  async purchaseAnalysis(
    listingId: string,
    buyerWallet: string
  ): Promise<PurchaseRecord> {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error(`Listing not found: ${listingId}`);

    console.log(
      `
[Marketplace] Purchase flow for listing: ${listingId.slice(0, 8)}...`
    );
    console.log(`[Marketplace] Buyer: ${buyerWallet.slice(0, 8)}...`);
    console.log(`[Marketplace] Price: ${listing.priceSol} SOL`);

    // 1. Initiate x402 payment
    const payment = await processX402Payment({
      resource: listingId,
      amountSol: listing.priceSol,
      recipientWallet: listing.analystWallet,
      payerWallet: buyerWallet,
      description: `Analysis: ${listing.marketQuestion.slice(0, 80)}`,
    });

    // 2. Verify receipt
    const receipt = await verifyX402Receipt(payment);
    if (!receipt.verified) {
      throw new Error(`Payment verification failed for listing ${listingId}`);
    }

    console.log(
      `[Marketplace] Payment verified — access granted to full thesis`
    );
    console.log(
      `[Marketplace] Analyst affiliate code: ${listing.affiliateCode} — embed in buyer's bet`
    );

    // 3. Grant access
    const purchase: PurchaseRecord = {
      listingId,
      buyerWallet,
      payment,
      analysis: listing,
      accessGrantedAt: new Date().toISOString(),
    };

    const existing = this.purchases.get(buyerWallet) || [];
    existing.push(purchase);
    this.purchases.set(buyerWallet, existing);

    // 4. Update listing sale count
    listing.purchased += 1;

    // 5. Track analyst revenue
    const prev = this.analystSales.get(listing.analystWallet) || 0;
    this.analystSales.set(
      listing.analystWallet,
      prev + listing.priceSol
    );

    // 6. Show buyer what to do next
    this.printBuyerGuide(listing, buyerWallet);

    return purchase;
  }

  private printBuyerGuide(listing: AnalysisListing, buyerWallet: string): void {
    console.log(`
${"─".repeat(60)}`);
    console.log(`📊 ANALYSIS PURCHASED — ${listing.marketQuestion}`);
    console.log(`${"─".repeat(60)}`);
    console.log(`Recommended: ${listing.recommendedSide}`);
    console.log(`Confidence:  ${listing.confidenceScore}/100`);
    console.log(`
Thesis:
${listing.thesis.slice(0, 300)}...`);
    console.log(`
🎯 Next step — place your bet with analyst's affiliate code:`);
    console.log(`{`);
    console.log(`  "name": "build_bet_transaction",`);
    console.log(`  "arguments": {`);
    console.log(`    "market": "${listing.marketPda}",`);
    console.log(`    "outcome": "${listing.recommendedSide.toLowerCase()}",`);
    console.log(`    "amount_sol": 1.0,`);
    console.log(`    "user_wallet": "${buyerWallet}",`);
    console.log(`    "affiliate_code": "${listing.affiliateCode}"`);
    console.log(`  }`);
    console.log(`}`);
    console.log(`
💰 ${listing.affiliateCode}: earns 1% lifetime on your winnings`);
    console.log(`${"─".repeat(60)}
`);
  }

  // ── Revenue Tracking ───────────────────────────────────────────────────

  getAnalystRevenue(wallet: string): number {
    return this.analystSales.get(wallet) || 0;
  }

  getBuyerPurchases(wallet: string): PurchaseRecord[] {
    return this.purchases.get(wallet) || [];
  }

  hasBuyerPurchased(buyerWallet: string, listingId: string): boolean {
    const purchases = this.purchases.get(buyerWallet) || [];
    return purchases.some((p) => p.listingId === listingId);
  }

  getTotalSales(): number {
    return Array.from(this.listings.values()).reduce(
      (sum, l) => sum + l.purchased,
      0
    );
  }

  getTotalRevenue(): number {
    return Array.from(this.analystSales.values()).reduce(
      (sum, v) => sum + v,
      0
    );
  }

  formatListings(listings: AnalysisListing[]): string {
    if (listings.length === 0) return "  (no listings)\n";
    let out = "";
    for (const l of listings) {
      out += `  [${l.id.slice(0, 8)}] ${l.marketQuestion.slice(0, 48).padEnd(48)}`;
      out += ` | ${l.recommendedSide.padEnd(4)} | conf:${String(l.confidenceScore).padStart(3)} | ${l.priceSol} SOL | sold:${l.purchased}
`;
      out += `       by ${l.analystName} (code: ${l.affiliateCode}) — ${l.marketCategory}
`;
    }
    return out;
  }
}
