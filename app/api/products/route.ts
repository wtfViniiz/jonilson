import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.products);
}

export async function POST(request: Request) {
  const db = await readDb();
  const body = await request.json();
  const newProduct = { ...body, id: Date.now().toString() };
  db.products.push(newProduct);
  await writeDb(db);
  return NextResponse.json(newProduct);
}
