/**
 * Market Creator — On-chain market creation
 *
 * Signs and sends create_lab_market_sol transactions to Baozi program.
 * Uses existing CreatorProfile PDA for 0.5% creator fees.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { config, CONFIG_PDA, CREATE_LAB_MARKET_SOL_DISCRIMINATOR, MARKET_COUNT_OFFSET } from './config';
import { MarketProposal } from './news-detector';
import { recordMarket } from './tracker';

let connection: Connection;
let keypair: Keypair;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.rpcEndpoint, 'confirmed');
  }
  return connection;
}

function getKeypair(): Keypair {
  if (!keypair) {
    const secretKey = bs58.decode(config.privateKey);
    keypair = Keypair.fromSecretKey(secretKey);
  }
  return keypair;
}

// =============================================================================
// PDA DERIVATION
// =============================================================================

function deriveMarketPda(marketId: bigint): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(marketId);
  return PublicKey.findProgramAddressSync(
    [config.seeds.MARKET, buf],
    config.programId
  );
}

function deriveCreatorProfilePda(creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator_profile'), creator.toBuffer()],
    config.programId
  );
}

// =============================================================================
// GET NEXT MARKET ID
// =============================================================================

async function getNextMarketId(): Promise<bigint> {
  const conn = getConnection();
  const configAccount = await conn.getAccountInfo(CONFIG_PDA);
  if (!configAccount) {
    throw new Error('GlobalConfig not found on-chain');
  }
  return configAccount.data.readBigUInt64LE(MARKET_COUNT_OFFSET);
}

// =============================================================================
// BUILD & SEND TRANSACTION
// =============================================================================

export interface CreateMarketResult {
  success: boolean;
  marketPda: string;
  marketId: number;
  txSignature: string;
  error?: string;
}

export async function createLabMarket(proposal: MarketProposal): Promise<CreateMarketResult> {
  const conn = getConnection();
  const kp = getKeypair();
  const creatorPubkey = kp.publicKey;

  try {
    // 1. Get current market count
    const marketId = await getNextMarketId();
    const [marketPda] = deriveMarketPda(marketId);
    const [creatorProfilePda] = deriveCreatorProfilePda(creatorPubkey);

    // 2. Check creator profile exists (we created it earlier)
    const creatorProfileInfo = await conn.getAccountInfo(creatorProfilePda);
    const hasCreatorProfile = creatorProfileInfo !== null;

    if (!hasCreatorProfile) {
      console.warn('⚠️ No CreatorProfile found — markets will not earn creator fees');
    }

    // 3. Encode instruction data
    const closingTimeSec = BigInt(Math.floor(proposal.closingTime.getTime() / 1000));
    const resolutionBuffer = BigInt(config.defaultResolutionBufferSec);
    const autoStopBuffer = BigInt(config.defaultAutoStopBufferSec);
    const resolutionMode = 1; // CouncilOracle
    const council = [creatorPubkey]; // Creator is the council
    const councilThreshold = 1;

    const questionBytes = Buffer.from(proposal.question, 'utf8');
    const size = 8 + 4 + questionBytes.length + 8 + 8 + 8 + 1 + 4 + (council.length * 32) + 1;
    const data = Buffer.alloc(size);
    let offset = 0;

    CREATE_LAB_MARKET_SOL_DISCRIMINATOR.copy(data, offset); offset += 8;
    data.writeUInt32LE(questionBytes.length, offset); offset += 4;
    questionBytes.copy(data, offset); offset += questionBytes.length;
    data.writeBigInt64LE(closingTimeSec, offset); offset += 8;
    data.writeBigInt64LE(resolutionBuffer, offset); offset += 8;
    data.writeBigInt64LE(autoStopBuffer, offset); offset += 8;
    data.writeUInt8(resolutionMode, offset); offset += 1;
    data.writeUInt32LE(council.length, offset); offset += 4;
    for (const member of council) {
      member.toBuffer().copy(data, offset); offset += 32;
    }
    data.writeUInt8(councilThreshold, offset);

    // 4. Build accounts
    const keys = [
      { pubkey: CONFIG_PDA, isSigner: false, isWritable: true },
      { pubkey: marketPda, isSigner: false, isWritable: true },
      { pubkey: config.configTreasury, isSigner: false, isWritable: true },
      { pubkey: creatorPubkey, isSigner: true, isWritable: true },
      {
        pubkey: hasCreatorProfile ? creatorProfilePda : config.programId,
        isSigner: false,
        isWritable: hasCreatorProfile,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
      programId: config.programId,
      keys,
      data,
    });

    // 5. Build, sign, send transaction
    const transaction = new Transaction().add(instruction);
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    const txSignature = await sendAndConfirmTransaction(conn, transaction, [kp], {
      commitment: 'confirmed',
      maxRetries: 3,
    });

    console.log(`\n🎉 Market created on-chain!`);
    console.log(`   Question: "${proposal.question}"`);
    console.log(`   Market PDA: ${marketPda.toBase58()}`);
    console.log(`   Market ID: ${Number(marketId)}`);
    console.log(`   TX: ${txSignature}`);
    console.log(`   Closing: ${proposal.closingTime.toISOString()}`);
    console.log(`   Category: ${proposal.category}`);

    // 6. Record in database
    recordMarket({
      market_pda: marketPda.toBase58(),
      market_id: Number(marketId),
      question: proposal.question,
      category: proposal.category,
      source: proposal.source,
      source_url: proposal.sourceUrl,
      closing_time: proposal.closingTime.toISOString(),
      resolution_outcome: null,
      tx_signature: txSignature,
    });

    return {
      success: true,
      marketPda: marketPda.toBase58(),
      marketId: Number(marketId),
      txSignature,
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`\n❌ Failed to create market: ${errorMsg}`);

    // Parse Solana program errors
    if (errorMsg.includes('custom program error')) {
      const codeMatch = errorMsg.match(/0x(\w+)/);
      if (codeMatch) {
        const code = parseInt(codeMatch[1], 16);
        console.error(`   Program error code: ${code}`);
      }
    }

    return {
      success: false,
      marketPda: '',
      marketId: 0,
      txSignature: '',
      error: errorMsg,
    };
  }
}

// =============================================================================
// CHECK WALLET BALANCE
// =============================================================================

export async function getWalletBalance(): Promise<number> {
  const conn = getConnection();
  const kp = getKeypair();
  const balance = await conn.getBalance(kp.publicKey);
  return balance / 1_000_000_000; // lamports to SOL
}

export async function canAffordMarketCreation(): Promise<boolean> {
  const balance = await getWalletBalance();
  // Need 0.01 SOL creation fee + ~0.005 SOL for tx fee + rent
  const needed = 0.015;
  if (balance < needed) {
    console.warn(`⚠️ Low balance: ${balance.toFixed(4)} SOL (need ${needed} SOL for market creation)`);
    return false;
  }
  return true;
}
