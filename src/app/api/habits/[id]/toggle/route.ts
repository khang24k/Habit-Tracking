import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, getSql } from '@/db';
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
    const compact = searchParams.get('compact') === '1';
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const body = await request.json();
    const { date, completed: desiredCompleted } = toggleHabitSchema.parse(body);

    const result = await withAutoSchema(async () => {
      if (compact && desiredCompleted !== undefined) {
        const sql = getSql();
        const rows = desiredCompleted
          ? await sql`
              WITH owned AS (
                SELECT id FROM habits WHERE id = ${habitId}::uuid AND user_id = ${user.id}::uuid
              ),
              ins AS (
                INSERT INTO habit_completions (habit_id, user_id, completed_date)
                SELECT id, ${user.id}::uuid, ${date}::text FROM owned
                ON CONFLICT (habit_id, completed_date) DO NOTHING
              )
              SELECT EXISTS(SELECT 1 FROM owned) AS found
            `
          : await sql`
              WITH owned AS (
                SELECT id FROM habits WHERE id = ${habitId}::uuid AND user_id = ${user.id}::uuid
              ),
              del AS (
                DELETE FROM habit_completions
                WHERE habit_id IN (SELECT id FROM owned)
                  AND completed_date = ${date}::text
              )
              SELECT EXISTS(SELECT 1 FROM owned) AS found
            `;

        const found = Boolean(rows[0]?.found);
        if (!found) {
          return null;
        }
        return {
          completed: desiredCompleted,
          date,
        };
      }

      const db = getDb();
      const [habit] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .limit(1);

      if (!habit) {
        return null;
      }

      let finalCompleted = false;
      if (desiredCompleted !== undefined) {
        if (desiredCompleted) {
          await db
            .insert(habitCompletions)
            .values({
              habitId,
              userId: user.id,
              completedDate: date,
            })
            .onConflictDoNothing();
        } else {
          await db
            .delete(habitCompletions)
            .where(
              and(
                eq(habitCompletions.habitId, habitId),
                eq(habitCompletions.completedDate, date),
              ),
            );
        }
        finalCompleted = desiredCompleted;
      } else {
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

        if (existing.length > 0) {
          await db
            .delete(habitCompletions)
            .where(eq(habitCompletions.id, existing[0].id));
          finalCompleted = false;
        } else {
          await db
            .insert(habitCompletions)
            .values({
              habitId,
              userId: user.id,
              completedDate: date,
            })
            .onConflictDoNothing();
          finalCompleted = true;
        }
      }

      const rows = await db
        .select({ completedDate: habitCompletions.completedDate })
        .from(habitCompletions)
        .where(eq(habitCompletions.habitId, habitId));

      const completedDates = rows.map((r) => r.completedDate);
      const stats = calculateHabitStats(habit.daysOfWeek, completedDates, today);

      return {
        completed: finalCompleted,
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
