import { ethers } from 'ethers';
import { 
  getBondSeriesContract, 
  getKeeperBalance, 
  formatTimestamp, 
  getTimeLeft 
} from './utils/contract.js';
import {
  notifySnapshotSuccess,
  notifySnapshotError,
  notifyLowBalance,
  notifyTooSoon
} from './utils/notify.js';

/**
 * Main snapshot function
 */
export async function recordSnapshot() {
  console.log('\n' + '='.repeat(60));
  console.log('📸 ArcBond Daily Snapshot');
  console.log('='.repeat(60));
  console.log('Time:', new Date().toISOString());

  try {
    const { contract, keeper } = getBondSeriesContract();
    
    console.log('\n📍 Keeper address:', keeper.address);
    
    // Check keeper balance (native token on Arc = USDC with 18 decimals)
    const keeperBalance = await getKeeperBalance();
    console.log('💰 Keeper balance:', ethers.formatUnits(keeperBalance, 18), 'USDC');
    
    const MIN_BALANCE = ethers.parseUnits('1', 18); // 1 USDC (native token)
    if (keeperBalance < MIN_BALANCE) {
      console.log('⚠️ WARNING: Keeper balance low!');
      await notifyLowBalance(keeperBalance);
    }
    
    // Get timing info
    const nextRecordTime = await contract.nextRecordTime();
    const recordCount = await contract.recordCount();
    
    console.log('\n📊 Contract Status:');
    console.log('   Record Count:', recordCount.toString());
    console.log('   Next Record Time:', formatTimestamp(nextRecordTime));
    
    // Check if can record
    const timeLeft = getTimeLeft(nextRecordTime);
    
    if (!timeLeft.canRecord) {
      console.log(`\n⏰ Too soon! Need to wait ${timeLeft.hours.toFixed(1)} hours`);
      await notifyTooSoon(timeLeft.hours);
      return { success: false, reason: 'too_soon' };
    }
    
    console.log('\n✅ Can record snapshot now!');
    
    // Record snapshot
    console.log('⏳ Sending transaction...');
    const tx = await contract.recordSnapshot();
    console.log('📤 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    // Get snapshot data
    const newRecordCount = await contract.recordCount();
    const snapshot = await contract.snapshots(newRecordCount);
    
    console.log('\n📸 Snapshot Recorded:');
    console.log('   Record ID:', snapshot.recordId.toString());
    console.log('   Total Supply:', ethers.formatUnits(snapshot.totalSupply, 18), 'arcUSDC');
    console.log('   Treasury:', ethers.formatUnits(snapshot.treasuryBalance, 6), 'USDC');
    console.log('   Timestamp:', formatTimestamp(snapshot.timestamp));
    
    // Calculate coupon due: 1% of totalSupply (arcUSDC is 18 decimals, USDC is 6 decimals)
    const couponDue = snapshot.totalSupply / BigInt(100) / BigInt(1e12);
    console.log('\n💰 Coupon Due:', ethers.formatUnits(couponDue, 6), 'USDC');
    console.log('   (Owner should distribute this amount)');
    
    // Send notification
    await notifySnapshotSuccess(
      snapshot.recordId,
      snapshot.totalSupply,
      snapshot.treasuryBalance,
      tx.hash
    );
    
    console.log('\n🔗 Explorer:', `https://testnet.arcscan.app/tx/${tx.hash}`);
    console.log('='.repeat(60));
    
    return {
      success: true,
      recordId: snapshot.recordId.toString(),
      txHash: tx.hash,
      totalSupply: snapshot.totalSupply.toString(),
      treasuryBalance: snapshot.treasuryBalance.toString(),
      couponDue: couponDue.toString()
    };
    
  } catch (error) {
    console.error('\n❌ Snapshot failed:', error.message);
    
    // Parse common errors
    if (error.message.includes('TooSoon')) {
      console.log('   Reason: Too soon to record (24h interval)');
      return { success: false, reason: 'too_soon', error: error.message };
    }
    
    if (error.message.includes('insufficient funds')) {
      console.log('   Reason: Keeper wallet has insufficient USDC for gas');
      await notifyLowBalance(0n);
      return { success: false, reason: 'insufficient_funds', error: error.message };
    }
    
    // Send error notification
    await notifySnapshotError(error);
    
    console.log('='.repeat(60));
    return { success: false, reason: 'error', error: error.message };
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recordSnapshot()
    .then(result => {
      console.log('\n📋 Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

