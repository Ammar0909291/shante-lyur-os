'use client';

import * as React from 'react';

export type UIVersion = 'legacy' | 'next';
export type UIDensity = 'comfortable' | 'compact';

const VERSION_KEY = 'sl-ui-version';
const DENSITY_KEY = 'sl-ui-density';

interface AppearanceCtx {
  version: UIVersion;
  density: UIDensity;
  setVersion: (v: UIVersion) => void;
  setDensity: (d: UIDensity) => void;
  toggle: () => void;
}

const Ctx = React.createContext<AppearanceCtx>({
  version: 'legacy',
  density: 'comfortable',
  setVersion: () => {},
  setDensity: () => {},
  toggle: () => {},
});

export function UIVersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = React.useState<UIVersion>('legacy');
  const [density, setDensityState] = React.useState<UIDensity>('comfortable');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(VERSION_KEY) as UIVersion | null;
      if (v === 'legacy' || v === 'next') setVersionState(v);
      const d = localStorage.getItem(DENSITY_KEY) as UIDensity | null;
      if (d === 'comfortable' || d === 'compact') setDensityState(d);
    } catch {}
    setHydrated(true);
  }, []);

  const setVersion = React.useCallback((v: UIVersion) => {
    setVersionState(v);
    try { localStorage.setItem(VERSION_KEY, v); } catch {}
  }, []);

  const setDensity = React.useCallback((d: UIDensity) => {
    setDensityState(d);
    try { localStorage.setItem(DENSITY_KEY, d); } catch {}
  }, []);

  const toggle = React.useCallback(() => {
    setVersion(version === 'legacy' ? 'next' : 'legacy');
  }, [version, setVersion]);

  if (!hydrated) return null;

  return (
    <Ctx.Provider value={{ version, density, setVersion, setDensity, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUIVersion() {
  return React.useContext(Ctx);
}

// Alias — preferred name going forward
export const useAppearance = useUIVersion;
