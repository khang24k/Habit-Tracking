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
    const compact = searchParams.get('compact') === '1';
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const body = await request.json();
    const parsed = updateHabitSchema.parse(body);

    const result = await withAutoSchema(async () => {
      const db = getDb();
      const baseUpdates: Partial<typeof habits.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (parsed.title !== undefined) baseUpdates.title = parsed.title;
      if (parsed.description !== undefined)
        baseUpdates.description = parsed.description;
      if (parsed.category !== undefined) baseUpdates.category = parsed.category;
      if (parsed.color !== undefined) baseUpdates.color = parsed.color;
      if (parsed.reminderTime !== undefined)
        baseUpdates.reminderTime = parsed.reminderTime;
      if (parsed.archived !== undefined) baseUpdates.archived = parsed.archived;

      if (compact) {
        const directDays =
          parsed.frequency !== undefined
            ? daysOfWeekForFrequency(
                parsed.frequency as FrequencyKey,
                parsed.daysOfWeek,
              )
            : undefined;

        const canUpdateDirectly =
          (parsed.frequency === undefined && parsed.daysOfWeek === undefined) ||
          (parsed.frequency !== undefined &&
            directDays !== undefined &&
            directDays.length > 0);

        if (canUpdateDirectly) {
          if (parsed.frequency !== undefined && directDays) {
            baseUpdates.frequency = parsed.frequency;
            baseUpdates.daysOfWeek = directDays;
          }

          const [updated] = await db
            .update(habits)
            .set(baseUpdates)
            .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
            .returning();

          if (!updated) {
            return null;
          }

          return { ok: true as const, habit: updated };
        }
      }

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
        ...baseUpdates,
        frequency: nextFrequency,
        daysOfWeek: nextDaysOfWeek,
      };

      const [updated] = await db
        .update(habits)
        .set(updates)
        .where(and(eq(habits.id, habitId), eq(habits.userId, user.id)))
        .returning();

      if (compact) {
        return { ok: true as const, habit: updated };
      }

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
        ok: false as const,
        habit: {
          ...updated,
          completedDates,
          stats,
        },
      };
    });

    if (!result) {
      throw new NotFoundError('Không tìm thấy thói quen.');
    }

    return NextResponse.json(
      result.ok ? { ok: true, habit: result.habit } : { habit: result.habit },
    );
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
