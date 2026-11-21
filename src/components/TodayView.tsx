'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  GripVertical,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import {
  CATEGORIES,
  HABIT_COLORS,
  PRIORITIES,
} from '@/lib/constants';
import {
  addDays,
  formatDateForLocale,
  formatShortDate,
  getDayOfWeek,
  getShortDayLabel,
  isScheduledOnDate,
} from '@/lib/dates';
import { getCategoryLabel, getPriorityLabel } from '@/lib/i18n';
import {
  compareHabitsForDisplay,
  compareTasksForDisplay,
} from '@/lib/reorder';
import type { HabitItem, TaskItem } from '@/types/app';
import { useLanguage } from './LanguageProvider';
import { useLongPressReorder } from './useLongPressReorder';

interface TodayViewProps {
  todayKey: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks: TaskItem[];
  habits: HabitItem[];
  onToggleTask: (task: TaskItem) => Promise<void>;
  onOpenNewTask: () => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onRescheduleOverdue: () => Promise<void>;
  onToggleHabit: (habitId: string, date: string) => Promise<void>;
  onOpenNewHabit: () => void;
  onEditHabit: (habit: HabitItem) => void;
  onReorderHabits: (orderedHabitIds: string[]) => void;
  onReorderDayTasks: (dateKey: string, orderedTaskIds: string[]) => void;
}

