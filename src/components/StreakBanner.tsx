'use client';

import { LogOut } from 'lucide-react';
import { getStreakLevelInfo } from '@/lib/streaks';
import { LanguageIconButton, useLanguage } from './LanguageProvider';
import { ThemeIconButton } from './ThemeProvider';

interface StreakBannerProps {
  currentStreak: number;
  bestStreak: number;
  onLogout?: () => void;
}

function BurningFlame({
  level,
  active,
}: {
  level: 1 | 2 | 3 | 4;
  active: boolean;
}) {
  if (!active) {
    return (
      <svg
        viewBox="0 0 64 72"
        className="h-12 w-10 shrink-0 sm:h-14 sm:w-12"
        aria-hidden="true"
      >
        <path
          d="M32 64c-11 0-18-7.5-18-17 0-8.2 5.4-14.2 10.6-20.4 3.4-4 6.2-7.8 7.4-12.6 2.6 4.4 5.2 8.2 8.2 12.2C45 32.6 50 38.4 50 47c0 9.5-7 17-18 17Z"
          fill="#fed7aa"
          opacity="0.7"
        />
        <path
          d="M32 60c-6.2 0-10.2-4.2-10.2-9.8 0-4.8 3.2-8.2 6.2-11.8 1.6-1.9 3.1-3.9 4-6.4 1.3 2.5 2.8 4.4 4.4 6.4 2.9 3.6 5.8 7 5.8 11.8 0 5.6-4 9.8-10.2 9.8Z"
          fill="#fde68a"
          opacity="0.75"
        />
      </svg>
    );
  }

  const emberPositions =
    level >= 4
      ? [
          { cx: 16, cy: 26, r: 2, delay: '0s', fill: '#fb923c' },
          { cx: 48, cy: 24, r: 2.2, delay: '0.4s', fill: '#f59e0b' },
          { cx: 22, cy: 14, r: 1.8, delay: '0.8s', fill: '#fb7185' },
          { cx: 42, cy: 16, r: 1.9, delay: '1.1s', fill: '#fbbf24' },
          { cx: 31, cy: 10, r: 2.1, delay: '0.6s', fill: '#38bdf8' },
          { cx: 52, cy: 38, r: 1.6, delay: '1.4s', fill: '#fb923c' },
        ]
      : level === 3
        ? [
            { cx: 17, cy: 26, r: 1.9, delay: '0s', fill: '#fb923c' },
            { cx: 47, cy: 24, r: 2, delay: '0.5s', fill: '#fbbf24' },
            { cx: 24, cy: 15, r: 1.7, delay: '1s', fill: '#fb7185' },
            { cx: 40, cy: 17, r: 1.7, delay: '1.3s', fill: '#fb923c' },
          ]
        : level === 2
          ? [
              { cx: 19, cy: 28, r: 1.8, delay: '0.1s', fill: '#fb923c' },
              { cx: 46, cy: 26, r: 1.8, delay: '0.8s', fill: '#fbbf24' },
            ]
          : [];

  return (
    <svg
      viewBox="0 0 64 72"
      className="h-12 w-10 shrink-0 overflow-visible sm:h-14 sm:w-12"
      aria-hidden="true"
    >
      <g className="animate-flame-sway">
        {level >= 3 && (
          <path
            d="M19 58c-5.8-3.8-8.8-10.2-7.2-17.6 1.2-5.4 4.8-9.2 6.6-14.2 1.8 3.6 3.1 6.5 2.8 10.6 3-5.2 7.8-12.2 10.8-24.8 4.4 8.2 8.2 13.8 11.4 19.6.8-3.2 1.6-6.2 1.2-9.6 4.4 4.8 8.4 10.8 8.4 19.2 0 11.6-8.6 20.8-21 20.8-5.1 0-9.6-1.4-13-4Z"
            fill={level === 4 ? '#f97316' : '#fb7185'}
            opacity="0.88"
          />
        )}
        <path
          d={
            level >= 2
              ? 'M32 65c-12.4 0-20.5-8.4-20.5-19.2 0-9.6 6.2-16.4 12.2-23.4 4-4.7 7-9.6 8.3-16.4 3.2 5.8 6.4 10.6 9.8 15.2 5.4 7.2 10.7 13.8 10.7 24.6C52.5 56.6 44.4 65 32 65Z'
              : 'M32 64c-10.8 0-17.5-7.4-17.5-16.8 0-8 5.4-13.8 10.2-19.6 3.2-3.8 5.8-7.4 7.3-12.6 2.5 4.2 5 8 7.8 11.8 4.5 6 9.7 11.8 9.7 20.4C49.5 56.6 42.8 64 32 64Z'
          }
          fill={level === 1 ? '#fb923c' : level === 2 ? '#f97316' : '#fb923c'}
        />
      </g>

      <g className="animate-flame-flicker">
        <path
          d={
            level >= 3
              ? 'M32 62c-8.4 0-13.8-5.8-13.8-13.6 0-6.8 4.2-11.8 8.1-16.6 2.6-3.2 4.6-6.5 5.7-11.2 2.2 4 4.3 7.2 6.7 10.4 3.6 4.9 7.1 9.8 7.1 17.4C45.8 56.2 40.4 62 32 62Z'
              : 'M32 61c-7.2 0-11.8-4.9-11.8-11.4 0-5.6 3.4-9.8 6.6-13.8 2-2.6 3.8-5.4 5.2-9 1.8 3.4 3.6 6 5.5 8.6 3 4 6.3 8.2 6.3 14.2C43.8 56.1 39.2 61 32 61Z'
          }
          fill="#fbbf24"
        />
      </g>

      <g className="animate-flame-core">
        <path
          d="M32 59c-4.4 0-7.2-3-7.2-7 0-3.5 2.1-6.2 4-8.8 1.3-1.7 2.4-3.4 3.2-5.6.9 2.1 2 3.8 3.2 5.4 1.9 2.6 4 5.3 4 9 0 4-2.8 7-7.2 7Z"
          fill={level === 4 ? '#fef9c3' : '#fef3c7'}
        />
      </g>

      {level === 4 && (
        <g className="animate-flame-core">
          <path
            d="M32 57.5c-2.2 0-3.6-1.5-3.6-3.5 0-1.9 1.2-3.4 2.4-4.9.5-.7.9-1.4 1.2-2.2.4.8.8 1.5 1.3 2.2 1.1 1.5 2.3 3 2.3 4.9 0 2-1.4 3.5-3.6 3.5Z"
            fill="#bae6fd"
            opacity="0.85"
          />
        </g>
      )}

      {emberPositions.map((ember, idx) => (
        <circle
          key={idx}
          cx={ember.cx}
          cy={ember.cy}
          r={ember.r}
          fill={ember.fill}
          className="animate-flame-ember"
          style={{ animationDelay: ember.delay }}
        />
      ))}
    </svg>
  );
}

