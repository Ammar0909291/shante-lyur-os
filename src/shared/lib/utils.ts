export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 100)
    : 20;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function parseSort(
  searchParams: URLSearchParams,
  allowed: string[]
): { field: string; order: 'asc' | 'desc' } | null {
  const sortBy = searchParams.get('sortBy') ?? searchParams.get('sort');
  if (!sortBy) return null;

  const [field, rawOrder] = sortBy.split(':');
  if (!field || !allowed.includes(field)) return null;

  const order: 'asc' | 'desc' =
    rawOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return { field, order };
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function sanitizeString(str: string): string {
  // Trim whitespace and remove ASCII control characters (0x00–0x1F, 0x7F)
  return str.trim().replace(/[\x00-\x1F\x7F]/g, '');
}
