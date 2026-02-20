export interface AgentProfile {
  wallet: string;
  name: string;
  avatar?: string;
}

export interface Position {
  marketPda: string;
  marketQuestion: string;
  side: "Yes" | "No";
  amount: number;
  currentOdds: number;
  unrealizedPnl: number;
  closingAt?: string;
}

export interface AgentStats {
  wallet: string;
  name: string;
  openPositions: Position[];
  totalWagered: number;
  solWon: number;
  solLost: number;
  accuracy: number; // 0-1
  totalResolved: number;
  correctResolved: number;
  streak: number;
  rank?: number;
}

export interface MarketState {
  pda: string;
  question: string;
  yesPool: number;
  noPool: number;
  totalPool: number;
  yesOdds: number;
  noOdds: number;
  closingAt: string;
  layer: string;
  agentPositions: { wallet: string; name: string; side: string; amount: number; pnl: number }[];
}

export interface ArenaSnapshot {
  timestamp: string;
  agents: AgentStats[];
  markets: MarketState[];
}
