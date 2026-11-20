import { NextResponse } from 'next/server';
import { handleApiError, requireSession } from '@/lib/api-helpers';
import { refreshSessionIfNeeded } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const response = NextResponse.json(
      { user: session.user },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
    await refreshSessionIfNeeded(session, request, response);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
