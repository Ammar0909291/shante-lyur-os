'use client';

import * as React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIVersion } from '@/contexts/ui-version';

interface UIVersionToggleProps {
  compact?: boolean;
}

const MODES = [
  { value: 'legacy' as const, label: 'Классика',     compactLabel: 'CRM'    },
  { value: 'next'   as const, label: 'Luxury',        compactLabel: 'Luxury' },
] as const;

export function UIVersionToggle({ compact = false }: UIVersionToggleProps) {
  const { version, setVersion } = useUIVersion();

  return (
    <div
      className={cn(
        'flex items-center rounded-xl overflow-hidden',
        'border border-border-luxury',
        'text-xs font-medium',
        compact ? 'h-7' : 'h-8',
      )}
      role="group"
      aria-label="Режим интерфейса"
    >
      {MODES.map((mode, i) => (
        <React.Fragment key={mode.value}>
          {i > 0 && <div className="w-px h-full bg-border-luxury" aria-hidden="true" />}
          <button
            onClick={() => setVersion(mode.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full transition-all duration-150',
              version === mode.value
                ? mode.value === 'next'
                  ? 'bg-champagne/10 text-champagne'
                  : 'bg-charcoal text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
            title={mode.label}
          >
            {!compact && <Layers className="w-3 h-3 shrink-0" />}
            <span>{compact ? mode.compactLabel : mode.label}</span>
            {version === mode.value && mode.value === 'next' && (
              <span className="w-1.5 h-1.5 rounded-full bg-champagne shrink-0" aria-hidden="true" />
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
