import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('id');

    if (!checkoutId) {
      return NextResponse.json({ error: 'Missing checkout ID' }, { status: 400 });
    }

    const res = await pool.query(
      'SELECT status, failure_reason FROM mpesa_deposits WHERE checkout_request_id = $1 AND user_id = $2',
      [checkoutId, session.user.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: res.rows[0].status,
      failure_reason: res.rows[0].failure_reason
    });

  } catch (error) {
    console.error('Status Check Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
