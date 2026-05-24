export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DomainError } from '@/domain/errors';
import { z } from 'zod';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ListSpecialistsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  serviceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.string().optional(),
});

const CreateSpecialistSchema = z.object({
  name: z.string().min(1),
  specialization: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((value, key) => { raw[key] = value; });

    const parsed = ListSpecialistsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        issues: parsed.error.issues,
      });
    }

    const { page, limit } = parsed.data;

    const where: Record<string, unknown> = {};
    // Default: show ACTIVE; pass ?status=ALL to skip filter
    if (parsed.data.status !== 'ALL') {
      where.status = parsed.data.status ?? 'ACTIVE';
    }

    const [rows, total] = await Promise.all([
      prisma.specialist.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.specialist.count({ where }),
    ]);

    const items = rows.map((s) => ({
      id: s.id,
      name: `${s.user.firstName} ${s.user.lastName}`.trim(),
      email: s.user.email,
      phone: s.user.phone ?? undefined,
      specialization: s.specialization ?? undefined,
      rating: s.rating ? Number(s.rating) : undefined,
      reviews: s.reviewCount,
      appointmentsMonth: undefined as number | undefined,
      status: s.status,
      bio: s.bio ?? undefined,
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
    const parsed = CreateSpecialistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const { name, specialization, email, phone, bio } = parsed.data;
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ') || '-';

    // Generate a unique email if not provided
    const resolvedEmail = email || `specialist.${Date.now()}@shantelyur.internal`;

    // Create User + Specialist in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: resolvedEmail,
          passwordHash: 'locked',
          firstName,
          lastName,
          phone: phone ?? null,
          role: 'SPECIALIST',
          status: 'ACTIVE',
        },
      });

      const specialist = await tx.specialist.create({
        data: {
          userId: user.id,
          specialization: specialization ?? null,
          bio: bio ?? null,
          status: 'ACTIVE',
          commissionRate: 0.30,
          sortOrder: 999,
        },
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      });

      return specialist;
    });

    return ok({
      id: result.id,
      name: `${result.user.firstName} ${result.user.lastName}`.trim(),
      email: result.user.email,
      specialization: result.specialization ?? undefined,
      status: result.status,
    }, 201);
  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error) {
      // Unique constraint on email
      if (error.message.includes('Unique constraint') || error.message.includes('unique')) {
        return apiError('CONFLICT', 'Email already in use', 409);
      }
      return apiError('INTERNAL_ERROR', error.message, 500);
    }
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
