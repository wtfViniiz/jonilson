import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.orders);
}

export async function POST(request: Request) {
  const db = await readDb();
  const body = await request.json();
  const newOrder = {
    ...body,
    id: Date.now().toString(),
    uuid: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.orders.push(newOrder);
  await writeDb(db);
  return NextResponse.json(newOrder);
}
