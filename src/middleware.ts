import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Role groups
// ---------------------------------------------------------------------------

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;
const FRONT_DESK_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;
const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'] as const;
const EMPLOYEE_ROLES = [...FRONT_DESK_ROLES, ...SPECIALIST_ROLES] as const;

// ---------------------------------------------------------------------------
// Route classification — API
// ---------------------------------------------------------------------------

const PROTECTED_API_ROUTES = [
  '/api/v1',
  '/api/appointments',
  '/api/customers',
  '/api/admin',
  '/api/payments',
  '/api/analytics',
  '/api/operations',
  '/api/finance',
  '/api/executive',
  '/api/payroll',
  '/api/specialists',
  '/api/clients',
  '/api/services',
  '/api/inventory',
  '/api/sales',
  '/api/promo-codes',
  '/api/messaging',
  '/api/chat',
  '/api/risk',
  '/api/specialist',
  '/api/sales',
];

const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/webhooks',
  '/api/health',
];

// Admin-only API routes (SUPER_ADMIN + ADMIN + MANAGER — same CRM rights)
const ADMIN_ONLY_API = ['/api/admin', '/api/finance', '/api/executive', '/api/risk'];

// Manager+ routes (SUPER_ADMIN, ADMIN, MANAGER)
const MANAGER_API = ['/api/analytics', '/api/payroll', '/api/sales', '/api/promo-codes', '/api/inventory'];

// ---------------------------------------------------------------------------
// Route classification — Pages
// ---------------------------------------------------------------------------

// Auth pages — redirect to dashboard if already logged in
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

// Pages that require authentication (any role)
const AUTHENTICATED_PAGES = ['/dashboard', '/bookings', '/profile'];

// Page → allowed roles map (empty = all authenticated users)
interface PageRule {
  path: string;
  roles: string[];
  redirect: string;
}

const PAGE_RULES: PageRule[] = [
  // Super admin + admin only
  { path: '/finance', roles: [...ADMIN_ROLES], redirect: '/dashboard' },
  { path: '/payroll', roles: [...ADMIN_ROLES], redirect: '/dashboard' },
  { path: '/executive', roles: [...ADMIN_ROLES], redirect: '/dashboard' },
  { path: '/risk', roles: [...ADMIN_ROLES], redirect: '/dashboard' },
  { path: '/promo-codes', roles: [...ADMIN_ROLES, 'MANAGER'], redirect: '/dashboard' },
  { path: '/settings', roles: [...ADMIN_ROLES], redirect: '/dashboard' },
  { path: '/permissions', roles: ['SUPER_ADMIN'], redirect: '/dashboard' },

  // Manager + above
  { path: '/analytics', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/operations', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/communications', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },

  // Front desk
  { path: '/receptionist', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/clients', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/specialists', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/services', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/sales', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },
  { path: '/inventory', roles: [...FRONT_DESK_ROLES], redirect: '/dashboard' },

  // Specialist (cosmetologist / massagist) only
  { path: '/my-panel', roles: [...SPECIALIST_ROLES], redirect: '/dashboard' },

  // All employees only
  { path: '/chat', roles: [...EMPLOYEE_ROLES], redirect: '/dashboard' },
  { path: '/bookings', roles: [...EMPLOYEE_ROLES], redirect: '/dashboard' },
];

// ---------------------------------------------------------------------------
// JWT helpers (edge-compatible)
// ---------------------------------------------------------------------------

interface AccessPayload {
  sub: string;
  role: string;
  type?: string;
  /** Per-user permission overrides granted by SUPER_ADMIN */
  grants?: string[];
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET ??
    'dev-access-secret-change-me';
  return new TextEncoder().encode(secret);
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.cookies.get('access_token')?.value ?? null;
}

async function verifyToken(
  token: string,
): Promise<{ userId: string; role: string; grants: string[] } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const p = payload as unknown as AccessPayload;
    if (!p.sub || !p.role) return null;
    if (p.type && p.type !== 'access') return null;
    return { userId: p.sub, role: p.role, grants: p.grants ?? [] };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Response helpers (inline — no Node.js imports)
// ---------------------------------------------------------------------------

function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

function redirectTo(url: string, request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(url, request.url));
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-CSRF-Token, X-Request-Id';

