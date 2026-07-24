/**
 * Celo Blockchain Integration Service
 * 
 * This service handles all interactions with the Celo blockchain for stablecoin operations.
 * Requires: viem package for blockchain interactions
 * 
 * IMPORTANT: Replace placeholder values with your actual credentials before deployment
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ==================== CONFIGURATION ====================
// TODO: Replace these with your actual values from environment variables

const CONFIG = {
  // Celo RPC URLs - Get from providers like Infura, QuickNode, or Alchemy
  CELO_MAINNET_RPC: process.env.REACT_APP_CELO_RPC || 'https://forno.celo.org', // Free public RPC
  CELO_TESTNET_RPC: process.env.REACT_APP_CELO_TESTNET_RPC || 'https://alfajores-forno.celo-testnet.org',
  
  // Use testnet for development, mainnet for production
  USE_TESTNET: process.env.REACT_APP_USE_TESTNET === 'true' || true,
  
  // Master wallet private key (KEEP THIS SECRET!)
  // Generate using: const account = privateKeyToAccount(generatePrivateKey())
  MASTER_PRIVATE_KEY: process.env.REACT_APP_MASTER_WALLET_KEY || '0xYOUR_PRIVATE_KEY_HERE',
  
  // Multi-sig wallet addresses for cold storage (generate these separately)
  COLD_STORAGE_WALLETS: [
    '0xYOUR_COLD_WALLET_1',
    '0xYOUR_COLD_WALLET_2',
    '0xYOUR_COLD_WALLET_3',
  ],
};

// Celo Stablecoin Contract Addresses (Mainnet)
export const STABLECOIN_CONTRACTS = {
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Native CELO token (wrapped)
} as const;

// Testnet contracts (Alfajores)
const TESTNET_CONTRACTS = {
  cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
  cEUR: '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F',
  USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
  CELO: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9', // Testnet CELO
} as const;

// ERC20 ABI for stablecoin interactions
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ==================== CLIENT SETUP ====================

const getChain = () => (CONFIG.USE_TESTNET ? celoAlfajores : celo);
const getRPC = () => (CONFIG.USE_TESTNET ? CONFIG.CELO_TESTNET_RPC : CONFIG.CELO_MAINNET_RPC);
const getContracts = () => (CONFIG.USE_TESTNET ? TESTNET_CONTRACTS : STABLECOIN_CONTRACTS);

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: getChain(),
  transport: http(getRPC()),
});

// Wallet client for sending transactions (only on backend!)
let walletClient: any = null;

// Initialize wallet client (should only be called on backend)
export function initializeWalletClient() {
  if (!CONFIG.MASTER_PRIVATE_KEY || CONFIG.MASTER_PRIVATE_KEY === '0xYOUR_PRIVATE_KEY_HERE') {
    return null;
  }

  try {
    const account = privateKeyToAccount(CONFIG.MASTER_PRIVATE_KEY as `0x${string}`);
    walletClient = createWalletClient({
      account,
      chain: getChain(),
      transport: http(getRPC()),
    });
    return walletClient;
  } catch (error) {
    return null;
  }
}

// ==================== WALLET OPERATIONS ====================

export interface CeloWallet {
  address: string;
  privateKey: string;
  userId: string;
  createdAt: Date;
}

/**
 * Creates a new custodial wallet for a user
 * In production, store the privateKey ENCRYPTED in your secure database
 */
export async function createUserWallet(userId: string): Promise<CeloWallet> {
  // Generate a new random account
  const { privateKey } = await import('viem/accounts');
  const account = privateKeyToAccount(privateKey());

  return {
    address: account.address,
    privateKey: privateKey(), // ENCRYPT THIS before storing!
    userId,
    createdAt: new Date(),
  };
}

/**
 * Gets the balance of a specific stablecoin for an address
 */
export async function getStablecoinBalance(
  address: string,
  stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO'
): Promise<number> {
  try {
    const contracts = getContracts();
    const contractAddress = contracts[stablecoin];

    const balance = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    // Convert from smallest unit (18 decimals) to human-readable
    return parseFloat(formatUnits(balance as bigint, 18));
  } catch (error) {
    throw error;
  }
}

/**
 * Gets all stablecoin balances for an address
 */
export async function getAllBalances(address: string): Promise<{
  cUSD: number;
  cEUR: number;
  USDC: number;
  totalUSD: number;
}> {
  const [cUSD, cEUR, USDC] = await Promise.all([
    getStablecoinBalance(address, 'cUSD'),
    getStablecoinBalance(address, 'cEUR'),
    getStablecoinBalance(address, 'USDC'),
  ]);

  // For simplicity, assume 1 EUR = 1.1 USD
  const totalUSD = cUSD + cEUR * 1.1 + USDC;

  return { cUSD, cEUR, USDC, totalUSD };
}

