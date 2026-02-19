// Shared types for Claim & Alert Agent

export interface WalletConfig {
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

export interface MarketSnapshot {
  pda: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  status: string;
  closingTime?: string;
}

export const DEFAULT_ALERTS: WalletConfig['alerts'] = {
  claimable: true,
  closingSoon: true,
  closingSoonHours: 6,
  oddsShift: true,
  oddsShiftThreshold: 10,
};
