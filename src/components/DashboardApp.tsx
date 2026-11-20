'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarCheck,
  CheckSquare,
  Plus,
  RefreshCw,
  Repeat,
  WifiOff,
  X,
} from 'lucide-react';
import { computeClientStats } from '@/lib/client-stats';
import { getTodayDateKey } from '@/lib/dates';
import { calculateHabitStats } from '@/lib/streaks';
import {
  applyQueuedOpsToState,
  buildOptimisticHabit,
  buildOptimisticTask,
  createOpId,
  createTempId,
  dropDependentOps,
  enqueueMutation,
  loadQueueFromStorage,
  remapQueueEntityId,
  saveQueueToStorage,
  type QueuedMutation,
} from '@/lib/sync-queue';
import type { HabitItem, TaskItem, UserProfile } from '@/types/app';
import { HabitModal, type HabitFormPayload } from './HabitModal';
import { HabitsView } from './HabitsView';
import { useLanguage } from './LanguageProvider';
import { StatsView } from './StatsView';
import { StreakBanner } from './StreakBanner';
import { TaskModal, type TaskFormPayload } from './TaskModal';
import { TasksView } from './TasksView';
import { TodayView } from './TodayView';

type TabKey = 'today' | 'habits' | 'tasks' | 'stats';

interface DashboardAppProps {
  initialUser: UserProfile;
}

