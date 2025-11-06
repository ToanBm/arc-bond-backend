import { DISCORD_WEBHOOK_URL } from '../config.js';

/**
 * Send notification to Discord
 */
export async function notifyDiscord(title, fields = [], color = 0x00ff00) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('📢 Discord notification skipped (no webhook configured)');
    return;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: title,
          fields: fields,
          color: color,
          timestamp: new Date().toISOString(),
          footer: { text: 'ArcBond Keeper' }
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Discord notification sent');
    } else {
      console.log('⚠️ Discord notification failed:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Discord notification error:', error.message);
  }
}

/**
 * Notify snapshot success
 */
export async function notifySnapshotSuccess(recordId, totalSupply, treasuryBalance, txHash) {
  const couponDue = (BigInt(totalSupply) * BigInt(1000)) / BigInt(1e6); // Both 6 decimals
  
  await notifyDiscord(
    '📸 Snapshot Recorded',
    [
      { name: 'Record ID', value: recordId.toString(), inline: true },
      { name: 'Total Supply', value: `${(Number(totalSupply) / 1e6).toFixed(2)} arcUSDC`, inline: true },
      { name: 'Treasury', value: `${(Number(treasuryBalance) / 1e6).toFixed(2)} USDC`, inline: true },
      { name: 'Coupon Due', value: `${(Number(couponDue) / 1e6).toFixed(6)} USDC`, inline: false },
      { name: 'Transaction', value: `[View on Explorer](https://testnet.arcscan.app/tx/${txHash})`, inline: false },
      { name: '📝 Next Step', value: 'Owner should distribute coupon now!', inline: false }
    ],
    0x00ff00 // Green
  );
}

/**
 * Notify snapshot error
 */
export async function notifySnapshotError(error) {
  await notifyDiscord(
    '🚨 Snapshot Failed',
    [
      { name: 'Error', value: error.message.substring(0, 1000), inline: false },
      { name: 'Time', value: new Date().toISOString(), inline: false }
    ],
    0xff0000 // Red
  );
}

/**
 * Notify keeper low balance
 */
export async function notifyLowBalance(balance) {
  await notifyDiscord(
    '⚠️ Keeper Balance Low',
    [
      { name: 'Current Balance', value: `${(Number(balance) / 1e18).toFixed(2)} USDC`, inline: true },
      { name: 'Action Required', value: 'Please refill keeper wallet for gas fees', inline: false }
    ],
    0xffa500 // Orange
  );
}

/**
 * Notify too soon (skip snapshot)
 */
export async function notifyTooSoon(hoursLeft) {
  console.log(`⏰ Too soon to snapshot. ${hoursLeft.toFixed(1)} hours left.`);
  // Don't send Discord for this - it's normal behavior
}

