import { and, desc, eq, lt, type SQL } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { tasks } from '@/db/schema';
import { handleApiError, requireUser } from '@/lib/api-helpers';
import {
  CATEGORY_KEYS,
  PRIORITIES,
  PRIORITY_KEYS,
  type CategoryKey,
  type PriorityKey,
} from '@/lib/constants';
import { getTodayDateKey, isValidDateKey } from '@/lib/dates';
import { createTaskSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim().toLowerCase() ?? '';
    const status = searchParams.get('status') ?? 'all';
    const category = searchParams.get('category') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const date = searchParams.get('date') ?? '';
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const conditions: SQL[] = [eq(tasks.userId, user.id)];

    if (status === 'open') {
      conditions.push(eq(tasks.completed, false));
    } else if (status === 'completed') {
      conditions.push(eq(tasks.completed, true));
    } else if (status === 'overdue') {
      conditions.push(eq(tasks.completed, false));
      conditions.push(lt(tasks.dueDate, today));
    }

    if (CATEGORY_KEYS.includes(category as CategoryKey)) {
      conditions.push(eq(tasks.category, category));
    }
    if (PRIORITY_KEYS.includes(priority as PriorityKey)) {
      conditions.push(eq(tasks.priority, priority));
    }
    if (date && isValidDateKey(date)) {
      conditions.push(eq(tasks.dueDate, date));
    }

    const rows = await withAutoSchema(async () => {
      const db = getDb();
      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(tasks.completed, tasks.dueDate, desc(tasks.createdAt));
    });

    const filtered = q
      ? rows.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.notes ?? '').toLowerCase().includes(q),
        )
      : rows;

    filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      const wa = PRIORITIES[a.priority as PriorityKey]?.weight ?? 2;
      const wb = PRIORITIES[b.priority as PriorityKey]?.weight ?? 2;
      if (wa !== wb) {
        return wa - wb;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({ tasks: filtered });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = createTaskSchema.parse(body);

    const created = await withAutoSchema(async () => {
      const db = getDb();
      const [inserted] = await db
        .insert(tasks)
        .values({
          userId: user.id,
          title: parsed.title,
          notes: parsed.notes ?? null,
          dueDate: parsed.dueDate,
          priority: parsed.priority,
          category: parsed.category,
        })
        .returning();
      return inserted;
    });

    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
