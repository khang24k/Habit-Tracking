import type { HabitItem, TaskItem } from '@/types/app';
import type {
  CategoryKey,
  FrequencyKey,
  HabitColorKey,
  PriorityKey,
} from './constants';
import { isValidDateKey } from './dates';
import { compareHabitsForDisplay, compareTasksForDisplay } from './reorder';
import { calculateHabitStats } from './streaks';

export interface TaskCreatePayload {
  title: string;
  notes: string | null;
  dueDate: string;
  priority: PriorityKey;
  category: CategoryKey;
}

export interface TaskUpdatePatch {
  title?: string;
  notes?: string | null;
  dueDate?: string;
  priority?: PriorityKey;
  category?: CategoryKey;
  completed?: boolean;
  sortOrder?: number;
}

export interface HabitCreatePayload {
  title: string;
  description: string | null;
  category: CategoryKey;
  color: HabitColorKey;
  frequency: FrequencyKey;
  daysOfWeek: number[];
  reminderTime: string | null;
  sortOrder?: number;
}

export interface HabitUpdatePatch {
  title?: string;
  description?: string | null;
  category?: CategoryKey;
  color?: HabitColorKey;
  frequency?: FrequencyKey;
  daysOfWeek?: number[];
  reminderTime?: string | null;
  archived?: boolean;
  sortOrder?: number;
}

export type QueuedMutation =
  | {
      opId: string;
      type: 'task:create';
      tempId: string;
      payload: TaskCreatePayload;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'task:update';
      taskId: string;
      patch: TaskUpdatePatch;
      baseCompleted?: boolean;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'task:delete';
      taskId: string;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'habit:create';
      tempId: string;
      payload: HabitCreatePayload;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'habit:update';
      habitId: string;
      patch: HabitUpdatePatch;
      baseArchived?: boolean;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'habit:set-completion';
      habitId: string;
      date: string;
      completed: boolean;
      baseCompleted: boolean;
      createdAt: string;
    }
  | {
      opId: string;
      type: 'habit:delete';
      habitId: string;
      createdAt: string;
    };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY_PREFIX = 'mylife-sync-queue-v1:';
const TEMP_ID_PREFIX = 'tmp_';

