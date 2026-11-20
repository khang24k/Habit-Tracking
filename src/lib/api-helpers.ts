import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DatabaseNotConfiguredError, isDatabaseConfigured } from '@/db';
import {
  getCurrentSession,
  getCurrentUser,
  type CurrentSession,
  type PublicUser,
} from './session';

export class UnauthorizedError extends Error {
  constructor(message = 'Bạn cần đăng nhập để thực hiện thao tác này.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Không tìm thấy dữ liệu yêu cầu.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function requireSession(): Promise<CurrentSession> {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireUser(): Promise<PublicUser> {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Dữ liệu đầu vào không hợp lệ.' },
      { status: 400 },
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Nội dung JSON không hợp lệ.' },
      { status: 400 },
    );
  }
  console.error('[MyLife API Error]', err);
  return NextResponse.json(
    { error: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.' },
    { status: 500 },
  );
}
