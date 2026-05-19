import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const db = await readDb();
    const body = await request.json();

    const total = Number(body.total);
    if (!Array.isArray(body.items) || !Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const newBalance = db.client.balance - total;
    const newOrder = {
      items: body.items,
      total,
      balance: newBalance,
      status: 'active' as const,
      deletionRequested: false,
      id: Date.now().toString(),
      uuid: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    db.orders.push(newOrder);
    db.client.balance = newBalance;

    await writeDb(db);
    return NextResponse.json({
      order: newOrder,
      client: db.client,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Unable to confirm order' }, { status: 500 });
  }
}
