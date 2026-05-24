export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { CreateCustomerProfileUseCase } from '@/application/use-cases/crm';
import { CreateCustomerProfileSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import { prisma } from '@/infrastructure/config/prisma-client';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Only staff can list all customers
    if (role === UserRole.CLIENT) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const querySchema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      loyaltyTier: z.string().optional(),
    });
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const { search, page, limit, loyaltyTier } = parsed.data;

    const where: Record<string, unknown> = {};
    if (loyaltyTier) where.loyaltyTier = loyaltyTier;
    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.customerProfile.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customerProfile.count({ where }),
    ]);

    const items = rows.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
      email: p.user.email,
      phone: p.user.phone ?? '',
      visits: p.totalVisits,
      totalSpent: typeof p.totalSpent === 'object' && 'toNumber' in p.totalSpent
        ? (p.totalSpent as { toNumber(): number }).toNumber()
        : Number(p.totalSpent),
      tier: p.loyaltyTier,
      lastVisit: p.lastVisitAt ? p.lastVisitAt.toLocaleDateString('ru-RU') : '—',
    }));

    return ok({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body: unknown = await req.json();
    const parsed = CreateCustomerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new CreateCustomerProfileUseCase(
      registry.customerProfileRepository,
      registry.userRepository,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(parsed.data, userId);
    return ok(result, 201);
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
