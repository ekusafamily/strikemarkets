import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { amount, phone } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return NextResponse.json({ error: 'Invalid amount (minimum 1 KES)' }, { status: 400 });
    }

    if (!phone || phone.trim().length < 9) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Call PayNexus STK Push API
    const paynexusResponse = await fetch('https://paynexus.co.ke/api/mpesa/payment/initiate', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PAYNEXUS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: parsedAmount,
        phone: phone.trim(),
        description: 'Strike Markets Deposit',
      }),
    });

    const responseData = await paynexusResponse.json();

    if (!paynexusResponse.ok || !responseData.success) {
      console.error('PayNexus Error:', responseData);
      return NextResponse.json({ error: responseData.message || 'Payment initiation failed' }, { status: 400 });
    }

    const { reference, checkout_request_id, status } = responseData.data;

    // Save pending deposit in our database
    await pool.query(
      `INSERT INTO mpesa_deposits (user_id, amount, phone_number, reference, checkout_request_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, parsedAmount, phone.trim(), reference, checkout_request_id, status || 'initiated']
    );

    return NextResponse.json({ success: true, reference, checkout_request_id });

  } catch (error) {
    console.error('STK Push Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
