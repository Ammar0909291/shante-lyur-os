'use client';

import * as React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIVersion } from '@/contexts/ui-version';

interface UIVersionToggleProps {
  compact?: boolean;
}

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
      aria-label="Версия интерфейса"
    >
      <button
        onClick={() => setVersion('legacy')}
        className={cn(
          'flex items-center gap-1.5 px-3 h-full transition-all duration-150',
          version === 'legacy'
            ? 'bg-charcoal text-text-primary'
            : 'text-text-tertiary hover:text-text-secondary',
        )}
        title="Legacy UI"
      >
        {!compact && <Layers className="w-3 h-3" />}
        <span>Legacy</span>
      </button>

      <div className="w-px h-full bg-border-luxury" aria-hidden="true" />

      <button
        onClick={() => setVersion('next')}
        className={cn(
          'flex items-center gap-1.5 px-3 h-full transition-all duration-150',
          version === 'next'
            ? 'bg-champagne/10 text-champagne'
            : 'text-text-tertiary hover:text-text-secondary',
        )}
        title="Next UI"
      >
        {!compact && <Layers className="w-3 h-3" />}
        <span>Next UI</span>
        {version === 'next' && (
          <span className="w-1.5 h-1.5 rounded-full bg-champagne" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
