'use client';

import * as React from 'react';
import { useUIVersion } from '@/contexts/ui-version';

interface UIPageWrapperProps {
  legacy: React.ReactNode;
  next: React.ReactNode;
}

/**
 * Renders the appropriate page content based on the active UI version.
 * Both `legacy` and `next` are evaluated by React as ReactNodes — the active
 * one is rendered, the inactive one is not mounted.
 */
export function UIPageWrapper({ legacy, next }: UIPageWrapperProps) {
  const { version } = useUIVersion();
  return <>{version === 'next' ? next : legacy}</>;
}
