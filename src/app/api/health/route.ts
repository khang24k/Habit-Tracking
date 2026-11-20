import { NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured } from '@/db';

export const runtime = 'nodejs';

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  if (!databaseConfigured) {
    return NextResponse.json({
      ok: true,
      databaseConfigured: false,
      databaseConnected: false,
    });
  }

  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return NextResponse.json({
      ok: true,
      databaseConfigured: true,
      databaseConnected: true,
    });
  } catch (err) {
    console.error('[MyLife Health Check]', err);
    return NextResponse.json(
      {
        ok: false,
        databaseConfigured: true,
        databaseConnected: false,
      },
      { status: 503 },
    );
  }
}
