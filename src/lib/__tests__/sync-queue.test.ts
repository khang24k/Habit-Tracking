import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyQueuedOpsToState,
  dropDependentOps,
  enqueueMutation,
  getSyncQueueStorageKey,
  loadQueueFromStorage,
  remapQueueEntityId,
  saveQueueToStorage,
  type QueuedMutation,
  type StorageLike,
} from '../sync-queue';
import { calculateHabitStats } from '../streaks';
import type { HabitItem, TaskItem } from '@/types/app';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'user-1',
    title: 'Task 1',
    notes: null,
    dueDate: '2026-11-20',
    priority: 'medium',
    category: 'personal',
    completed: false,
    completedAt: null,
    sortOrder: 0,
    createdAt: '2026-11-20T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
    ...overrides,
  };
}

function makeHabit(overrides: Partial<HabitItem> = {}): HabitItem {
  const daysOfWeek = overrides.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
  const completedDates = overrides.completedDates ?? [];
  return {
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'user-1',
    title: 'Drink Water',
    description: null,
    category: 'health',
    color: 'blue',
    frequency: 'daily',
    daysOfWeek,
    reminderTime: null,
    archived: false,
    sortOrder: 0,
    createdAt: '2026-11-20T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
    completedDates,
    stats: calculateHabitStats(daysOfWeek, completedDates, '2026-11-20'),
    ...overrides,
  };
}

test('enqueueMutation coalesces and cancels habit completion toggles', () => {
  let queue: QueuedMutation[] = [];

  queue = enqueueMutation(queue, {
    opId: 'op-1',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-20',
    completed: true,
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:00.000Z',
  });
  assert.equal(queue.length, 1);

  // Toggle back before flush -> cancels out to 0 requests
  queue = enqueueMutation(queue, {
    opId: 'op-2',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-20',
    completed: false,
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:01.000Z',
  });
  assert.equal(queue.length, 0);

  // Toggle ON -> OFF -> ON when starting from true -> keeps single op with completed=false then cancels
  queue = enqueueMutation(queue, {
    opId: 'op-3',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-20',
    completed: false,
    baseCompleted: true,
    createdAt: '2026-11-20T09:00:02.000Z',
  });
  queue = enqueueMutation(queue, {
    opId: 'op-4',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-20',
    completed: true,
    baseCompleted: true,
    createdAt: '2026-11-20T09:00:03.000Z',
  });
  assert.equal(queue.length, 0);

  // Different dates do not collide
  queue = enqueueMutation(queue, {
    opId: 'op-5',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-19',
    completed: true,
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:04.000Z',
  });
  queue = enqueueMutation(queue, {
    opId: 'op-6',
    type: 'habit:set-completion',
    habitId: 'h-1',
    date: '2026-11-20',
    completed: true,
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:05.000Z',
  });
  assert.equal(queue.length, 2);
});

