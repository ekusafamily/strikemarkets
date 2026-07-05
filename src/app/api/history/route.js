import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

// GET /api/history - Get logged-in user's trade history, positions, and stats
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // User info
    const userRes = await pool.query('SELECT id, username, balance, created_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = userRes.rows[0];

    // All transactions
    const txRes = await pool.query(
      `SELECT t.*, m.question as market_question, mo.name as option_name
       FROM transactions t
       LEFT JOIN markets m ON t.market_id = m.id
       LEFT JOIN market_options mo ON t.option_id = mo.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [userId]
    );

    // Active positions (open markets only)
    const posRes = await pool.query(
      `SELECT p.*, mo.name as option_name, m.question as market_question, m.id as market_id, m.status
       FROM positions p
       JOIN market_options mo ON p.option_id = mo.id
       JOIN markets m ON p.market_id = m.id
       WHERE p.user_id = $1 AND p.shares > 0 AND m.status = 'open'
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    // Calculate portfolio value
    let portfolioValue = 0;
    const positions = [];
    for (const pos of posRes.rows) {
      const optionsRes = await pool.query('SELECT * FROM market_options WHERE market_id = $1', [pos.market_id]);
      const prices = getPrices(optionsRes.rows);
      const fairPrice = prices[pos.option_id]?.fair || 0;
      const value = Number(pos.shares) * fairPrice;
      portfolioValue += value;
      positions.push({
        ...pos,
        shares: Number(pos.shares),
        fair_price: fairPrice,
        current_value: value,
      });
    }

    // Summary stats
    const statsRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE type = 'buy') as total_buys,
        COUNT(*) FILTER (WHERE type = 'sell') as total_sells,
        COALESCE(SUM(amount_coins) FILTER (WHERE type = 'buy'), 0) as total_spent,
        COALESCE(SUM(amount_coins) FILTER (WHERE type = 'sell'), 0) as total_sold,
        COALESCE(SUM(amount_coins) FILTER (WHERE type = 'resolution_payout'), 0) as total_winnings,
        COALESCE(SUM(fee_coins), 0) as total_fees_paid
       FROM transactions WHERE user_id = $1`,
      [userId]
    );
    const s = statsRes.rows[0];

    // Markets created by user
    const createdRes = await pool.query(
      'SELECT COUNT(*) as count FROM markets WHERE created_by = $1',
      [userId]
    );

    return NextResponse.json({
      user: {
        username: user.username,
        balance: Number(user.balance),
        joined: user.created_at,
      },
      stats: {
        total_buys: Number(s.total_buys),
        total_sells: Number(s.total_sells),
        total_spent: Number(s.total_spent),
        total_sold: Number(s.total_sold),
        total_winnings: Number(s.total_winnings),
        total_fees_paid: Number(s.total_fees_paid),
        portfolio_value: portfolioValue,
        net_worth: Number(user.balance) + portfolioValue,
        markets_created: Number(createdRes.rows[0].count),
      },
      positions,
      transactions: txRes.rows,
    });
  } catch (err) {
    console.error('History error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
