'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarCheck,
  CheckSquare,
  Plus,
  Repeat,
  X,
} from 'lucide-react';
import { getTodayDateKey } from '@/lib/dates';
import type {
  HabitItem,
  StatsResponse,
  TaskItem,
  UserProfile,
} from '@/types/app';
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

export function DashboardApp({ initialUser }: DashboardAppProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [todayKey, setTodayKey] = useState(() =>
    getTodayDateKey(initialUser.timezone),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    getTodayDateKey(initialUser.timezone),
  );
  const [activeTab, setActiveTab] = useState<TabKey>('today');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localToday = getTodayDateKey(browserTz || initialUser.timezone);
    setTodayKey(localToday);
    setSelectedDate(localToday);
  }, [initialUser.timezone]);

  const loadAllData = useCallback(
    async (today: string, archivedFlag: boolean) => {
      try {
        const [tasksRes, habitsRes, statsRes] = await Promise.all([
          fetch(`/api/tasks?today=${encodeURIComponent(today)}`, {
            cache: 'no-store',
          }),
          fetch(
            `/api/habits?today=${encodeURIComponent(today)}&includeArchived=${archivedFlag}`,
            { cache: 'no-store' },
          ),
          fetch(`/api/stats?today=${encodeURIComponent(today)}`, {
            cache: 'no-store',
          }),
        ]);

        if (
          tasksRes.status === 401 ||
          habitsRes.status === 401 ||
          statsRes.status === 401
        ) {
          router.push('/login');
          return;
        }

        const [tasksData, habitsData, statsData] = await Promise.all([
          tasksRes.json() as Promise<{ tasks?: TaskItem[]; error?: string }>,
          habitsRes.json() as Promise<{ habits?: HabitItem[]; error?: string }>,
          statsRes.json() as Promise<StatsResponse & { error?: string }>,
        ]);

        if (tasksRes.ok && tasksData.tasks) setTasks(tasksData.tasks);
        if (habitsRes.ok && habitsData.habits) setHabits(habitsData.habits);
        if (statsRes.ok && !statsData.error) setStats(statsData);
        setErrorBanner(null);
      } catch {
        setErrorBanner(t.errors.loadFailed);
      } finally {
        setLoading(false);
      }
    },
    [router, t.errors.loadFailed],
  );

  useEffect(() => {
    void loadAllData(todayKey, includeArchived);
  }, [todayKey, includeArchived, loadAllData]);

  const refreshStats = useCallback(async () => {
    const res = await fetch(`/api/stats?today=${encodeURIComponent(todayKey)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    }
  }, [todayKey]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function handleSaveTask(payload: TaskFormPayload, taskId?: string) {
    const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
    const method = taskId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { task?: TaskItem; error?: string };
    if (!res.ok || !data.task) {
      throw new Error(data.error ?? t.errors.saveTaskFailed);
    }

    if (taskId) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task! : t)));
    } else {
      setTasks((prev) => [data.task!, ...prev]);
    }
    setErrorBanner(null);
    void refreshStats();
  }

  async function handleToggleTask(task: TaskItem) {
    const nextCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: nextCompleted } : t,
      ),
    );

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: nextCompleted }),
    });
    const data = (await res.json()) as { task?: TaskItem; error?: string };
    if (!res.ok || !data.task) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setErrorBanner(data.error ?? t.errors.updateTaskFailed);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task! : t)));
    void refreshStats();
  }

  async function handleDeleteTask(taskId: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      setTasks(previous);
      setErrorBanner(t.errors.deleteTaskFailed);
      return;
    }
    void refreshStats();
  }

  async function handleRescheduleOverdue() {
    const overdue = tasks.filter((t) => !t.completed && t.dueDate < todayKey);
    if (overdue.length === 0) return;

    await Promise.all(
      overdue.map((task) =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: todayKey }),
        }),
      ),
    );
    await loadAllData(todayKey, includeArchived);
  }

  async function handleSaveHabit(payload: HabitFormPayload, habitId?: string) {
    const url = habitId
      ? `/api/habits/${habitId}?today=${encodeURIComponent(todayKey)}`
      : `/api/habits?today=${encodeURIComponent(todayKey)}`;
    const method = habitId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { habit?: HabitItem; error?: string };
    if (!res.ok || !data.habit) {
      throw new Error(data.error ?? t.errors.saveHabitFailed);
    }

    if (habitId) {
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? data.habit! : h)),
      );
    } else {
      setHabits((prev) => [...prev, data.habit!]);
    }
    setErrorBanner(null);
    void refreshStats();
  }

  async function handleToggleHabit(habitId: string, date: string) {
    const res = await fetch(
      `/api/habits/${habitId}/toggle?today=${encodeURIComponent(todayKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      },
    );
    const data = (await res.json()) as {
      completedDates?: string[];
      stats?: HabitItem['stats'];
      error?: string;
    };

    if (!res.ok || !data.completedDates || !data.stats) {
      setErrorBanner(data.error ?? t.errors.updateHabitFailed);
      return;
    }

    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completedDates: data.completedDates!,
              stats: data.stats!,
            }
          : h,
      ),
    );
    void refreshStats();
  }

  async function handleDeleteHabit(habitId: string) {
    const previous = habits;
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
    if (!res.ok) {
      setHabits(previous);
      setErrorBanner(t.errors.deleteHabitFailed);
      return;
    }
    void refreshStats();
  }

  async function handleArchiveHabit(habit: HabitItem, archived: boolean) {
    const res = await fetch(
      `/api/habits/${habit.id}?today=${encodeURIComponent(todayKey)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      },
    );
    if (!res.ok) {
      setErrorBanner(t.errors.archiveHabitFailed);
      return;
    }
    await loadAllData(todayKey, includeArchived);
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

  const activeHabits = habits.filter((h) => !h.archived);
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
                  habits={habits}
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
