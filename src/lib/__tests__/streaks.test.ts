import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateHabitStats, getStreakLevelInfo } from '../streaks';

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

test('returns zeroed metrics when there are no completions', () => {
  const stats = calculateHabitStats(DAILY, [], '2026-11-20');
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.longestStreak, 0);
  assert.equal(stats.completionRate30d, 0);
  assert.equal(stats.totalCompletions, 0);
  assert.equal(stats.completedToday, false);
  assert.equal(stats.scheduledToday, true);
  assert.equal(stats.recentDays.length, 14);
});

test('counts consecutive daily streak including today', () => {
  const stats = calculateHabitStats(
    DAILY,
    ['2026-11-18', '2026-11-19', '2026-11-20'],
    '2026-11-20',
  );
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.completedToday, true);
  assert.equal(stats.completionRate30d, Math.round((3 / 30) * 100));
});

test('keeps yesterday active streak alive when today is not checked yet', () => {
  const stats = calculateHabitStats(
    DAILY,
    ['2026-11-17', '2026-11-18', '2026-11-19'],
    '2026-11-20',
  );
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.completedToday, false);
});

test('resets currentStreak to 0 when yesterday was missed, keeping longestStreak', () => {
  const stats = calculateHabitStats(
    DAILY,
    ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'],
    '2026-11-20',
  );
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.longestStreak, 4);
});

test('weekdays-only habit preserves streak across Saturday and Sunday', () => {
  // 2026-11-19 Thu, 2026-11-20 Fri, 2026-11-21 Sat, 2026-11-22 Sun, 2026-11-23 Mon
  const stats = calculateHabitStats(
    WEEKDAYS,
    ['2026-11-19', '2026-11-20', '2026-11-23'],
    '2026-11-23',
  );
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.scheduledToday, true);

  // Checking on Sunday (unscheduled) also keeps Thu+Fri streak alive
  const sundayStats = calculateHabitStats(
    WEEKDAYS,
    ['2026-11-19', '2026-11-20'],
    '2026-11-22',
  );
  assert.equal(sundayStats.scheduledToday, false);
  assert.equal(sundayStats.currentStreak, 2);
});

test('custom Mon-Wed-Fri schedule calculates streaks and 30d rate correctly', () => {
  // 2026-11-16 Mon, 2026-11-18 Wed, 2026-11-20 Fri
  const mwf = [1, 3, 5];
  const stats = calculateHabitStats(
    mwf,
    ['2026-11-16', '2026-11-18', '2026-11-20'],
    '2026-11-20',
  );
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.longestStreak, 3);
  assert.equal(stats.totalCompletions, 3);
});

test('getStreakLevelInfo levels up every 10 days up to 3 level-ups max', () => {
  const l0 = getStreakLevelInfo(0);
  assert.equal(l0.level, 1);
  assert.equal(l0.levelUps, 0);
  assert.equal(l0.isMaxLevel, false);
  assert.equal(l0.daysToNextLevel, 10);
  assert.equal(l0.progressPercent, 0);

  const l9 = getStreakLevelInfo(9);
  assert.equal(l9.level, 1);
  assert.equal(l9.levelUps, 0);
  assert.equal(l9.daysToNextLevel, 1);
  assert.equal(l9.progressPercent, 90);

  const l10 = getStreakLevelInfo(10);
  assert.equal(l10.level, 2);
  assert.equal(l10.levelUps, 1);
  assert.equal(l10.isMaxLevel, false);
  assert.equal(l10.daysToNextLevel, 10);
  assert.equal(l10.progressPercent, 0);

  const l25 = getStreakLevelInfo(25);
  assert.equal(l25.level, 3);
  assert.equal(l25.levelUps, 2);
  assert.equal(l25.isMaxLevel, false);
  assert.equal(l25.daysToNextLevel, 5);
  assert.equal(l25.progressPercent, 50);

  const l30 = getStreakLevelInfo(30);
  assert.equal(l30.level, 4);
  assert.equal(l30.levelUps, 3);
  assert.equal(l30.isMaxLevel, true);
  assert.equal(l30.nextThreshold, null);
  assert.equal(l30.daysToNextLevel, 0);
  assert.equal(l30.progressPercent, 100);

  const l65 = getStreakLevelInfo(65);
  assert.equal(l65.level, 4);
  assert.equal(l65.levelUps, 3);
  assert.equal(l65.isMaxLevel, true);
});
