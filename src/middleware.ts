import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ROLE_BLOCKED_PAGES, blockedRedirect } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

const PROTECTED_API_ROUTES = [
  '/api/appointments',
  '/api/customers',
  '/api/admin',
  '/api/payments',
  '/api/specialists',
];

const AUTH_ROUTES = ['/api/auth/login', '/api/auth/register'];

const PUBLIC_API_ROUTES = [
  ...AUTH_ROUTES,
  '/api/webhooks',
  '/api/health',
  '/api/locations',
  '/api/services',
];

const ADMIN_ONLY = ['/api/admin'];

// Page routes that do NOT require authentication
const PUBLIC_PAGE_ROUTES = ['/login', '/register', '/forgot-password'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some((route) => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ONLY.some((route) => pathname.startsWith(route));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api');
}

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// ---------------------------------------------------------------------------
// JWT helpers (edge-compatible)
// ---------------------------------------------------------------------------

interface AccessPayload {
  sub: string;
  role: string;
  type?: string;
}

function getJwtSecret(): Uint8Array {
  // Must match the order used by JwtTokenService — ACCESS_SECRET is authoritative
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
  token: string
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const p = payload as unknown as AccessPayload;
    if (!p.sub || !p.role) return null;
    if (p.type && p.type !== 'access') return null;
    return { userId: p.sub, role: p.role };
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
    { status }
  );
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
    'camera=(), microphone=(), geolocation=()'
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

  // Handle CORS pre-flight for API routes
  if (isApiRoute(pathname) && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight, request);
    return preflight;
  }

  // Start building the response headers (forwarded to the route or returned)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  // ── Page-level auth guard ──────────────────────────────────────────────────
  if (!isApiRoute(pathname)) {
    const token = extractToken(request);
    const user  = token ? await verifyToken(token) : null;

    if (isPublicPage(pathname)) {
      // Already authenticated → bounce to dashboard
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // Not authenticated → let the public page render
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      applySecurityHeaders(response);
      return response;
    }

    // Protected page — require valid token
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      // Preserve the original destination so login can redirect back
      if (pathname !== '/' && pathname !== '/dashboard') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // CLIENT role has no access to the internal CRM dashboard
    if (user.role === 'CLIENT') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based page guard — redirect blocked pages to safe default
    const blocked = ROLE_BLOCKED_PAGES[user.role];
    if (blocked) {
      const isBlocked = blocked.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
      if (isBlocked) {
        return NextResponse.redirect(new URL(blockedRedirect(user.role), request.url));
      }
    }

    // Authenticated — inject identity headers into page request (SSR routes can use them)
    requestHeaders.set('x-user-id',   user.userId);
    requestHeaders.set('x-user-role', user.role);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(response);
    return response;
  }
  // ── End page-level guard ───────────────────────────────────────────────────

  // Skip auth checks for public API routes
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applyCorsHeaders(response, request);
    applySecurityHeaders(response);
    return response;
  }

  // Protected route — require valid JWT
  if (isProtectedRoute(pathname)) {
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

    // Admin-only route check
    if (isAdminRoute(pathname)) {
      const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
      if (!adminRoles.includes(user.role)) {
        const res = jsonError('FORBIDDEN', 'Admin access required', 403);
        applyCorsHeaders(res, request);
        applySecurityHeaders(res);
        return res;
      }
    }

    // Forward user identity to route handlers via headers
    requestHeaders.set('x-user-id', user.userId);
    requestHeaders.set('x-user-role', user.role);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Rate limit hint headers (informational — actual enforcement uses rate-limit.ts in routes)
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Policy', '100;w=60');

    applyCorsHeaders(response, request);
    applySecurityHeaders(response);
    return response;
  }

  // Non-protected API route (e.g., /api/services public listing)
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applyCorsHeaders(response, request);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
