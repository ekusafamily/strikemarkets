import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getPrices } from '@/lib/parimutuel';

// GET /api/markets - List all markets with prices
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

      // Get volume for this market
      const volRes = await pool.query(
        'SELECT COALESCE(SUM(amount_coins), 0) as volume FROM transactions WHERE market_id = $1 AND type IN ($2, $3)',
        [market.id, 'buy', 'sell']
      );

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
      });
    }

    return NextResponse.json({ markets });
  } catch (err) {
    console.error('Markets GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/markets - Create a new market
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

      // Create options with initial seed pool (10 coins each, from the house)
      const createdOptions = [];
      for (const optName of options) {
        const optRes = await client.query(
          `INSERT INTO market_options (market_id, name, pool_coins, total_shares_issued) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [market.id, optName.trim(), 10.00, 0]
        );
        createdOptions.push(optRes.rows[0]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        market: {
          ...market,
          options: createdOptions,
        }
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
