import { Market } from './baozi-api';

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  crypto: ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'crypto', 'token', 'defi', 'nft', 'blockchain', 'coinbase', 'binance', 'chain'],
  sports: ['nba', 'nfl', 'mlb', 'nhl', 'ucl', 'premier league', 'world cup', 'super bowl', 'championship', 'playoff', 'match', 'game', 'win', 'score', 'olympics', 'tennis', 'golf', 'race'],
  politics: ['president', 'election', 'congress', 'senate', 'vote', 'democrat', 'republican', 'governor', 'political', 'policy', 'legislation', 'trump', 'biden'],
  entertainment: ['oscar', 'grammy', 'emmy', 'bafta', 'movie', 'film', 'album', 'song', 'artist', 'award', 'netflix', 'box office', 'release', 'streaming'],
  technology: ['ai', 'openai', 'google', 'apple', 'microsoft', 'launch', 'product', 'release', 'iphone', 'android', 'software', 'model', 'gpt', 'claude'],
  finance: ['stock', 'market', 'fed', 'rate', 'inflation', 'gdp', 'ipo', 'nasdaq', 'dow', 's&p', 'bond', 'treasury', 'cboe'],
  weather: ['weather', 'hurricane', 'temperature', 'snow', 'rain', 'storm', 'climate'],
};

export interface MarketMetadata {
  category: string;
  tags: string[];
  description: string;
  qualityScore: number;
  qualityReasons: string[];
  timingAnalysis: string;
  issues: string[];
}

export class Enricher {
  /**
   * Analyze a market and generate metadata suggestions.
   */
  analyzeMarket(market: Market): MarketMetadata {
    const question = market.question.toLowerCase();
    
    // Detect category
    const category = this.detectCategory(question);
    
    // Generate tags
    const tags = this.generateTags(question, category);
    
    // Generate description
    const description = this.generateDescription(market);
    
    // Timing analysis
    const timingAnalysis = this.analyzeClosingTime(market);
    
    // Quality scoring
    const { score, reasons, issues } = this.scoreQuality(market, category, timingAnalysis);

    return {
      category,
      tags,
      description,
      qualityScore: score,
      qualityReasons: reasons,
      timingAnalysis,
      issues,
    };
  }

  private detectCategory(question: string): string {
    let bestCategory = 'general';
    let bestScore = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (question.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    }

    return bestCategory;
  }

