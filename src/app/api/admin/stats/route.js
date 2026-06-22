import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const adminRes = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (!adminRes.rows[0]?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const statsRes = await pool.query('SELECT * FROM system_stats');
    const stats = {};
    statsRes.rows.forEach(r => { stats[r.key] = Number(r.value); });

    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const marketsCount = await pool.query("SELECT COUNT(*) FROM markets WHERE status = 'open'");
    const resolvedCount = await pool.query("SELECT COUNT(*) FROM markets WHERE status = 'resolved'");

    const recentTx = await pool.query(
      `SELECT t.*, u.username, mo.name as option_name, m.question 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       LEFT JOIN market_options mo ON t.option_id = mo.id
       LEFT JOIN markets m ON t.market_id = m.id
       WHERE t.type IN ('buy', 'sell', 'resolution_payout')
       ORDER BY t.created_at DESC LIMIT 50`
    );

    return NextResponse.json({
      stats,
      users_count: parseInt(usersCount.rows[0].count),
      open_markets: parseInt(marketsCount.rows[0].count),
      resolved_markets: parseInt(resolvedCount.rows[0].count),
      recent_transactions: recentTx.rows,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
