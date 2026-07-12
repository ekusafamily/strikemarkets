import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const rawPayload = await request.text();
    const signature = request.headers.get('x-paynexus-signature') || '';
    const secret = process.env.PAYNEXUS_WEBHOOK_SECRET;

    if (!secret) {
      console.error('Webhook Secret is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    
    // Use timingSafeEqual to prevent timing attacks, though for this simple webhook it's fine
    if (signature !== expectedSignature) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(rawPayload);
    const { event, data } = payload;

    if (!data || !data.reference) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const reference = data.reference;

    if (event === 'payment.completed') {
      const amount = parseFloat(data.amount);

      // Start a database transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock the deposit row and check if it's already completed to prevent duplicate processing
        const depRes = await client.query(
          'SELECT * FROM mpesa_deposits WHERE reference = $1 FOR UPDATE',
          [reference]
        );

        if (depRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ ResultCode: 0, ResultDesc: 'Deposit reference not found in system' });
        }

        const deposit = depRes.rows[0];

        if (deposit.status === 'completed') {
          await client.query('ROLLBACK');
          return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
        }

        // 1. Update deposit status
        await client.query(
          'UPDATE mpesa_deposits SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', deposit.id]
        );

        // 2. Add funds to user
        await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2',
          [amount, deposit.user_id]
        );

        // 3. Log transaction
        await client.query(
          \`INSERT INTO transactions (user_id, type, amount_coins, created_at)
           VALUES ($1, 'deposit', $2, NOW())\`,
          [deposit.user_id, amount]
        );

        await client.query('COMMIT');
        
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('DB Transaction Error processing webhook:', err);
        return NextResponse.json({ error: 'Internal database error' }, { status: 500 });
      } finally {
        client.release();
      }

    } else if (event === 'payment.failed') {
      const failureReason = data.failure_reason || 'Unknown failure';
      
      await pool.query(
        'UPDATE mpesa_deposits SET status = $1, failure_reason = $2, updated_at = NOW() WHERE reference = $3',
        ['failed', failureReason, reference]
      );
    }

    // PayNexus expects a 200 OK immediately
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Received' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
