import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { users } from '@/db/schema';
import { handleApiError } from '@/lib/api-helpers';
import { verifyPassword } from '@/lib/auth';
import { attachSessionCookie, createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      throw new DatabaseNotConfiguredError();
    }

    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const found = await withAutoSchema(async () => {
      const db = getDb();
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, parsed.email))
        .limit(1);
      return rows[0] ?? null;
    });

    if (!found || !verifyPassword(parsed.password, found.passwordHash)) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng.' },
        { status: 401 },
      );
    }

    const session = await createSession(found.id);

    const response = NextResponse.json({
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        timezone: found.timezone,
      },
    });
    attachSessionCookie(response, session.token, request);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
