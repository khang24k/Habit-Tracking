import type { CategoryKey, FrequencyKey, HabitColorKey, PriorityKey } from '@/lib/constants';
import type { HabitStats } from '@/lib/streaks';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  dueDate: string;
  priority: PriorityKey;
  category: CategoryKey;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: CategoryKey;
  color: HabitColorKey;
  frequency: FrequencyKey;
  daysOfWeek: number[];
  reminderTime: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  completedDates: string[];
  stats: HabitStats;
}

export interface StatsSummary {
  tasksCompletedTotal: number;
  tasksOpenTotal: number;
  tasksCompletedToday: number;
  habitsActiveCount: number;
  habitsCompletedToday: number;
  habitsScheduledToday: number;
  bestStreak: number;
  avgRate30d: number;
}

export interface HeatmapPoint {
  date: string;
  tasksCompleted: number;
  habitsCompleted: number;
  total: number;
}

export interface HabitBreakdownItem {
  id: string;
  title: string;
  color: HabitColorKey;
  category: CategoryKey;
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number;
  totalCompletions: number;
  completedToday: boolean;
  scheduledToday: boolean;
}

export interface StatsResponse {
  today: string;
  summary: StatsSummary;
  heatmap: HeatmapPoint[];
  habitBreakdown: HabitBreakdownItem[];
}
