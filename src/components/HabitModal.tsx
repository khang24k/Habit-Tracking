'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  CATEGORY_KEYS,
  FREQUENCY_KEYS,
  HABIT_COLORS,
  HABIT_COLOR_KEYS,
  daysOfWeekForFrequency,
  type CategoryKey,
  type FrequencyKey,
  type HabitColorKey,
} from '@/lib/constants';
import { getShortDayLabel } from '@/lib/dates';
import {
  getCategoryLabel,
  getFrequencyLabel,
  getHabitColorLabel,
} from '@/lib/i18n';
import type { HabitItem } from '@/types/app';
import { useLanguage } from './LanguageProvider';

export interface HabitFormPayload {
  title: string;
  description: string | null;
  category: CategoryKey;
  color: HabitColorKey;
  frequency: FrequencyKey;
  daysOfWeek: number[];
  reminderTime: string | null;
}

interface HabitModalProps {
  open: boolean;
  initialHabit: HabitItem | null;
  onClose: () => void;
  onSave: (payload: HabitFormPayload, habitId?: string) => Promise<void>;
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HabitModal({
  open,
  initialHabit,
  onClose,
  onSave,
}: HabitModalProps) {
  const { locale, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey>('health');
  const [color, setColor] = useState<HabitColorKey>('blue');
  const [frequency, setFrequency] = useState<FrequencyKey>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminderTime, setReminderTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialHabit) {
      setTitle(initialHabit.title);
      setDescription(initialHabit.description ?? '');
      setCategory(initialHabit.category);
      setColor(initialHabit.color);
      setFrequency(initialHabit.frequency);
      setCustomDays(initialHabit.daysOfWeek);
      setReminderTime(initialHabit.reminderTime ?? '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('health');
      setColor('blue');
      setFrequency('daily');
      setCustomDays([1, 2, 3, 4, 5]);
      setReminderTime('');
    }
    setError(null);
  }, [open, initialHabit]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.habitModal.nameRequired);
      return;
    }

    const finalDays = daysOfWeekForFrequency(frequency, customDays);
    if (finalDays.length === 0) {
      setError(t.habitModal.selectAtLeastOneDay);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          category,
          color,
          frequency,
          daysOfWeek: finalDays,
          reminderTime: reminderTime.trim() ? reminderTime.trim() : null,
        },
        initialHabit?.id,
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.habitModal.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-xl border border-sky-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-neutral-100">
            {initialHabit
              ? t.habitModal.editTitle
              : t.habitModal.createTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.habitModal.cancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.habitModal.nameLabel}
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.habitModal.namePlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.habitModal.descLabel}
            </label>
            <input
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.habitModal.descPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.habitModal.frequencyLabel}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {FREQUENCY_KEYS.map((key) => {
                const active = frequency === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFrequency(key)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100'
                        : 'border-sky-200 bg-white text-slate-600 hover:bg-sky-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {getFrequencyLabel(key, locale)}
                  </button>
                );
              })}
            </div>

            {frequency === 'custom' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {WEEKDAY_ORDER.map((day) => {
                  const selected = customDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleCustomDay(day)}
                      className={`flex h-9 w-10 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                        selected
                          ? 'border-sky-600 bg-sky-600 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900'
                          : 'border-sky-200 bg-white text-slate-600 hover:bg-sky-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {getShortDayLabel(day, locale)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
                {t.habitModal.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryKey)}
                className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              >
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {getCategoryLabel(key, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
                {t.habitModal.reminderLabel}
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.habitModal.colorLabel}
            </label>
            <div className="mt-2 flex items-center gap-2.5">
              {HABIT_COLOR_KEYS.map((key) => {
                const active = color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={getHabitColorLabel(key, locale)}
                    onClick={() => setColor(key)}
                    className={`h-8 w-8 rounded-lg transition ${HABIT_COLORS[key].bg} ${
                      active
                        ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-neutral-300 dark:ring-offset-neutral-900'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-sky-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {t.habitModal.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialHabit ? t.habitModal.save : t.habitModal.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
