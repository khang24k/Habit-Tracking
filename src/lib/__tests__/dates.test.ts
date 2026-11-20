import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  formatDateForLocale,
  formatShortDate,
  formatVietnameseDate,
  getDayOfWeek,
  getLastNDays,
  getShortDayLabel,
  isScheduledOnDate,
  isValidDateKey,
} from '../dates';

test('isValidDateKey validates calendar dates accurately', () => {
  assert.equal(isValidDateKey('2026-11-20'), true);
  assert.equal(isValidDateKey('2024-02-29'), true); // leap year
  assert.equal(isValidDateKey('2026-02-29'), false); // non-leap year
  assert.equal(isValidDateKey('2026-02-30'), false);
  assert.equal(isValidDateKey('2026-13-01'), false);
  assert.equal(isValidDateKey('20-11-2026'), false);
  assert.equal(isValidDateKey(''), false);
});

test('addDays handles month and year rollovers cleanly', () => {
  assert.equal(addDays('2026-11-20', 1), '2026-11-21');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
});

test('getDayOfWeek and isScheduledOnDate match calendar days', () => {
  // 2026-11-20 is Friday (5)
  assert.equal(getDayOfWeek('2026-11-20'), 5);
  assert.equal(getShortDayLabel(5), 'T6');
  assert.equal(getShortDayLabel(0), 'CN');

  const weekdays = [1, 2, 3, 4, 5];
  assert.equal(isScheduledOnDate(weekdays, '2026-11-20'), true); // Fri
  assert.equal(isScheduledOnDate(weekdays, '2026-11-21'), false); // Sat
  assert.equal(isScheduledOnDate(weekdays, '2026-11-22'), false); // Sun
  assert.equal(isScheduledOnDate(weekdays, '2026-11-23'), true); // Mon
});

test('getLastNDays returns chronological range inclusive of endDate', () => {
  assert.deepEqual(getLastNDays('2026-11-20', 4), [
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
  ]);
  assert.deepEqual(getLastNDays('2026-11-20', 0), []);
});

test('Vietnamese and English formatters output expected strings', () => {
  assert.equal(
    formatVietnameseDate('2026-11-20'),
    'Thứ Sáu, 20 tháng 11, 2026',
  );
  assert.equal(
    formatDateForLocale('2026-11-20', 'en'),
    'Friday, Nov 20, 2026',
  );
  assert.equal(getShortDayLabel(5, 'en'), 'Fr');
  assert.equal(formatShortDate('2026-11-05'), '05/11');
});
