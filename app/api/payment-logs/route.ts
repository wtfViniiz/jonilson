import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.paymentLogs);
}

export async function POST(request: Request) {
  const db = await readDb();
  const body = await request.json();
  const newLog = {
    id: Date.now().toString(),
    ...body,
    createdAt: new Date().toISOString(),
  };
  db.paymentLogs.push(newLog);
  await writeDb(db);
  return NextResponse.json(newLog);
}