// ==================== TRANSACTION OPERATIONS ====================

export interface TransferParams {
  from: string;
  fromPrivateKey: string;
  to: string;
  amount: number;
  stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO';
}

/**
 * Transfers stablecoin from one address to another
 * IMPORTANT: This should only be called from a secure backend!
 */
export async function transferStablecoin(params: TransferParams): Promise<{
  txHash: string;
  success: boolean;
  blockNumber?: bigint;
}> {
  const { from, fromPrivateKey, to, amount, stablecoin } = params;

  try {
    // Create account from private key
    const account = privateKeyToAccount(fromPrivateKey as `0x${string}`);

    // Create wallet client for this specific account
    const client = createWalletClient({
      account,
      chain: getChain(),
      transport: http(getRPC()),
    });

    const contracts = getContracts();
    const contractAddress = contracts[stablecoin];

    // Convert amount to smallest unit (18 decimals)
    const amountInWei = parseUnits(amount.toString(), 18);

    // Send transfer transaction
    const hash = await client.writeContract({
      address: contractAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountInWei],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      txHash: hash,
      success: receipt.status === 'success',
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Batch transfer to multiple addresses (gas efficient)
 */
export async function batchTransfer(
  fromPrivateKey: string,
  transfers: Array<{ to: string; amount: number; stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO' }>
): Promise<Array<{ to: string; txHash: string; success: boolean }>> {
  const results = [];

  for (const transfer of transfers) {
    try {
      const result = await transferStablecoin({
        from: '', // Will be derived from privateKey
        fromPrivateKey,
        to: transfer.to,
        amount: transfer.amount,
        stablecoin: transfer.stablecoin,
      });

      results.push({
        to: transfer.to,
        txHash: result.txHash,
        success: result.success,
      });
    } catch (error) {
      results.push({
        to: transfer.to,
        txHash: '',
        success: false,
      });
    }
  }

  return results;
}

// ==================== SETTLEMENT HELPERS ====================

/**
 * Converts fiat amount to equivalent stablecoin amount
 */
export function convertFiatToStablecoin(
  fiatAmount: number,
  fiatCurrency: string,
  fxRates: Record<string, number>
): { stablecoin: 'cUSD' | 'cEUR' | 'USDC'; amount: number } {
  // Default to cUSD for most currencies
  let stablecoin: 'cUSD' | 'cEUR' | 'USDC' = 'cUSD';
  let amount = fiatAmount;

  if (fiatCurrency === 'EUR') {
    stablecoin = 'cEUR';
  } else if (fiatCurrency !== 'USD') {
    // Convert to USD equivalent
    const rate = fxRates[fiatCurrency] || 1;
    amount = fiatAmount / rate;
  }

  return { stablecoin, amount };
}

/**
 * Estimates gas cost for a transaction
 */
export async function estimateTransactionCost(
  to: string,
  amount: number,
  stablecoin: 'cUSD' | 'cEUR' | 'USDC' | 'CELO'
): Promise<{ gasCost: number; gasCostUSD: number }> {
  try {
    const contracts = getContracts();
    const contractAddress = contracts[stablecoin];
    const amountInWei = parseUnits(amount.toString(), 18);

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: contractAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountInWei],
    });

    // Get gas price
    const gasPrice = await publicClient.getGasPrice();

    // Calculate cost
    const gasCost = Number(gasEstimate * gasPrice);
    const gasCostInCelo = parseFloat(formatUnits(BigInt(gasCost), 18));

    // Assume 1 CELO = $0.50 (update with real price feed)
    const gasCostUSD = gasCostInCelo * 0.5;

    return { gasCost: gasCostInCelo, gasCostUSD };
  } catch (error) {
    return { gasCost: 0.001, gasCostUSD: 0.0005 }; // Default estimate
  }
}

// ==================== MONITORING & UTILITIES ====================

/**
 * Gets transaction details by hash
 */
export async function getTransactionDetails(txHash: string) {
  try {
    const [transaction, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: txHash as `0x${string}` }),
      publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }),
    ]);

    return {
      transaction,
      receipt,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Checks if an address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Gets current block number
 */
export async function getCurrentBlockNumber(): Promise<bigint> {
  return await publicClient.getBlockNumber();
}

// ==================== HEALTH CHECK ====================

export async function healthCheck(): Promise<{
  connected: boolean;
  blockNumber?: bigint;
  network?: string;
  error?: string;
}> {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const chain = getChain();

    return {
      connected: true,
      blockNumber,
      network: chain.name,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}