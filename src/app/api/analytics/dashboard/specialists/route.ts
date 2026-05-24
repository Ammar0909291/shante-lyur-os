export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { deriveSpecialistType } from '@/app/api/specialists/_shared';
import { SALON_TIMEZONE, getTodayBounds, checkAuth } from '../_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// Minimum massage sessions per specialist per working day
const MASSAGE_DAILY_TARGET = 6;

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req.headers.get('x-user-id'), req.headers.get('x-user-role') ?? '');
  if (authErr) return authErr;

  try {
    const { todayStart, todayEnd } = getTodayBounds(SALON_TIMEZONE);

    const [allSpecialists, workingTodayRows] = await Promise.all([
      prisma.specialist.findMany({
        select: { id: true, status: true, specialization: true },
      }),
      prisma.appointment.groupBy({
        by: ['specialistId'],
        where: {
          startAt: { gte: todayStart, lt: todayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
        },
      }),
    ]);

    const total = allSpecialists.length;
    const active = allSpecialists.filter(s => s.status === 'ACTIVE').length;
    const massageSpecialists = allSpecialists.filter(
      s => deriveSpecialistType(s.specialization) === 'MASSAGE',
    );
    const massageSpecialistIds = massageSpecialists.map(s => s.id);

    const massageApts = massageSpecialistIds.length > 0
      ? await prisma.appointment.findMany({
          where: {
            specialistId: { in: massageSpecialistIds },
            startAt: { gte: todayStart, lt: todayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
          },
          select: { specialistId: true, totalDuration: true },
        })
      : [];

    // 90-minute session = 1.5 units; 60-minute session = 1.0 unit
    // General formula: totalDuration (minutes) / 60 = session units
    const workloadBySpecialist = new Map<string, number>();
    for (const apt of massageApts) {
      const prev = workloadBySpecialist.get(apt.specialistId) ?? 0;
      workloadBySpecialist.set(apt.specialistId, prev + apt.totalDuration / 60);
    }

    let meetingTarget = 0;
    let belowTarget = 0;
    // TODO: Requires schema addition (MassageWorkloadOverride table) to persist per-specialist admin bypasses
    const overridden = 0;

    for (const s of massageSpecialists) {
      const daily = workloadBySpecialist.get(s.id) ?? 0;
      if (daily >= MASSAGE_DAILY_TARGET) {
        meetingTarget++;
      } else {
        belowTarget++;
      }
    }

    return ok({
      total,
      active,
      byType: {
        cosmetology: total - massageSpecialists.length,
        massage: massageSpecialists.length,
      },
      workingToday: workingTodayRows.length,
      massageWorkload: {
        meetingTarget,
        belowTarget,
        overridden,
      },
    });
  } catch (e) {
    console.error('[analytics/specialists]', e);
    return apiError('INTERNAL_ERROR', 'Failed to fetch specialist analytics', 500);
  }
}
