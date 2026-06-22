import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

// POST /api/claim - Claim daily 100 free coins
export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const user = userRes.rows[0];

      if (user.last_claim) {
        const lastClaim = new Date(user.last_claim);
        const now = new Date();
        const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const hoursLeft = Math.ceil(24 - hoursSince);
          await client.query('ROLLBACK');
          return NextResponse.json({ 
            error: `You can claim again in ${hoursLeft} hours`,
            next_claim_hours: hoursLeft 
          }, { status: 400 });
        }
      }

      // Grant 100 coins
      await client.query(
        'UPDATE users SET balance = balance + 100, last_claim = NOW() WHERE id = $1',
        [userId]
      );

      // Log it
      await client.query(
        `INSERT INTO transactions (user_id, type, amount_coins) VALUES ($1, 'claim_daily', 100)`,
        [userId]
      );

      await client.query('COMMIT');

      const newBalance = Number(user.balance) + 100;
      return NextResponse.json({ success: true, new_balance: newBalance });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Claim error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
