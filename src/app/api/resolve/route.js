import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { calculateResolution } from '@/lib/parimutuel';

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

    const { market_id, winning_option_id } = await request.json();
    if (!market_id || !winning_option_id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const marketRes = await client.query('SELECT * FROM markets WHERE id = $1 FOR UPDATE', [market_id]);
      if (marketRes.rows.length === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
      if (marketRes.rows[0].status !== 'open') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Already resolved' }, { status: 400 }); }

      const optionsRes = await client.query('SELECT * FROM market_options WHERE market_id = $1', [market_id]);
      const winnerPosRes = await client.query('SELECT * FROM positions WHERE market_id = $1 AND option_id = $2 AND shares > 0', [market_id, winning_option_id]);
      const resolution = calculateResolution(optionsRes.rows, winning_option_id, winnerPosRes.rows);

      await client.query('UPDATE markets SET status = $1, outcome_resolved = $2 WHERE id = $3', ['resolved', winning_option_id, market_id]);

      for (const payout of resolution.payouts) {
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [payout.coins, payout.user_id]);
        await client.query(
          `INSERT INTO transactions (user_id, market_id, option_id, type, amount_coins, amount_shares, price_per_share, house_profit) VALUES ($1, $2, $3, 'resolution_payout', $4, $5, $6, 0)`,
          [payout.user_id, market_id, winning_option_id, payout.coins, payout.shares, resolution.payoutPerShare]
        );
      }

      await client.query('UPDATE positions SET shares = 0, updated_at = NOW() WHERE market_id = $1', [market_id]);
      await client.query('UPDATE market_options SET pool_coins = 0 WHERE market_id = $1', [market_id]);
      await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_resolution_rake'`, [resolution.houseRake]);
      await client.query(`UPDATE system_stats SET value = value + $1 WHERE key = 'total_house_profit'`, [resolution.houseRake]);

      // Refund the 100 VC seed liquidity to the market creator
      const creatorId = marketRes.rows[0].created_by;
      if (creatorId) {
        await client.query('UPDATE users SET balance = balance + 100 WHERE id = $1', [creatorId]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, resolution: { totalPool: resolution.totalPool, houseRake: resolution.houseRake, payoutPool: resolution.payoutPool, payoutPerShare: resolution.payoutPerShare, winnersCount: resolution.payouts.length } });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) {
    console.error('Resolve error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
