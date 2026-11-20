import { and, eq, gt, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { sessions, users } from '@/db/schema';
import {
  SESSION_COOKIE_NAME,
  SESSION_RENEW_THRESHOLD_DAYS,
  SESSION_TTL_DAYS,
  SESSION_TTL_SECONDS,
  buildClearSessionCookieOptions,
  buildSessionCookieOptions,
  generateSessionToken,
  hashSessionToken,
  isSecureRequest,
  parseCookieValue,
} from './auth';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

export interface CurrentSession {
  sessionId: string;
  token: string;
  user: PublicUser;
  shouldRenew: boolean;
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  const inserted = await withAutoSchema(async () => {
    const db = getDb();
    const [row] = await db
      .insert(sessions)
      .values({
        userId,
        tokenHash,
        expiresAt: sql`now() + (${SESSION_TTL_DAYS}::int * interval '1 day')`,
      })
      .returning({ expiresAt: sessions.expiresAt });
    return row;
  });

  return {
    token,
    expiresAt:
      inserted?.expiresAt ?? new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  };
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  request?: Request,
): void {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    buildSessionCookieOptions(isSecureRequest(request)),
  );
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
}

export function clearSessionCookie(
  response: NextResponse,
  request?: Request,
): void {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    '',
    buildClearSessionCookieOptions(isSecureRequest(request)),
  );
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
}

export async function destroyCurrentSession(request?: Request): Promise<void> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ??
    parseCookieValue(
      request?.headers.get('cookie') ?? null,
      SESSION_COOKIE_NAME,
    );

  if (token && isDatabaseConfigured()) {
    const tokenHash = hashSessionToken(token);
    await withAutoSchema(async () => {
      const db = getDb();
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    }).catch(() => {
      // Bỏ qua lỗi DB khi xóa cookie đăng xuất
    });
  }

  try {
    cookieStore.set(
      SESSION_COOKIE_NAME,
      '',
      buildClearSessionCookieOptions(isSecureRequest(request)),
    );
  } catch {
    // Fallback an toàn nếu cookie được xóa qua NextResponse
  }
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const rows = await withAutoSchema(async () => {
    const db = getDb();
    return db
      .select({
        sessionId: sessions.id,
        id: users.id,
        name: users.name,
        email: users.email,
        timezone: users.timezone,
        shouldRenew: sql<boolean>`${sessions.expiresAt} < now() + (${SESSION_RENEW_THRESHOLD_DAYS}::int * interval '1 day')`,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, sql`now()`)),
      )
      .limit(1);
  });

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    token,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      timezone: row.timezone,
    },
    shouldRenew: Boolean(row.shouldRenew),
  };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function refreshSessionIfNeeded(
  session: CurrentSession,
  request: Request,
  response: NextResponse,
): Promise<void> {
  if (!session.shouldRenew) {
    return;
  }

  try {
    const db = getDb();
    await db
      .update(sessions)
      .set({
        expiresAt: sql`now() + (${SESSION_TTL_DAYS}::int * interval '1 day')`,
      })
      .where(eq(sessions.id, session.sessionId));
  } catch {
    // Bỏ qua lỗi gia hạn để không làm gián đoạn request
  }

  attachSessionCookie(response, session.token, request);
}
