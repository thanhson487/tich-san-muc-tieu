import { NextResponse } from 'next/server';
import { client } from '@/lib/mongodb';

export async function GET() {
  try {
    // simple command to ensure server selection succeeds
    const admin = client.db().admin();
    const res = await admin.ping();
    return NextResponse.json({ ok: true, ping: res });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          name: err?.name,
          code: err?.code,
          message: err?.message,
        },
      },
      { status: 500 },
    );
  }
}
