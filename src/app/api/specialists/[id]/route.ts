export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import {
  departmentToRole, departmentToSpecialistType,
  type SpecialistDepartment,
} from '../_shared';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

const PatchSchema = z.object({
  status:          z.enum(['ACTIVE', 'ON_VACATION', 'INACTIVE', 'TERMINATED']).optional(),
  department:      z.enum(['COSMETOLOGY', 'MASSAGE', 'RECEPTION', 'MANAGEMENT']).optional(),
  sortOrder:       z.number().int().min(0).optional(),
  specialization:  z.string().max(200).nullable().optional(),
  bio:             z.string().max(2000).nullable().optional(),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
  color:           z.string().max(20).nullable().optional(),
  firstName:       z.string().min(1).max(50).optional(),
  lastName:        z.string().min(1).max(50).optional(),
  phone:           z.string().max(30).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body: unknown = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid request body', 400);

    const { firstName, lastName, phone, department, ...specialistFields } = parsed.data;

    const userUpdate = Object.fromEntries(
      Object.entries({ firstName, lastName, phone }).filter(([, v]) => v !== undefined),
    );

    // If department changes, sync user.role accordingly
    if (department) {
      userUpdate.role = departmentToRole(department as SpecialistDepartment);
    }

    const specialist = await prisma.specialist.update({
      where: { id: params.id },
      data: {
        ...specialistFields,
        ...(department ? { department: department as never } : {}),
        ...(Object.keys(userUpdate).length > 0 ? { user: { update: userUpdate } } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });

    return ok({
      id:              specialist.id,
      status:          specialist.status,
      department:      specialist.department as SpecialistDepartment,
      firstName:       specialist.user.firstName,
      lastName:        specialist.user.lastName,
      email:           specialist.user.email,
      phone:           specialist.user.phone,
      specialization:  specialist.specialization,
      bio:             specialist.bio,
      experienceYears: specialist.experienceYears,
      color:           specialist.color,
      specialistType:  departmentToSpecialistType(specialist.department as SpecialistDepartment),
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const specialist = await prisma.specialist.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        user:     { select: { firstName: true, lastName: true, email: true } },
        services: { where: { isActive: true }, select: { serviceId: true } },
      },
    });

    return ok({
      id:              specialist.id,
      userId:          specialist.userId,
      firstName:       specialist.user.firstName,
      lastName:        specialist.user.lastName,
      email:           specialist.user.email,
      department:      specialist.department as SpecialistDepartment,
      specialization:  specialist.specialization,
      bio:             specialist.bio,
      experienceYears: specialist.experienceYears,
      rating:          specialist.rating !== null ? Number(specialist.rating) : null,
      reviewCount:     specialist.reviewCount,
      commissionRate:  Number(specialist.commissionRate),
      status:          specialist.status,
      color:           specialist.color,
      sortOrder:       specialist.sortOrder,
      createdAt:       specialist.createdAt,
      allowedServiceIds: specialist.services.map((ss) => ss.serviceId),
      specialistType:  departmentToSpecialistType(specialist.department as SpecialistDepartment),
    });
  } catch (error) {
    if (error instanceof Error) return apiError('INTERNAL_ERROR', error.message, 500);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
