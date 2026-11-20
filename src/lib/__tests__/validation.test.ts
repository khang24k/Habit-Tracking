import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHabitSchema,
  createTaskSchema,
  registerSchema,
  toggleHabitSchema,
} from '../validation';

test('registerSchema normalizes email and rejects short passwords', () => {
  const ok = registerSchema.parse({
    name: '  Minh Khôi ',
    email: 'USER@Example.COM',
    password: 'password123',
  });
  assert.equal(ok.name, 'Minh Khôi');
  assert.equal(ok.email, 'user@example.com');

  assert.throws(() =>
    registerSchema.parse({
      name: 'A',
      email: 'bad-email',
      password: '123',
    }),
  );

  const matched = registerSchema.parse({
    name: 'Minh Khôi',
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(matched.confirmPassword, 'password123');

  assert.throws(() =>
    registerSchema.parse({
      name: 'Minh Khôi',
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    }),
  );
});

test('createTaskSchema validates date keys and defaults', () => {
  const task = createTaskSchema.parse({
    title: 'Hoàn thành báo cáo',
    dueDate: '2026-11-20',
  });
  assert.equal(task.priority, 'medium');
  assert.equal(task.category, 'personal');

  assert.throws(() =>
    createTaskSchema.parse({
      title: 'Test',
      dueDate: '2026-02-30',
    }),
  );
});

test('createHabitSchema derives daysOfWeek from frequency presets', () => {
  const weekdaysHabit = createHabitSchema.parse({
    title: 'Học tiếng Anh',
    frequency: 'weekdays',
  });
  assert.deepEqual(weekdaysHabit.daysOfWeek, [1, 2, 3, 4, 5]);

  const customHabit = createHabitSchema.parse({
    title: 'Gym',
    frequency: 'custom',
    daysOfWeek: [5, 1, 3, 1],
  });
  assert.deepEqual(customHabit.daysOfWeek, [1, 3, 5]);

  assert.throws(() =>
    createHabitSchema.parse({
      title: 'Gym',
      frequency: 'custom',
      daysOfWeek: [],
    }),
  );
});

test('toggleHabitSchema rejects malformed dates', () => {
  assert.deepEqual(toggleHabitSchema.parse({ date: '2026-11-20' }), {
    date: '2026-11-20',
  });
  assert.throws(() => toggleHabitSchema.parse({ date: '2026/11/20' }));
});
