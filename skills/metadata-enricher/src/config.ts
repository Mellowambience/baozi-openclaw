import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  walletAddress: process.env.WALLET_ADDRESS || '',
  privateKey: process.env.PRIVATE_KEY || '',
  apiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '30', 10),
};
