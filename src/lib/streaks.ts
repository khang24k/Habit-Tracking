import {
  addDays,
  getDayOfWeek,
  getLastNDays,
  getShortDayLabel,
  isScheduledOnDate,
  isValidDateKey,
} from './dates';

export const STREAK_STEP_DAYS = 10;
export const STREAK_MAX_LEVEL_UPS = 3;

export interface StreakLevelInfo {
  streakDays: number;
  level: 1 | 2 | 3 | 4;
  levelUps: 0 | 1 | 2 | 3;
  isMaxLevel: boolean;
  currentTierStart: number;
  nextThreshold: number | null;
  daysInCurrentTier: number;
  daysToNextLevel: number;
  progressPercent: number;
}

/**
 * Tính cấp độ lửa streak: tăng 1 cấp sau mỗi 10 ngày liên tiếp,
 * tối đa 3 lần lên cấp (Cấp 1 -> Cấp 2 -> Cấp 3 -> Cấp 4 MAX).
 */
export function getStreakLevelInfo(streakDays: number): StreakLevelInfo {
  const safeStreak = Number.isFinite(streakDays)
    ? Math.max(0, Math.floor(streakDays))
    : 0;
  const levelUps = Math.min(
    STREAK_MAX_LEVEL_UPS,
    Math.floor(safeStreak / STREAK_STEP_DAYS),
  ) as 0 | 1 | 2 | 3;
  const level = (1 + levelUps) as 1 | 2 | 3 | 4;
  const isMaxLevel = levelUps >= STREAK_MAX_LEVEL_UPS;
  const currentTierStart = levelUps * STREAK_STEP_DAYS;
  const nextThreshold = isMaxLevel
    ? null
    : (levelUps + 1) * STREAK_STEP_DAYS;
  const daysInCurrentTier = isMaxLevel
    ? STREAK_STEP_DAYS
    : safeStreak - currentTierStart;
  const daysToNextLevel = isMaxLevel ? 0 : nextThreshold! - safeStreak;
  const progressPercent = isMaxLevel
    ? 100
    : Math.round((daysInCurrentTier / STREAK_STEP_DAYS) * 100);

  return {
    streakDays: safeStreak,
    level,
    levelUps,
    isMaxLevel,
    currentTierStart,
    nextThreshold,
    daysInCurrentTier,
    daysToNextLevel,
    progressPercent,
  };
}

export interface RecentDayStatus {
  date: string;
  dayLabel: string;
  scheduled: boolean;
  completed: boolean;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number;
  totalCompletions: number;
  completedToday: boolean;
  scheduledToday: boolean;
  recentDays: RecentDayStatus[];
}

export function calculateHabitStats(
  daysOfWeek: number[],
  completedDates: string[],
  todayKey: string,
): HabitStats {
  const scheduledDays = Array.from(
    new Set(daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
  );
  const completedSet = new Set(completedDates.filter((d) => isValidDateKey(d)));

  const scheduledToday = isScheduledOnDate(scheduledDays, todayKey);
  const completedToday = completedSet.has(todayKey);

  const recentDays: RecentDayStatus[] = getLastNDays(todayKey, 14).map(
    (date) => ({
      date,
      dayLabel: getShortDayLabel(getDayOfWeek(date)),
      scheduled: isScheduledOnDate(scheduledDays, date),
      completed: completedSet.has(date),
    }),
  );

  if (completedSet.size === 0 || scheduledDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completionRate30d: 0,
      totalCompletions: completedSet.size,
      completedToday,
      scheduledToday,
      recentDays,
    };
  }

  const sortedDates = Array.from(completedSet).sort();
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];

  let currentStreak = 0;
  let cursor =
    scheduledToday && !completedToday ? addDays(todayKey, -1) : todayKey;

  let backSteps = 0;
  while (cursor >= earliestDate && backSteps < 3650) {
    if (completedSet.has(cursor)) {
      currentStreak += 1;
    } else if (isScheduledOnDate(scheduledDays, cursor)) {
      break;
    }
    cursor = addDays(cursor, -1);
    backSteps += 1;
  }

  let longestStreak = 0;
  let running = 0;
  const endWalk = latestDate > todayKey ? latestDate : todayKey;
  let walkCursor = earliestDate;
  let forwardSteps = 0;

  while (walkCursor <= endWalk && forwardSteps < 36500) {
    if (completedSet.has(walkCursor)) {
      running += 1;
      if (running > longestStreak) {
        longestStreak = running;
      }
    } else if (isScheduledOnDate(scheduledDays, walkCursor)) {
      running = 0;
    }
    walkCursor = addDays(walkCursor, 1);
    forwardSteps += 1;
  }

  const last30 = getLastNDays(todayKey, 30);
  let scheduled30 = 0;
  let done30 = 0;
  for (const date of last30) {
    if (isScheduledOnDate(scheduledDays, date)) {
      scheduled30 += 1;
      if (completedSet.has(date)) {
        done30 += 1;
      }
    }
  }
  const completionRate30d =
    scheduled30 === 0 ? 0 : Math.round((done30 / scheduled30) * 100);

  return {
    currentStreak,
    longestStreak,
    completionRate30d,
    totalCompletions: completedSet.size,
    completedToday,
    scheduledToday,
    recentDays,
  };
}
