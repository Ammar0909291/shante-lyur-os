/**
 * Shared utilities for specialist routes.
 * Imported by /api/specialists/*, /api/operations/*, and analytics routes.
 */

export type SpecialistDepartment = 'COSMETOLOGY' | 'MASSAGE' | 'RECEPTION' | 'MANAGEMENT';

export const DEPARTMENTS: SpecialistDepartment[] = ['COSMETOLOGY', 'MASSAGE', 'RECEPTION', 'MANAGEMENT'];

/** Departments that can be booked as appointment specialists */
export const BOOKABLE_DEPARTMENTS: SpecialistDepartment[] = ['COSMETOLOGY', 'MASSAGE'];

/** Service categories allowed per department. null = cannot book. */
export const DEPT_SERVICE_CATEGORIES: Record<SpecialistDepartment, string[] | null> = {
  MASSAGE:     ['MASSAGE'],
  COSMETOLOGY: ['COSMETOLOGY', 'FACIAL', 'LASER', 'INJECTION', 'BODY_CONTOURING', 'HAIR_REMOVAL', 'OTHER'],
  RECEPTION:   null,
  MANAGEMENT:  null,
};

export function departmentToRole(dept: SpecialistDepartment): string {
  switch (dept) {
    case 'MASSAGE':     return 'MASSAGIST';
    case 'COSMETOLOGY': return 'COSMETOLOGIST';
    case 'RECEPTION':   return 'RECEPTIONIST';
    case 'MANAGEMENT':  return 'MANAGER';
  }
}

/** For backward compat with code that only knows MASSAGE | COSMETOLOGY */
export function departmentToSpecialistType(dept: SpecialistDepartment): 'MASSAGE' | 'COSMETOLOGY' {
  return dept === 'MASSAGE' ? 'MASSAGE' : 'COSMETOLOGY';
}

/** Legacy fallback — derive from free-text specialization when department is absent */
export function deriveSpecialistType(
  specialization: string | null | undefined,
): 'MASSAGE' | 'COSMETOLOGY' {
  if (!specialization) return 'COSMETOLOGY';
  const lower = specialization.toLowerCase();
  if (lower.includes('массаж') || lower.includes('spa') || lower.includes('спа')) return 'MASSAGE';
  return 'COSMETOLOGY';
}
