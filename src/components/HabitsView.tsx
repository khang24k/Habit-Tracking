'use client';

import { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Clock,
  Flame,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import {
  CATEGORIES,
  HABIT_COLORS,
  daysOfWeekForFrequency,
  type HabitTemplate,
} from '@/lib/constants';
import { formatShortDate, getDayOfWeek, getShortDayLabel } from '@/lib/dates';
import {
  getCategoryLabel,
  getFrequencyLabel,
  getHabitTemplates,
} from '@/lib/i18n';
import type { HabitItem } from '@/types/app';
import type { HabitFormPayload } from './HabitModal';
import { useLanguage } from './LanguageProvider';

interface HabitsViewProps {
  habits: HabitItem[];
  todayKey: string;
  includeArchived: boolean;
  onToggleIncludeArchived: () => void;
  onOpenNewHabit: () => void;
  onEditHabit: (habit: HabitItem) => void;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onArchiveHabit: (habit: HabitItem, archived: boolean) => Promise<void>;
  onToggleHabit: (habitId: string, date: string) => Promise<void>;
  onCreateFromTemplate: (payload: HabitFormPayload) => Promise<void>;
}

export function HabitsView({
  habits,
  todayKey,
  includeArchived,
  onToggleIncludeArchived,
  onOpenNewHabit,
  onEditHabit,
  onDeleteHabit,
  onArchiveHabit,
  onToggleHabit,
  onCreateFromTemplate,
}: HabitsViewProps) {
  const { locale, t } = useLanguage();
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);
  const templates = getHabitTemplates(locale);

  function formatScheduleSummary(habit: HabitItem): string {
    if (habit.frequency !== 'custom') {
      return getFrequencyLabel(habit.frequency, locale);
    }
    return habit.daysOfWeek
      .map((d) => getShortDayLabel(d, locale))
      .join(', ');
  }

  async function handleTemplateAdd(template: HabitTemplate) {
    setAddingTemplate(template.title);
    try {
      await onCreateFromTemplate({
        title: template.title,
        description: template.description,
        category: template.category,
        color: template.color,
        frequency: template.frequency,
        daysOfWeek: daysOfWeekForFrequency(template.frequency),
        reminderTime: template.reminderTime,
      });
    } finally {
      setAddingTemplate(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
            {t.habits.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {t.habits.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleIncludeArchived}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              includeArchived
                ? 'border-sky-600 bg-sky-600 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
                : 'border-sky-200 bg-white text-slate-600 hover:bg-sky-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {includeArchived ? t.habits.showingArchived : t.habits.showArchived}
          </button>

          <button
            type="button"
            onClick={onOpenNewHabit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            <Plus className="h-4 w-4" />
            {t.habits.createHabit}
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="rounded-xl border border-sky-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 text-sky-700 dark:text-neutral-200">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-bold text-slate-800 dark:text-neutral-100">
              {t.habits.templatesTitle}
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {t.habits.templatesSubtitle}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => {
              const theme = HABIT_COLORS[tpl.color];
              const busy = addingTemplate === tpl.title;
              return (
                <button
                  key={tpl.title}
                  type="button"
                  disabled={busy}
                  onClick={() => handleTemplateAdd(tpl)}
                  className="flex flex-col justify-between rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-left transition hover:border-sky-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/60 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`h-2.5 w-2.5 rounded-xs ${theme.bg}`} />
                      <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                        {getFrequencyLabel(tpl.frequency, locale)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800 dark:text-neutral-100">
                      {tpl.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                      {tpl.description}
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-neutral-200">
                    <Plus className="h-3.5 w-3.5" />
                    {busy ? t.habits.adding : t.habits.addNow}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {habits.map((habit) => {
            const theme = HABIT_COLORS[habit.color] ?? HABIT_COLORS.blue;
            const doneToday = habit.completedDates.includes(todayKey);

            return (
              <div
                key={habit.id}
                className={`rounded-xl border bg-white p-5 transition dark:bg-neutral-900 ${
                  habit.archived
                    ? 'border-sky-100 opacity-70 dark:border-neutral-800/70'
                    : 'border-sky-200/80 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-xs ${theme.bg}`}
                      />
                      <h3 className="truncate font-bold text-slate-800 dark:text-neutral-100">
                        {habit.title}
                      </h3>
                      {habit.archived && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
                          {t.habits.archivedBadge}
                        </span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                        {habit.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                      <span
                        className={`rounded-md border px-1.5 py-0.5 font-medium ${CATEGORIES[habit.category].badgeClass}`}
                      >
                        {getCategoryLabel(habit.category, locale)}
                      </span>
                      <span className="rounded-md bg-sky-50 px-2 py-0.5 font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {formatScheduleSummary(habit)}
                      </span>
                      {habit.reminderTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {habit.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditHabit(habit)}
                      aria-label={t.today.editLabel}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchiveHabit(habit, !habit.archived)}
                      aria-label={
                        habit.archived
                          ? t.habits.restoreLabel
                          : t.habits.archiveLabel
                      }
                      className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      {habit.archived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHabit(habit.id)}
                      aria-label={t.today.deleteLabel}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 3 chỉ số Streak */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-sky-100 bg-sky-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-800/70">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      {t.habits.currentLabel}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-base font-bold text-slate-800 dark:text-neutral-100">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {habit.stats.currentStreak} {t.habits.daysUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      {t.habits.longestLabel}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-base font-bold text-slate-800 dark:text-neutral-100">
                      <Trophy className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
                      {habit.stats.longestStreak} {t.habits.daysUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      {t.habits.rate30dLabel}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-slate-800 dark:text-neutral-100">
                      {habit.stats.completionRate30d}%
                    </p>
                  </div>
                </div>

                {/* Lưới 14 ngày gần nhất */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                    <span>{t.habits.recent14Days}</span>
                    <button
                      type="button"
                      onClick={() => onToggleHabit(habit.id, todayKey)}
                      className={`font-semibold transition ${
                        doneToday
                          ? theme.text
                          : 'text-sky-700 hover:underline dark:text-neutral-200'
                      }`}
                    >
                      {doneToday ? t.habits.doneToday : t.habits.markToday}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                    {habit.stats.recentDays.map((day) => {
                      const isToday = day.date === todayKey;
                      const label = getShortDayLabel(
                        getDayOfWeek(day.date),
                        locale,
                      );
                      return (
                        <button
                          key={day.date}
                          type="button"
                          title={`${label} ${formatShortDate(day.date)}`}
                          onClick={() => onToggleHabit(habit.id, day.date)}
                          className={`flex flex-col items-center justify-center rounded-md py-1.5 text-[10px] font-semibold transition ${
                            day.completed
                              ? `${theme.bg} text-white dark:text-neutral-900`
                              : day.scheduled
                                ? 'bg-sky-50 text-slate-600 hover:bg-sky-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                : 'bg-slate-50 text-slate-400 dark:bg-neutral-800/40 dark:text-neutral-600'
                          } ${isToday ? 'ring-2 ring-sky-400 dark:ring-neutral-400' : ''}`}
                        >
                          <span>{label}</span>
                          <span className="mt-0.5 text-[9px] opacity-80">
                            {day.date.slice(8)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
