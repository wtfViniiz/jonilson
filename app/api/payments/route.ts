import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const db = await readDb();
    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const previousBalance = db.client.balance;
    const newBalance = previousBalance + amount;
    const paymentLog = {
      id: Date.now().toString(),
      amount,
      previousBalance,
      newBalance,
      createdAt: new Date().toISOString(),
      reversed: false,
    };

    db.client.balance = newBalance;
    db.paymentLogs.push(paymentLog);

    await writeDb(db);
    return NextResponse.json({
      client: db.client,
      paymentLog,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Unable to register payment' }, { status: 500 });
  }
}
