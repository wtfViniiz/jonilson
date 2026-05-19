import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const index = db.orders.findIndex((order: any) => String(order.id) === id || order.uuid === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const [removedOrder] = db.orders.splice(index, 1);
  if (removedOrder.status !== 'canceled') {
    db.client.balance += Number(removedOrder.total) || 0;
  }
  await writeDb(db);
  return NextResponse.json({ success: true, removedOrder, client: db.client });
}
