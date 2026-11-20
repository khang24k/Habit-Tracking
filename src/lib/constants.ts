export const CATEGORY_KEYS = [
  'work',
  'personal',
  'health',
  'study',
  'finance',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; badgeClass: string; dotClass: string }
> = {
  work: {
    label: 'Công việc',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
    dotClass: 'bg-sky-400 dark:bg-neutral-400',
  },
  personal: {
    label: 'Cá nhân',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
    dotClass: 'bg-indigo-400 dark:bg-neutral-400',
  },
  health: {
    label: 'Sức khỏe',
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
    dotClass: 'bg-teal-400 dark:bg-neutral-400',
  },
  study: {
    label: 'Học tập',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
    dotClass: 'bg-amber-400 dark:bg-neutral-400',
  },
  finance: {
    label: 'Tài chính',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
    dotClass: 'bg-rose-400 dark:bg-neutral-400',
  },
};

export const PRIORITY_KEYS = ['high', 'medium', 'low'] as const;
export type PriorityKey = (typeof PRIORITY_KEYS)[number];

export const PRIORITIES: Record<
  PriorityKey,
  { label: string; weight: number; pillClass: string; dotClass: string }
> = {
  high: {
    label: 'Cao',
    weight: 1,
    pillClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-neutral-800 dark:text-rose-300 dark:border-neutral-700',
    dotClass: 'bg-rose-400',
  },
  medium: {
    label: 'Trung bình',
    weight: 2,
    pillClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-neutral-800 dark:text-amber-300 dark:border-neutral-700',
    dotClass: 'bg-amber-400',
  },
  low: {
    label: 'Thấp',
    weight: 3,
    pillClass:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
    dotClass: 'bg-slate-400 dark:bg-neutral-400',
  },
};

export const HABIT_COLOR_KEYS = [
  'emerald',
  'blue',
  'violet',
  'amber',
  'rose',
  'cyan',
] as const;

export type HabitColorKey = (typeof HABIT_COLOR_KEYS)[number];

export const HABIT_COLORS: Record<
  HabitColorKey,
  {
    label: string;
    bg: string;
    bgSoft: string;
    border: string;
    text: string;
    ring: string;
  }
> = {
  emerald: {
    label: 'Bạc hà',
    bg: 'bg-teal-400 dark:bg-teal-500/80',
    bgSoft: 'bg-teal-50 dark:bg-neutral-800',
    border: 'border-teal-300 dark:border-neutral-700',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-200 dark:ring-neutral-700',
  },
  blue: {
    label: 'Xanh trời',
    bg: 'bg-sky-400 dark:bg-neutral-300',
    bgSoft: 'bg-sky-50 dark:bg-neutral-800',
    border: 'border-sky-300 dark:border-neutral-700',
    text: 'text-sky-700 dark:text-neutral-200',
    ring: 'ring-sky-200 dark:ring-neutral-700',
  },
  violet: {
    label: 'Oải hương',
    bg: 'bg-indigo-400 dark:bg-indigo-400/80',
    bgSoft: 'bg-indigo-50 dark:bg-neutral-800',
    border: 'border-indigo-300 dark:border-neutral-700',
    text: 'text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-200 dark:ring-neutral-700',
  },
  amber: {
    label: 'Vàng mơ',
    bg: 'bg-amber-400 dark:bg-amber-400/80',
    bgSoft: 'bg-amber-50 dark:bg-neutral-800',
    border: 'border-amber-300 dark:border-neutral-700',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-neutral-700',
  },
  rose: {
    label: 'Hồng phấn',
    bg: 'bg-rose-400 dark:bg-rose-400/80',
    bgSoft: 'bg-rose-50 dark:bg-neutral-800',
    border: 'border-rose-300 dark:border-neutral-700',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-neutral-700',
  },
  cyan: {
    label: 'Xanh băng',
    bg: 'bg-cyan-400 dark:bg-cyan-400/80',
    bgSoft: 'bg-cyan-50 dark:bg-neutral-800',
    border: 'border-cyan-300 dark:border-neutral-700',
    text: 'text-cyan-700 dark:text-cyan-300',
    ring: 'ring-cyan-200 dark:ring-neutral-700',
  },
};

export const FREQUENCY_KEYS = [
  'daily',
  'weekdays',
  'weekends',
  'custom',
] as const;

export type FrequencyKey = (typeof FREQUENCY_KEYS)[number];

export const FREQUENCY_LABELS: Record<FrequencyKey, string> = {
  daily: 'Mỗi ngày',
  weekdays: 'Thứ 2 – Thứ 6',
  weekends: 'Cuối tuần (T7, CN)',
  custom: 'Tùy chỉnh ngày',
};

export function daysOfWeekForFrequency(
  frequency: FrequencyKey,
  customDays?: number[],
): number[] {
  switch (frequency) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays':
      return [1, 2, 3, 4, 5];
    case 'weekends':
      return [0, 6];
    case 'custom': {
      const normalized = Array.from(
        new Set(
          (customDays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        ),
      ).sort((a, b) => a - b);
      return normalized;
    }
  }
}

export interface HabitTemplate {
  title: string;
  description: string;
  category: CategoryKey;
  color: HabitColorKey;
  frequency: FrequencyKey;
  reminderTime: string;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    title: 'Uống đủ 2 lít nước',
    description: 'Bổ sung nước đều đặn trong ngày giúp tỉnh táo và khỏe mạnh.',
    category: 'health',
    color: 'cyan',
    frequency: 'daily',
    reminderTime: '09:00',
  },
  {
    title: 'Tập thể dục 30 phút',
    description: 'Đi bộ nhanh, chạy bộ hoặc tập cardio nhẹ nhàng.',
    category: 'health',
    color: 'emerald',
    frequency: 'daily',
    reminderTime: '07:00',
  },
  {
    title: 'Đọc sách 20 phút',
    description: 'Duy trì thói quen đọc sách trước khi đi ngủ.',
    category: 'study',
    color: 'violet',
    frequency: 'daily',
    reminderTime: '21:30',
  },
  {
    title: 'Học ngoại ngữ 15 phút',
    description: 'Ôn từ vựng và luyện nghe mỗi ngày làm việc.',
    category: 'study',
    color: 'blue',
    frequency: 'weekdays',
    reminderTime: '20:00',
  },
  {
    title: 'Tổng kết ngày & lập kế hoạch',
    description: 'Xem lại việc đã hoàn thành và chuẩn bị 3 ưu tiên ngày mai.',
    category: 'personal',
    color: 'amber',
    frequency: 'daily',
    reminderTime: '22:00',
  },
];
