import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

const MARKET_CREATION_COST = 100; // 100 VC deducted as opening liquidity

// GET /api/markets - List all markets with prices, sorted by volume (highest first)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'open';

    let query = `
      SELECT m.*, u.username as creator_name
      FROM markets m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.status = $1
    `;
    const params = [status];

    if (category && category !== 'All') {
      query += ' AND m.category = $2';
      params.push(category);
    }

    // No ORDER BY here — we'll sort in JS after computing volume
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

      // Get volume for this market
      const volRes = await pool.query(
        'SELECT COALESCE(SUM(amount_coins), 0) as volume FROM transactions WHERE market_id = $1 AND type IN ($2, $3)',
        [market.id, 'buy', 'sell']
      );

      // Build options sorted by fair probability (highest first)
      const mappedOptions = options.map(o => ({
        id: o.id,
        name: o.name,
        pool_coins: Number(o.pool_coins),
        total_shares_issued: Number(o.total_shares_issued),
        ...prices[o.id],
      }));
      mappedOptions.sort((a, b) => b.fair - a.fair);

      markets.push({
        ...market,
        options: mappedOptions,
        total_pool: totalPool,
        volume: Number(volRes.rows[0].volume),
      });
    }

    // Sort markets by volume descending (highest traded first)
    markets.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ markets });
  } catch (err) {
    console.error('Markets GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/markets - Create a new market (costs 100 VC as opening liquidity)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { question, description, category, end_date, options } = await request.json();

    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 });
    }
    if (!options || options.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 options' }, { status: 400 });
    }
    if (options.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 options' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check user balance
      const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const balance = Number(userRes.rows[0].balance);
      if (balance < MARKET_CREATION_COST) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Insufficient balance. Creating a market costs ${MARKET_CREATION_COST} VCoins (refunded when market closes).` }, { status: 400 });
      }

      // Deduct 100 VC from the creator
      await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [MARKET_CREATION_COST, userId]);

      // Create market
      const marketRes = await client.query(
        `INSERT INTO markets (question, description, category, created_by, end_date) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          question.trim(),
          description?.trim() || '',
          category || 'General',
          userId,
          end_date || null,
        ]
      );
      const market = marketRes.rows[0];

      // Split 100 VC evenly across options as seed liquidity
      const seedPerOption = MARKET_CREATION_COST / options.length;
      const createdOptions = [];
      for (const optName of options) {
        const optRes = await client.query(
          `INSERT INTO market_options (market_id, name, pool_coins, total_shares_issued) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [market.id, optName.trim(), seedPerOption, 0]
        );
        createdOptions.push(optRes.rows[0]);
      }

      // Log the creation cost as a transaction
      await client.query(
        `INSERT INTO transactions (user_id, market_id, type, amount_coins, amount_shares, price_per_share, fee_coins, house_profit)
         VALUES ($1, $2, 'buy', $3, 0, 0, 0, 0)`,
        [userId, market.id, MARKET_CREATION_COST]
      );

      await client.query('COMMIT');

      // Record initial price snapshot for chart
      const fairPrice = 1 / createdOptions.length; // equal probability at creation
      for (const opt of createdOptions) {
        await pool.query(
          'INSERT INTO price_history (market_id, option_id, fair_price) VALUES ($1, $2, $3)',
          [market.id, opt.id, fairPrice]
        );
      }

      return NextResponse.json({
        market: {
          ...market,
          options: createdOptions,
        },
        cost: MARKET_CREATION_COST,
        message: `Market created! ${MARKET_CREATION_COST} VCoins deducted as seed liquidity (refunded when market closes).`,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Markets POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
