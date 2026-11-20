import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { habitCompletions, habits, tasks } from '@/db/schema';
import { handleApiError, requireUser } from '@/lib/api-helpers';
import { getLastNDays, getTodayDateKey, isValidDateKey } from '@/lib/dates';
import { calculateHabitStats } from '@/lib/streaks';

export const runtime = 'nodejs';

function toDateKeyInTimezone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const todayParam = searchParams.get('today') ?? '';
    const today = isValidDateKey(todayParam)
      ? todayParam
      : getTodayDateKey(user.timezone);

    const { taskRows, habitRows, completionRows } = await withAutoSchema(
      async () => {
        const db = getDb();
        const [taskList, habitList, completionList] = await Promise.all([
          db.select().from(tasks).where(eq(tasks.userId, user.id)),
          db
            .select()
            .from(habits)
            .where(and(eq(habits.userId, user.id), eq(habits.archived, false)))
            .orderBy(asc(habits.createdAt)),
          db
            .select({
              habitId: habitCompletions.habitId,
              completedDate: habitCompletions.completedDate,
            })
            .from(habitCompletions)
            .where(eq(habitCompletions.userId, user.id)),
        ]);
        return {
          taskRows: taskList,
          habitRows: habitList,
          completionRows: completionList,
        };
      },
    );

    const datesByHabit = new Map<string, string[]>();
    const habitDoneByDate = new Map<string, number>();

    for (const row of completionRows) {
      const list = datesByHabit.get(row.habitId) ?? [];
      list.push(row.completedDate);
      datesByHabit.set(row.habitId, list);

      habitDoneByDate.set(
        row.completedDate,
        (habitDoneByDate.get(row.completedDate) ?? 0) + 1,
      );
    }

    const taskDoneByDate = new Map<string, number>();
    let tasksCompletedTotal = 0;
    let tasksOpenTotal = 0;
    let tasksCompletedToday = 0;

    for (const t of taskRows) {
      if (t.completed) {
        tasksCompletedTotal += 1;
        const doneKey = t.completedAt
          ? toDateKeyInTimezone(t.completedAt, user.timezone)
          : t.dueDate;
        taskDoneByDate.set(doneKey, (taskDoneByDate.get(doneKey) ?? 0) + 1);
        if (doneKey === today) {
          tasksCompletedToday += 1;
        }
      } else {
        tasksOpenTotal += 1;
      }
    }

    const habitBreakdown = habitRows.map((habit) => {
      const completedDates = datesByHabit.get(habit.id) ?? [];
      const stats = calculateHabitStats(habit.daysOfWeek, completedDates, today);
      return {
        id: habit.id,
        title: habit.title,
        color: habit.color,
        category: habit.category,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        completionRate30d: stats.completionRate30d,
        totalCompletions: stats.totalCompletions,
        completedToday: stats.completedToday,
        scheduledToday: stats.scheduledToday,
      };
    });

    const habitsActiveCount = habitBreakdown.length;
    const habitsCompletedToday = habitBreakdown.filter(
      (h) => h.completedToday,
    ).length;
    const habitsScheduledToday = habitBreakdown.filter(
      (h) => h.scheduledToday,
    ).length;
    const bestStreak = habitBreakdown.reduce(
      (max, h) => Math.max(max, h.longestStreak),
      0,
    );
    const avgRate30d =
      habitsActiveCount === 0
        ? 0
        : Math.round(
            habitBreakdown.reduce((sum, h) => sum + h.completionRate30d, 0) /
              habitsActiveCount,
          );

    const heatmapDays = getLastNDays(today, 84);
    const heatmap = heatmapDays.map((date) => {
      const tasksCompleted = taskDoneByDate.get(date) ?? 0;
      const habitsCompleted = habitDoneByDate.get(date) ?? 0;
      return {
        date,
        tasksCompleted,
        habitsCompleted,
        total: tasksCompleted + habitsCompleted,
      };
    });

    return NextResponse.json({
      today,
      summary: {
        tasksCompletedTotal,
        tasksOpenTotal,
        tasksCompletedToday,
        habitsActiveCount,
        habitsCompletedToday,
        habitsScheduledToday,
        bestStreak,
        avgRate30d,
      },
      heatmap,
      habitBreakdown,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