test('enqueueMutation merges task updates and cancels round-trip completion toggles', () => {
  let queue: QueuedMutation[] = [];

  queue = enqueueMutation(queue, {
    opId: 'op-1',
    type: 'task:update',
    taskId: 't-1',
    patch: { completed: true },
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:00.000Z',
  });
  assert.equal(queue.length, 1);

  queue = enqueueMutation(queue, {
    opId: 'op-2',
    type: 'task:update',
    taskId: 't-1',
    patch: { completed: false },
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:01.000Z',
  });
  assert.equal(queue.length, 0);

  // If another field was also modified, keep the update even if completed toggled back
  queue = enqueueMutation(queue, {
    opId: 'op-3',
    type: 'task:update',
    taskId: 't-1',
    patch: { title: 'Updated title', completed: true },
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:02.000Z',
  });
  queue = enqueueMutation(queue, {
    opId: 'op-4',
    type: 'task:update',
    taskId: 't-1',
    patch: { completed: false },
    baseCompleted: true,
    createdAt: '2026-11-20T09:00:03.000Z',
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'task:update');
  if (queue[0].type === 'task:update') {
    assert.deepEqual(queue[0].patch, {
      title: 'Updated title',
      completed: false,
    });
  }
});

test('enqueueMutation merges updates into pending create and cancels delete of unsynced create', () => {
  let queue: QueuedMutation[] = [];

  queue = enqueueMutation(queue, {
    opId: 'op-c',
    type: 'task:create',
    tempId: 'tmp_task_1',
    payload: {
      title: 'Draft',
      notes: null,
      dueDate: '2026-11-20',
      priority: 'medium',
      category: 'personal',
    },
    createdAt: '2026-11-20T09:00:00.000Z',
  });

  queue = enqueueMutation(queue, {
    opId: 'op-u1',
    type: 'task:update',
    taskId: 'tmp_task_1',
    patch: { title: 'Edited Draft', priority: 'high' },
    createdAt: '2026-11-20T09:00:01.000Z',
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'task:create');
  if (queue[0].type === 'task:create') {
    assert.equal(queue[0].payload.title, 'Edited Draft');
    assert.equal(queue[0].payload.priority, 'high');
  }

  // Completing an unsynced temp task keeps create + appends task:update({ completed: true })
  queue = enqueueMutation(queue, {
    opId: 'op-u2',
    type: 'task:update',
    taskId: 'tmp_task_1',
    patch: { completed: true },
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:02.000Z',
  });
  assert.equal(queue.length, 2);

  // Deleting the unsynced temp task removes both create and update -> 0 requests
  queue = enqueueMutation(queue, {
    opId: 'op-d',
    type: 'task:delete',
    taskId: 'tmp_task_1',
    createdAt: '2026-11-20T09:00:03.000Z',
  });
  assert.equal(queue.length, 0);
});

test('enqueueMutation handles habit create merge, archive cancel, and inFlight protection', () => {
  let queue: QueuedMutation[] = [];

  queue = enqueueMutation(queue, {
    opId: 'op-hc',
    type: 'habit:create',
    tempId: 'tmp_habit_1',
    payload: {
      title: 'Run',
      description: null,
      category: 'health',
      color: 'blue',
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      reminderTime: null,
    },
    createdAt: '2026-11-20T09:00:00.000Z',
  });

  // Protected while op-hc is in-flight: must NOT merge into op-hc, must append instead
  queue = enqueueMutation(
    queue,
    {
      opId: 'op-hu',
      type: 'habit:update',
      habitId: 'tmp_habit_1',
      patch: { title: 'Run 5km' },
      createdAt: '2026-11-20T09:00:01.000Z',
    },
    'op-hc',
  );
  assert.equal(queue.length, 2);

  // When op-hc finishes, remapping temp ID updates trailing op-hu
  queue = remapQueueEntityId(queue.slice(1), 'habit', 'tmp_habit_1', 'uuid-real');
  assert.equal(queue.length, 1);
  if (queue[0].type === 'habit:update') {
    assert.equal(queue[0].habitId, 'uuid-real');
  }

  // Deleting pending habit also drops pending completions and archive updates
  queue = enqueueMutation(queue, {
    opId: 'op-hcomp',
    type: 'habit:set-completion',
    habitId: 'uuid-real',
    date: '2026-11-20',
    completed: true,
    baseCompleted: false,
    createdAt: '2026-11-20T09:00:02.000Z',
  });
  queue = enqueueMutation(queue, {
    opId: 'op-hd',
    type: 'habit:delete',
    habitId: 'uuid-real',
    createdAt: '2026-11-20T09:00:03.000Z',
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'habit:delete');

  // dropDependentOps removes all queued operations for an entity
  const pruned = dropDependentOps(queue, 'habit', 'uuid-real');
  assert.equal(pruned.length, 0);
});

test('localStorage persistence isolates users and tolerates corrupt JSON', () => {
  const storage = createMemoryStorage();
  const sampleQueue: QueuedMutation[] = [
    {
      opId: 'op-1',
      type: 'habit:set-completion',
      habitId: 'h-1',
      date: '2026-11-20',
      completed: true,
      baseCompleted: false,
      createdAt: '2026-11-20T09:00:00.000Z',
    },
  ];

  saveQueueToStorage('user-a', sampleQueue, storage);
  assert.equal(loadQueueFromStorage('user-a', storage).length, 1);
  assert.equal(loadQueueFromStorage('user-b', storage).length, 0);

  // Emptying removes key cleanly
  saveQueueToStorage('user-a', [], storage);
  assert.equal(storage.getItem(getSyncQueueStorageKey('user-a')), null);

  // Corrupt JSON / invalid elements safely ignored
  storage.setItem(getSyncQueueStorageKey('user-a'), '{not valid json');
  assert.deepEqual(loadQueueFromStorage('user-a', storage), []);

  storage.setItem(
    getSyncQueueStorageKey('user-a'),
    JSON.stringify([{ opId: 'bad', type: 'unknown' }, sampleQueue[0]]),
  );
  assert.equal(loadQueueFromStorage('user-a', storage).length, 1);
});

test('applyQueuedOpsToState replays local queue cleanly on top of server snapshot', () => {
  const serverTasks = [makeTask()];
  const serverHabits = [makeHabit()];

  const queue: QueuedMutation[] = [
    {
      opId: 'op-1',
      type: 'task:update',
      taskId: serverTasks[0].id,
      patch: { completed: true },
      baseCompleted: false,
      createdAt: '2026-11-20T10:00:00.000Z',
    },
    {
      opId: 'op-2',
      type: 'task:create',
      tempId: 'tmp_task_new',
      payload: {
        title: 'Offline task',
        notes: null,
        dueDate: '2026-11-20',
        priority: 'high',
        category: 'work',
      },
      createdAt: '2026-11-20T10:00:01.000Z',
    },
    {
      opId: 'op-3',
      type: 'habit:set-completion',
      habitId: serverHabits[0].id,
      date: '2026-11-20',
      completed: true,
      baseCompleted: false,
      createdAt: '2026-11-20T10:00:02.000Z',
    },
  ];

  const merged = applyQueuedOpsToState(
    serverTasks,
    serverHabits,
    queue,
    'user-1',
    '2026-11-20',
  );

  assert.equal(merged.tasks.length, 2);
  assert.equal(merged.tasks[0].id, 'tmp_task_new');
  assert.equal(merged.tasks[1].completed, true);
  assert.deepEqual(merged.habits[0].completedDates, ['2026-11-20']);
  assert.equal(merged.habits[0].stats.currentStreak, 1);
});

test('applyQueuedOpsToState replays sortOrder updates cleanly for tasks and habits', () => {
  const serverTasks = [
    makeTask({ id: 't-1', title: 'First', sortOrder: 1 }),
    makeTask({ id: 't-2', title: 'Second', sortOrder: 2 }),
  ];
  const serverHabits = [
    makeHabit({ id: 'h-1', title: 'Habit 1', sortOrder: 1 }),
    makeHabit({ id: 'h-2', title: 'Habit 2', sortOrder: 2 }),
  ];

  const queue: QueuedMutation[] = [
    {
      opId: 'op-t1',
      type: 'task:update',
      taskId: 't-1',
      patch: { sortOrder: 2 },
      createdAt: '2026-11-20T11:00:00.000Z',
    },
    {
      opId: 'op-t2',
      type: 'task:update',
      taskId: 't-2',
      patch: { sortOrder: 1 },
      createdAt: '2026-11-20T11:00:01.000Z',
    },
    {
      opId: 'op-h1',
      type: 'habit:update',
      habitId: 'h-1',
      patch: { sortOrder: 2 },
      createdAt: '2026-11-20T11:00:02.000Z',
    },
    {
      opId: 'op-h2',
      type: 'habit:update',
      habitId: 'h-2',
      patch: { sortOrder: 1 },
      createdAt: '2026-11-20T11:00:03.000Z',
    },
  ];

  const merged = applyQueuedOpsToState(
    serverTasks,
    serverHabits,
    queue,
    'user-1',
    '2026-11-20',
  );

  assert.deepEqual(
    merged.tasks.map((t) => t.id),
    ['t-2', 't-1'],
  );
  assert.deepEqual(
    merged.habits.map((h) => h.id),
    ['h-2', 'h-1'],
  );
});
