import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const body = await request.json();
  const index = db.products.findIndex((product: any) => product.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  db.products[index] = { ...db.products[index], ...body };
  await writeDb(db);
  return NextResponse.json(db.products[index]);
}
