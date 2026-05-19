export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';
import { UpdateCustomerProfileUseCase } from '@/application/use-cases/crm';
import { UpdateCustomerProfileSchema } from '@/application/dto';
import { UserRole } from '@/domain/enums';
import { DomainError } from '@/domain/errors';
import { serializeAppointments } from '@/lib/appointment-serializer';

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role') ?? 'CLIENT';
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const registry = DIRegistry.instance;

    const profile = await registry.customerProfileRepository.findById(id);
    if (!profile) {
      return apiError('NOT_FOUND', `CustomerProfile ${id} not found`, 404);
    }

    if (role === UserRole.CLIENT && profile.userId !== userId) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    // Enrich in parallel: user details, sub-records, recent appointments
    const [user, allergies, restrictions, tags, rawNotes, procedureHistoryRows, apptResult] = await Promise.all([
      registry.userRepository.findById(profile.userId),
      registry.customerAllergyRepository.findByProfile(id),
      registry.customerRestrictionRepository.findByProfile(id),
      registry.customerTagRepository.findByProfile(id),
      registry.specialistNoteRepository.findByProfile(id, 15),
      registry.procedureHistoryRepository.findByProfile(id, 20),
      registry.appointmentRepository.findMany({ clientId: profile.userId, limit: 10 }),
    ]);

    // Enrich notes with specialist names
    const uniqueSpecIds = [...new Set(rawNotes.map(n => n.specialistId))];
    const specialists = await Promise.all(uniqueSpecIds.map(sid => registry.specialistRepository.findById(sid)));
    const specUserIds = [...new Set(specialists.filter(Boolean).map(s => s!.userId))];
    const specUsers = await Promise.all(specUserIds.map(uid => registry.userRepository.findById(uid)));
    const specMap = new Map(uniqueSpecIds.map((sid, i) => [sid, specialists[i]]));
    const specUserMap = new Map(specUserIds.map((uid, i) => [uid, specUsers[i]]));

    const notes = rawNotes.map(n => {
      const spec = specMap.get(n.specialistId);
      const specUser = spec ? specUserMap.get(spec.userId) : null;
      return {
        id: n.id,
        specialistId: n.specialistId,
        specialistName: specUser ? `${specUser.firstName} ${specUser.lastName}`.trim() : 'Специалист',
        appointmentId: n.appointmentId,
        noteType: n.noteType,
        content: n.content,
        privacy: n.privacy,
        createdAt: n.createdAt.toISOString(),
      };
    });

    // Enrich procedure history with service + specialist names
    const uniqueProcSpecIds = [...new Set(procedureHistoryRows.map(p => p.specialistId))];
    const uniqueServiceIds = [...new Set(procedureHistoryRows.map(p => p.serviceId))];
    const [procSpecialists, services] = await Promise.all([
      Promise.all(uniqueProcSpecIds.map(sid => registry.specialistRepository.findById(sid))),
      Promise.all(uniqueServiceIds.map(sid => registry.serviceRepository.findById(sid))),
    ]);
    const procSpecUserIds = [...new Set(procSpecialists.filter(Boolean).map(s => s!.userId))];
    const procSpecUsers = await Promise.all(procSpecUserIds.map(uid => registry.userRepository.findById(uid)));
    const procSpecMap = new Map(uniqueProcSpecIds.map((sid, i) => [sid, procSpecialists[i]]));
    const procSpecUserMap = new Map(procSpecUserIds.map((uid, i) => [uid, procSpecUsers[i]]));
    const serviceMap = new Map(uniqueServiceIds.map((sid, i) => [sid, services[i]]));

    const procedureHistory = procedureHistoryRows.map(p => {
      const spec = procSpecMap.get(p.specialistId);
      const specUser = spec ? procSpecUserMap.get(spec.userId) : null;
      return {
        id: p.id,
        serviceId: p.serviceId,
        serviceName: serviceMap.get(p.serviceId)?.name ?? '—',
        specialistId: p.specialistId,
        specialistName: specUser ? `${specUser.firstName} ${specUser.lastName}`.trim() : 'Специалист',
        performedAt: p.performedAt.toISOString(),
        results: p.results,
        sideEffects: p.sideEffects,
        clientFeedback: p.clientFeedback,
        followUpRequired: p.followUpRequired,
        followUpDate: p.followUpDate?.toISOString() ?? null,
      };
    });

    const recentAppointments = await serializeAppointments(apptResult.items);

    return ok({
      id: profile.id,
      userId: profile.userId,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? null,
      dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
      gender: profile.gender ?? null,
      skinType: profile.skinType ?? null,
      hairType: profile.hairType ?? null,
      bodyType: profile.bodyType ?? null,
      preferredLocationId: profile.preferredLocationId ?? null,
      preferredSpecialistId: profile.preferredSpecialistId ?? null,
      referralSource: profile.referralSource ?? null,
      firstVisitAt: profile.firstVisitAt?.toISOString() ?? null,
      lastVisitAt: profile.lastVisitAt?.toISOString() ?? null,
      totalVisits: profile.totalVisits,
      totalSpent: profile.totalSpent.amount,
      loyaltyPoints: profile.loyaltyPoints,
      loyaltyTier: profile.loyaltyTier,
      churnRiskScore: profile.churnRiskScore ?? null,
      notes: profile.notes ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      allergies: allergies.map(a => ({
        id: a.id,
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction,
        diagnosedAt: a.diagnosedAt?.toISOString() ?? null,
      })),
      restrictions: restrictions.map(r => ({
        id: r.id,
        type: r.type,
        description: r.description,
        isActive: r.isActive,
        validFrom: r.validFrom?.toISOString() ?? null,
        validUntil: r.validUntil?.toISOString() ?? null,
      })),
      tags: tags.map(t => ({ id: t.id, tag: t.tag, color: t.color })),
      specialistNotes: notes,
      procedureHistory,
      recentAppointments,
    });
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = (req.headers.get('x-user-role') ?? 'CLIENT') as UserRole;
    if (!userId) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { id } = await context.params;
    const body: unknown = await req.json();
    const parsed = UpdateCustomerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        issues: parsed.error.issues,
      });
    }

    const registry = DIRegistry.instance;
    const useCase = new UpdateCustomerProfileUseCase(
      registry.customerProfileRepository,
      registry.auditLogRepository,
    );

    const result = await useCase.execute(id, parsed.data, userId, role);
    return ok(result);
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
