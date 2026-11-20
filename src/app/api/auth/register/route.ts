import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { users } from '@/db/schema';
import { handleApiError } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/auth';
import { attachSessionCookie, createSession } from '@/lib/session';
import { registerSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      throw new DatabaseNotConfiguredError();
    }

    const body = await request.json();
    const parsed = registerSchema.parse(body);

    const createdUser = await withAutoSchema(async () => {
      const db = getDb();
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, parsed.email))
        .limit(1);

      if (existing.length > 0) {
        return null;
      }

      const [inserted] = await db
        .insert(users)
        .values({
          name: parsed.name,
          email: parsed.email,
          passwordHash: hashPassword(parsed.password),
          timezone: parsed.timezone ?? 'Asia/Ho_Chi_Minh',
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          timezone: users.timezone,
        });

      return inserted;
    });

    if (!createdUser) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký.' },
        { status: 409 },
      );
    }

    const session = await createSession(createdUser.id);
    const response = NextResponse.json({ user: createdUser }, { status: 201 });
    attachSessionCookie(response, session.token, request);
    return response;
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: unknown }).code === '23505'
    ) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký.' },
        { status: 409 },
      );
    }
    return handleApiError(err);
  }
}
