import { ru } from './ru';

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function t(key: string): string {
  return getNestedValue(ru as unknown as Record<string, unknown>, key);
}

export { ru };
export type { Ru } from './ru';
