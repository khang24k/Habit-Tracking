'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  PRIORITY_KEYS,
  type CategoryKey,
  type PriorityKey,
} from '@/lib/constants';
import { getCategoryLabel, getPriorityLabel } from '@/lib/i18n';
import type { TaskItem } from '@/types/app';
import { useLanguage } from './LanguageProvider';

export interface TaskFormPayload {
  title: string;
  notes: string | null;
  dueDate: string;
  priority: PriorityKey;
  category: CategoryKey;
}

interface TaskModalProps {
  open: boolean;
  initialTask: TaskItem | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (payload: TaskFormPayload, taskId?: string) => Promise<void>;
}

export function TaskModal({
  open,
  initialTask,
  defaultDate,
  onClose,
  onSave,
}: TaskModalProps) {
  const { locale, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<PriorityKey>('medium');
  const [category, setCategory] = useState<CategoryKey>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setNotes(initialTask.notes ?? '');
      setDueDate(initialTask.dueDate);
      setPriority(initialTask.priority);
      setCategory(initialTask.category);
    } else {
      setTitle('');
      setNotes('');
      setDueDate(defaultDate);
      setPriority('medium');
      setCategory('personal');
    }
    setError(null);
  }, [open, initialTask, defaultDate]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.taskModal.nameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          notes: notes.trim() ? notes.trim() : null,
          dueDate,
          priority,
          category,
        },
        initialTask?.id,
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.taskModal.saveError,
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
        className="w-full max-w-lg rounded-xl border border-sky-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-neutral-100">
            {initialTask ? t.taskModal.editTitle : t.taskModal.createTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.taskModal.cancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-slate-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.taskModal.nameLabel}
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.taskModal.namePlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
                {t.taskModal.dueDateLabel}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
                {t.taskModal.priorityLabel}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityKey)}
                className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              >
                {PRIORITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {getPriorityLabel(key, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.taskModal.categoryLabel}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_KEYS.map((key) => {
                const active = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-sky-500 bg-sky-50 text-sky-800 dark:border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100'
                        : 'border-sky-200 bg-white text-slate-600 hover:bg-sky-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-xs ${CATEGORIES[key].dotClass}`}
                    />
                    {getCategoryLabel(key, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300">
              {t.taskModal.notesLabel}
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.taskModal.notesPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
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
              {t.taskModal.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialTask ? t.taskModal.save : t.taskModal.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
