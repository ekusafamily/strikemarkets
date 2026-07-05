import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

// GET /api/markets/[id] - Get single market details
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    const marketRes = await pool.query(
      `SELECT m.*, u.username as creator_name 
       FROM markets m LEFT JOIN users u ON m.created_by = u.id 
       WHERE m.id = $1`,
      [id]
    );

    if (marketRes.rows.length === 0) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    const market = marketRes.rows[0];

    // Get options
    const optionsRes = await pool.query(
      'SELECT * FROM market_options WHERE market_id = $1 ORDER BY name',
      [id]
    );
    const options = optionsRes.rows;
    const prices = getPrices(options);
    const totalPool = options.reduce((sum, o) => sum + Number(o.pool_coins), 0);

    // Get volume
    const volRes = await pool.query(
      'SELECT COALESCE(SUM(amount_coins), 0) as volume FROM transactions WHERE market_id = $1 AND type IN ($2, $3)',
      [id, 'buy', 'sell']
    );

    // Get user positions if logged in
    let userPositions = [];
    if (userId) {
      const posRes = await pool.query(
        'SELECT p.*, mo.name as option_name FROM positions p JOIN market_options mo ON p.option_id = mo.id WHERE p.user_id = $1 AND p.market_id = $2 AND p.shares > 0',
        [userId, id]
      );
      userPositions = posRes.rows.map(p => ({
        ...p,
        shares: Number(p.shares),
      }));
    }

    // Get recent transactions
    const txRes = await pool.query(
      `SELECT t.*, u.username, mo.name as option_name 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       LEFT JOIN market_options mo ON t.option_id = mo.id
       WHERE t.market_id = $1 AND t.type IN ('buy', 'sell')
       ORDER BY t.created_at DESC LIMIT 20`,
      [id]
    );

    // Get price history for chart
    const chartRes = await pool.query(
      'SELECT option_id, fair_price, recorded_at FROM price_history WHERE market_id = $1 ORDER BY recorded_at ASC',
      [id]
    );

    return NextResponse.json({
      market: {
        ...market,
        options: options.map(o => ({
          id: o.id,
          name: o.name,
          pool_coins: Number(o.pool_coins),
          total_shares_issued: Number(o.total_shares_issued),
          ...prices[o.id],
        })).sort((a, b) => b.fair - a.fair),
        total_pool: totalPool,
        volume: Number(volRes.rows[0].volume),
      },
      userPositions,
      recentTrades: txRes.rows,
      priceHistory: chartRes.rows,
    });
  } catch (err) {
    console.error('Market GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
