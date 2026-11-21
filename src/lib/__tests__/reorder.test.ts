import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDayTaskReorder,
  applyHabitReorder,
  compareHabitsForDisplay,
  compareTasksForDisplay,
  moveItem,
} from '../reorder';
import { calculateHabitStats } from '../streaks';
import type { HabitItem, TaskItem } from '@/types/app';

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 't-1',
    userId: 'u-1',
    title: 'Task',
    notes: null,
    dueDate: '2026-11-21',
    priority: 'medium',
    category: 'personal',
    completed: false,
    completedAt: null,
    sortOrder: 0,
    createdAt: '2026-11-21T08:00:00.000Z',
    updatedAt: '2026-11-21T08:00:00.000Z',
    ...overrides,
  };
}

function makeHabit(overrides: Partial<HabitItem> = {}): HabitItem {
  const daysOfWeek = overrides.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
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
    sortOrder: 0,
    createdAt: '2026-11-21T08:00:00.000Z',
    updatedAt: '2026-11-21T08:00:00.000Z',
    completedDates: [],
    stats: calculateHabitStats(daysOfWeek, [], '2026-11-21'),
    ...overrides,
  };
}

test('moveItem moves element immutably and handles invalid indices safely', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 1, 1), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], -1, 1), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 5), ['a', 'b']);
});

test('compareTasksForDisplay respects sortOrder ahead of completed/priority on same dueDate', () => {
  const tasks = [
    makeTask({
      id: 't-completed-first',
      completed: true,
      priority: 'low',
      sortOrder: 1,
    }),
    makeTask({
      id: 't-open-second',
      completed: false,
      priority: 'high',
      sortOrder: 2,
    }),
    makeTask({
      id: 't-earlier-day',
      dueDate: '2026-11-20',
      sortOrder: 5,
    }),
  ];

  const sorted = [...tasks].sort(compareTasksForDisplay);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['t-earlier-day', 't-completed-first', 't-open-second'],
  );
});

test('applyDayTaskReorder updates sortOrder only on target date and emits only changed items', () => {
  const allTasks = [
    makeTask({ id: 't-1', dueDate: '2026-11-21', sortOrder: 1 }),
    makeTask({ id: 't-2', dueDate: '2026-11-21', sortOrder: 2 }),
    makeTask({ id: 't-3', dueDate: '2026-11-21', sortOrder: 3 }),
    makeTask({ id: 't-other', dueDate: '2026-11-22', sortOrder: 1 }),
  ];

  const result = applyDayTaskReorder(allTasks, '2026-11-21', [
    't-1',
    't-3',
    't-2',
  ]);

  assert.deepEqual(
    result.tasks.filter((t) => t.dueDate === '2026-11-21').map((t) => t.id),
    ['t-1', 't-3', 't-2'],
  );
  // t-1 stayed at sortOrder 1, t-other untouched
  assert.deepEqual(result.changed, [
    { id: 't-3', sortOrder: 2 },
    { id: 't-2', sortOrder: 3 },
  ]);
  const otherTask = result.tasks.find((t) => t.id === 't-other');
  assert.equal(otherTask?.sortOrder, 1);
});

test('applyHabitReorder preserves hidden rest-day and archived habit positions cleanly', () => {
  const allHabits = [
    makeHabit({ id: 'h-vis-1', sortOrder: 1 }),
    makeHabit({ id: 'h-rest', daysOfWeek: [0], sortOrder: 2 }),
    makeHabit({ id: 'h-vis-2', sortOrder: 3 }),
    makeHabit({ id: 'h-archived', archived: true, sortOrder: 4 }),
    makeHabit({ id: 'h-vis-3', sortOrder: 5 }),
  ];

  // Move h-vis-3 before h-vis-1 in visible subset
  const result = applyHabitReorder(allHabits, [
    'h-vis-3',
    'h-vis-1',
    'h-vis-2',
  ]);

  assert.deepEqual(
    [...result.habits].sort(compareHabitsForDisplay).map((h) => h.id),
    ['h-vis-3', 'h-rest', 'h-vis-1', 'h-archived', 'h-vis-2'],
  );
  // Hidden habits keep their slot indices (2 and 4) -> zero unnecessary patch emissions
  assert.deepEqual(result.changed, [
    { id: 'h-vis-3', sortOrder: 1 },
    { id: 'h-vis-1', sortOrder: 3 },
    { id: 'h-vis-2', sortOrder: 5 },
  ]);
});
