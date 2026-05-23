'use client';

import * as React from 'react';
import { ThemeProvider } from './theme-provider';
import { LocaleProvider } from './locale-provider';

export { useTheme } from './theme-provider';
export { useLocale } from './locale-provider';
export type { Theme } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </ThemeProvider>
  );
}
