import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-helpers';
import { destroyCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
