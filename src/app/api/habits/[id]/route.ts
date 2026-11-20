import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { habitCompletions, habits } from '@/db/schema';
import { NotFoundError, handleApiError, requireUser } from '@/lib/api-helpers';
import { daysOfWeekForFrequency, type FrequencyKey } from '@/lib/constants';
import { getTodayDateKey, isValidDateKey } from '@/lib/dates';
import { calculateHabitStats } from '@/lib/streaks';
import { updateHabitSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function PATCH(
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
    const parsed = updateHabitSchema.parse(body);

    const result = await withAutoSchema(async () => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .limit(1);

      if (!existing) {
        return null;
      }

      const nextFrequency = (parsed.frequency ??
        existing.frequency) as FrequencyKey;
      let nextDaysOfWeek = existing.daysOfWeek;

      if (parsed.frequency !== undefined || parsed.daysOfWeek !== undefined) {
        nextDaysOfWeek = daysOfWeekForFrequency(
          nextFrequency,
          parsed.daysOfWeek ?? existing.daysOfWeek,
        );
        if (nextDaysOfWeek.length === 0) {
          nextDaysOfWeek = existing.daysOfWeek;
        }
      }

      const updates: Partial<typeof habits.$inferInsert> = {
        updatedAt: new Date(),
        frequency: nextFrequency,
        daysOfWeek: nextDaysOfWeek,
      };
      if (parsed.title !== undefined) updates.title = parsed.title;
      if (parsed.description !== undefined)
        updates.description = parsed.description;
      if (parsed.category !== undefined) updates.category = parsed.category;
      if (parsed.color !== undefined) updates.color = parsed.color;
      if (parsed.reminderTime !== undefined)
        updates.reminderTime = parsed.reminderTime;
      if (parsed.archived !== undefined) updates.archived = parsed.archived;

      const [updated] = await db
        .update(habits)
        .set(updates)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .returning();

      const completionRows = await db
        .select({ completedDate: habitCompletions.completedDate })
        .from(habitCompletions)
        .where(eq(habitCompletions.habitId, habitId));

      const completedDates = completionRows.map((c) => c.completedDate);
      const stats = calculateHabitStats(
        updated.daysOfWeek,
        completedDates,
        today,
      );

      return {
        ...updated,
        completedDates,
        stats,
      };
    });

    if (!result) {
      throw new NotFoundError('Không tìm thấy thói quen.');
    }

    return NextResponse.json({ habit: result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const habitId = uuidSchema.parse(id);

    const deleted = await withAutoSchema(async () => {
      const db = getDb();
      const [row] = await db
        .delete(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .returning({ id: habits.id });
      return row ?? null;
    });

    if (!deleted) {
      throw new NotFoundError('Không tìm thấy thói quen.');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
