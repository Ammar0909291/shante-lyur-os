'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/language';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const { t } = useLanguage();

  React.useEffect(() => {
    console.error('[dashboard] render error', error);
  }, [error]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stale data amber banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-800/40 bg-amber-950/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-300">
            {t('dashboard.error.stale')}
          </p>
        </div>
        <button
          onClick={reset}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-amber-900/60 text-amber-200 hover:bg-amber-900/80 border border-amber-700/40 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {t('dashboard.error.retry')}
        </button>
      </div>

      {/* Minimal fallback card — never blank */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-text-tertiary" aria-hidden="true" />
        <div>
          <p className="text-text-primary font-medium">Не удалось загрузить дашборд</p>
          <p className="text-text-secondary text-sm mt-1">
            Проверьте подключение или обновите страницу
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg text-obsidian bg-champagne hover:brightness-105 transition-all"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t('dashboard.error.retry')}
        </button>
      </div>
    </div>
  );
}
