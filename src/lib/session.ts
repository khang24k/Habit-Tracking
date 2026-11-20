import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb, isDatabaseConfigured } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { sessions, users } from '@/db/schema';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  generateSessionToken,
  hashSessionToken,
} from './auth';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

export async function createSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await withAutoSchema(async () => {
    const db = getDb();
    await db.insert(sessions).values({
      userId,
      tokenHash,
      expiresAt,
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token && isDatabaseConfigured()) {
    const tokenHash = hashSessionToken(token);
    await withAutoSchema(async () => {
      const db = getDb();
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    }).catch(() => {
      // Bỏ qua lỗi DB khi xóa cookie đăng xuất
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const rows = await withAutoSchema(async () => {
    const db = getDb();
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        timezone: users.timezone,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);
  });

  return rows[0] ?? null;
}
