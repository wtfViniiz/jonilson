import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const index = db.paymentLogs.findIndex((log: any) => log.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Payment log not found' }, { status: 404 });
  }

  const log = db.paymentLogs[index];
  if (log.reversed) {
    return NextResponse.json({ error: 'Payment already reversed' }, { status: 400 });
  }

  const revertedBalance = db.client.balance - log.amount;
  db.client.balance = revertedBalance;
  db.paymentLogs[index] = {
    ...log,
    reversed: true,
    reversedAt: new Date().toISOString(),
    reversedBalance: revertedBalance,
  };

  await writeDb(db);
  return NextResponse.json({
    paymentLog: db.paymentLogs[index],
    client: db.client,
  });
}
