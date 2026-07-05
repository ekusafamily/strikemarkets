/**
 * House-Favored Pari-Mutuel Pricing Algorithm
 * 
 * Probabilities are volume-driven:
 *   Fair Price_i = pool_i / total_pool
 * 
 * House edges:
 *   - Buy price = fair * 1.20 (capped at 0.95)
 *   - Sell price = fair * 0.80
 *   - 10% transaction fee on all trades
 *   - 20% resolution rake on winning payouts
 */

const FEE_RATE = 0.10;       // 10% transaction fee
const BUY_MARKUP = 1.20;     // 20% overround on buys
const SELL_MARKDOWN = 0.80;  // 20% markdown on sells
const RESOLUTION_RAKE = 0.20; // 20% house rake on resolution

/**
 * Calculate fair probabilities for all options
 * @param {Array} options - [{id, pool_coins}]
 * @returns {Object} { [optionId]: fairPrice }
 */
export function getFairPrices(options) {
  const totalPool = options.reduce((sum, o) => sum + Number(o.pool_coins), 0);
  if (totalPool === 0) {
    const even = 1 / options.length;
    return Object.fromEntries(options.map(o => [o.id, even]));
  }
  return Object.fromEntries(
    options.map(o => [o.id, Number(o.pool_coins) / totalPool])
  );
}

/**
 * Calculate display (buy) prices with house overround
 * Prices are inflated by 20%, capped at 0.95
 * @param {Array} options - [{id, pool_coins}]
 * @returns {Object} { [optionId]: { fair, buy, sell } }
 */
export function getPrices(options) {
  const fairPrices = getFairPrices(options);
  const result = {};
  for (const o of options) {
    const fair = fairPrices[o.id];
    result[o.id] = {
      fair: fair,
      buy: Math.min(0.95, fair * BUY_MARKUP),
      sell: fair * SELL_MARKDOWN,
    };
  }
  return result;
}

/**
 * Calculate buy trade details
 * User spends `coins` to buy shares of `targetOptionId`
 * 
 * Process:
 * 1. Deduct 10% fee from coins
 * 2. Calculate shares at the buy price
 * 3. Add coins to the target option's pool (increases its probability)
 * 4. Compute spread profit (difference between what they pay and fair value)
 * 
 * @param {Array} options - [{id, pool_coins, total_shares_issued}]
 * @param {string} targetOptionId
 * @param {number} coins - Total coins the user wants to spend
 * @returns {Object} { shares, fee, netCoins, spreadProfit, newOptions, pricePerShare }
 */
export function calculateBuy(options, targetOptionId, coins) {
  if (coins <= 0) throw new Error('Amount must be positive');

  const fee = coins * FEE_RATE;
  const netCoins = coins - fee;

  // Get buy price BEFORE this trade
  const prices = getPrices(options);
  const buyPrice = prices[targetOptionId].buy;
  const fairPrice = prices[targetOptionId].fair;

  // Shares received = net coins / buy price
  const shares = netCoins / buyPrice;

  // Spread profit = what user paid (netCoins) minus fair value of shares (shares * fairPrice)
  const spreadProfit = netCoins - (shares * fairPrice);

  // Update the pool: add the net coins to the target option pool
  const newOptions = options.map(o => ({
    ...o,
    pool_coins: o.id === targetOptionId
      ? Number(o.pool_coins) + netCoins
      : Number(o.pool_coins),
    total_shares_issued: o.id === targetOptionId
      ? Number(o.total_shares_issued) + shares
      : Number(o.total_shares_issued),
  }));

  return {
    shares,
    fee,
    netCoins,
    spreadProfit,
    pricePerShare: buyPrice,
    newOptions,
    totalHouseProfit: fee + spreadProfit,
  };
}

/**
 * Calculate sell trade details
 * User sells `shares` of `targetOptionId` for coins
 * 
 * Process:
 * 1. Calculate coin value at the sell price (20% markdown)
 * 2. Deduct 2% fee
 * 3. Compute markdown profit (fair value - what they receive before fee)
 * 
 * @param {Array} options - [{id, pool_coins, total_shares_issued}]
 * @param {string} targetOptionId
 * @param {number} shares - Number of shares to sell
 * @returns {Object} { coins, fee, netCoins, markdownProfit, newOptions, pricePerShare }
 */
export function calculateSell(options, targetOptionId, shares) {
  if (shares <= 0) throw new Error('Shares must be positive');

  const prices = getPrices(options);
  const sellPrice = prices[targetOptionId].sell;
  const fairPrice = prices[targetOptionId].fair;

  // Gross coins = shares * sell price
  const grossCoins = shares * sellPrice;
  const fee = grossCoins * FEE_RATE;
  const netCoins = grossCoins - fee;

  // Markdown profit = fair value they should get minus what we give them (before fee)
  const markdownProfit = (shares * fairPrice) - grossCoins;

  // Update the pool: remove the coins from the target option pool
  const targetOption = options.find(o => o.id === targetOptionId);
  const maxRemovable = Number(targetOption.pool_coins) * 0.9; // never drain more than 90%
  const actualRemove = Math.min(grossCoins, maxRemovable);

  const newOptions = options.map(o => ({
    ...o,
    pool_coins: o.id === targetOptionId
      ? Math.max(1, Number(o.pool_coins) - actualRemove)
      : Number(o.pool_coins),
    total_shares_issued: o.id === targetOptionId
      ? Math.max(0, Number(o.total_shares_issued) - shares)
      : Number(o.total_shares_issued),
  }));

  return {
    grossCoins,
    fee,
    netCoins,
    markdownProfit,
    pricePerShare: sellPrice,
    newOptions,
    totalHouseProfit: fee + markdownProfit,
  };
}

/**
 * Calculate resolution payouts
 * House takes 20% of total pool, winners split remaining 80%
 * 
 * @param {Array} options - [{id, pool_coins, total_shares_issued}]
 * @param {string} winningOptionId
 * @param {Array} winnerPositions - [{user_id, shares}]
 * @returns {Object} { totalPool, houseRake, payoutPool, payoutPerShare, payouts }
 */
export function calculateResolution(options, winningOptionId, winnerPositions) {
  const totalPool = options.reduce((sum, o) => sum + Number(o.pool_coins), 0);
  const houseRake = totalPool * RESOLUTION_RAKE;
  const payoutPool = totalPool - houseRake;

  const totalWinningShares = winnerPositions.reduce((sum, p) => sum + Number(p.shares), 0);

  let payoutPerShare = 0;
  const payouts = [];

  if (totalWinningShares > 0) {
    payoutPerShare = payoutPool / totalWinningShares;
    for (const pos of winnerPositions) {
      payouts.push({
        user_id: pos.user_id,
        coins: Number(pos.shares) * payoutPerShare,
        shares: Number(pos.shares),
      });
    }
  } else {
    // No winners: house keeps everything
  }

  return {
    totalPool,
    houseRake: totalWinningShares > 0 ? houseRake : totalPool,
    payoutPool: totalWinningShares > 0 ? payoutPool : 0,
    payoutPerShare,
    payouts,
  };
}

export { FEE_RATE, BUY_MARKUP, SELL_MARKDOWN, RESOLUTION_RAKE };
