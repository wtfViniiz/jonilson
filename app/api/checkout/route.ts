import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { INITIAL_DATA, readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const db = await readDb();
    const body = await request.json();

    const total = Number(body.total);
    if (!Array.isArray(body.items) || !Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    db.client = db.client || { ...INITIAL_DATA.client };
    db.orders = Array.isArray(db.orders) ? db.orders : [];

    const currentBalance = Number(db.client.balance ?? 0) || 0;
    const newBalance = Number((currentBalance - total).toFixed(2));
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
    const message = error instanceof Error ? error.message : 'Unable to confirm order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
