import assert from 'node:assert/strict';
import test from 'node:test';
import { computeClientStats } from '../client-stats';
import { calculateHabitStats } from '../streaks';
import type { HabitItem, TaskItem } from '@/types/app';

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 't-1',
    userId: 'u-1',
    title: 'Task',
    notes: null,
    dueDate: '2026-11-20',
    priority: 'medium',
    category: 'personal',
    completed: false,
    completedAt: null,
    sortOrder: 0,
    createdAt: '2026-11-20T01:00:00.000Z',
    updatedAt: '2026-11-20T01:00:00.000Z',
    ...overrides,
  };
}

function makeHabit(overrides: Partial<HabitItem> = {}): HabitItem {
  const daysOfWeek = overrides.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
  const completedDates = overrides.completedDates ?? [];
  return {
    id: 'h-1',
    userId: 'u-1',
    title: 'Habit',
    description: null,
    category: 'health',
    color: 'blue',
    frequency: 'daily',
    daysOfWeek,
    reminderTime: null,
    archived: false,
    createdAt: '2026-11-20T01:00:00.000Z',
    updatedAt: '2026-11-20T01:00:00.000Z',
    completedDates,
    stats: calculateHabitStats(daysOfWeek, completedDates, '2026-11-20'),
    ...overrides,
  };
}

test('computeClientStats summarizes tasks, active habits, and 84-day heatmap accurately', () => {
  const todayKey = '2026-11-20';
  const tasks: TaskItem[] = [
    makeTask({
      id: 't-done-today',
      completed: true,
      completedAt: '2026-11-20T10:00:00.000Z',
    }),
    makeTask({
      id: 't-done-earlier',
      dueDate: '2026-11-18',
      completed: true,
      completedAt: '2026-11-18T10:00:00.000Z',
    }),
    makeTask({
      id: 't-open',
      completed: false,
    }),
  ];

  const habits: HabitItem[] = [
    makeHabit({
      id: 'h-active',
      title: 'Water',
      completedDates: ['2026-11-19', '2026-11-20'],
    }),
    makeHabit({
      id: 'h-archived',
      title: 'Old habit',
      archived: true,
      completedDates: ['2026-11-20'],
    }),
  ];

  const stats = computeClientStats(
    tasks,
    habits,
    todayKey,
    'Asia/Ho_Chi_Minh',
  );

  assert.equal(stats.summary.tasksCompletedTotal, 2);
  assert.equal(stats.summary.tasksOpenTotal, 1);
  assert.equal(stats.summary.tasksCompletedToday, 1);

  // Breakdown includes only non-archived habits
  assert.equal(stats.habitBreakdown.length, 1);
  assert.equal(stats.habitBreakdown[0].id, 'h-active');
  assert.equal(stats.summary.habitsActiveCount, 1);
  assert.equal(stats.summary.habitsCompletedToday, 1);
  assert.equal(stats.summary.habitsScheduledToday, 1);
  assert.equal(stats.summary.bestStreak, 2);

  // Heatmap includes 84 days and counts completions across both active & archived habits
  assert.equal(stats.heatmap.length, 84);
  const todayPoint = stats.heatmap[83];
  assert.equal(todayPoint.date, todayKey);
  assert.equal(todayPoint.tasksCompleted, 1);
  assert.equal(todayPoint.habitsCompleted, 2);
  assert.equal(todayPoint.total, 3);
});
