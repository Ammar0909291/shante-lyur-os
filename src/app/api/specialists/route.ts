export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma, SpecialistStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/config/prisma-client';
import { DomainError } from '@/domain/errors';

function deriveSpecialistType(specialization: string | null): 'MASSAGE' | 'COSMETOLOGY' {
  if (!specialization) return 'COSMETOLOGY';
  const lower = specialization.toLowerCase();
  if (lower.includes('массаж') || lower.includes('spa') || lower.includes('спа')) return 'MASSAGE';
  return 'COSMETOLOGY';
}

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
});

const CreateSpecialistSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  specialization: z.string().max(255).optional(),
  bio: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).max(50).optional(),
  commissionRate: z.coerce.number().min(0).max(1).default(0.3),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const raw: Record<string, string> = {};
    params.forEach((v, k) => { raw[k] = v; });

    const parsed = ListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters', 400, { issues: parsed.error.issues });
    }

    const { page, limit, status } = parsed.data;
    const where: Prisma.SpecialistWhereInput = status ? { status: status as SpecialistStatus } : {};

    const [specialists, total] = await Promise.all([
      prisma.specialist.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          services: { where: { isActive: true }, select: { serviceId: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.specialist.count({ where }),
    ]);

    const items = specialists.map((s) => ({
      id: s.id,
      userId: s.userId,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      specialization: s.specialization,
      bio: s.bio,
      experienceYears: s.experienceYears,
      rating: s.rating !== null ? Number(s.rating) : null,
      reviewCount: s.reviewCount,
      commissionRate: Number(s.commissionRate),
      status: s.status,
      color: s.color,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt,
      allowedServiceIds: s.services.map((ss) => ss.serviceId),
      specialistType: deriveSpecialistType(s.specialization),
    }));

    return ok({ items, total, page, limit });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = CreateSpecialistSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues });
    }

    const { firstName, lastName, email, specialization, bio, experienceYears, commissionRate, color } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('CONFLICT', 'A user with this email already exists', 409);
    }

    const { randomUUID } = await import('crypto');
    const userId = randomUUID();
    const specialistId = randomUUID();

    const [, specialist] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          email,
          firstName,
          lastName,
          passwordHash: 'SPECIALIST_NO_LOGIN',
          role: 'SPECIALIST',
          status: 'ACTIVE',
          emailVerified: false,
        },
      }),
      prisma.specialist.create({
        data: {
          id: specialistId,
          userId,
          specialization,
          bio,
          experienceYears,
          commissionRate,
          color,
          status: 'ACTIVE',
          reviewCount: 0,
          sortOrder: 0,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return ok({
      id: specialist.id,
      userId: specialist.userId,
      firstName: specialist.user.firstName,
      lastName: specialist.user.lastName,
      email: specialist.user.email,
      specialization: specialist.specialization,
      bio: specialist.bio,
      experienceYears: specialist.experienceYears,
      rating: null,
      reviewCount: 0,
      commissionRate: Number(specialist.commissionRate),
      status: specialist.status,
      color: specialist.color,
      sortOrder: specialist.sortOrder,
      createdAt: specialist.createdAt,
      specialistType: deriveSpecialistType(specialist.specialization),
      allowedServiceIds: [],
    }, 201);
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, error.statusCode);
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
