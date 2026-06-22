import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

// GET /api/admin/markets - All markets (all statuses) for admin view
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const adminRes = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (!adminRes.rows[0]?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // optional: 'open', 'resolved', 'canceled'

    let query = `
      SELECT m.*, u.username AS creator_name
      FROM markets m
      LEFT JOIN users u ON m.created_by = u.id
    `;
    const params = [];
    if (statusFilter) {
      query += ' WHERE m.status = $1';
      params.push(statusFilter);
    }
    query += ' ORDER BY m.created_at DESC';

    const marketsRes = await pool.query(query, params);
    const markets = [];

    for (const market of marketsRes.rows) {
      const optionsRes = await pool.query(
        'SELECT * FROM market_options WHERE market_id = $1 ORDER BY name',
        [market.id]
      );
      const options = optionsRes.rows;
      const prices = getPrices(options);
      const totalPool = options.reduce((sum, o) => sum + Number(o.pool_coins), 0);

      const volRes = await pool.query(
        'SELECT COALESCE(SUM(amount_coins), 0) as volume FROM transactions WHERE market_id = $1 AND type IN ($2, $3)',
        [market.id, 'buy', 'sell']
      );

      // If resolved, find the winning option name
      let winnerName = null;
      if (market.outcome_resolved) {
        const winnerOpt = options.find(o => o.id === market.outcome_resolved);
        winnerName = winnerOpt?.name || null;
      }

      markets.push({
        ...market,
        options: options.map(o => ({
          id: o.id,
          name: o.name,
          pool_coins: Number(o.pool_coins),
          total_shares_issued: Number(o.total_shares_issued),
          ...prices[o.id],
        })),
        total_pool: totalPool,
        volume: Number(volRes.rows[0].volume),
        winner_name: winnerName,
      });
    }

    return NextResponse.json({ markets });
  } catch (err) {
    console.error('Admin markets GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
