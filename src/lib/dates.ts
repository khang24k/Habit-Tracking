export type Locale = 'vi' | 'en';

export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_REGEX.test(value)) {
    return false;
  }
  const [yStr, mStr, dStr] = value.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function getTodayDateKey(timeZone = 'Asia/Ho_Chi_Minh'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}

export function parseDateKeyParts(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Ngày không hợp lệ: ${dateKey}`);
  }
  const [yStr, mStr, dStr] = dateKey.split('-');
  return {
    year: Number(yStr),
    month: Number(mStr),
    day: Number(dStr),
  };
}

export function addDays(dateKey: string, delta: number): string {
  const { year, month, day } = parseDateKeyParts(dateKey);
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayOfWeek(dateKey: string): number {
  const { year, month, day } = parseDateKeyParts(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isScheduledOnDate(daysOfWeek: number[], dateKey: string): boolean {
  const dow = getDayOfWeek(dateKey);
  return daysOfWeek.includes(dow);
}

export function getLastNDays(endDateKey: string, count: number): string[] {
  if (count <= 0) {
    return [];
  }
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    result.push(addDays(endDateKey, -i));
  }
  return result;
}

const WEEKDAY_NAMES_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const WEEKDAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SHORT_DAY_LABELS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SHORT_DAY_LABELS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function getShortDayLabel(
  dayOfWeek: number,
  locale: Locale = 'vi',
): string {
  const list = locale === 'en' ? SHORT_DAY_LABELS_EN : SHORT_DAY_LABELS_VI;
  return list[dayOfWeek] ?? '';
}

export function formatVietnameseDate(dateKey: string): string {
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }
  const { year, month, day } = parseDateKeyParts(dateKey);
  const dow = getDayOfWeek(dateKey);
  return `${WEEKDAY_NAMES_VI[dow]}, ${day} tháng ${month}, ${year}`;
}

export function formatDateForLocale(dateKey: string, locale: Locale): string {
  if (locale === 'vi') {
    return formatVietnameseDate(dateKey);
  }
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }
  const { year, month, day } = parseDateKeyParts(dateKey);
  const dow = getDayOfWeek(dateKey);
  return `${WEEKDAY_NAMES_EN[dow]}, ${MONTHS_EN[month - 1]} ${day}, ${year}`;
}

export function formatShortDate(dateKey: string): string {
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }
  const { month, day } = parseDateKeyParts(dateKey);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}
