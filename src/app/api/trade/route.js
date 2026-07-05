import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { calculateBuy, calculateSell, getFairPrices } from '@/lib/parimutuel';

// POST /api/trade - Execute a buy or sell trade
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { market_id, option_id, action, amount } = await request.json();
    // action: 'buy' or 'sell'
    // amount: coins for buy, shares for sell

    if (!market_id || !option_id || !action || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check market is open
      const marketRes = await client.query('SELECT * FROM markets WHERE id = $1 FOR UPDATE', [market_id]);
      if (marketRes.rows.length === 0 || marketRes.rows[0].status !== 'open') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Market is not open for trading' }, { status: 400 });
      }

      // Get user
      const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const user = userRes.rows[0];

      // Get options
      const optionsRes = await client.query(
        'SELECT * FROM market_options WHERE market_id = $1 FOR UPDATE',
        [market_id]
      );
      const options = optionsRes.rows;

      if (action === 'buy') {
        const coins = Number(amount);
        if (coins > Number(user.balance)) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }
        if (coins < 1) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Minimum trade is 1 coin' }, { status: 400 });
        }

        const result = calculateBuy(options, option_id, coins);

        // Deduct coins from user
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [coins, userId]);

        // Update option pool
        for (const o of result.newOptions) {
          await client.query(
            'UPDATE market_options SET pool_coins = $1, total_shares_issued = $2 WHERE id = $3',
            [o.pool_coins, o.total_shares_issued, o.id]
          );
        }

        // Upsert position
        await client.query(
          `INSERT INTO positions (user_id, market_id, option_id, shares, updated_at) 
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id, market_id, option_id) 
           DO UPDATE SET shares = positions.shares + $4, updated_at = NOW()`,
          [userId, market_id, option_id, result.shares]
        );

        // Log transaction
        await client.query(
          `INSERT INTO transactions (user_id, market_id, option_id, type, amount_coins, amount_shares, price_per_share, fee_coins, house_profit) 
           VALUES ($1, $2, $3, 'buy', $4, $5, $6, $7, $8)`,
          [userId, market_id, option_id, coins, result.shares, result.pricePerShare, result.fee, result.totalHouseProfit]
        );

        // Update system stats
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_volume'`, [coins]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_fees'`, [result.fee]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_spread_profit'`, [result.spreadProfit]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_house_profit'`, [result.totalHouseProfit]);

        await client.query('COMMIT');

        // Record price snapshot for chart
        const updatedOpts = await pool.query('SELECT * FROM market_options WHERE market_id = $1', [market_id]);
        const fairPrices = getFairPrices(updatedOpts.rows);
        for (const o of updatedOpts.rows) {
          await pool.query(
            'INSERT INTO price_history (market_id, option_id, fair_price) VALUES ($1, $2, $3)',
            [market_id, o.id, fairPrices[o.id]]
          );
        }

        return NextResponse.json({
          success: true,
          trade: {
            action: 'buy',
            coins_spent: coins,
            shares_received: result.shares,
            price_per_share: result.pricePerShare,
            fee: result.fee,
          }
        });

      } else if (action === 'sell') {
        const shares = Number(amount);

        // Check user position
        const posRes = await client.query(
          'SELECT * FROM positions WHERE user_id = $1 AND market_id = $2 AND option_id = $3 FOR UPDATE',
          [userId, market_id, option_id]
        );
        if (posRes.rows.length === 0 || Number(posRes.rows[0].shares) < shares) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 });
        }

        const result = calculateSell(options, option_id, shares);

        // Add coins to user
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [result.netCoins, userId]);

        // Update option pool
        for (const o of result.newOptions) {
          await client.query(
            'UPDATE market_options SET pool_coins = $1, total_shares_issued = $2 WHERE id = $3',
            [o.pool_coins, o.total_shares_issued, o.id]
          );
        }

        // Update position
        await client.query(
          'UPDATE positions SET shares = shares - $1, updated_at = NOW() WHERE user_id = $2 AND market_id = $3 AND option_id = $4',
          [shares, userId, market_id, option_id]
        );

        // Log transaction
        await client.query(
          `INSERT INTO transactions (user_id, market_id, option_id, type, amount_coins, amount_shares, price_per_share, fee_coins, house_profit) 
           VALUES ($1, $2, $3, 'sell', $4, $5, $6, $7, $8)`,
          [userId, market_id, option_id, result.netCoins, shares, result.pricePerShare, result.fee, result.totalHouseProfit]
        );

        // Update system stats
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_volume'`, [result.grossCoins]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_fees'`, [result.fee]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_spread_profit'`, [result.markdownProfit]);
        await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_house_profit'`, [result.totalHouseProfit]);

        await client.query('COMMIT');

        // Record price snapshot for chart
        const updatedOptsSell = await pool.query('SELECT * FROM market_options WHERE market_id = $1', [market_id]);
        const fairPricesSell = getFairPrices(updatedOptsSell.rows);
        for (const o of updatedOptsSell.rows) {
          await pool.query(
            'INSERT INTO price_history (market_id, option_id, fair_price) VALUES ($1, $2, $3)',
            [market_id, o.id, fairPricesSell[o.id]]
          );
        }

        return NextResponse.json({
          success: true,
          trade: {
            action: 'sell',
            shares_sold: shares,
            coins_received: result.netCoins,
            price_per_share: result.pricePerShare,
            fee: result.fee,
          }
        });

      } else {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Invalid action. Use "buy" or "sell"' }, { status: 400 });
      }

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Trade error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
