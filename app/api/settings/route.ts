import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.settings);
}

export async function PATCH(request: Request) {
  const db = await readDb();
  const body = await request.json();
  db.settings = { ...db.settings, ...body };
  await writeDb(db);
  return NextResponse.json(db.settings);
}
