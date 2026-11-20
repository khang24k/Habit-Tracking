import type { HabitItem, StatsResponse, TaskItem } from '@/types/app';
import { getLastNDays } from './dates';
import { calculateHabitStats } from './streaks';

function toDateKeyInTimezone(
  isoOrDate: string | Date,
  timeZone: string,
): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return typeof isoOrDate === 'string' ? isoOrDate.slice(0, 10) : '';
  }

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

export function computeClientStats(
  tasks: TaskItem[],
  habits: HabitItem[],
  todayKey: string,
  timeZone = 'Asia/Ho_Chi_Minh',
): StatsResponse {
  const taskDoneByDate = new Map<string, number>();
  let tasksCompletedTotal = 0;
  let tasksOpenTotal = 0;
  let tasksCompletedToday = 0;

  for (const task of tasks) {
    if (task.completed) {
      tasksCompletedTotal += 1;
      const doneKey = task.completedAt
        ? toDateKeyInTimezone(task.completedAt, timeZone)
        : task.dueDate;
      taskDoneByDate.set(doneKey, (taskDoneByDate.get(doneKey) ?? 0) + 1);
      if (doneKey === todayKey) {
        tasksCompletedToday += 1;
      }
    } else {
      tasksOpenTotal += 1;
    }
  }

  const habitDoneByDate = new Map<string, number>();
  for (const habit of habits) {
    for (const date of habit.completedDates) {
      habitDoneByDate.set(date, (habitDoneByDate.get(date) ?? 0) + 1);
    }
  }

  const activeHabits = habits.filter((h) => !h.archived);
  const habitBreakdown = activeHabits.map((habit) => {
    const stats = calculateHabitStats(
      habit.daysOfWeek,
      habit.completedDates,
      todayKey,
    );
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

  const heatmapDays = getLastNDays(todayKey, 84);
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

  return {
    today: todayKey,
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
  };
}
