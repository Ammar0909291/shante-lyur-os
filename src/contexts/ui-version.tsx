'use client';

import * as React from 'react';

export type UIVersion = 'legacy' | 'next';

const STORAGE_KEY = 'sl-ui-version';

interface UIVersionCtx {
  version: UIVersion;
  setVersion: (v: UIVersion) => void;
  toggle: () => void;
}

const Ctx = React.createContext<UIVersionCtx>({
  version: 'legacy',
  setVersion: () => {},
  toggle: () => {},
});

export function UIVersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = React.useState<UIVersion>('legacy');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as UIVersion | null;
      if (stored === 'legacy' || stored === 'next') setVersionState(stored);
    } catch {}
    setHydrated(true);
  }, []);

  const setVersion = React.useCallback((v: UIVersion) => {
    setVersionState(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  }, []);

  const toggle = React.useCallback(() => {
    setVersion(version === 'legacy' ? 'next' : 'legacy');
  }, [version, setVersion]);

  // Prevent flash: render nothing until localStorage is read
  if (!hydrated) return null;

  return (
    <Ctx.Provider value={{ version, setVersion, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUIVersion() {
  return React.useContext(Ctx);
}
