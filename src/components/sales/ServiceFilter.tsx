'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ServiceOption {
  id:   string;
  name: string;
}

interface ServiceFilterProps {
  selected:  string[];
  onChange:  (ids: string[]) => void;
  className?: string;
}

export function ServiceFilter({ selected, onChange, className }: ServiceFilterProps) {
  const [options, setOptions] = React.useState<ServiceOption[]>([]);
  const [open, setOpen]       = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open || options.length) return;
    setLoading(true);
    fetch('/api/services?limit=100')
      .then((r) => r.json())
      .then((json) => {
        const items = json?.data?.services ?? json?.data?.items ?? [];
        setOptions(items.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, options.length]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0  ? 'Все услуги'
    : selected.length === 1 ? (options.find((o) => o.id === selected[0])?.name ?? '1 услуга')
    : `${selected.length} услуг`;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          'bg-charcoal border border-border-luxury hover:border-border-light',
          selected.length > 0
            ? 'text-champagne border-champagne/40'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        <span>{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-charcoal border border-border-luxury rounded-xl shadow-xl overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-sm text-text-muted">Загрузка…</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-muted">Нет данных</div>
          )}
          {!loading && options.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal/60 text-text-secondary hover:text-text-primary transition-colors"
              >
                Все услуги
              </button>
              <div className="border-t border-border-luxury" />
              <div className="max-h-52 overflow-y-auto">
                {options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-charcoal/60 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.id)}
                      onChange={() => toggle(opt.id)}
                      className="accent-champagne w-3.5 h-3.5"
                    />
                    <span className="text-sm text-text-primary truncate">{opt.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5 transition-transform text-text-muted', open && 'rotate-180')}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
