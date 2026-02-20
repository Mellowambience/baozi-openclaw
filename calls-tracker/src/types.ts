export interface Call {
  id: string;
  caller: string;
  walletAddress?: string;
  predictionText: string;
  marketQuestion: string;
  marketType: "A" | "B";
  closeTime: Date;
  eventTime?: Date;
  measurementStart?: Date;
  dataSource: string;
  resolutionCriteria: string;
  betAmount: number; // SOL
  side: "Yes" | "No";
  marketPda?: string;
  status: "pending" | "created" | "resolved";
  outcome?: "win" | "loss" | "pending";
  createdAt: Date;
}

export interface CallerReputation {
  caller: string;
  walletAddress?: string;
  totalCalls: number;
  correctCalls: number;
  pendingCalls: number;
  solWagered: number;
  solWon: number;
  solLost: number;
  hitRate: number;
  streak: number;
  longestStreak: number;
  confidenceScore: number;
  calls: Call[];
}

export interface MarketParams {
  question: string;
  type: "A" | "B";
  closeTime: Date;
  eventTime?: Date;
  measurementStart?: Date;
  dataSource: string;
  resolutionCriteria: string;
}

export interface BaoziMcpResponse {
  success: boolean;
  transaction?: string;
  marketPda?: string;
  error?: string;
  data?: any;
}
