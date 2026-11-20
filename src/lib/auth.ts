import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'mylife_session';
export const SESSION_TTL_DAYS = 180;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
export const SESSION_RENEW_THRESHOLD_DAYS = 90;
const KEY_LENGTH = 64;

export function isSecureRequest(request?: Request): boolean {
  if (request) {
    const forwardedProto = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();
    if (forwardedProto === 'https') {
      return true;
    }
    if (forwardedProto === 'http') {
      return false;
    }

    try {
      const protocol = new URL(request.url).protocol;
      if (protocol === 'https:') {
        return true;
      }
      if (protocol === 'http:') {
        return false;
      }
    } catch {
      // Bỏ qua URL không hợp lệ
    }
  }
  return process.env.NODE_ENV === 'production';
}

export function parseCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = pair.slice(0, idx).trim();
    if (key !== name) {
      continue;
    }
    const raw = pair.slice(idx + 1).trim();
    if (!raw) {
      return '';
    }
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function buildSessionCookieOptions(
  secure: boolean,
  nowMs = Date.now(),
) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    expires: new Date(nowMs + SESSION_TTL_SECONDS * 1000),
    priority: 'high' as const,
  };
}

export function buildClearSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) {
    return false;
  }
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = scryptSync(password, salt, KEY_LENGTH);
    if (keyBuf.length !== derivedBuf.length) {
      return false;
    }
    return timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
