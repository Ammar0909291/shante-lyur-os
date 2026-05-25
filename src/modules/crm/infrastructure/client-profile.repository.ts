/**
 * ClientProfileRepository — Prisma-direct read/write repository for the
 * Universal Customer Profile module. Returns DTOs directly (no domain entities).
 *
 * The "clientId" parameter throughout is always User.id (the primary client
 * identifier used in appointments, balance transactions, etc.).
 */

import { prisma } from '@/infrastructure/config/prisma-client';
import { Prisma } from '@prisma/client';
import type {
  ClientSummaryResponse,
  ClientProfileResponse,
  ClientBookingHistoryResponse,
  ClientTreatmentResponse,
  ClientTransactionResponse,
  ClientNoteResponse,
  ClientTreatmentItem,
  GetClientBookingsQuery,
  GetClientTreatmentsQuery,
  GetClientTransactionsQuery,
  CreateClientNoteDto,
  CreateTreatmentRecordDto,
} from '../domain/client.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ClientProfileRepository {
  // ── Summary (used by slide-over panel) ──────────────────────────────────

  async getClientSummary(clientId: string): Promise<ClientSummaryResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      include: {
        customerProfile: {
          include: {
            tags: true,
          },
        },
        clientAppointments: {
          where: { startAt: { gte: new Date() }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          orderBy: { startAt: 'asc' },
          take: 1,
          include: {
            specialist: { include: { user: true } },
            location: true,
            services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!user) return null;

    const profile = user.customerProfile;

    // recent visits — last 3 completed
    const recentAppts = await prisma.appointment.findMany({
      where: { clientId, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      take: 3,
      include: {
        specialist: { include: { user: true } },
        services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    const nextAppt = user.clientAppointments[0];

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      loyaltyTier: profile?.loyaltyTier ?? null,
      loyaltyPoints: profile?.loyaltyPoints ?? 0,
      totalVisits: profile?.totalVisits ?? 0,
      totalSpent: profile?.totalSpent.toNumber() ?? 0,
      lastVisitAt: isoOrNull(profile?.lastVisitAt),
      isBlacklisted: user.status === 'SUSPENDED',
      tags: (profile?.tags ?? []).map((t) => ({
        id: t.id,
        tag: t.tag,
        color: t.color ?? null,
      })),
      nextBooking: nextAppt
        ? {
            id: nextAppt.id,
            startAt: nextAppt.startAt.toISOString(),
            endAt: nextAppt.endAt.toISOString(),
            status: nextAppt.status,
            specialistId: nextAppt.specialistId,
            specialistName: `${nextAppt.specialist.user.firstName} ${nextAppt.specialist.user.lastName}`,
            serviceName: nextAppt.services[0]?.service.name ?? '',
            locationName: nextAppt.location.name,
            totalPrice: nextAppt.totalPrice.toNumber(),
          }
        : null,
      recentVisits: recentAppts.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
        serviceName: a.services[0]?.service.name ?? '',
        totalPrice: a.totalPrice.toNumber(),
        totalDuration: a.totalDuration,
      })),
    };
  }

  // ── Full profile ─────────────────────────────────────────────────────────

  async getClientProfile(clientId: string): Promise<ClientProfileResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      include: {
        customerProfile: {
          include: {
            tags: true,
            referralsGiven: true,
            specialistNotes: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { specialist: { include: { user: true } } },
            },
          },
        },
      },
    });

    if (!user) return null;

    const profile = user.customerProfile;

    // upcoming bookings (max 3)
    const upcomingAppts = await prisma.appointment.findMany({
      where: { clientId, startAt: { gte: new Date() }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      orderBy: { startAt: 'asc' },
      take: 3,
      include: {
        specialist: { include: { user: true } },
        location: true,
        services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    // recent visits (max 5)
    const recentAppts = await prisma.appointment.findMany({
      where: { clientId, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      take: 5,
      include: {
        specialist: { include: { user: true } },
        services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    // no-show and cancellation counts
    const [noShowCount, cancellationCount] = await Promise.all([
      prisma.appointment.count({ where: { clientId, status: 'NO_SHOW' } }),
      prisma.appointment.count({ where: { clientId, status: 'CANCELLED' } }),
    ]);

    // preferred services — top 3 by visit count
    const serviceAgg = await prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: { appointment: { clientId, status: 'COMPLETED' } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 3,
    });

    const serviceIds = serviceAgg.map((s) => s.serviceId);
    const services = serviceIds.length
      ? await prisma.service.findMany({ where: { id: { in: serviceIds } } })
      : [];
    const serviceMap = new Map(services.map((s) => [s.id, s.name]));

    const preferredServices = serviceAgg.map((s) => ({
      id: s.serviceId,
      name: serviceMap.get(s.serviceId) ?? s.serviceId,
      count: s._count.serviceId,
    }));

    // preferred specialist — most-booked specialist for completed visits
    const specialistAgg = await prisma.appointment.groupBy({
      by: ['specialistId'],
      where: { clientId, status: 'COMPLETED' },
      _count: { specialistId: true },
      orderBy: { _count: { specialistId: 'desc' } },
      take: 1,
    });

    let preferredSpecialist: { id: string; name: string } | null = null;
    if (specialistAgg.length) {
      const spec = await prisma.specialist.findUnique({
        where: { id: specialistAgg[0].specialistId },
        include: { user: true },
      });
      if (spec) {
        preferredSpecialist = {
          id: spec.id,
          name: `${spec.user.firstName} ${spec.user.lastName}`,
        };
      }
    }

    const totalVisits = profile?.totalVisits ?? 0;
    const totalSpent = profile?.totalSpent.toNumber() ?? 0;
    const latestNote = profile?.specialistNotes[0];

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      dateOfBirth: isoOrNull(profile?.dateOfBirth),
      age: calcAge(profile?.dateOfBirth ?? null),
      gender: profile?.gender ?? null,
      registeredAt: user.createdAt.toISOString(),
      status: user.status,
      referralSource: profile?.referralSource ?? null,

      loyaltyTier: profile?.loyaltyTier ?? null,
      loyaltyPoints: profile?.loyaltyPoints ?? 0,
      prepaidBalance: profile?.prepaidBalance.toNumber() ?? 0,
      isBlacklisted: user.status === 'SUSPENDED',
      tags: (profile?.tags ?? []).map((t) => ({ id: t.id, tag: t.tag, color: t.color ?? null })),

      totalVisits,
      totalSpent,
      avgSpendPerVisit: totalVisits > 0 ? Math.round((totalSpent / totalVisits) * 100) / 100 : 0,
      lastVisitAt: isoOrNull(profile?.lastVisitAt),
      firstVisitAt: isoOrNull(profile?.firstVisitAt),

      noShowCount,
      cancellationCount,
      referralsMade: profile?.referralsGiven.length ?? 0,

      preferredSpecialist,
      preferredServices,

      upcomingBookings: upcomingAppts.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        status: a.status,
        specialistId: a.specialistId,
        specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
        serviceName: a.services[0]?.service.name ?? '',
        locationName: a.location.name,
        totalPrice: a.totalPrice.toNumber(),
      })),
      recentVisits: recentAppts.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
        serviceName: a.services[0]?.service.name ?? '',
        totalPrice: a.totalPrice.toNumber(),
        totalDuration: a.totalDuration,
      })),
      latestNote: latestNote
        ? {
            id: latestNote.id,
            content: latestNote.content,
            noteType: latestNote.noteType,
            privacy: latestNote.privacy,
            specialistName: `${latestNote.specialist.user.firstName} ${latestNote.specialist.user.lastName}`,
            createdAt: latestNote.createdAt.toISOString(),
          }
        : null,
    };
  }

  // ── Booking history ──────────────────────────────────────────────────────

  async getClientBookings(
    clientId: string,
    query: GetClientBookingsQuery,
  ): Promise<ClientBookingHistoryResponse> {
    const { page, limit, status, from, to, specialistId } = query;

    const where: Prisma.AppointmentWhereInput = { clientId };
    if (status) where.status = status as Prisma.EnumAppointmentStatusFilter;
    if (specialistId) where.specialistId = specialistId;
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.startAt as Prisma.DateTimeFilter).lte = to;
    }

    const [appts, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          specialist: { include: { user: true } },
          location: true,
          services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      items: appts.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        status: a.status,
        specialistId: a.specialistId,
        specialistName: `${a.specialist.user.firstName} ${a.specialist.user.lastName}`,
        locationName: a.location.name,
        totalDuration: a.totalDuration,
        totalPrice: a.totalPrice.toNumber(),
        services: a.services.map((s) => ({
          id: s.serviceId,
          name: s.service.name,
          price: s.price.toNumber(),
          duration: s.duration,
        })),
      })),
      total,
      page,
      limit,
    };
  }

  // ── Treatment records ────────────────────────────────────────────────────

  async getClientTreatments(
    clientId: string,
    query: GetClientTreatmentsQuery,
  ): Promise<ClientTreatmentResponse> {
    const { page, limit } = query;

    const profile = await prisma.customerProfile.findUnique({ where: { userId: clientId } });
    if (!profile) return { items: [], total: 0, page, limit };

    const [records, total] = await Promise.all([
      prisma.procedureHistory.findMany({
        where: { profileId: profile.id },
        orderBy: { performedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          appointment: {
            include: { services: { include: { service: true }, orderBy: { sortOrder: 'asc' } } },
          },
        },
      }),
      prisma.procedureHistory.count({ where: { profileId: profile.id } }),
    ]);

    // fetch photos for these records (linked by profileId + serviceId)
    const serviceIds = records.map((r) => r.serviceId);
    const photos = serviceIds.length
      ? await prisma.beforeAfterPhoto.findMany({
          where: { profileId: profile.id, serviceId: { in: serviceIds } },
          orderBy: { takenAt: 'desc' },
        })
      : [];

    const photosByService = new Map<string, typeof photos>();
    for (const p of photos) {
      const key = p.serviceId ?? '';
      if (!photosByService.has(key)) photosByService.set(key, []);
      photosByService.get(key)!.push(p);
    }

    return {
      items: records.map((r) => ({
        id: r.id,
        performedAt: r.performedAt.toISOString(),
        serviceId: r.serviceId,
        serviceName: r.appointment.services.find((s) => s.serviceId === r.serviceId)?.service.name ?? '',
        specialistId: r.specialistId,
        specialistName: '',  // resolved below via separate query if needed
        results: r.results ?? null,
        sideEffects: r.sideEffects ?? null,
        clientFeedback: r.clientFeedback ?? null,
        followUpRequired: r.followUpRequired,
        followUpDate: isoOrNull(r.followUpDate),
        photos: (photosByService.get(r.serviceId) ?? []).map((p) => ({
          id: p.id,
          photoType: p.photoType,
          imageUrl: p.imageUrl,
          thumbnailUrl: p.thumbnailUrl ?? null,
          takenAt: p.takenAt.toISOString(),
        })),
      })),
      total,
      page,
      limit,
    };
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async getClientTransactions(
    clientId: string,
    query: GetClientTransactionsQuery,
  ): Promise<ClientTransactionResponse> {
    const { page, limit, from, to } = query;

    const where: Prisma.ClientBalanceTransactionWhereInput = { clientId };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = from;
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = to;
    }

    const [txs, total] = await Promise.all([
      prisma.clientBalanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.clientBalanceTransaction.count({ where }),
    ]);

    // aggregates for summary figures
    const [paidAgg, refundedAgg, unpaidAgg, profile] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { appointment: { clientId }, status: 'CAPTURED' },
      }),
      prisma.refund.aggregate({
        _sum: { amount: true },
        where: { payment: { appointment: { clientId } }, status: 'COMPLETED' },
      }),
      prisma.appointment.aggregate({
        _sum: { totalPrice: true },
        where: { clientId, paymentStatus: 'UNPAID', status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      prisma.customerProfile.findUnique({ where: { userId: clientId } }),
    ]);

    return {
      items: txs.map((t) => ({
        id: t.id,
        date: t.createdAt.toISOString(),
        amount: t.amount.toNumber(),
        type: t.type,
        description: t.note ?? t.type,
        status: 'COMPLETED',
        appointmentId: t.appointmentId ?? null,
      })),
      total,
      page,
      limit,
      totalPaid: paidAgg._sum?.amount?.toNumber() ?? 0,
      totalRefunded: refundedAgg._sum?.amount?.toNumber() ?? 0,
      outstandingBalance: unpaidAgg._sum?.totalPrice?.toNumber() ?? 0,
      prepaidBalance: profile?.prepaidBalance.toNumber() ?? 0,
    };
  }

  // ── Add note ──────────────────────────────────────────────────────────────

  /**
   * authorSpecialistId — the Specialist.id of the logged-in employee.
   * Callers must resolve User.id → Specialist.id before calling this method.
   */
  async addClientNote(
    clientId: string,
    authorSpecialistId: string,
    dto: CreateClientNoteDto,
  ): Promise<ClientNoteResponse> {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: clientId } });
    if (!profile) throw new Error('CLIENT_NOT_FOUND');

    const note = await prisma.specialistNote.create({
      data: {
        id: crypto.randomUUID(),
        specialistId: authorSpecialistId,
        profileId: profile.id,
        noteType: 'general',
        content: dto.content,
        privacy: 'SHARED',
      },
      include: { specialist: { include: { user: true } } },
    });

    return {
      id: note.id,
      content: note.content,
      noteType: note.noteType,
      privacy: note.privacy,
      authorId: note.specialist.userId,
      authorName: `${note.specialist.user.firstName} ${note.specialist.user.lastName}`,
      createdAt: note.createdAt.toISOString(),
    };
  }

  // ── Create treatment record ───────────────────────────────────────────────

  async createTreatmentRecord(
    clientId: string,
    dto: CreateTreatmentRecordDto,
  ): Promise<ClientTreatmentItem> {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: clientId } });
    if (!profile) throw new Error('CLIENT_NOT_FOUND');
    if (!dto.appointmentId) throw new Error('APPOINTMENT_ID_REQUIRED');

    const record = await prisma.procedureHistory.create({
      data: {
        id: crypto.randomUUID(),
        profileId: profile.id,
        appointmentId: dto.appointmentId,
        serviceId: dto.serviceId,
        specialistId: dto.specialistId,
        performedAt: dto.performedAt,
        results: dto.results,
        sideEffects: dto.sideEffects,
        clientFeedback: dto.clientFeedback,
        followUpRequired: dto.followUpRequired,
        followUpDate: dto.followUpDate,
      },
      include: {
        appointment: {
          include: {
            services: { include: { service: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    const spec = await prisma.specialist.findUnique({
      where: { id: dto.specialistId },
      include: { user: true },
    });

    return {
      id: record.id,
      performedAt: record.performedAt.toISOString(),
      serviceId: record.serviceId,
      serviceName: record.appointment.services.find((s) => s.serviceId === record.serviceId)?.service.name ?? '',
      specialistId: record.specialistId,
      specialistName: spec ? `${spec.user.firstName} ${spec.user.lastName}` : '',
      results: record.results ?? null,
      sideEffects: record.sideEffects ?? null,
      clientFeedback: record.clientFeedback ?? null,
      followUpRequired: record.followUpRequired,
      followUpDate: isoOrNull(record.followUpDate),
      photos: [],
    };
  }
}

export const clientProfileRepository = new ClientProfileRepository();
