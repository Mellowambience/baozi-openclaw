// ── x402 Payment Layer ──────────────────────────────────────────────────────
// x402 is a protocol for HTTP-native micropayments.
// See: https://www.x402.org/
//
// Current status (Feb 2026): x402 spec is defined but infrastructure for
// Solana mainnet is not yet fully deployed. This implementation builds the
// complete payment flow and documents exactly where live x402 calls slot in.
//
// When x402 Solana support lands:
//   1. Replace simulateX402Payment() with real HTTP 402 flow
//   2. Replace verifyX402Receipt() with real receipt verification
//   3. Everything else (marketplace, reputation, affiliate flow) stays unchanged

import { randomUUID } from "crypto";
import type { X402Payment, X402PaymentStatus } from "../types.js";
import { X402_MODE, X402_MIN_PRICE_SOL, X402_MAX_PRICE_SOL } from "../utils/constants.js";

// ── Payment Request ────────────────────────────────────────────────────────

export interface X402PaymentRequest {
  resource: string;      // URL/identifier of the paywalled resource
  amountSol: number;     // price in SOL
  recipientWallet: string;
  payerWallet: string;
  description: string;
}

export interface X402PaymentReceipt {
  paymentId: string;
  txSignature?: string;  // real on-chain tx when live
  timestamp: string;
  verified: boolean;
}

// ── x402 Protocol Simulation ───────────────────────────────────────────────
//
// Real x402 flow (when protocol is live on Solana):
//
//   1. Client requests resource → Server responds HTTP 402:
//      {
//        "x402Version": 1,
//        "accepts": [{ "scheme": "exact", "network": "solana", "maxAmountRequired": "0.01" }],
//        "paymentRequiredMessage": "Pay 0.01 SOL to access analysis"
//      }
//
//   2. Client constructs payment:
//      const payment = await x402Client.pay({
//        amount: "0.01",
//        network: "solana",
//        recipient: recipientWallet,
//        resource: resourceUrl,
//      });
//
//   3. Client retries with X-Payment header:
//      headers: { "X-Payment": payment.header }
//
//   4. Server verifies payment on-chain and serves resource.
//
// For now: we simulate this flow with full logging of each step.

export async function processX402Payment(
  request: X402PaymentRequest
): Promise<X402Payment> {
  console.log(`[x402] Initiating payment for resource: ${request.resource}`);
  console.log(`[x402] Amount: ${request.amountSol} SOL`);
  console.log(`[x402] From: ${request.payerWallet.slice(0, 8)}...`);
  console.log(`[x402] To: ${request.recipientWallet.slice(0, 8)}...`);

  if (request.amountSol < X402_MIN_PRICE_SOL || request.amountSol > X402_MAX_PRICE_SOL) {
    throw new Error(`x402: amount ${request.amountSol} SOL out of range [${X402_MIN_PRICE_SOL}, ${X402_MAX_PRICE_SOL}]`);
  }

  const paymentId = randomUUID();

  if (X402_MODE === "simulation") {
    return simulateX402Payment(request, paymentId);
  }

  // ── LIVE x402 flow (uncomment when protocol deployed) ──
  // return executeX402Payment(request, paymentId);

  return simulateX402Payment(request, paymentId);
}

// ── Simulation (current) ───────────────────────────────────────────────────

async function simulateX402Payment(
  request: X402PaymentRequest,
  paymentId: string
): Promise<X402Payment> {
  console.log(`[x402:sim] Step 1: Server returns HTTP 402 for ${request.resource}`);
  console.log(`[x402:sim] Step 2: Client constructs payment payload (${request.amountSol} SOL)`);
  console.log(`[x402:sim] Step 3: Client retries with X-Payment header`);
  console.log(`[x402:sim] Step 4: Server verifies payment — SIMULATED`);
  console.log(`[x402:sim] Payment ID: ${paymentId}`);

  const payment: X402Payment = {
    id: paymentId,
    buyerWallet: request.payerWallet,
    analystWallet: request.recipientWallet,
    listingId: request.resource,
    amountSol: request.amountSol,
    status: "simulated",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    txSignature: `sim_${paymentId.replace(/-/g, "").slice(0, 32)}`, // placeholder
  };

  return payment;
}

// ── Receipt Verification ───────────────────────────────────────────────────

export async function verifyX402Receipt(
  payment: X402Payment
): Promise<X402PaymentReceipt> {
  if (payment.status === "simulated") {
    console.log(`[x402] Verifying simulated payment: ${payment.id}`);
    return {
      paymentId: payment.id,
      txSignature: payment.txSignature,
      timestamp: new Date().toISOString(),
      verified: true, // simulated — always true
    };
  }

  // ── Live verification (when x402 deployed) ──
  // const receipt = await x402Client.verifyPayment(payment.txSignature);
  // return { paymentId: payment.id, txSignature: payment.txSignature, timestamp: receipt.timestamp, verified: receipt.valid };

  return {
    paymentId: payment.id,
    txSignature: payment.txSignature,
    timestamp: new Date().toISOString(),
    verified: payment.status === "completed",
  };
}

// ── HTTP 402 Response Builder ──────────────────────────────────────────────
// What a real server would return when requesting paywalled analysis

export function buildHttp402Response(amountSol: number, recipientWallet: string) {
  return {
    statusCode: 402,
    headers: { "Content-Type": "application/json" },
    body: {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "solana-mainnet",
          maxAmountRequired: amountSol.toString(),
          resource: `https://intel-marketplace.railway.app/api/analysis`,
          description: `Pay ${amountSol} SOL to access market analysis`,
          mimeType: "application/json",
          payTo: recipientWallet,
          maxTimeoutSeconds: 300,
        },
      ],
      error: "X-PAYMENT required",
    },
  };
}

// ── Payment History ────────────────────────────────────────────────────────

export function summarizePayments(payments: X402Payment[]): {
  total: number;
  completed: number;
  simulated: number;
  totalSol: number;
} {
  return {
    total: payments.length,
    completed: payments.filter((p) => p.status === "completed").length,
    simulated: payments.filter((p) => p.status === "simulated").length,
    totalSol: payments.reduce((sum, p) => sum + p.amountSol, 0),
  };
}
