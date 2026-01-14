import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function ensureEnv() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim().length === 0) {
    throw new Error('Thiếu MONGODB_URI trong .env.local');
  }
}

export async function GET() {
  try {
    ensureEnv();
    const col = await getCollection('transactions');
    const items = await col.find({}).sort({ date: -1, createdAt: -1 }).toArray();
    const mapped = items.map((d: any) => ({
      id: d._id.toString(),
      date: d.date,
      amount: d.amount,
      createdAt: d.createdAt,
    }));
    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureEnv();
    const body = await req.json();
    const { amount, date } = body as { amount: number; date: string };
    const col = await getCollection('transactions');
    const createdAt = Date.now();
    const res = await col.insertOne({ date, amount, createdAt });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'internal_error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    ensureEnv();
    const body = await req.json();
    const { id, amount, date } = body as { id: string; amount?: number; date?: string };
    const col = await getCollection('transactions');
    const update: any = {};
    if (amount !== undefined) update.amount = amount;
    if (date !== undefined) update.date = date;
    await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    ensureEnv();
    const body = await req.json();
    const { id } = body as { id: string };
    const col = await getCollection('transactions');
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'internal_error' }, { status: 500 });
  }
}
