import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-helpers';
import { clearSessionCookie, destroyCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await destroyCurrentSession(request);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response, request);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
