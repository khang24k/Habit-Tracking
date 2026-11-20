'use client';

import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Rocket,
  Terminal,
} from 'lucide-react';
import { LanguageIconButton, useLanguage } from './LanguageProvider';
import { ThemeIconButton } from './ThemeProvider';

function CopySnippet({ label, code }: { label: string; code: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-sky-200 bg-slate-800 text-slate-100 dark:border-neutral-700 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-slate-700 px-3.5 py-2 text-xs text-slate-300 dark:border-neutral-800 dark:text-neutral-400">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-sky-300 dark:text-neutral-100" />
              {t.setup.copied}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {t.setup.copy}
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 text-xs leading-relaxed text-sky-200 dark:text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function SetupGuide() {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#f2f8fd] px-4 py-10 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-amber-300">
            {t.setup.pendingBadge}
          </span>
          <div className="flex items-center gap-1.5">
            <LanguageIconButton />
            <ThemeIconButton />
          </div>
        </div>

        <div className="rounded-xl border border-sky-200/80 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
            {t.setup.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
            {t.setup.subtitle}
          </p>

          <div className="mt-7 space-y-5">
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <Database className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-800 dark:text-neutral-100">
                    {t.setup.step1Title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                    {t.setup.step1Desc}
                  </p>
                  <a
                    href="https://console.neon.tech"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-neutral-200 dark:hover:text-white"
                  >
                    {t.setup.openNeon}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <Terminal className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-800 dark:text-neutral-100">
                    {t.setup.step2Title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                    {t.setup.step2Desc}
                  </p>
                  <CopySnippet
                    label=".env.local"
                    code={'DATABASE_URL="postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"'}
                  />
                  <CopySnippet
                    label="Terminal"
                    code={'npm run db:push\nnpm run dev'}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-5 dark:border-neutral-800 dark:bg-neutral-800/60">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <Rocket className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-800 dark:text-neutral-100">
                    {t.setup.step3Title}
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-neutral-400">
                    {t.setup.step3Items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-neutral-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
