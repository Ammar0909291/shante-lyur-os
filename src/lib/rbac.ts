/**
 * Centralized RBAC for Shante Lyur OS.
 *
 * SUPER_ADMIN = root system authority.
 * SUPER_ADMIN bypasses ALL permission gates at every layer.
 * No role change, UI rule, or department restriction may restrict SUPER_ADMIN.
 *
 * Hierarchy (highest → lowest):
 *   SUPER_ADMIN(7) > ADMIN(6) > MANAGER(5) > RECEPTIONIST(4)
 *   > COSMETOLOGIST(3) > MASSAGIST(2) > CLIENT(1)
 */

export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'COSMETOLOGIST'
  | 'MASSAGIST'
  | 'CLIENT';

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  SUPER_ADMIN:   7,
  ADMIN:         6,
  MANAGER:       5,
  RECEPTIONIST:  4,
  COSMETOLOGIST: 3,
  MASSAGIST:     2,
  CLIENT:        1,
};

// ─── Predicates ───────────────────────────────────────────────────────────────

/** Root system authority — NEVER restrict. */
export const isSuperAdmin = (role: string): boolean => role === 'SUPER_ADMIN';

/** SUPER_ADMIN + ADMIN + MANAGER (same CRM rights) */
export const isAdminOrAbove = (role: string): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

/** SUPER_ADMIN + ADMIN + MANAGER */
export const isManagerOrAbove = (role: string): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

/** SUPER_ADMIN + ADMIN + MANAGER + RECEPTIONIST */
export const isFrontDesk = (role: string): boolean =>
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role);

/** Any employee (not CLIENT) */
export const isEmployee = (role: string): boolean =>
  role !== 'CLIENT' && role !== '';

/** COSMETOLOGIST or MASSAGIST */
export const isSpecialist = (role: string): boolean =>
  ['COSMETOLOGIST', 'MASSAGIST'].includes(role);

// ─── Named role groups (for middleware / sidebar) ─────────────────────────────

export const RBAC_GROUPS = {
  SUPER_ADMIN_ONLY: ['SUPER_ADMIN'],
  ADMIN_ONLY:       ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  MANAGER_UP:       ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  FRONT_DESK:       ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  EMPLOYEES:        ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'],
  SPECIALISTS:      ['COSMETOLOGIST', 'MASSAGIST'],
} as const;

// ─── API response guards ──────────────────────────────────────────────────────

function forbidden(message: string): Response {
  return Response.json(
    { success: false, error: { code: 'FORBIDDEN', message } },
    { status: 403 },
  );
}

function unauthorized(): Response {
  return Response.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    { status: 401 },
  );
}

/** Returns 401/403 Response if caller is not authenticated as SUPER_ADMIN+ADMIN+MANAGER; null otherwise. */
export function requireAdmin(userId: string | null, role: string): Response | null {
  if (!userId) return unauthorized();
  if (!isAdminOrAbove(role)) return forbidden('Admin access required');
  return null;
}

/** Returns 401/403 Response if caller is not authenticated as SUPER_ADMIN; null otherwise. */
export function requireSuperAdmin(userId: string | null, role: string): Response | null {
  if (!userId) return unauthorized();
  if (!isSuperAdmin(role)) return forbidden('Super-admin access required');
  return null;
}

/** Returns 401/403 Response if caller is not authenticated as MANAGER+; null otherwise. */
export function requireManager(userId: string | null, role: string): Response | null {
  if (!userId) return unauthorized();
  if (!isManagerOrAbove(role)) return forbidden('Manager access required');
  return null;
}

/** Returns 401/403 Response if caller is not authenticated as front-desk staff; null otherwise. */
export function requireFrontDesk(userId: string | null, role: string): Response | null {
  if (!userId) return unauthorized();
  if (!isFrontDesk(role)) return forbidden('Staff access required');
  return null;
}
