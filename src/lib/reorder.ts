import type { HabitItem, TaskItem } from '@/types/app';
import { PRIORITIES } from './constants';

export function moveItem<T>(
  list: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return [...list];
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function compareTasksForDisplay(a: TaskItem, b: TaskItem): number {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
  }
  const wa = PRIORITIES[a.priority]?.weight ?? 2;
  const wb = PRIORITIES[b.priority]?.weight ?? 2;
  if (wa !== wb) {
    return wa - wb;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export function compareHabitsForDisplay(a: HabitItem, b: HabitItem): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  return a.createdAt.localeCompare(b.createdAt);
}

export function applyDayTaskReorder(
  allTasks: readonly TaskItem[],
  dueDate: string,
  orderedDayTaskIds: readonly string[],
): { tasks: TaskItem[]; changed: Array<{ id: string; sortOrder: number }> } {
  const nextSortOrderById = new Map<string, number>();
  orderedDayTaskIds.forEach((id, idx) => {
    nextSortOrderById.set(id, idx + 1);
  });

  const changed: Array<{ id: string; sortOrder: number }> = [];
  const nextTasks = allTasks.map((task) => {
    if (task.dueDate !== dueDate) {
      return task;
    }
    const targetOrder = nextSortOrderById.get(task.id);
    if (targetOrder === undefined || targetOrder === task.sortOrder) {
      return task;
    }
    changed.push({ id: task.id, sortOrder: targetOrder });
    return { ...task, sortOrder: targetOrder };
  });

  nextTasks.sort(compareTasksForDisplay);
  changed.sort((a, b) => a.sortOrder - b.sortOrder);
  return { tasks: nextTasks, changed };
}

export function applyHabitReorder(
  allHabits: readonly HabitItem[],
  orderedVisibleHabitIds: readonly string[],
): { habits: HabitItem[]; changed: Array<{ id: string; sortOrder: number }> } {
  const sortedAll = [...allHabits].sort(compareHabitsForDisplay);
  const byId = new Map(sortedAll.map((habit) => [habit.id, habit]));
  const visibleIdSet = new Set(orderedVisibleHabitIds);

  const visibleSlots: number[] = [];
  sortedAll.forEach((habit, index) => {
    if (visibleIdSet.has(habit.id)) {
      visibleSlots.push(index);
    }
  });

  const orderedVisibleHabits = orderedVisibleHabitIds
    .map((id) => byId.get(id))
    .filter((habit): habit is HabitItem => habit !== undefined);

  if (
    visibleSlots.length === orderedVisibleHabits.length &&
    visibleSlots.length > 0
  ) {
    visibleSlots.forEach((slotIdx, i) => {
      sortedAll[slotIdx] = orderedVisibleHabits[i];
    });
  }

  const changed: Array<{ id: string; sortOrder: number }> = [];
  const nextHabits = sortedAll.map((habit, idx) => {
    const nextSortOrder = idx + 1;
    if (habit.sortOrder === nextSortOrder) {
      return habit;
    }
    changed.push({ id: habit.id, sortOrder: nextSortOrder });
    return { ...habit, sortOrder: nextSortOrder };
  });

  return { habits: nextHabits, changed };
}
