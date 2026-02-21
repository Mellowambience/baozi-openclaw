// ── Agent Discovery Scanner ─────────────────────────────────────────────────
// Scans multiple platforms to find AI agents that could trade prediction markets.

import type {
  AgentProfile,
  AgentFramework,
  DiscoveryPlatform,
  DiscoveryConfig,
  AgentCategory,
} from "../types.js";
import { BAOZI_API } from "../utils/constants.js";

const DEFAULT_CONFIG: DiscoveryConfig = {
  platforms: [
    "agentbook",
    "github",
    "twitter",
    "elizaos-registry",
    "langchain-hub",
    "solana-agent-kit",
  ],
  maxResultsPerPlatform: 50,
  excludeWallets: [],
  minCapabilityScore: 0,
};

export class AgentScanner {
  private config: DiscoveryConfig;
  private discovered: Map<string, AgentProfile> = new Map();

  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Main Scan ──────────────────────────────────────────────────────────

  async scanAll(): Promise<AgentProfile[]> {
    const results: AgentProfile[] = [];

    for (const platform of this.config.platforms) {
      try {
        const agents = await this.scanPlatform(platform);
        results.push(...agents);
        console.log(`[Discovery] ${platform}: found ${agents.length} agents`);
      } catch (err) {
        console.error(`[Discovery] ${platform}: scan failed -`, err);
      }
    }

    // Deduplicate by wallet or profile URL
    const unique = this.deduplicateAgents(results);
    for (const agent of unique) {
      this.discovered.set(agent.walletAddress || agent.profileUrl || agent.agentName, agent);
    }

    return unique;
  }

  async scanPlatform(platform: DiscoveryPlatform): Promise<AgentProfile[]> {
    switch (platform) {
      case "agentbook":
        return this.scanAgentBook();
      case "github":
        return this.scanGitHub();
      case "twitter":
        return this.scanTwitter();
      case "elizaos-registry":
        return this.scanElizaOS();
      case "langchain-hub":
        return this.scanLangChain();
      case "solana-agent-kit":
        return this.scanSolanaAgentKit();
      default:
        return [];
    }
  }

  // ── Platform Scanners ──────────────────────────────────────────────────

  async scanAgentBook(): Promise<AgentProfile[]> {
    // Fetch from Baozi AgentBook — already has Solana-active agents
    try {
      const res = await fetch(
        `${BAOZI_API}/api/agentbook/posts?sort=recent&limit=${this.config.maxResultsPerPlatform}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      const posts = data?.posts || [];

      // Extract unique agents from posts
      const agentMap = new Map<string, AgentProfile>();
      for (const post of posts) {
        if (post.walletAddress && !agentMap.has(post.walletAddress)) {
          agentMap.set(post.walletAddress, {
            walletAddress: post.walletAddress,
            agentName: post.agent?.agentName || `Agent-${post.walletAddress.slice(0, 6)}`,
            framework: (post.agent?.agentFramework as AgentFramework) || "unknown",
            platform: "agentbook",
            profileUrl: `${BAOZI_API}/creator/${post.walletAddress}`,
            description: post.agent?.bio || undefined,
            capabilities: post.agent?.specializations || [],
            discoveredAt: new Date().toISOString(),
          });
        }
      }
      return Array.from(agentMap.values());
    } catch {
      return [];
    }
  }

  async scanGitHub(): Promise<AgentProfile[]> {
    // Scan GitHub for repos using ElizaOS, LangChain, Solana Agent Kit patterns
    // In production: use GitHub Search API for "prediction market" + "agent" + "solana"
    const agents: AgentProfile[] = [
      {
        walletAddress: "",
        agentName: "GitHub Agent (ElizaOS template)",
        framework: "eliza",
        platform: "github",
        profileUrl: "https://github.com/elizaOS/eliza",
        description: "Agents built on ElizaOS framework — can integrate MCP tools",
        capabilities: ["social", "trading", "analysis"],
        discoveredAt: new Date().toISOString(),
      },
    ];
    return agents;
  }

  async scanTwitter(): Promise<AgentProfile[]> {
    // Monitor X/Twitter for AI agent accounts discussing crypto/prediction markets
    // In production: use Twitter API v2 to search for AI agent accounts
    return [
      {
        walletAddress: "",
        agentName: "Crypto AI Agent (@CryptoAgentAI)",
        framework: "custom",
        platform: "twitter",
        profileUrl: "https://x.com/CryptoAgentAI",
        description: "AI agent posting crypto analysis — potential recruit for prediction markets",
        capabilities: ["crypto-analysis", "social"],
        discoveredAt: new Date().toISOString(),
      },
    ];
  }

  async scanElizaOS(): Promise<AgentProfile[]> {
    // ElizaOS agent registry — agents that already have plugin infrastructure
    return [
      {
        walletAddress: "",
        agentName: "ElizaOS Trading Plugin Agent",
        framework: "eliza",
        platform: "elizaos-registry",
        profileUrl: "https://github.com/elizaOS/eliza/tree/main/packages/plugin-solana",
        description: "ElizaOS agent with Solana plugin — perfect MCP integration candidate",
        capabilities: ["solana", "trading", "defi"],
        discoveredAt: new Date().toISOString(),
      },
    ];
  }

  async scanLangChain(): Promise<AgentProfile[]> {
    // LangChain Hub — agents with tool-use capability
    return [
      {
        walletAddress: "",
        agentName: "LangChain Research Agent",
        framework: "langchain",
        platform: "langchain-hub",
        profileUrl: "https://smith.langchain.com/hub",
        description: "LangChain agent with tool-calling — can add MCP as a tool",
        capabilities: ["research", "analysis", "tool-use"],
        discoveredAt: new Date().toISOString(),
      },
    ];
  }

  async scanSolanaAgentKit(): Promise<AgentProfile[]> {
    // Solana Agent Kit — agents already on Solana
    return [
      {
        walletAddress: "",
        agentName: "Solana Agent Kit Agent",
        framework: "solana-agent-kit",
        platform: "solana-agent-kit",
        profileUrl: "https://github.com/sendaifun/solana-agent-kit",
        description: "Agent using Solana Agent Kit — already has wallet infrastructure",
        capabilities: ["solana", "defi", "trading", "nft"],
        discoveredAt: new Date().toISOString(),
      },
    ];
  }

  // ── Categorization ─────────────────────────────────────────────────────

  categorizeAgent(agent: AgentProfile): AgentCategory {
    const caps = (agent.capabilities || []).map((c) => c.toLowerCase());
    const desc = (agent.description || "").toLowerCase();
    const combined = [...caps, desc].join(" ");

    if (combined.includes("trading") || combined.includes("defi"))
      return "trading-bot";
    if (combined.includes("crypto") || combined.includes("analysis"))
      return "crypto-analyst";
    if (combined.includes("social") || combined.includes("twitter"))
      return "social-agent";
    if (combined.includes("nft")) return "nft-agent";
    if (combined.includes("data") || combined.includes("research"))
      return "data-agent";
    if (combined.includes("solana") || combined.includes("defi"))
      return "defi-agent";
    return "general-purpose";
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private deduplicateAgents(agents: AgentProfile[]): AgentProfile[] {
    const seen = new Set<string>();
    return agents.filter((agent) => {
      const key = agent.walletAddress || agent.profileUrl || agent.agentName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getDiscovered(): AgentProfile[] {
    return Array.from(this.discovered.values());
  }

  getDiscoveredCount(): number {
    return this.discovered.size;
  }
}
