import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { habitCompletions, habits } from '@/db/schema';
import { NotFoundError, handleApiError, requireUser } from '@/lib/api-helpers';
import { getTodayDateKey, isValidDateKey } from '@/lib/dates';
import { calculateHabitStats } from '@/lib/streaks';
import { toggleHabitSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const habitId = uuidSchema.parse(id);

    const { searchParams } = new URL(request.url);
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const body = await request.json();
    const { date } = toggleHabitSchema.parse(body);

    const result = await withAutoSchema(async () => {
      const db = getDb();
      const [habit] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .limit(1);

      if (!habit) {
        return null;
      }

      const existing = await db
        .select({ id: habitCompletions.id })
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.habitId, habitId),
            eq(habitCompletions.completedDate, date),
          ),
        )
        .limit(1);

      let completed = false;
      if (existing.length > 0) {
        await db
          .delete(habitCompletions)
          .where(eq(habitCompletions.id, existing[0].id));
        completed = false;
      } else {
        await db
          .insert(habitCompletions)
          .values({
            habitId,
            userId: user.id,
            completedDate: date,
          })
          .onConflictDoNothing();
        completed = true;
      }

      const rows = await db
        .select({ completedDate: habitCompletions.completedDate })
        .from(habitCompletions)
        .where(eq(habitCompletions.habitId, habitId));

      const completedDates = rows.map((r) => r.completedDate);
      const stats = calculateHabitStats(habit.daysOfWeek, completedDates, today);

      return {
        completed,
        date,
        completedDates,
        stats,
      };
    });

    if (!result) {
      throw new NotFoundError('Không tìm thấy thói quen.');
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
