/**
 * Shared utilities for specialist routes.
 * Imported by both /api/specialists/* and /api/analytics/dashboard/* routes.
 */

export function deriveSpecialistType(
  specialization: string | null | undefined,
): 'MASSAGE' | 'COSMETOLOGY' {
  if (!specialization) return 'COSMETOLOGY';
  const lower = specialization.toLowerCase();
  if (lower.includes('массаж') || lower.includes('spa') || lower.includes('спа')) {
    return 'MASSAGE';
  }
  return 'COSMETOLOGY';
}
