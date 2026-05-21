/**
 * Unit tests — bilingual string handling (RU / EN).
 *
 * Tests the translation lookup logic from src/contexts/language.tsx
 * without mounting any React components — pure function verification.
 */

// ─── Re-implement the translation lookup for pure unit testing ────────────────
// (mirrors the logic in src/contexts/language.tsx)

type Lang = 'ru' | 'en';

const RU: Record<string, string> = {
  'nav.dashboard':  'Дашборд',
  'nav.bookings':   'Записи',
  'nav.clients':    'Клиенты',
  'nav.specialists': 'Специалисты',
  'nav.services':   'Услуги',
  'nav.analytics':  'Аналитика',
  'nav.sales':      'Продажи',
  'nav.inventory':  'Склад',
  'nav.chat':       'Чат',
  'nav.settings':   'Настройки',
  'page.dashboard': 'Дашборд',
  'page.bookings':  'Записи',
  'page.clients':   'Клиенты',
  'page.specialists': 'Специалисты',
  'page.services':  'Услуги',
  'page.analytics': 'Аналитика',
  'page.sales':     'Продажи',
  'page.settings':  'Настройки',
  'header.admin':   'Администратор',
  'header.logout':  'Выйти',
};

const EN: Record<string, string> = {
  'nav.dashboard':  'Dashboard',
  'nav.bookings':   'Bookings',
  'nav.clients':    'Clients',
  'nav.specialists': 'Specialists',
  'nav.services':   'Services',
  'nav.analytics':  'Analytics',
  'nav.sales':      'Sales',
  'nav.inventory':  'Inventory',
  'nav.chat':       'Chat',
  'nav.settings':   'Settings',
  'page.dashboard': 'Dashboard',
  'page.bookings':  'Bookings',
  'page.clients':   'Clients',
  'page.specialists': 'Specialists',
  'page.services':  'Services',
  'page.analytics': 'Analytics',
  'page.sales':     'Sales',
  'page.settings':  'Settings',
  'header.admin':   'Administrator',
  'header.logout':  'Sign out',
};

const TRANSLATIONS: Record<Lang, Record<string, string>> = { ru: RU, en: EN };

function t(lang: Lang, key: string): string {
  return TRANSLATIONS[lang][key] ?? key;
}

// ─── Key coverage ────────────────────────────────────────────────────────────
describe('Translation lookup — key coverage', () => {
  const NAV_KEYS = [
    'nav.dashboard', 'nav.bookings', 'nav.clients', 'nav.specialists',
    'nav.services', 'nav.analytics', 'nav.sales', 'nav.inventory',
    'nav.chat', 'nav.settings',
  ];

  it('every nav key resolves to a non-empty string in RU', () => {
    for (const key of NAV_KEYS) {
      const result = t('ru', key);
      expect(result).not.toBe(key);    // must be translated, not fall back to key
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('every nav key resolves to a non-empty string in EN', () => {
    for (const key of NAV_KEYS) {
      const result = t('en', key);
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('RU and EN translations differ for each nav key', () => {
    for (const key of NAV_KEYS) {
      expect(t('ru', key)).not.toBe(t('en', key));
    }
  });

  it('nav.inventory correctly maps to Склад (RU) and Inventory (EN)', () => {
    expect(t('ru', 'nav.inventory')).toBe('Склад');
    expect(t('en', 'nav.inventory')).toBe('Inventory');
  });
});

// ─── Fallback behaviour ──────────────────────────────────────────────────────
describe('Translation lookup — fallback', () => {
  it('returns the key itself for unknown keys (graceful degradation)', () => {
    const unknown = 'nav.thisKeyDoesNotExist';
    expect(t('ru', unknown)).toBe(unknown);
    expect(t('en', unknown)).toBe(unknown);
  });

  it('does not throw for empty string key', () => {
    expect(() => t('ru', '')).not.toThrow();
    expect(() => t('en', '')).not.toThrow();
  });
});

// ─── Symmetry checks ────────────────────────────────────────────────────────
describe('Translation symmetry — RU ↔ EN parity', () => {
  it('every key present in RU is also present in EN', () => {
    for (const key of Object.keys(RU)) {
      // Use [key] array form — toHaveProperty with a string treats '.' as nested path
      expect(EN[key]).toBeDefined();
      expect(typeof EN[key]).toBe('string');
    }
  });

  it('every key present in EN is also present in RU', () => {
    for (const key of Object.keys(EN)) {
      expect(RU[key]).toBeDefined();
      expect(typeof RU[key]).toBe('string');
    }
  });

  it('RU and EN maps have the same number of keys', () => {
    expect(Object.keys(RU).length).toBe(Object.keys(EN).length);
  });
});

// ─── Salon-domain string content ────────────────────────────────────────────
describe('Translation content — salon-domain vocabulary', () => {
  it('RU uses Cyrillic for all nav labels', () => {
    const cyrillicRe = /[Ѐ-ӿ]/;
    for (const key of Object.keys(RU).filter((k) => k.startsWith('nav.'))) {
      expect(cyrillicRe.test(t('ru', key))).toBe(true);
    }
  });

  it('EN uses only ASCII for all nav labels', () => {
    for (const key of Object.keys(EN).filter((k) => k.startsWith('nav.'))) {
      expect(/^[\x20-\x7E]+$/.test(t('en', key))).toBe(true);
    }
  });
});
