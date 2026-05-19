import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const index = db.orders.findIndex((order: any) => String(order.id) === id || order.uuid === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  db.orders[index] = {
    ...db.orders[index],
    deletionRequested: true,
    deletionRequestedAt: new Date().toISOString(),
  };

  await writeDb(db);
  return NextResponse.json(db.orders[index]);
}
