import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/auth - Login or Register
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body; // 'register' | 'login'

    if (action === 'register') {
      const { username, email, password } = body;

      if (!username || username.trim().length < 2) {
        return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
      }
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      // Check username or email already taken
      const existRes = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [cleanUsername, cleanEmail]
      );
      if (existRes.rows.length > 0) {
        return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
      }

      const password_hash = await bcrypt.hash(password, 10);

      // First user becomes admin
      const countRes = await pool.query('SELECT COUNT(*) FROM users');
      const isFirst = parseInt(countRes.rows[0].count) === 0;

      const res = await pool.query(
        'INSERT INTO users (username, email, password_hash, balance, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [cleanUsername, cleanEmail, password_hash, 1000.00, isFirst]
      );
      const user = res.rows[0];

      const cookieStore = await cookies();
      cookieStore.set('user_id', user.id, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });

      return NextResponse.json({
        id: user.id,
        username: user.username,
        email: user.email,
        balance: Number(user.balance),
        is_admin: user.is_admin,
      });

    } else if (action === 'login') {
      const { identifier, password } = body; // identifier = username or email

      if (!identifier || !password) {
        return NextResponse.json({ error: 'Username/email and password required' }, { status: 400 });
      }

      const clean = identifier.trim().toLowerCase();
      const res = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [clean]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const user = res.rows[0];

      // Support legacy accounts without passwords (username-only login)
      if (!user.password_hash) {
        // Legacy: allow login without password
      } else {
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
      }

      const cookieStore = await cookies();
      cookieStore.set('user_id', user.id, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });

      return NextResponse.json({
        id: user.id,
        username: user.username,
        email: user.email,
        balance: Number(user.balance),
        is_admin: user.is_admin,
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/auth - Get current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return NextResponse.json({ user: null });

    const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return NextResponse.json({ user: null });

    const user = res.rows[0];
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: Number(user.balance),
        is_admin: user.is_admin,
      }
    });
  } catch (err) {
    console.error('Auth GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/auth - Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('user_id');
  return NextResponse.json({ ok: true });
}
