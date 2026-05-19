import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const order = db.orders.find((item: any) => item.id === id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const body = await request.json();
  const index = db.orders.findIndex((order: any) => order.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const oldOrder = db.orders[index];
  const diff = body.total - oldOrder.total;
  db.client.balance -= diff;
  db.orders[index] = {
    ...oldOrder,
    ...body,
    isEdited: true,
    editedAt: new Date().toISOString(),
    originalTotal: oldOrder.originalTotal || oldOrder.total,
  };

  await writeDb(db);
  return NextResponse.json(db.orders[index]);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const index = db.orders.findIndex((order: any) => order.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = db.orders[index];
  if (order.status === 'canceled') {
    return NextResponse.json({ error: 'Already canceled' }, { status: 400 });
  }

  db.client.balance += order.total;
  order.status = 'canceled';
  order.canceledAt = new Date().toISOString();
  await writeDb(db);

  return NextResponse.json(order);
}