function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function DashboardApp({ initialUser }: DashboardAppProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;

  const [effectiveTimeZone, setEffectiveTimeZone] = useState(
    initialUser.timezone,
  );
  const [todayKey, setTodayKey] = useState(() =>
    getTodayDateKey(initialUser.timezone),
  );
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;

  const [selectedDate, setSelectedDate] = useState(() =>
    getTodayDateKey(initialUser.timezone),
  );
  const [activeTab, setActiveTab] = useState<TabKey>('today');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const tasksRef = useRef<TaskItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const habitsRef = useRef<HabitItem[]>([]);

  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  const queueRef = useRef<QueuedMutation[]>([]);
  const inFlightOpIdRef = useRef<string | null>(null);
  const workerActiveRef = useRef(false);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const unmountedRef = useRef(false);
  const drainResolversRef = useRef<Array<() => void>>([]);
  const tempToServerIdRef = useRef<Map<string, string>>(new Map());

  const setTasksSynced = useCallback(
    (updater: TaskItem[] | ((prev: TaskItem[]) => TaskItem[])) => {
      const resolved =
        typeof updater === 'function' ? updater(tasksRef.current) : updater;
      tasksRef.current = resolved;
      setTasks(resolved);
    },
    [],
  );

  const setHabitsSynced = useCallback(
    (updater: HabitItem[] | ((prev: HabitItem[]) => HabitItem[])) => {
      const resolved =
        typeof updater === 'function' ? updater(habitsRef.current) : updater;
      habitsRef.current = resolved;
      setHabits(resolved);
    },
    [],
  );

  const resolveEntityId = useCallback((id: string): string => {
    let current = id;
    const seen = new Set<string>();
    while (tempToServerIdRef.current.has(current) && !seen.has(current)) {
      seen.add(current);
      current = tempToServerIdRef.current.get(current)!;
    }
    return current;
  }, []);

  const resolveDrainWaiters = useCallback(() => {
    if (drainResolversRef.current.length === 0) return;
    const resolvers = drainResolversRef.current;
    drainResolversRef.current = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }, []);

  const loadAllData = useCallback(
    async (today: string) => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          fetch(`/api/tasks?today=${encodeURIComponent(today)}`, {
            cache: 'no-store',
          }),
          fetch(
            `/api/habits?today=${encodeURIComponent(today)}&includeArchived=true`,
            { cache: 'no-store' },
          ),
        ]);

        if (tasksRes.status === 401 || habitsRes.status === 401) {
          router.push('/login');
          return;
        }

        const [tasksData, habitsData] = await Promise.all([
          tasksRes.json() as Promise<{ tasks?: TaskItem[]; error?: string }>,
          habitsRes.json() as Promise<{ habits?: HabitItem[]; error?: string }>,
        ]);

        if (tasksRes.ok && habitsRes.ok && tasksData.tasks && habitsData.habits) {
          const merged = applyQueuedOpsToState(
            tasksData.tasks,
            habitsData.habits,
            queueRef.current,
            initialUser.id,
            today,
          );
          setTasksSynced(merged.tasks);
          setHabitsSynced(merged.habits);
          setErrorBanner(null);
        } else {
          if (tasksRes.ok && tasksData.tasks) {
            const mergedTasks = applyQueuedOpsToState(
              tasksData.tasks,
              habitsRef.current,
              queueRef.current,
              initialUser.id,
              today,
            );
            setTasksSynced(mergedTasks.tasks);
          }
          if (habitsRes.ok && habitsData.habits) {
            const mergedHabits = applyQueuedOpsToState(
              tasksRef.current,
              habitsData.habits,
              queueRef.current,
              initialUser.id,
              today,
            );
            setHabitsSynced(mergedHabits.habits);
          }
        }
      } catch {
        setErrorBanner(tRef.current.errors.loadFailed);
      } finally {
        setLoading(false);
      }
    },
    [initialUser.id, router, setHabitsSynced, setTasksSynced],
  );

  const drainQueueRef = useRef<() => Promise<void>>(async () => {});

  const scheduleDrain = useCallback((delayMs: number) => {
    if (
      unmountedRef.current ||
      workerActiveRef.current ||
      queueRef.current.length === 0
    ) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    coalesceTimerRef.current = setTimeout(() => {
      coalesceTimerRef.current = null;
      void drainQueueRef.current();
    }, delayMs);
  }, []);

  const drainQueue = useCallback(async () => {
    if (unmountedRef.current || workerActiveRef.current) {
      return;
    }

    if (queueRef.current.length === 0) {
      resolveDrainWaiters();
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsRetrying(false);
      resolveDrainWaiters();
      return;
    }

    workerActiveRef.current = true;
    let needsServerResync = false;

    try {
      while (queueRef.current.length > 0 && !unmountedRef.current) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false);
          setIsRetrying(false);
          break;
        }

        const op = queueRef.current[0];
        inFlightOpIdRef.current = op.opId;

        let res: Response;
        try {
          switch (op.type) {
            case 'task:create':
              res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(op.payload),
              });
              break;
            case 'task:update':
              res = await fetch(`/api/tasks/${op.taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(op.patch),
              });
              break;
            case 'task:delete':
              res = await fetch(`/api/tasks/${op.taskId}`, {
                method: 'DELETE',
              });
              break;
            case 'habit:create':
              res = await fetch(
                `/api/habits?today=${encodeURIComponent(todayKeyRef.current)}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(op.payload),
                },
              );
              break;
            case 'habit:update':
              res = await fetch(
                `/api/habits/${op.habitId}?today=${encodeURIComponent(todayKeyRef.current)}&compact=1`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(op.patch),
                },
              );
              break;
            case 'habit:set-completion':
              res = await fetch(
                `/api/habits/${op.habitId}/toggle?today=${encodeURIComponent(todayKeyRef.current)}&compact=1`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    date: op.date,
                    completed: op.completed,
                  }),
                },
              );
              break;
            case 'habit:delete':
              res = await fetch(`/api/habits/${op.habitId}`, {
                method: 'DELETE',
              });
              break;
          }
        } catch {
          inFlightOpIdRef.current = null;
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOnline(false);
            setIsRetrying(false);
          } else {
            retryAttemptRef.current += 1;
            setIsRetrying(true);
            const backoffMs = Math.min(
              15000,
              1000 * 2 ** Math.min(retryAttemptRef.current - 1, 4),
            );
            if (!unmountedRef.current) {
              retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null;
                void drainQueueRef.current();
              }, backoffMs);
            }
          }
          return;
        }

        if (res.status === 401) {
          inFlightOpIdRef.current = null;
          setIsRetrying(false);
          router.push('/login');
          return;
        }

        const isDeleteMissing =
          (op.type === 'task:delete' || op.type === 'habit:delete') &&
          res.status === 404;

        if (res.ok || isDeleteMissing) {
          inFlightOpIdRef.current = null;
          retryAttemptRef.current = 0;
          setIsRetrying(false);
          setIsOnline(true);

          let remaining = queueRef.current.filter(
            (item) => item.opId !== op.opId,
          );

          if (op.type === 'task:create') {
            const data = (await res.json()) as { task?: TaskItem };
            if (data.task) {
              const serverTask = data.task;
              tempToServerIdRef.current.set(op.tempId, serverTask.id);
              remaining = remapQueueEntityId(
                remaining,
                'task',
                op.tempId,
                serverTask.id,
              );
              queueRef.current = remaining;
              saveQueueToStorage(initialUser.id, remaining);
              setPendingCount(remaining.length);

              const trailingTaskOps = remaining.filter(
                (item) =>
                  (item.type === 'task:update' || item.type === 'task:delete') &&
                  item.taskId === serverTask.id,
              );
              const reconciled = applyQueuedOpsToState(
                [serverTask],
                [],
                trailingTaskOps,
                initialUser.id,
                todayKeyRef.current,
              );
              const reconciledTask = reconciled.tasks[0] ?? null;

              setTasksSynced((prev) =>
                reconciledTask
                  ? prev.map((tItem) =>
                      tItem.id === op.tempId ? reconciledTask : tItem,
                    )
                  : prev.filter((tItem) => tItem.id !== op.tempId),
              );
              setEditingTask((prev) =>
                prev?.id === op.tempId ? reconciledTask : prev,
              );
              continue;
            }
          } else if (op.type === 'task:update') {
            const data = (await res.json()) as { task?: TaskItem };
            queueRef.current = remaining;
            saveQueueToStorage(initialUser.id, remaining);
            setPendingCount(remaining.length);

            if (data.task) {
              const serverTask = data.task;
              const trailingTaskOps = remaining.filter(
                (item) =>
                  (item.type === 'task:update' || item.type === 'task:delete') &&
                  item.taskId === op.taskId,
              );
              const reconciled = applyQueuedOpsToState(
                [serverTask],
                [],
                trailingTaskOps,
                initialUser.id,
                todayKeyRef.current,
              );
              const reconciledTask = reconciled.tasks[0] ?? null;
              setTasksSynced((prev) =>
                reconciledTask
                  ? prev.map((tItem) =>
                      tItem.id === op.taskId ? reconciledTask : tItem,
                    )
                  : prev.filter((tItem) => tItem.id !== op.taskId),
              );
            }
            continue;
          } else if (op.type === 'habit:create') {
            const data = (await res.json()) as { habit?: HabitItem };
            if (data.habit) {
              const serverHabit = data.habit;
              tempToServerIdRef.current.set(op.tempId, serverHabit.id);
              remaining = remapQueueEntityId(
                remaining,
                'habit',
                op.tempId,
                serverHabit.id,
              );
              queueRef.current = remaining;
              saveQueueToStorage(initialUser.id, remaining);
              setPendingCount(remaining.length);

              const trailingHabitOps = remaining.filter(
                (item) =>
                  (item.type === 'habit:update' ||
                    item.type === 'habit:set-completion' ||
                    item.type === 'habit:delete') &&
                  item.habitId === serverHabit.id,
              );
              const reconciled = applyQueuedOpsToState(
                [],
                [serverHabit],
                trailingHabitOps,
                initialUser.id,
                todayKeyRef.current,
              );
              const reconciledHabit = reconciled.habits[0] ?? null;

              setHabitsSynced((prev) =>
                reconciledHabit
                  ? prev.map((hItem) =>
                      hItem.id === op.tempId ? reconciledHabit : hItem,
                    )
                  : prev.filter((hItem) => hItem.id !== op.tempId),
              );
              setEditingHabit((prev) =>
                prev?.id === op.tempId ? reconciledHabit : prev,
              );
              continue;
            }
          } else if (op.type === 'habit:update') {
            const data = (await res.json()) as {
              habit?: Omit<HabitItem, 'completedDates' | 'stats'>;
            };
            queueRef.current = remaining;
            saveQueueToStorage(initialUser.id, remaining);
            setPendingCount(remaining.length);

            const hasTrailingHabitOp = remaining.some(
              (item) =>
                (item.type === 'habit:update' || item.type === 'habit:delete') &&
                item.habitId === op.habitId,
            );
            if (data.habit && !hasTrailingHabitOp) {
              const serverFields = data.habit;
              setHabitsSynced((prev) =>
                prev.map((hItem) => {
                  if (hItem.id !== op.habitId) return hItem;
                  const nextDays = serverFields.daysOfWeek ?? hItem.daysOfWeek;
                  return {
                    ...hItem,
                    title: serverFields.title,
                    description: serverFields.description,
                    category: serverFields.category,
                    color: serverFields.color,
                    frequency: serverFields.frequency,
                    daysOfWeek: nextDays,
                    reminderTime: serverFields.reminderTime,
                    archived: serverFields.archived,
                    updatedAt: serverFields.updatedAt,
                    stats: calculateHabitStats(
                      nextDays,
                      hItem.completedDates,
                      todayKeyRef.current,
                    ),
                  };
                }),
              );
            }
            continue;
          }

          queueRef.current = remaining;
          saveQueueToStorage(initialUser.id, remaining);
          setPendingCount(remaining.length);
          continue;
        }

        inFlightOpIdRef.current = null;

        if (isTransientHttpStatus(res.status)) {
          retryAttemptRef.current += 1;
          setIsRetrying(true);
          const backoffMs = Math.min(
            15000,
            1000 * 2 ** Math.min(retryAttemptRef.current - 1, 4),
          );
          if (!unmountedRef.current) {
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              void drainQueueRef.current();
            }, backoffMs);
          }
          return;
        }

        // Lỗi 4xx vĩnh viễn: loại bỏ thao tác lỗi và đồng bộ lại trạng thái chuẩn từ máy chủ
        let serverErrorMsg: string | undefined;
        try {
          const errBody = (await res.json()) as { error?: string };
          serverErrorMsg = errBody.error;
        } catch {
          serverErrorMsg = undefined;
        }

        let remaining = queueRef.current.filter(
          (item) => item.opId !== op.opId,
        );
        if (op.type === 'task:create') {
          remaining = dropDependentOps(remaining, 'task', op.tempId);
        } else if (op.type === 'habit:create') {
          remaining = dropDependentOps(remaining, 'habit', op.tempId);
        }
        queueRef.current = remaining;
        saveQueueToStorage(initialUser.id, remaining);
        setPendingCount(remaining.length);
        setErrorBanner(serverErrorMsg ?? tRef.current.sync.syncFailed);
        needsServerResync = true;
      }
    } finally {
      inFlightOpIdRef.current = null;
      workerActiveRef.current = false;
      if (queueRef.current.length === 0) {
        resolveDrainWaiters();
      }
      if (needsServerResync && !unmountedRef.current) {
        void loadAllData(todayKeyRef.current);
      }
    }
  }, [
    initialUser.id,
    loadAllData,
    resolveDrainWaiters,
    router,
    setHabitsSynced,
    setTasksSynced,
  ]);

  drainQueueRef.current = drainQueue;

  const triggerImmediateDrain = useCallback(() => {
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    if (!workerActiveRef.current && queueRef.current.length > 0) {
      void drainQueueRef.current();
    }
  }, []);

  const enqueueAndPersist = useCallback(
    (op: QueuedMutation, drainDelayMs = 150) => {
      const nextQueue = enqueueMutation(
        queueRef.current,
        op,
        inFlightOpIdRef.current,
      );
      queueRef.current = nextQueue;
      saveQueueToStorage(initialUser.id, nextQueue);
      setPendingCount(nextQueue.length);

      if (nextQueue.length === 0) {
        retryAttemptRef.current = 0;
        setIsRetrying(false);
        if (coalesceTimerRef.current) {
          clearTimeout(coalesceTimerRef.current);
          coalesceTimerRef.current = null;
        }
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        if (!workerActiveRef.current) {
          resolveDrainWaiters();
        }
      } else {
        scheduleDrain(drainDelayMs);
      }
    },
    [initialUser.id, resolveDrainWaiters, scheduleDrain],
  );

  useEffect(() => {
    unmountedRef.current = false;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && browserTz !== initialUser.timezone) {
      setEffectiveTimeZone(browserTz);
    }
    const localToday = getTodayDateKey(browserTz || initialUser.timezone);
    if (localToday !== todayKeyRef.current) {
      setTodayKey(localToday);
      setSelectedDate(localToday);
    }

    const storedQueue = loadQueueFromStorage(initialUser.id);
    if (storedQueue.length > 0) {
      queueRef.current = storedQueue;
      setPendingCount(storedQueue.length);
      const overlaid = applyQueuedOpsToState(
        tasksRef.current,
        habitsRef.current,
        storedQueue,
        initialUser.id,
        localToday,
      );
      setTasksSynced(overlaid.tasks);
      setHabitsSynced(overlaid.habits);
    }

    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    function handleOnline() {
      setIsOnline(true);
      triggerImmediateDrain();
    }

    function handleOffline() {
      setIsOnline(false);
      setIsRetrying(false);
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        queueRef.current.length > 0 &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        triggerImmediateDrain();
      }
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (queueRef.current.length > 0) {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unmountedRef.current = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      resolveDrainWaiters();
    };
  }, [
    initialUser.id,
    initialUser.timezone,
    resolveDrainWaiters,
    setHabitsSynced,
    setTasksSynced,
    triggerImmediateDrain,
  ]);

  useEffect(() => {
    void loadAllData(todayKey).then(() => {
      if (
        !unmountedRef.current &&
        queueRef.current.length > 0 &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        scheduleDrain(0);
      }
    });
  }, [todayKey, loadAllData, scheduleDrain]);

  async function handleLogout() {
    if (
      queueRef.current.length > 0 &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      await Promise.race([
        new Promise<void>((resolve) => {
          drainResolversRef.current.push(resolve);
          triggerImmediateDrain();
          if (queueRef.current.length === 0 && !workerActiveRef.current) {
            resolve();
          }
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function handleSaveTask(payload: TaskFormPayload, taskId?: string) {
    const nowIso = new Date().toISOString();
    const resolvedId = taskId ? resolveEntityId(taskId) : undefined;

    if (!resolvedId) {
      const tempId = createTempId('task');
      const optimisticTask = buildOptimisticTask(
        tempId,
        initialUser.id,
        payload,
        nowIso,
      );
      setTasksSynced((prev) => [optimisticTask, ...prev]);
      enqueueAndPersist({
        opId: createOpId(),
        type: 'task:create',
        tempId,
        payload,
        createdAt: nowIso,
      });
    } else {
      setTasksSynced((prev) =>
        prev.map((item) =>
          item.id === resolvedId || item.id === taskId
            ? {
                ...item,
                title: payload.title,
                notes: payload.notes,
                dueDate: payload.dueDate,
                priority: payload.priority,
                category: payload.category,
                updatedAt: nowIso,
              }
            : item,
        ),
      );
      enqueueAndPersist({
        opId: createOpId(),
        type: 'task:update',
        taskId: resolvedId,
        patch: payload,
        createdAt: nowIso,
      });
    }
    setErrorBanner(null);
  }

  async function handleToggleTask(task: TaskItem) {
    const resolvedId = resolveEntityId(task.id);
    const current =
      tasksRef.current.find(
        (item) => item.id === resolvedId || item.id === task.id,
      ) ?? task;
    const prevCompleted = current.completed;
    const nextCompleted = !prevCompleted;
    const nowIso = new Date().toISOString();

    setTasksSynced((prev) =>
      prev.map((item) =>
        item.id === resolvedId || item.id === task.id
          ? {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? (item.completedAt ?? nowIso) : null,
              updatedAt: nowIso,
            }
          : item,
      ),
    );

    enqueueAndPersist({
      opId: createOpId(),
      type: 'task:update',
      taskId: resolvedId,
      patch: { completed: nextCompleted },
      baseCompleted: prevCompleted,
      createdAt: nowIso,
    });
  }

  async function handleDeleteTask(taskId: string) {
    const resolvedId = resolveEntityId(taskId);
    setTasksSynced((prev) =>
      prev.filter((item) => item.id !== resolvedId && item.id !== taskId),
    );
    enqueueAndPersist({
      opId: createOpId(),
      type: 'task:delete',
      taskId: resolvedId,
      createdAt: new Date().toISOString(),
    });
  }

  async function handleRescheduleOverdue() {
    const targetDate = todayKeyRef.current;
    const overdue = tasksRef.current.filter(
      (item) => !item.completed && item.dueDate < targetDate,
    );
    if (overdue.length === 0) return;

    const nowIso = new Date().toISOString();
    const overdueIds = new Set(overdue.map((item) => item.id));

    setTasksSynced((prev) =>
      prev.map((item) =>
        overdueIds.has(item.id)
          ? { ...item, dueDate: targetDate, updatedAt: nowIso }
          : item,
      ),
    );

    for (const item of overdue) {
      enqueueAndPersist({
        opId: createOpId(),
        type: 'task:update',
        taskId: resolveEntityId(item.id),
        patch: { dueDate: targetDate },
        createdAt: nowIso,
      });
    }
  }

  async function handleSaveHabit(payload: HabitFormPayload, habitId?: string) {
    const nowIso = new Date().toISOString();
    const resolvedId = habitId ? resolveEntityId(habitId) : undefined;

    if (!resolvedId) {
      const tempId = createTempId('habit');
      const optimisticHabit = buildOptimisticHabit(
        tempId,
        initialUser.id,
        payload,
        todayKeyRef.current,
        nowIso,
      );
      setHabitsSynced((prev) => [...prev, optimisticHabit]);
      enqueueAndPersist({
        opId: createOpId(),
        type: 'habit:create',
        tempId,
        payload,
        createdAt: nowIso,
      });
    } else {
      setHabitsSynced((prev) =>
        prev.map((h) => {
          if (h.id !== resolvedId && h.id !== habitId) return h;
          return {
            ...h,
            title: payload.title,
            description: payload.description,
            category: payload.category,
            color: payload.color,
            frequency: payload.frequency,
            daysOfWeek: [...payload.daysOfWeek],
            reminderTime: payload.reminderTime,
            updatedAt: nowIso,
            stats: calculateHabitStats(
              payload.daysOfWeek,
              h.completedDates,
              todayKeyRef.current,
            ),
          };
        }),
      );
      enqueueAndPersist({
        opId: createOpId(),
        type: 'habit:update',
        habitId: resolvedId,
        patch: payload,
        createdAt: nowIso,
      });
    }
    setErrorBanner(null);
  }

  async function handleToggleHabit(habitId: string, date: string) {
    const resolvedId = resolveEntityId(habitId);
    const habit = habitsRef.current.find(
      (h) => h.id === resolvedId || h.id === habitId,
    );
    if (!habit) return;

    const prevCompleted = habit.completedDates.includes(date);
    const nextCompleted = !prevCompleted;
    const nextDates = nextCompleted
      ? [...habit.completedDates, date]
      : habit.completedDates.filter((d) => d !== date);
    const nextStats = calculateHabitStats(
      habit.daysOfWeek,
      nextDates,
      todayKeyRef.current,
    );

    setHabitsSynced((prev) =>
      prev.map((h) =>
        h.id === resolvedId || h.id === habitId
          ? {
              ...h,
              completedDates: nextDates,
              stats: nextStats,
            }
          : h,
      ),
    );

    enqueueAndPersist({
      opId: createOpId(),
      type: 'habit:set-completion',
      habitId: resolvedId,
      date,
      completed: nextCompleted,
      baseCompleted: prevCompleted,
      createdAt: new Date().toISOString(),
    });
  }

  async function handleDeleteHabit(habitId: string) {
    const resolvedId = resolveEntityId(habitId);
    setHabitsSynced((prev) =>
      prev.filter((h) => h.id !== resolvedId && h.id !== habitId),
    );
    enqueueAndPersist({
      opId: createOpId(),
      type: 'habit:delete',
      habitId: resolvedId,
      createdAt: new Date().toISOString(),
    });
  }

  async function handleArchiveHabit(habit: HabitItem, archived: boolean) {
    const resolvedId = resolveEntityId(habit.id);
    const current =
      habitsRef.current.find(
        (h) => h.id === resolvedId || h.id === habit.id,
      ) ?? habit;
    const prevArchived = current.archived;
    const nowIso = new Date().toISOString();

    setHabitsSynced((prev) =>
      prev.map((h) =>
        h.id === resolvedId || h.id === habit.id
          ? { ...h, archived, updatedAt: nowIso }
          : h,
      ),
    );

    enqueueAndPersist({
      opId: createOpId(),
      type: 'habit:update',
      habitId: resolvedId,
      patch: { archived },
      baseArchived: prevArchived,
      createdAt: nowIso,
    });
  }

  const navItems: {
    key: TabKey;
    label: string;
    icon: typeof CalendarCheck;
  }[] = [
    { key: 'today', label: t.nav.today, icon: CalendarCheck },
    { key: 'habits', label: t.nav.habits, icon: Repeat },
    { key: 'tasks', label: t.nav.tasks, icon: CheckSquare },
    { key: 'stats', label: t.nav.stats, icon: BarChart3 },
  ];

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits],
  );
  const visibleHabits = useMemo(
    () => (includeArchived ? habits : activeHabits),
    [activeHabits, habits, includeArchived],
  );
  const stats = useMemo(
    () => computeClientStats(tasks, habits, todayKey, effectiveTimeZone),
    [tasks, habits, todayKey, effectiveTimeZone],
  );

  const currentMaxStreak = activeHabits.reduce(
    (max, h) => Math.max(max, h.stats.currentStreak),
    0,
  );
  const bestMaxStreak = habits.reduce(
    (max, h) => Math.max(max, h.stats.longestStreak),
    0,
  );

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#f2f8fd] pb-[calc(5rem+env(safe-area-inset-bottom))] md:flex md:pb-0 dark:bg-neutral-950">
      {/* Thanh điều hướng bên trái (không header, không tên ứng dụng) */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-sky-200/70 bg-white p-5 md:flex dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-sky-100 text-sky-900 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 space-y-2 border-t border-sky-100 pt-5 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              <Plus className="h-4 w-4" />
              {t.nav.addTask}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingHabit(null);
                setHabitModalOpen(true);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Repeat className="h-3.5 w-3.5" />
              {t.nav.addHabit}
            </button>
          </div>
        </div>

        <div className="border-t border-sky-100 pt-4 dark:border-neutral-800">
          <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/80">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-100">
              {initialUser.name}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-neutral-400">
              {initialUser.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Nội dung chính (Streak + 3 biểu tượng góc trên bên phải) */}
      <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-7">
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          <StreakBanner
            currentStreak={currentMaxStreak}
            bestStreak={bestMaxStreak}
            onLogout={handleLogout}
          />

          {pendingCount > 0 && (!isOnline || isRetrying) && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              <div className="flex min-w-0 items-center gap-2.5">
                {isOnline ? (
                  <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-amber-600 dark:text-neutral-300" />
                ) : (
                  <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-neutral-300" />
                )}
                <span className="break-words">
                  {isOnline
                    ? t.sync.retryingPending(pendingCount)
                    : t.sync.offlinePending(pendingCount)}
                </span>
              </div>
              {isOnline && (
                <button
                  type="button"
                  onClick={triggerImmediateDrain}
                  className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                >
                  {t.sync.retryNow}
                </button>
              )}
            </div>
          )}

          {errorBanner && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                aria-label="Đóng"
                className="rounded-md p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-xl bg-sky-100/70 dark:bg-neutral-800" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-60 animate-pulse rounded-xl bg-sky-100/70 dark:bg-neutral-800" />
                <div className="h-60 animate-pulse rounded-xl bg-sky-100/70 dark:bg-neutral-800" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'today' && (
                <TodayView
                  userName={initialUser.name}
                  todayKey={todayKey}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  tasks={tasks}
                  habits={activeHabits}
                  onQuickCreateTask={handleSaveTask}
                  onToggleTask={handleToggleTask}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setTaskModalOpen(true);
                  }}
                  onDeleteTask={handleDeleteTask}
                  onRescheduleOverdue={handleRescheduleOverdue}
                  onToggleHabit={handleToggleHabit}
                  onOpenNewHabit={() => {
                    setEditingHabit(null);
                    setHabitModalOpen(true);
                  }}
                  onEditHabit={(habit) => {
                    setEditingHabit(habit);
                    setHabitModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'habits' && (
                <HabitsView
                  habits={visibleHabits}
                  todayKey={todayKey}
                  includeArchived={includeArchived}
                  onToggleIncludeArchived={() =>
                    setIncludeArchived((prev) => !prev)
                  }
                  onOpenNewHabit={() => {
                    setEditingHabit(null);
                    setHabitModalOpen(true);
                  }}
                  onEditHabit={(habit) => {
                    setEditingHabit(habit);
                    setHabitModalOpen(true);
                  }}
                  onDeleteHabit={handleDeleteHabit}
                  onArchiveHabit={handleArchiveHabit}
                  onToggleHabit={handleToggleHabit}
                  onCreateFromTemplate={handleSaveHabit}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  todayKey={todayKey}
                  onOpenNewTask={() => {
                    setEditingTask(null);
                    setTaskModalOpen(true);
                  }}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setTaskModalOpen(true);
                  }}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {activeTab === 'stats' && <StatsView stats={stats} />}
            </>
          )}
        </div>
      </main>

      {/* Thanh điều hướng dưới cùng trên di động */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 grid w-full grid-cols-4 border-t border-sky-200/80 bg-white pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden dark:border-neutral-800 dark:bg-neutral-900">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
                active
                  ? 'text-sky-700 dark:text-neutral-100'
                  : 'text-slate-500 dark:text-neutral-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        initialTask={editingTask}
        defaultDate={selectedDate}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <HabitModal
        open={habitModalOpen}
        initialHabit={editingHabit}
        onClose={() => {
          setHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
      />
    </div>
  );
}
