'use client';

import {
  Activity,
  CheckCircle2,
  Flame,
  Repeat,
  Trophy,
} from 'lucide-react';
import { HABIT_COLORS } from '@/lib/constants';
import { formatDateForLocale } from '@/lib/dates';
import { getCategoryLabel } from '@/lib/i18n';
import type { HeatmapPoint, StatsResponse } from '@/types/app';
import { useLanguage } from './LanguageProvider';

interface StatsViewProps {
  stats: StatsResponse | null;
}

function getHeatmapColor(total: number): string {
  if (total <= 0) {
    return 'bg-sky-50 dark:bg-neutral-800';
  }
  if (total === 1) {
    return 'bg-sky-200 dark:bg-neutral-700';
  }
  if (total <= 3) {
    return 'bg-sky-300 dark:bg-neutral-500';
  }
  return 'bg-sky-500 dark:bg-neutral-300';
}

export function StatsView({ stats }: StatsViewProps) {
  const { locale, t } = useLanguage();

  if (!stats) {
    return (
      <div className="rounded-xl border border-sky-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        ...
      </div>
    );
  }

  const { summary, heatmap, habitBreakdown } = stats;

  const weeks: HeatmapPoint[][] = [];
  for (let i = 0; i < heatmap.length; i += 7) {
    weeks.push(heatmap.slice(i, i + 7));
  }

  const sortedHabits = [...habitBreakdown].sort(
    (a, b) =>
      b.currentStreak - a.currentStreak ||
      b.completionRate30d - a.completionRate30d,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
          {t.stats.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          {t.stats.subtitle}
        </p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-sky-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              {t.stats.tasksDone}
            </span>
            <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-neutral-300" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-neutral-100">
            {summary.tasksCompletedTotal}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {t.stats.tasksOpenHint(summary.tasksOpenTotal)}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              {t.stats.activeHabits}
            </span>
            <Repeat className="h-4 w-4 text-teal-600 dark:text-neutral-300" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-neutral-100">
            {summary.habitsActiveCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {t.stats.habitsTodayHint(
              summary.habitsCompletedToday,
              summary.habitsScheduledToday,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              {t.stats.bestStreak}
            </span>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-neutral-100">
            {summary.bestStreak} {t.stats.daysUnit}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {t.stats.bestStreakHint}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              {t.stats.avgRate30d}
            </span>
            <Activity className="h-4 w-4 text-indigo-500 dark:text-neutral-300" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-neutral-100">
            {summary.avgRate30d}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {t.stats.avgRateHint}
          </p>
        </div>
      </div>

      {/* Heatmap 12 tuần (84 ngày) */}
      <section className="rounded-xl border border-sky-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-neutral-100">
              {t.stats.heatmapTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {t.stats.heatmapSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-neutral-400">
            <span>{t.stats.less}</span>
            <span className="h-3 w-3 rounded-xs border border-sky-100 bg-sky-50 dark:border-neutral-700 dark:bg-neutral-800" />
            <span className="h-3 w-3 rounded-xs bg-sky-200 dark:bg-neutral-700" />
            <span className="h-3 w-3 rounded-xs bg-sky-300 dark:bg-neutral-500" />
            <span className="h-3 w-3 rounded-xs bg-sky-500 dark:bg-neutral-300" />
            <span>{t.stats.more}</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <div className="inline-grid grid-cols-12 gap-2">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-2">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={t.stats.heatmapTooltip(
                      formatDateForLocale(day.date, locale),
                      day.habitsCompleted,
                      day.tasksCompleted,
                    )}
                    className={`h-5 w-5 rounded-sm border border-sky-100/80 transition hover:ring-2 hover:ring-sky-400 sm:h-6 sm:w-6 dark:border-neutral-800 dark:hover:ring-neutral-400 ${getHeatmapColor(day.total)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chi tiết độ ổn định từng thói quen */}
      <section className="rounded-xl border border-sky-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-bold text-slate-800 dark:text-neutral-100">
          {t.stats.habitDetailTitle}
        </h2>

        {sortedHabits.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
            {t.stats.noActiveHabits}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedHabits.map((h) => {
              const theme = HABIT_COLORS[h.color] ?? HABIT_COLORS.blue;
              return (
                <div key={h.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-xs ${theme.bg}`} />
                      <span className="font-semibold text-slate-800 dark:text-neutral-100">
                        {h.title}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-neutral-500">
                        · {getCategoryLabel(h.category, locale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {h.currentStreak} {t.stats.daysUnit}
                      </span>
                      <span className="text-slate-500 dark:text-neutral-400">
                        {t.stats.longestPrefix} {h.longestStreak}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-neutral-100">
                        {h.completionRate30d}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-sm bg-sky-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-sm transition-all ${theme.bg}`}
                      style={{ width: `${h.completionRate30d}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
