import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import pool from '@/lib/db';

// POST /api/auth - Login or Register
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body; // 'register' | 'login'
    
    const supabase = await createClient();

    if (action === 'register') {
      const { email, password } = body;

      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();

      const origin = new URL(request.url).origin;

      // Sign up via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          emailRedirectTo: `${origin}/api/auth/callback`,
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Check if email confirmation is required
      if (data?.user && data?.user?.identities && data?.user?.identities.length === 0) {
          return NextResponse.json({ error: 'Email already registered. Try logging in.' }, { status: 400 });
      }

      return NextResponse.json({
        message: 'Registration successful! Please check your email to verify your account.',
        requiresEmailVerification: true
      });

    } else if (action === 'login') {
      const { identifier, password } = body; // identifier = email

      if (!identifier || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }

      const clean = identifier.trim().toLowerCase();
      
      let emailToLogin = clean;
      if (!clean.includes('@')) {
        // Find email by username
        const uRes = await pool.query('SELECT email FROM users WHERE username = $1', [clean]);
        if (uRes.rows.length > 0) {
          emailToLogin = uRes.rows[0].email;
        } else {
          return NextResponse.json({ error: 'Username not found' }, { status: 404 });
        }
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      // After successful login, Supabase SSR automatically sets the cookies
      return NextResponse.json({
        success: true
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
    const supabase = await createClient();
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session || sessionError) {
      return NextResponse.json({ user: null });
    }

    // Get user from our public table
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [session.user.id]);
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
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
