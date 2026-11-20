'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  PRIORITIES,
  PRIORITY_KEYS,
  type CategoryKey,
  type PriorityKey,
} from '@/lib/constants';
import { addDays, formatShortDate } from '@/lib/dates';
import { getCategoryLabel, getPriorityLabel } from '@/lib/i18n';
import type { TaskItem } from '@/types/app';
import { useLanguage } from './LanguageProvider';

interface TasksViewProps {
  tasks: TaskItem[];
  todayKey: string;
  onOpenNewTask: () => void;
  onEditTask: (task: TaskItem) => void;
  onToggleTask: (task: TaskItem) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

type StatusFilter = 'all' | 'open' | 'completed' | 'overdue';

export function TasksView({
  tasks,
  todayKey,
  onOpenNewTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: TasksViewProps) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'all'>(
    'all',
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityKey | 'all'>(
    'all',
  );

  const tomorrowKey = addDays(todayKey, 1);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter === 'open' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (
        statusFilter === 'overdue' &&
        (task.completed || task.dueDate >= todayKey)
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && task.category !== categoryFilter) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (
        q &&
        !task.title.toLowerCase().includes(q) &&
        !(task.notes ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, query, statusFilter, categoryFilter, priorityFilter, todayKey]);

  const groups = useMemo(() => {
    const overdue: TaskItem[] = [];
    const today: TaskItem[] = [];
    const tomorrow: TaskItem[] = [];
    const upcoming: TaskItem[] = [];
    const completed: TaskItem[] = [];

    for (const task of filteredTasks) {
      if (task.completed) {
        completed.push(task);
      } else if (task.dueDate < todayKey) {
        overdue.push(task);
      } else if (task.dueDate === todayKey) {
        today.push(task);
      } else if (task.dueDate === tomorrowKey) {
        tomorrow.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return [
      { key: 'overdue', label: t.tasks.groups.overdue, tone: 'text-rose-700 dark:text-rose-400', items: overdue },
      { key: 'today', label: t.tasks.groups.today, tone: 'text-sky-700 dark:text-neutral-200', items: today },
      { key: 'tomorrow', label: t.tasks.groups.tomorrow, tone: 'text-indigo-700 dark:text-neutral-300', items: tomorrow },
      { key: 'upcoming', label: t.tasks.groups.upcoming, tone: 'text-slate-700 dark:text-neutral-300', items: upcoming },
      { key: 'completed', label: t.tasks.groups.completed, tone: 'text-slate-500 dark:text-neutral-500', items: completed },
    ].filter((g) => g.items.length > 0);
  }, [filteredTasks, todayKey, tomorrowKey, t.tasks.groups]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
            {t.tasks.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {t.tasks.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTask}
          className="inline-flex items-center gap-1.5 self-start rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 sm:self-auto dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          <Plus className="h-4 w-4" />
          {t.tasks.addTask}
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.tasks.searchPlaceholder}
              className="w-full rounded-lg border border-sky-200 bg-sky-50/40 py-2 pr-3.5 pl-10 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CategoryKey | 'all')
              }
              className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-medium text-slate-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="all">{t.tasks.allCategories}</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {getCategoryLabel(key, locale)}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as PriorityKey | 'all')
              }
              className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-medium text-slate-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <option value="all">{t.tasks.allPriorities}</option>
              {PRIORITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t.tasks.priorityPrefix} {getPriorityLabel(key, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', t.tasks.statuses.all],
              ['open', t.tasks.statuses.open],
              ['overdue', t.tasks.statuses.overdue],
              ['completed', t.tasks.statuses.completed],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === value
                  ? 'bg-sky-600 text-white dark:bg-neutral-200 dark:text-neutral-900'
                  : 'bg-sky-50 text-slate-600 hover:bg-sky-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách theo nhóm */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sky-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            {t.tasks.emptyFiltered}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <h2 className={`text-sm font-bold ${group.tone}`}>
                  {group.label}
                </h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  {group.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((task) => {
                  const isOverdue = !task.completed && task.dueDate < todayKey;
                  return (
                    <div
                      key={task.id}
                      className="group flex items-start gap-3 rounded-xl border border-sky-200/70 bg-white p-4 transition hover:border-sky-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
                          className={`text-sm font-medium text-slate-800 dark:text-neutral-100 ${
                            task.completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                            {task.notes}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 dark:bg-neutral-800 dark:text-rose-300'
                                : 'bg-sky-50 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatShortDate(task.dueDate)}
                          </span>
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

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={t.today.editLabel}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={t.today.deleteLabel}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