export function TodayView({
  todayKey,
  selectedDate,
  onSelectDate,
  tasks,
  habits,
  onToggleTask,
  onOpenNewTask,
  onEditTask,
  onDeleteTask,
  onRescheduleOverdue,
  onToggleHabit,
  onOpenNewHabit,
  onEditHabit,
  onReorderHabits,
  onReorderDayTasks,
}: TodayViewProps) {
  const { locale, t } = useLanguage();
  const [showUnscheduledHabits, setShowUnscheduledHabits] = useState(false);

  const isViewingToday = selectedDate === todayKey;

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((item) => item.dueDate === selectedDate)
        .sort(compareTasksForDisplay),
    [tasks, selectedDate],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((item) => !item.completed && item.dueDate < todayKey),
    [tasks, todayKey],
  );

  const sortedHabits = useMemo(
    () => [...habits].sort(compareHabitsForDisplay),
    [habits],
  );
  const scheduledHabits = useMemo(
    () =>
      sortedHabits.filter((h) => isScheduledOnDate(h.daysOfWeek, selectedDate)),
    [sortedHabits, selectedDate],
  );
  const unscheduledHabits = useMemo(
    () =>
      sortedHabits.filter(
        (h) => !isScheduledOnDate(h.daysOfWeek, selectedDate),
      ),
    [sortedHabits, selectedDate],
  );
  const visibleHabits = useMemo(
    () => (showUnscheduledHabits ? sortedHabits : scheduledHabits),
    [scheduledHabits, showUnscheduledHabits, sortedHabits],
  );

  const habitDrag = useLongPressReorder({
    items: visibleHabits,
    onReorder: onReorderHabits,
  });
  const taskDrag = useLongPressReorder({
    items: dayTasks,
    onReorder: (orderedIds) => onReorderDayTasks(selectedDate, orderedIds),
  });

  const habitsDoneCount = scheduledHabits.filter((h) =>
    h.completedDates.includes(selectedDate),
  ).length;
  const tasksDoneCount = dayTasks.filter((item) => item.completed).length;

  const totalItems = scheduledHabits.length + dayTasks.length;
  const completedItems = habitsDoneCount + tasksDoneCount;
  const progressPercent =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Ngày hiện tại & điều hướng ngày */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <CalendarDays className="h-4 w-4 shrink-0 text-sky-600 dark:text-neutral-400" />
          <span className="break-words">
            {formatDateForLocale(selectedDate, locale)}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, -1))}
            aria-label={t.today.prevDay}
            className="rounded-lg border border-sky-200 bg-white p-2 text-slate-600 transition hover:bg-sky-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(todayKey)}
            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
              isViewingToday
                ? 'border-sky-600 bg-sky-600 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
                : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            {t.today.todayBtn}
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, 1))}
            aria-label={t.today.nextDay}
            className="rounded-lg border border-sky-200 bg-white p-2 text-slate-600 transition hover:bg-sky-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thẻ tiến độ trong ngày */}
      <div className="rounded-xl border border-sky-200/80 bg-sky-50/90 p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase dark:text-neutral-300">
              {t.today.progressLabel}
            </p>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-slate-800 dark:text-neutral-100">
                {progressPercent}%
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                {t.today.itemsDone(completedItems, totalItems)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-neutral-400">
            <span>{t.today.habitsSummary(habitsDoneCount, scheduledHabits.length)}</span>
            <span>{t.today.tasksSummary(tasksDoneCount, dayTasks.length)}</span>
          </div>
        </div>

        <div className="mt-3.5 h-2 w-full overflow-hidden rounded-sm bg-sky-200/70 dark:bg-neutral-800">
          <div
            className="h-full rounded-sm bg-sky-500 transition-all duration-300 dark:bg-neutral-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Nhắc việc quá hạn */}
      {isViewingToday && overdueTasks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium">
              {t.today.overdueNotice(overdueTasks.length)}
            </span>
          </div>
          <button
            type="button"
            onClick={onRescheduleOverdue}
            className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {t.today.rescheduleAll}
          </button>
        </div>
      )}

      {/* Hai cột chính */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {/* Thói quen lặp lại */}
        <section className="min-w-0 rounded-xl border border-sky-200/80 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
              <h2 className="font-bold text-slate-800 dark:text-neutral-100">
                {t.today.habitsSection}
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                {habitsDoneCount}/{scheduledHabits.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {unscheduledHabits.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUnscheduledHabits((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  {showUnscheduledHabits
                    ? t.today.hideRestDays
                    : t.today.showAllHabits}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenNewHabit}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.today.createNew}
              </button>
            </div>
          </div>

          {habitDrag.draggingId && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-neutral-300">
              <GripVertical className="h-3.5 w-3.5" />
              {t.today.draggingHint}
            </p>
          )}

          {visibleHabits.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-sky-200 p-6 text-center dark:border-neutral-700">
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                {t.today.noHabitsScheduled}
              </p>
              <button
                type="button"
                onClick={onOpenNewHabit}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.today.createFirstHabit}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {habitDrag.displayItems.map((habit) => {
                const isDone = habit.completedDates.includes(selectedDate);
                const colorTheme =
                  HABIT_COLORS[habit.color] ?? HABIT_COLORS.blue;
                const scheduled = isScheduledOnDate(
                  habit.daysOfWeek,
                  selectedDate,
                );
                const last7 = habit.stats.recentDays.slice(-7);
                const isCharging = habitDrag.chargingId === habit.id;
                const isDragging = habitDrag.draggingId === habit.id;

                return (
                  <div
                    key={habit.id}
                    ref={(el) => habitDrag.registerItemRef(habit.id, el)}
                    {...habitDrag.getItemPointerHandlers(habit.id)}
                    style={
                      isDragging
                        ? {
                            transform: `translateY(${habitDrag.dragOffsetY}px) scale(1.015)`,
                            transition: 'none',
                          }
                        : undefined
                    }
                    className={`long-press-card relative overflow-hidden rounded-xl border p-3.5 transition ${
                      isDone
                        ? 'border-sky-200 bg-sky-50/70 dark:border-neutral-700 dark:bg-neutral-800/70'
                        : 'border-sky-100 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    } ${
                      isDragging
                        ? 'z-20 cursor-grabbing shadow-lg ring-2 ring-sky-400 dark:ring-neutral-400'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleHabit(habit.id, selectedDate)}
                        aria-label={habit.title}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          isDone
                            ? `${colorTheme.bg} border-transparent text-white dark:text-neutral-900`
                            : 'border-sky-300 bg-white text-transparent hover:border-sky-500 dark:border-neutral-600 dark:bg-neutral-800'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`break-words font-semibold text-slate-800 dark:text-neutral-100 ${
                                isDone ? 'line-through opacity-70' : ''
                              }`}
                            >
                              {habit.title}
                            </p>
                            {habit.description && (
                              <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-neutral-400">
                                {habit.description}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {isDragging && (
                              <GripVertical className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
                            )}
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-300">
                              <Flame className="h-3.5 w-3.5 text-orange-500" />
                              {habit.stats.currentStreak}
                            </span>
                            <button
                              type="button"
                              onClick={() => onEditHabit(habit)}
                              aria-label={t.today.editLabel}
                              className="rounded-md p-1 text-slate-400 hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                            <span
                              className={`rounded-md border px-1.5 py-0.5 font-medium ${CATEGORIES[habit.category].badgeClass}`}
                            >
                              {getCategoryLabel(habit.category, locale)}
                            </span>
                            {habit.reminderTime && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {habit.reminderTime}
                              </span>
                            )}
                            {!scheduled && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800 dark:text-neutral-400">
                                {t.today.restDay}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {last7.map((d) => {
                              const label = getShortDayLabel(
                                getDayOfWeek(d.date),
                                locale,
                              );
                              return (
                                <button
                                  key={d.date}
                                  type="button"
                                  title={`${label} (${formatShortDate(d.date)})`}
                                  onClick={() => onToggleHabit(habit.id, d.date)}
                                  className={`flex h-5 w-5 items-center justify-center rounded-sm text-[9px] font-bold transition ${
                                    d.completed
                                      ? `${colorTheme.bg} text-white dark:text-neutral-900`
                                      : d.scheduled
                                        ? 'bg-sky-50 text-slate-500 hover:bg-sky-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                        : 'bg-slate-50 text-slate-300 dark:bg-neutral-800/40 dark:text-neutral-600'
                                  }`}
                                >
                                  {label.replace('T', '')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isCharging && (
                      <div
                        aria-hidden="true"
                        className="animate-hold-charge pointer-events-none absolute right-0 bottom-0 left-0 h-1 bg-sky-400 dark:bg-neutral-400"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Nhiệm vụ trong ngày */}
        <section className="min-w-0 rounded-xl border border-sky-200/80 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
              <h2 className="font-bold text-slate-800 dark:text-neutral-100">
                {t.today.tasksSection(formatShortDate(selectedDate))}
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                {tasksDoneCount}/{dayTasks.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.today.createNew}
            </button>
          </div>

          {taskDrag.draggingId && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-neutral-300">
              <GripVertical className="h-3.5 w-3.5" />
              {t.today.draggingHint}
            </p>
          )}

          {dayTasks.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-sky-200 p-6 text-center dark:border-neutral-700">
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                {t.today.noTasksToday}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {taskDrag.displayItems.map((task) => {
                const isCharging = taskDrag.chargingId === task.id;
                const isDragging = taskDrag.draggingId === task.id;

                return (
                  <div
                    key={task.id}
                    ref={(el) => taskDrag.registerItemRef(task.id, el)}
                    {...taskDrag.getItemPointerHandlers(task.id)}
                    style={
                      isDragging
                        ? {
                            transform: `translateY(${taskDrag.dragOffsetY}px) scale(1.015)`,
                            transition: 'none',
                          }
                        : undefined
                    }
                    className={`group long-press-card relative flex items-start gap-3 overflow-hidden rounded-xl border p-3.5 transition ${
                      task.completed
                        ? 'border-sky-100 bg-sky-50/40 opacity-75 dark:border-neutral-800 dark:bg-neutral-900/50'
                        : 'border-sky-100 bg-white hover:border-sky-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
                    } ${
                      isDragging
                        ? 'z-20 cursor-grabbing opacity-100 shadow-lg ring-2 ring-sky-400 dark:ring-neutral-400'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      aria-label={task.title}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                        task.completed
                          ? 'border-sky-600 bg-sky-600 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
                          : 'border-sky-300 bg-white text-transparent hover:border-sky-500 dark:border-neutral-600 dark:bg-neutral-800'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-words text-sm font-medium text-slate-800 dark:text-neutral-100 ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-neutral-500'
                            : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500 dark:text-neutral-400">
                          {task.notes}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${CATEGORIES[task.category].badgeClass}`}
                        >
                          {getCategoryLabel(task.category, locale)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${PRIORITIES[task.priority].pillClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-xs ${PRIORITIES[task.priority].dotClass}`}
                          />
                          {getPriorityLabel(task.priority, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      {isDragging && (
                        <GripVertical className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
                      )}
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        aria-label={t.today.editLabel}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={t.today.deleteLabel}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {isCharging && (
                      <div
                        aria-hidden="true"
                        className="animate-hold-charge pointer-events-none absolute right-0 bottom-0 left-0 h-1 bg-sky-400 dark:bg-neutral-400"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
