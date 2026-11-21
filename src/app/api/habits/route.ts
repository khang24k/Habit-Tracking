import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { habitCompletions, habits } from '@/db/schema';
import { handleApiError, requireUser } from '@/lib/api-helpers';
import { getTodayDateKey, isValidDateKey } from '@/lib/dates';
import { calculateHabitStats } from '@/lib/streaks';
import { createHabitSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const { habitRows, completionRows } = await withAutoSchema(async () => {
      const db = getDb();
      const habitWhere = includeArchived
        ? eq(habits.userId, user.id)
        : and(eq(habits.userId, user.id), eq(habits.archived, false));

      const [habitList, completionList] = await Promise.all([
        db
          .select()
          .from(habits)
          .where(habitWhere)
          .orderBy(asc(habits.sortOrder), asc(habits.createdAt)),
        db
          .select({
            habitId: habitCompletions.habitId,
            completedDate: habitCompletions.completedDate,
          })
          .from(habitCompletions)
          .where(eq(habitCompletions.userId, user.id)),
      ]);

      return { habitRows: habitList, completionRows: completionList };
    });

    const datesByHabit = new Map<string, string[]>();
    for (const row of completionRows) {
      const existing = datesByHabit.get(row.habitId) ?? [];
      existing.push(row.completedDate);
      datesByHabit.set(row.habitId, existing);
    }

    const enriched = habitRows.map((habit) => {
      const completedDates = datesByHabit.get(habit.id) ?? [];
      const stats = calculateHabitStats(habit.daysOfWeek, completedDates, today);
      return {
        ...habit,
        completedDates,
        stats,
      };
    });

    return NextResponse.json({ habits: enriched, today });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const body = await request.json();
    const parsed = createHabitSchema.parse(body);

    const created = await withAutoSchema(async () => {
      const db = getDb();
      const [inserted] = await db
        .insert(habits)
        .values({
          userId: user.id,
          title: parsed.title,
          description: parsed.description ?? null,
          category: parsed.category,
          color: parsed.color,
          frequency: parsed.frequency,
          daysOfWeek: parsed.daysOfWeek,
          reminderTime: parsed.reminderTime ?? null,
          sortOrder: parsed.sortOrder ?? 0,
        })
        .returning();
      return inserted;
    });

    const stats = calculateHabitStats(created.daysOfWeek, [], today);

    return NextResponse.json(
      {
        habit: {
          ...created,
          completedDates: [],
          stats,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
