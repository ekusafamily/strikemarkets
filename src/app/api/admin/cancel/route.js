import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/admin/cancel - Cancel/void a market and refund all users
export async function POST(request) {
  try {
    const { createClient } = require('@/lib/supabase-server');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = user.id; const adminRes = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (!adminRes.rows[0]?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { market_id } = await request.json();
    if (!market_id) return NextResponse.json({ error: 'Missing market_id' }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const marketRes = await client.query('SELECT * FROM markets WHERE id = $1 FOR UPDATE', [market_id]);
      if (marketRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
      }
      if (marketRes.rows[0].status !== 'open') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Market already settled' }, { status: 400 });
      }

      // Get all positions with their pool values for refund
      const positionsRes = await client.query(
        `SELECT p.user_id, p.option_id, p.shares,
                mo.pool_coins, mo.total_shares_issued
         FROM positions p
         JOIN market_options mo ON mo.id = p.option_id
         WHERE p.market_id = $1 AND p.shares > 0`,
        [market_id]
      );

      // Refund each user based on their proportional stake
      // For cancel: refund actual coins spent (use transaction records)
      const txRes = await client.query(
        `SELECT user_id, SUM(CASE WHEN type = 'buy' THEN amount_coins ELSE -amount_coins END) as net_spent
         FROM transactions
         WHERE market_id = $1 AND type IN ('buy', 'sell')
         GROUP BY user_id`,
        [market_id]
      );

      let refundCount = 0;
      for (const row of txRes.rows) {
        const refund = Math.max(0, Number(row.net_spent));
        if (refund > 0) {
          await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [refund, row.user_id]);
          await client.query(
            `INSERT INTO transactions (user_id, market_id, type, amount_coins, amount_shares, price_per_share, fee_coins, house_profit)
             VALUES ($1, $2, 'redeem', $3, 0, 0, 0, 0)`,
            [row.user_id, market_id, refund]
          );
          refundCount++;
        }
      }

      // Refund the 100 VC seed liquidity to the market creator
      const creatorId = marketRes.rows[0].created_by;
      if (creatorId) {
        await client.query('UPDATE users SET balance = balance + 100 WHERE id = $1', [creatorId]);
      }

      // Mark market as canceled and zero out pools
      await client.query('UPDATE markets SET status = $1 WHERE id = $2', ['canceled', market_id]);
      await client.query('UPDATE positions SET shares = 0, updated_at = NOW() WHERE market_id = $1', [market_id]);
      await client.query('UPDATE market_options SET pool_coins = 0 WHERE market_id = $1', [market_id]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, refund_count: refundCount });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Cancel error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