function randomToken(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSyncQueueStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function createOpId(): string {
  return `op_${randomToken()}`;
}

export function createTempId(kind: 'task' | 'habit'): string {
  return `${TEMP_ID_PREFIX}${kind}_${randomToken()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

function getTargetEntityId(op: QueuedMutation): string {
  switch (op.type) {
    case 'task:create':
    case 'habit:create':
      return op.tempId;
    case 'task:update':
    case 'task:delete':
      return op.taskId;
    case 'habit:update':
    case 'habit:set-completion':
    case 'habit:delete':
      return op.habitId;
  }
}

export function enqueueMutation(
  queue: QueuedMutation[],
  incoming: QueuedMutation,
  inFlightOpId: string | null = null,
): QueuedMutation[] {
  const next = queue.map((item) => ({ ...item }));
  const isEditable = (item: QueuedMutation) => item.opId !== inFlightOpId;

  switch (incoming.type) {
    case 'task:create':
    case 'habit:create': {
      next.push(incoming);
      return next;
    }

    case 'task:update': {
      let remainingPatch: TaskUpdatePatch = { ...incoming.patch };

      const createIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'task:create' &&
          item.tempId === incoming.taskId,
      );

      if (createIdx !== -1) {
        const createOp = next[createIdx];
        if (createOp.type === 'task:create') {
          const nextPayload: TaskCreatePayload = {
            ...createOp.payload,
            ...(remainingPatch.title !== undefined
              ? { title: remainingPatch.title }
              : {}),
            ...(remainingPatch.notes !== undefined
              ? { notes: remainingPatch.notes }
              : {}),
            ...(remainingPatch.dueDate !== undefined
              ? { dueDate: remainingPatch.dueDate }
              : {}),
            ...(remainingPatch.priority !== undefined
              ? { priority: remainingPatch.priority }
              : {}),
            ...(remainingPatch.category !== undefined
              ? { category: remainingPatch.category }
              : {}),
          };
          next[createIdx] = { ...createOp, payload: nextPayload };

          if (remainingPatch.completed === undefined) {
            return next;
          }
          remainingPatch = { completed: remainingPatch.completed };
        }
      }

      const updateIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'task:update' &&
          item.taskId === incoming.taskId,
      );

      if (updateIdx !== -1) {
        const existing = next[updateIdx];
        if (existing.type === 'task:update') {
          const mergedPatch: TaskUpdatePatch = {
            ...existing.patch,
            ...remainingPatch,
          };
          const baseCompleted =
            existing.baseCompleted !== undefined
              ? existing.baseCompleted
              : incoming.baseCompleted;

          const patchKeys = Object.keys(
            mergedPatch,
          ) as (keyof TaskUpdatePatch)[];
          if (
            patchKeys.length === 1 &&
            patchKeys[0] === 'completed' &&
            baseCompleted !== undefined &&
            mergedPatch.completed === baseCompleted
          ) {
            next.splice(updateIdx, 1);
            return next;
          }

          next[updateIdx] = {
            ...existing,
            patch: mergedPatch,
            ...(baseCompleted !== undefined ? { baseCompleted } : {}),
          };
          return next;
        }
      }

      next.push({ ...incoming, patch: remainingPatch });
      return next;
    }

    case 'task:delete': {
      const pendingCreateIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'task:create' &&
          item.tempId === incoming.taskId,
      );

      const filtered = next.filter((item) => {
        if (!isEditable(item)) return true;
        if (item.type === 'task:update' && item.taskId === incoming.taskId) {
          return false;
        }
        if (
          pendingCreateIdx !== -1 &&
          item.type === 'task:create' &&
          item.tempId === incoming.taskId
        ) {
          return false;
        }
        return true;
      });

      if (pendingCreateIdx !== -1) {
        return filtered;
      }

      const hasPendingDelete = filtered.some(
        (item) =>
          item.type === 'task:delete' && item.taskId === incoming.taskId,
      );
      if (!hasPendingDelete) {
        filtered.push(incoming);
      }
      return filtered;
    }

    case 'habit:update': {
      let remainingPatch: HabitUpdatePatch = { ...incoming.patch };

      const createIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'habit:create' &&
          item.tempId === incoming.habitId,
      );

      if (createIdx !== -1) {
        const createOp = next[createIdx];
        if (createOp.type === 'habit:create') {
          const nextPayload: HabitCreatePayload = {
            ...createOp.payload,
            ...(remainingPatch.title !== undefined
              ? { title: remainingPatch.title }
              : {}),
            ...(remainingPatch.description !== undefined
              ? { description: remainingPatch.description }
              : {}),
            ...(remainingPatch.category !== undefined
              ? { category: remainingPatch.category }
              : {}),
            ...(remainingPatch.color !== undefined
              ? { color: remainingPatch.color }
              : {}),
            ...(remainingPatch.frequency !== undefined
              ? { frequency: remainingPatch.frequency }
              : {}),
            ...(remainingPatch.daysOfWeek !== undefined
              ? { daysOfWeek: remainingPatch.daysOfWeek }
              : {}),
            ...(remainingPatch.reminderTime !== undefined
              ? { reminderTime: remainingPatch.reminderTime }
              : {}),
            ...(remainingPatch.sortOrder !== undefined
              ? { sortOrder: remainingPatch.sortOrder }
              : {}),
          };
          next[createIdx] = { ...createOp, payload: nextPayload };

          if (remainingPatch.archived === undefined) {
            return next;
          }
          remainingPatch = { archived: remainingPatch.archived };
        }
      }

      const updateIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'habit:update' &&
          item.habitId === incoming.habitId,
      );

      if (updateIdx !== -1) {
        const existing = next[updateIdx];
        if (existing.type === 'habit:update') {
          const mergedPatch: HabitUpdatePatch = {
            ...existing.patch,
            ...remainingPatch,
          };
          const baseArchived =
            existing.baseArchived !== undefined
              ? existing.baseArchived
              : incoming.baseArchived;

          const patchKeys = Object.keys(
            mergedPatch,
          ) as (keyof HabitUpdatePatch)[];
          if (
            patchKeys.length === 1 &&
            patchKeys[0] === 'archived' &&
            baseArchived !== undefined &&
            mergedPatch.archived === baseArchived
          ) {
            next.splice(updateIdx, 1);
            return next;
          }

          next[updateIdx] = {
            ...existing,
            patch: mergedPatch,
            ...(baseArchived !== undefined ? { baseArchived } : {}),
          };
          return next;
        }
      }

      next.push({ ...incoming, patch: remainingPatch });
      return next;
    }

    case 'habit:set-completion': {
      const existingIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'habit:set-completion' &&
          item.habitId === incoming.habitId &&
          item.date === incoming.date,
      );

      if (existingIdx !== -1) {
        const existing = next[existingIdx];
        if (existing.type === 'habit:set-completion') {
          if (incoming.completed === existing.baseCompleted) {
            next.splice(existingIdx, 1);
            return next;
          }
          next[existingIdx] = {
            ...existing,
            completed: incoming.completed,
          };
          return next;
        }
      }

      next.push(incoming);
      return next;
    }

    case 'habit:delete': {
      const pendingCreateIdx = next.findIndex(
        (item) =>
          isEditable(item) &&
          item.type === 'habit:create' &&
          item.tempId === incoming.habitId,
      );

      const filtered = next.filter((item) => {
        if (!isEditable(item)) return true;
        if (
          (item.type === 'habit:update' ||
            item.type === 'habit:set-completion') &&
          item.habitId === incoming.habitId
        ) {
          return false;
        }
        if (
          pendingCreateIdx !== -1 &&
          item.type === 'habit:create' &&
          item.tempId === incoming.habitId
        ) {
          return false;
        }
        return true;
      });

      if (pendingCreateIdx !== -1) {
        return filtered;
      }

      const hasPendingDelete = filtered.some(
        (item) =>
          item.type === 'habit:delete' && item.habitId === incoming.habitId,
      );
      if (!hasPendingDelete) {
        filtered.push(incoming);
      }
      return filtered;
    }
  }
}

export function remapQueueEntityId(
  queue: QueuedMutation[],
  kind: 'task' | 'habit',
  tempId: string,
  serverId: string,
): QueuedMutation[] {
  return queue.map((item) => {
    if (kind === 'task') {
      if (item.type === 'task:create' && item.tempId === tempId) {
        return { ...item, tempId: serverId };
      }
      if (
        (item.type === 'task:update' || item.type === 'task:delete') &&
        item.taskId === tempId
      ) {
        return { ...item, taskId: serverId };
      }
      return item;
    }

    if (item.type === 'habit:create' && item.tempId === tempId) {
      return { ...item, tempId: serverId };
    }
    if (
      (item.type === 'habit:update' ||
        item.type === 'habit:set-completion' ||
        item.type === 'habit:delete') &&
      item.habitId === tempId
    ) {
      return { ...item, habitId: serverId };
    }
    return item;
  });
}

export function dropDependentOps(
  queue: QueuedMutation[],
  kind: 'task' | 'habit',
  entityId: string,
): QueuedMutation[] {
  return queue.filter((item) => {
    const isTaskOp =
      item.type === 'task:create' ||
      item.type === 'task:update' ||
      item.type === 'task:delete';
    if (kind === 'task' && isTaskOp) {
      return getTargetEntityId(item) !== entityId;
    }
    if (kind === 'habit' && !isTaskOp) {
      return getTargetEntityId(item) !== entityId;
    }
    return true;
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidQueuedMutation(value: unknown): value is QueuedMutation {
  if (!isObjectRecord(value)) return false;
  if (typeof value.opId !== 'string' || !value.opId) return false;
  if (typeof value.createdAt !== 'string' || !value.createdAt) return false;

  switch (value.type) {
    case 'task:create':
      return (
        typeof value.tempId === 'string' &&
        value.tempId.length > 0 &&
        isObjectRecord(value.payload) &&
        typeof value.payload.title === 'string' &&
        typeof value.payload.dueDate === 'string'
      );
    case 'task:update':
      return (
        typeof value.taskId === 'string' &&
        value.taskId.length > 0 &&
        isObjectRecord(value.patch)
      );
    case 'task:delete':
      return typeof value.taskId === 'string' && value.taskId.length > 0;
    case 'habit:create':
      return (
        typeof value.tempId === 'string' &&
        value.tempId.length > 0 &&
        isObjectRecord(value.payload) &&
        typeof value.payload.title === 'string' &&
        Array.isArray(value.payload.daysOfWeek)
      );
    case 'habit:update':
      return (
        typeof value.habitId === 'string' &&
        value.habitId.length > 0 &&
        isObjectRecord(value.patch)
      );
    case 'habit:set-completion':
      return (
        typeof value.habitId === 'string' &&
        value.habitId.length > 0 &&
        typeof value.date === 'string' &&
        isValidDateKey(value.date) &&
        typeof value.completed === 'boolean' &&
        typeof value.baseCompleted === 'boolean'
      );
    case 'habit:delete':
      return typeof value.habitId === 'string' && value.habitId.length > 0;
    default:
      return false;
  }
}

function resolveBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadQueueFromStorage(
  userId: string,
  storage?: StorageLike,
): QueuedMutation[] {
  const targetStorage = storage ?? resolveBrowserStorage();
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(getSyncQueueStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidQueuedMutation);
  } catch {
    return [];
  }
}

export function saveQueueToStorage(
  userId: string,
  queue: QueuedMutation[],
  storage?: StorageLike,
): void {
  const targetStorage = storage ?? resolveBrowserStorage();
  if (!targetStorage) return;

  const key = getSyncQueueStorageKey(userId);
  try {
    if (queue.length === 0) {
      targetStorage.removeItem(key);
    } else {
      targetStorage.setItem(key, JSON.stringify(queue));
    }
  } catch {
    // Bỏ qua lỗi quota/private mode của trình duyệt
  }
}

export function buildOptimisticTask(
  id: string,
  userId: string,
  payload: TaskCreatePayload,
  nowIso: string,
): TaskItem {
  return {
    id,
    userId,
    title: payload.title,
    notes: payload.notes,
    dueDate: payload.dueDate,
    priority: payload.priority,
    category: payload.category,
    completed: false,
    completedAt: null,
    sortOrder: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function buildOptimisticHabit(
  id: string,
  userId: string,
  payload: HabitCreatePayload,
  todayKey: string,
  nowIso: string,
): HabitItem {
  return {
    id,
    userId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    color: payload.color,
    frequency: payload.frequency,
    daysOfWeek: [...payload.daysOfWeek],
    reminderTime: payload.reminderTime,
    archived: false,
    sortOrder: payload.sortOrder ?? 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    completedDates: [],
    stats: calculateHabitStats(payload.daysOfWeek, [], todayKey),
  };
}

export function applyQueuedOpsToState(
  serverTasks: TaskItem[],
  serverHabits: HabitItem[],
  queue: QueuedMutation[],
  userId: string,
  todayKey: string,
): { tasks: TaskItem[]; habits: HabitItem[] } {
  let nextTasks = serverTasks.map((t) => ({ ...t }));
  let nextHabits = serverHabits.map((h) => ({
    ...h,
    daysOfWeek: [...h.daysOfWeek],
    completedDates: [...h.completedDates],
  }));
  let hasTaskSortOrderUpdate = false;

  for (const op of queue) {
    switch (op.type) {
      case 'task:create': {
        if (!nextTasks.some((t) => t.id === op.tempId)) {
          nextTasks = [
            buildOptimisticTask(op.tempId, userId, op.payload, op.createdAt),
            ...nextTasks,
          ];
        }
        break;
      }

      case 'task:update': {
        if (op.patch.sortOrder !== undefined) {
          hasTaskSortOrderUpdate = true;
        }
        nextTasks = nextTasks.map((task) => {
          if (task.id !== op.taskId) return task;
          const nextCompleted =
            op.patch.completed !== undefined
              ? op.patch.completed
              : task.completed;
          const nextCompletedAt =
            op.patch.completed !== undefined
              ? op.patch.completed
                ? task.completedAt ?? op.createdAt
                : null
              : task.completedAt;
          return {
            ...task,
            ...(op.patch.title !== undefined ? { title: op.patch.title } : {}),
            ...(op.patch.notes !== undefined ? { notes: op.patch.notes } : {}),
            ...(op.patch.dueDate !== undefined
              ? { dueDate: op.patch.dueDate }
              : {}),
            ...(op.patch.priority !== undefined
              ? { priority: op.patch.priority }
              : {}),
            ...(op.patch.category !== undefined
              ? { category: op.patch.category }
              : {}),
            ...(op.patch.sortOrder !== undefined
              ? { sortOrder: op.patch.sortOrder }
              : {}),
            completed: nextCompleted,
            completedAt: nextCompletedAt,
            updatedAt: op.createdAt,
          };
        });
        break;
      }

      case 'task:delete': {
        nextTasks = nextTasks.filter((task) => task.id !== op.taskId);
        break;
      }

      case 'habit:create': {
        if (!nextHabits.some((h) => h.id === op.tempId)) {
          nextHabits = [
            ...nextHabits,
            buildOptimisticHabit(
              op.tempId,
              userId,
              op.payload,
              todayKey,
              op.createdAt,
            ),
          ];
        }
        break;
      }

      case 'habit:update': {
        nextHabits = nextHabits.map((habit) => {
          if (habit.id !== op.habitId) return habit;
          const nextDaysOfWeek =
            op.patch.daysOfWeek !== undefined
              ? [...op.patch.daysOfWeek]
              : habit.daysOfWeek;
          return {
            ...habit,
            ...(op.patch.title !== undefined ? { title: op.patch.title } : {}),
            ...(op.patch.description !== undefined
              ? { description: op.patch.description }
              : {}),
            ...(op.patch.category !== undefined
              ? { category: op.patch.category }
              : {}),
            ...(op.patch.color !== undefined ? { color: op.patch.color } : {}),
            ...(op.patch.frequency !== undefined
              ? { frequency: op.patch.frequency }
              : {}),
            daysOfWeek: nextDaysOfWeek,
            ...(op.patch.reminderTime !== undefined
              ? { reminderTime: op.patch.reminderTime }
              : {}),
            ...(op.patch.archived !== undefined
              ? { archived: op.patch.archived }
              : {}),
            ...(op.patch.sortOrder !== undefined
              ? { sortOrder: op.patch.sortOrder }
              : {}),
            updatedAt: op.createdAt,
            stats: calculateHabitStats(
              nextDaysOfWeek,
              habit.completedDates,
              todayKey,
            ),
          };
        });
        break;
      }

      case 'habit:set-completion': {
        nextHabits = nextHabits.map((habit) => {
          if (habit.id !== op.habitId) return habit;
          const nextDates = op.completed
            ? habit.completedDates.includes(op.date)
              ? habit.completedDates
              : [...habit.completedDates, op.date]
            : habit.completedDates.filter((d) => d !== op.date);
          return {
            ...habit,
            completedDates: nextDates,
            stats: calculateHabitStats(habit.daysOfWeek, nextDates, todayKey),
          };
        });
        break;
      }

      case 'habit:delete': {
        nextHabits = nextHabits.filter((habit) => habit.id !== op.habitId);
        break;
      }
    }
  }

  if (hasTaskSortOrderUpdate) {
    nextTasks.sort(compareTasksForDisplay);
  }
  nextHabits.sort(compareHabitsForDisplay);

  return { tasks: nextTasks, habits: nextHabits };
}
