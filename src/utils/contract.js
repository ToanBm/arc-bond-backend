import { ethers } from 'ethers';
import { 
  RPC_URL, 
  KEEPER_PRIVATE_KEY, 
  BOND_SERIES_ADDRESS, 
  BOND_SERIES_ABI 
} from '../config.js';

/**
 * Get contract instance
 */
export function getBondSeriesContract() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const keeper = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(BOND_SERIES_ADDRESS, BOND_SERIES_ABI, keeper);
  
  return { contract, keeper, provider };
}

/**
 * Get keeper balance
 */
export async function getKeeperBalance() {
  const { keeper, provider } = getBondSeriesContract();
  const balance = await provider.getBalance(keeper.address);
  return balance;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

/**
 * Calculate time left until next record
 */
export function getTimeLeft(nextRecordTime) {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(nextRecordTime) - now;
  
  return {
    seconds: timeLeft,
    hours: timeLeft / 3600,
    canRecord: timeLeft <= 0
  };
}