export function StreakBanner({
  currentStreak,
  bestStreak,
  onLogout,
}: StreakBannerProps) {
  const { t } = useLanguage();
  const info = getStreakLevelInfo(currentStreak);
  const tierName = t.streak.tiers[info.level];

  const tierSurfaceClass =
    info.level === 4
      ? 'border-amber-200/90 bg-gradient-to-r from-sky-50 via-white to-amber-50/70 dark:border-neutral-800 dark:bg-none dark:bg-neutral-900'
      : info.level === 3
        ? 'border-orange-200/80 bg-gradient-to-r from-sky-50 via-white to-orange-50/60 dark:border-neutral-800 dark:bg-none dark:bg-neutral-900'
        : info.level === 2
          ? 'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-amber-50/40 dark:border-neutral-800 dark:bg-none dark:bg-neutral-900'
          : 'border-sky-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900';

  const segments = [0, 1, 2];

  return (
    <section
      aria-label={t.streak.title}
      className={`mb-6 w-full min-w-0 overflow-x-clip rounded-xl border p-4 sm:p-5 ${tierSurfaceClass}`}
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50/70 sm:h-16 sm:w-14 dark:border-neutral-700 dark:bg-neutral-800">
            <BurningFlame level={info.level} active={info.streakDays > 0} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-sky-700 uppercase dark:text-neutral-300">
                {t.streak.title}
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-300">
                {t.streak.levelPrefix} {info.level}/4 · {tierName}
              </span>
              {info.isMaxLevel && (
                <span className="rounded-md border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {t.streak.maxTag}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl dark:text-neutral-100">
                {info.streakDays} {t.streak.daysUnit}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                {t.streak.bestLabel}: {bestStreak} {t.streak.daysUnit}
              </span>
            </div>
          </div>
        </div>

        {/* 3 nút biểu tượng cạnh nhau ở góc trên bên phải */}
        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageIconButton />
          <ThemeIconButton />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.nav.logout}
              title={t.nav.logout}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thanh tiến trình 3 lần lên cấp (mỗi 10 ngày: 0 -> 10 -> 20 -> 30) */}
      <div className="mt-4 space-y-1.5">
        <div className="grid grid-cols-3 gap-2">
          {segments.map((segIdx) => {
            const segStart = segIdx * 10;
            const fillPct = Math.max(
              0,
              Math.min(100, ((info.streakDays - segStart) / 10) * 100),
            );
            return (
              <div
                key={segIdx}
                className="h-2 overflow-hidden rounded-sm bg-sky-100 dark:bg-neutral-800"
              >
                <div
                  className="h-full rounded-sm bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
          <span>
            {info.isMaxLevel
              ? t.streak.maxLevelHint
              : t.streak.nextLevelHint(info.daysToNextLevel, info.level + 1)}
          </span>
          <span className="font-medium text-slate-400 dark:text-neutral-500">
            0 · 10 · 20 · 30 {t.streak.daysUnit}
          </span>
        </div>
      </div>
    </section>
  );
}
