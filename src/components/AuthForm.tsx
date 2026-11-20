'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { LanguageIconButton, useLanguage } from './LanguageProvider';
import { ThemeIconButton } from './ThemeProvider';

interface AuthFormProps {
  initialMode: 'login' | 'register';
}

export function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMismatch =
    mode === 'register' &&
    confirmPassword.length > 0 &&
    confirmPassword !== password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password, confirmPassword, timezone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t.auth.authErrorFallback);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError(t.auth.networkError);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full max-w-full items-center justify-center overflow-x-clip bg-[#f2f8fd] px-4 py-10 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-sky-200/80 bg-white p-6 shadow-xs sm:p-7 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-sky-100 bg-sky-50/80 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-sky-900 shadow-2xs dark:bg-neutral-700 dark:text-neutral-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              {t.auth.loginTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'register'
                  ? 'bg-white text-sky-900 shadow-2xs dark:bg-neutral-700 dark:text-neutral-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              {t.auth.registerTab}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageIconButton />
            <ThemeIconButton />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                {t.auth.nameLabel}
              </label>
              <input
                id="auth-name"
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.auth.namePlaceholder}
                className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              {t.auth.emailLabel}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
            >
              {t.auth.passwordLabel}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50/30 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300"
              >
                {t.auth.confirmPasswordLabel}
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.auth.confirmPasswordPlaceholder}
                className={`mt-1.5 w-full rounded-lg border bg-sky-50/30 px-3 py-2 text-sm text-slate-900 outline-none transition focus:bg-white dark:bg-neutral-800 dark:text-neutral-100 dark:focus:bg-neutral-800 ${
                  hasMismatch
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-sky-200 focus:border-sky-500 dark:border-neutral-700 dark:focus:border-neutral-500'
                }`}
              />
              {hasMismatch && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {t.auth.passwordMismatch}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || hasMismatch}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? t.auth.submitLogin : t.auth.submitRegister}
          </button>
        </form>
      </div>
    </div>
  );
}
