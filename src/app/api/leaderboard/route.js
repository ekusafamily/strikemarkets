import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

export async function GET() {
  try {
    const usersRes = await pool.query('SELECT id, username, balance FROM users ORDER BY balance DESC');
    const leaderboard = [];

    for (const user of usersRes.rows) {
      let portfolioValue = 0;
      const positionsRes = await pool.query(
        `SELECT p.shares, p.option_id, p.market_id 
         FROM positions p 
         JOIN markets m ON p.market_id = m.id 
         WHERE p.user_id = $1 AND p.shares > 0 AND m.status = 'open'`,
        [user.id]
      );

      for (const pos of positionsRes.rows) {
        const optionsRes = await pool.query('SELECT * FROM market_options WHERE market_id = $1', [pos.market_id]);
        const prices = getPrices(optionsRes.rows);
        const fairPrice = prices[pos.option_id]?.fair || 0;
        portfolioValue += Number(pos.shares) * fairPrice;
      }

      leaderboard.push({
        username: user.username,
        balance: Number(user.balance),
        portfolio_value: portfolioValue,
        net_worth: Number(user.balance) + portfolioValue,
      });
    }

    leaderboard.sort((a, b) => b.net_worth - a.net_worth);
    return NextResponse.json({ leaderboard: leaderboard.slice(0, 50) });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