function applyCorsHeaders(response: NextResponse, request: NextRequest): void {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get('Origin') ?? '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── CORS pre-flight ──────────────────────────────────────────────────────
  if (pathname.startsWith('/api') && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight, request);
    return preflight;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  // ── Auth pages (login, register…) ─────────────────────────────────────
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const token = extractToken(request);
    if (token) {
      const user = await verifyToken(token);
      // Only redirect employees to dashboard — CLIENT role is not permitted in the CRM
      if (user && EMPLOYEE_ROLES.includes(user.role as typeof EMPLOYEE_ROLES[number])) {
        return redirectTo('/dashboard', request);
      }
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(response);
    return response;
  }

  // ── API routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    // Skip auth for public routes
    if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      applyCorsHeaders(response, request);
      applySecurityHeaders(response);
      return response;
    }

    // All other /api routes require auth
    if (PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
      const token = extractToken(request);
      if (!token) {
        const res = jsonError('UNAUTHORIZED', 'Authentication required', 401);
        applyCorsHeaders(res, request);
        applySecurityHeaders(res);
        return res;
      }

      const user = await verifyToken(token);
      if (!user) {
        const res = jsonError('UNAUTHORIZED', 'Invalid or expired token', 401);
        applyCorsHeaders(res, request);
        applySecurityHeaders(res);
        return res;
      }

      // CLIENT role is not permitted to access the CRM
      if (!EMPLOYEE_ROLES.includes(user.role as typeof EMPLOYEE_ROLES[number])) {
        const res = jsonError('FORBIDDEN', 'CRM access is restricted to salon staff', 403);
        applyCorsHeaders(res, request);
        applySecurityHeaders(res);
        return res;
      }

      // Admin-only API check
      if (ADMIN_ONLY_API.some((r) => pathname.startsWith(r))) {
        if (!ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number])) {
          const res = jsonError('FORBIDDEN', 'Admin access required', 403);
          applyCorsHeaders(res, request);
          applySecurityHeaders(res);
          return res;
        }
      }

      // Manager+ API check
      if (MANAGER_API.some((r) => pathname.startsWith(r))) {
        const managerRoles = [...ADMIN_ROLES, 'MANAGER'] as string[];
        if (!managerRoles.includes(user.role)) {
          const res = jsonError('FORBIDDEN', 'Manager access required', 403);
          applyCorsHeaders(res, request);
          applySecurityHeaders(res);
          return res;
        }
      }

      requestHeaders.set('x-user-id', user.userId);
      requestHeaders.set('x-user-role', user.role);

      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Policy', '100;w=60');
      applyCorsHeaders(response, request);
      applySecurityHeaders(response);
      return response;
    }

    // Non-protected API (public listings, etc.)
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applyCorsHeaders(response, request);
    applySecurityHeaders(response);
    return response;
  }

  // ── Page routes ─────────────────────────────────────────────────────────
  const isDashboardPage =
    AUTHENTICATED_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    PAGE_RULES.some((r) => pathname === r.path || pathname.startsWith(r.path + '/'));

  if (isDashboardPage) {
    const token = extractToken(request);
    if (!token) {
      return redirectTo(`/login?next=${encodeURIComponent(pathname)}`, request);
    }

    const user = await verifyToken(token);
    if (!user) {
      return redirectTo(`/login?next=${encodeURIComponent(pathname)}`, request);
    }

    // CLIENT role is not permitted in the CRM — redirect to login
    if (!EMPLOYEE_ROLES.includes(user.role as typeof EMPLOYEE_ROLES[number])) {
      return redirectTo('/login', request);
    }

    // Check page-level role restriction (with per-user grant override)
    const matchedRule = PAGE_RULES.find(
      (r) => pathname === r.path || pathname.startsWith(r.path + '/'),
    );
    if (matchedRule && !matchedRule.roles.includes(user.role)) {
      // Allow if SUPER_ADMIN has granted this user explicit access to the resource
      const hasGrant = user.grants.some(
        (g) => pathname === g || pathname.startsWith(g + '/'),
      );
      if (!hasGrant) {
        return redirectTo(matchedRule.redirect, request);
      }
    }

    requestHeaders.set('x-user-id', user.userId);
    requestHeaders.set('x-user-role', user.role);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(response);
    return response;
  }

  // ── Everything else (static, root, etc.) ────────────────────────────────
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