  private generateTags(question: string, category: string): string[] {
    const tags = [category];
    
    // Extract proper nouns and key terms (simple heuristic)
    const words = question.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (clean.length > 3 && !['will', 'the', 'that', 'this', 'have', 'been', 'with', 'from', 'before', 'after', 'above', 'below', 'exceed', 'million', 'billion'].includes(clean)) {
        // Check if it matches any category keyword
        for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
          if (keywords.includes(clean) && !tags.includes(clean)) {
            tags.push(clean);
          }
        }
      }
    }

    // Add 'prediction' and 'baozi' as default tags
    tags.push('prediction');
    
    return tags.slice(0, 6); // Max 6 tags
  }

  private generateDescription(market: Market): string {
    const closingDate = new Date(market.closingTime).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return `Prediction market on whether "${market.question}" — resolves by ${closingDate}. Current consensus: ${market.yesPercent > market.noPercent ? `Yes (${market.yesPercent}%)` : `No (${market.noPercent}%)`}. Pool: ${market.totalPoolSol.toFixed(2)} SOL.`;
  }

  private analyzeClosingTime(market: Market): string {
    const now = Date.now();
    const closingTime = new Date(market.closingTime).getTime();
    const hoursUntilClose = (closingTime - now) / (1000 * 60 * 60);
    const daysUntilClose = hoursUntilClose / 24;

    if (closingTime < now) {
      return '⚠️ Market already past closing time';
    } else if (hoursUntilClose < 1) {
      return '⚠️ Closing within 1 hour — very limited time for betting';
    } else if (hoursUntilClose < 24) {
      return `⏰ Closing in ${hoursUntilClose.toFixed(1)}h — last-day window`;
    } else if (daysUntilClose < 7) {
      return `✅ Closing in ${daysUntilClose.toFixed(1)} days — reasonable window`;
    } else if (daysUntilClose > 90) {
      return `📅 Closing in ${daysUntilClose.toFixed(0)} days — long-dated market, may see low early activity`;
    } else {
      return `✅ Closing in ${daysUntilClose.toFixed(0)} days — good timing`;
    }
  }

  private scoreQuality(market: Market, category: string, timingAnalysis: string): { score: number; reasons: string[]; issues: string[] } {
    let score = 3; // Base score
    const reasons: string[] = [];
    const issues: string[] = [];

    // Question clarity
    if (market.question.endsWith('?')) {
      score += 0.5;
      reasons.push('Clear question format');
    } else {
      issues.push('Question doesn\'t end with "?"');
    }

    // Has data source in question
    if (market.question.toLowerCase().includes('source:') || market.question.includes('http')) {
      score += 0.5;
      reasons.push('Includes data source reference');
    } else {
      issues.push('No data source referenced — add "Source: ..." for faster resolution');
    }

    // Category detected
    if (category !== 'general') {
      score += 0.25;
      reasons.push(`Clear category: ${category}`);
    } else {
      issues.push('Category unclear — consider making the topic more specific');
    }

    // Pool activity
    if (market.totalPoolSol > 0.1) {
      score += 0.5;
      reasons.push('Has betting activity');
    } else if (market.totalPoolSol === 0) {
      issues.push('No bets yet — market may need promotion');
    }

    // Timing
    if (timingAnalysis.startsWith('⚠️')) {
      score -= 0.5;
      issues.push('Timing issue: ' + timingAnalysis);
    } else if (timingAnalysis.startsWith('✅')) {
      score += 0.25;
      reasons.push('Good closing timing');
    }

    // Test market detection
    if (market.question.toLowerCase().includes('[test]') || market.question.toLowerCase().includes('auto-test')) {
      score -= 1;
      issues.push('Appears to be a test market');
    }

    // Vague question detection
    if (market.question.length < 20) {
      score -= 0.5;
      issues.push('Question is very short — may be too vague');
    }

    // Clamp score
    score = Math.max(1, Math.min(5, Math.round(score * 2) / 2));

    return { score, reasons, issues };
  }

  /**
   * Format the metadata analysis as an AgentBook post.
   */
  formatAsPost(market: Market, metadata: MarketMetadata): string {
    const stars = '★'.repeat(Math.floor(metadata.qualityScore)) + 
                  (metadata.qualityScore % 1 >= 0.5 ? '½' : '') +
                  '☆'.repeat(5 - Math.ceil(metadata.qualityScore));

    let post = `🔍 Market Analysis: "${market.question}"\n\n`;
    post += `Category: ${metadata.category} | Tags: ${metadata.tags.join(', ')}\n`;
    post += `Quality: ${stars} (${metadata.qualityScore}/5)\n`;
    post += `Timing: ${metadata.timingAnalysis}\n`;

    if (metadata.issues.length > 0) {
      post += `\n⚠️ Suggestions:\n`;
      for (const issue of metadata.issues.slice(0, 3)) {
        post += `• ${issue}\n`;
      }
    }

    if (metadata.qualityReasons.length > 0) {
      post += `\n✅ Strengths:\n`;
      for (const reason of metadata.qualityReasons.slice(0, 3)) {
        post += `• ${reason}\n`;
      }
    }

    post += `\nbaozi.bet/market/${market.publicKey}`;

    return post.substring(0, 2000);
  }

  /**
   * Format as a short market comment.
   */
  formatAsComment(market: Market, metadata: MarketMetadata): string {
    let comment = `Quality: ${'★'.repeat(Math.floor(metadata.qualityScore))}${'☆'.repeat(5 - Math.floor(metadata.qualityScore))} | Category: ${metadata.category}`;

    if (metadata.issues.length > 0) {
      comment += ` | Suggestion: ${metadata.issues[0]}`;
    }

    return comment.substring(0, 500);
  }
}
