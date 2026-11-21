import { getSql } from './index';

let schemaReadyPromise: Promise<void> | null = null;

/**
 * Tự động tạo bảng nếu Neon database còn trống (chưa chạy `npm run db:push`),
 * giúp người dùng deploy lần đầu lên Vercel không bị lỗi thiếu bảng.
 */
export async function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = runSchemaBootstrap().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

async function runSchemaBootstrap(): Promise<void> {
  const sql = getSql();
  await sql.transaction([
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        notes TEXT,
        due_date TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        category TEXT NOT NULL DEFAULT 'personal',
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMPTZ,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE INDEX IF NOT EXISTS tasks_user_due_idx ON tasks (user_id, due_date)
    `,
    sql`
      CREATE TABLE IF NOT EXISTS habits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'health',
        color TEXT NOT NULL DEFAULT 'emerald',
        frequency TEXT NOT NULL DEFAULT 'daily',
        days_of_week JSONB NOT NULL DEFAULT '[0, 1, 2, 3, 4, 5, 6]'::jsonb,
        reminder_time TEXT,
        archived BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      ALTER TABLE habits ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
    `,
    sql`
      CREATE INDEX IF NOT EXISTS habits_user_archived_idx ON habits (user_id, archived)
    `,
    sql`
      CREATE TABLE IF NOT EXISTS habit_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        completed_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS habit_completions_habit_date_uq
        ON habit_completions (habit_id, completed_date)
    `,
    sql`
      CREATE INDEX IF NOT EXISTS habit_completions_user_date_idx
        ON habit_completions (user_id, completed_date)
    `,
  ]);
}

export function isSchemaBootstrapError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const candidate = err as { code?: unknown; cause?: unknown };
  if (candidate.code === '42P01' || candidate.code === '42703') {
    return true;
  }
  if (candidate.cause && typeof candidate.cause === 'object') {
    const cause = candidate.cause as { code?: unknown };
    return cause.code === '42P01' || cause.code === '42703';
  }
  return false;
}

export async function withAutoSchema<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaBootstrapError(err)) {
      await ensureSchema();
      return await fn();
    }
    throw err;
  }
}
