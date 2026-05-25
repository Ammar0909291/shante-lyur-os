export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { prisma } from '@/infrastructure/config/prisma-client';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10);
}

function fmtTime(d: Date): string {
  return d.toTimeString().substring(0, 5);
}

function maskName(first: string, last: string): string {
  return `${first} ${last.charAt(0)}.`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  if (!userId || !role) return R.unauthorized();
  if (!ALLOWED_ROLES.includes(role)) return R.forbidden('Requires Manager role or above');

  const { id: specialistId } = params;
  const { searchParams } = new URL(req.url);

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const now = new Date();
  const dateFrom = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = toParam ? new Date(toParam + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const periodMonthStr = `${dateFrom.getFullYear()}-${String(dateFrom.getMonth() + 1).padStart(2, '0')}`;

  const specialist = await prisma.specialist.findUnique({
    where: { id: specialistId },
    select: {
      id: true,
      specialization: true,
      department: true,
      status: true,
      dailyTargetSessions: true,
      totalCommissionPending: true,
      totalCommissionApproved: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
  });
  if (!specialist) return R.notFound('Specialist not found');

  // ── Fetch all data in parallel ──────────────────────────────────────────────
  const [appointments, payrollEntries, attendanceRecords, leaveRequests] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        specialistId,
        startAt: { gte: dateFrom, lte: dateTo },
        status: { in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        startAt: true,
        totalPrice: true,
        totalDuration: true,
        status: true,
        client: { select: { id: true, firstName: true, lastName: true } },
        services: {
          select: {
            id: true,
            price: true,
            duration: true,
            service: { select: { name: true } },
          },
        },
        payrollEntries: {
          where: { specialistId, type: 'COMMISSION' },
          select: { id: true, amount: true, rate: true, entryStatus: true, isManuallyEdited: true, entryNotes: true },
          take: 1,
        },
      },
      orderBy: { startAt: 'desc' },
    }),

    prisma.payrollEntry.findMany({
      where: {
        specialistId,
        periodMonth: periodMonthStr,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        rate: true,
        appointmentId: true,
        description: true,
        entryStatus: true,
        isManuallyEdited: true,
        entryNotes: true,
        createdAt: true,
        appointment: {
          select: {
            id: true,
            startAt: true,
            totalPrice: true,
            client: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.attendanceRecord.findMany({
      where: {
        specialistId,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { date: true, status: true, completedApts: true },
      orderBy: { date: 'asc' },
    }),

    prisma.leaveRequest.findMany({
      where: {
        specialistId,
        date: { gte: dateFrom, lte: dateTo },
      },
      select: { id: true, date: true, reason: true, status: true, createdAt: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  // ── Section 1: Summary ───────────────────────────────────────────────────────
  const completedAppts = appointments.filter((a) => a.status === 'COMPLETED');
  const totalServices = completedAppts.length;
  const totalSalesValue = r2(completedAppts.reduce((s, a) => s + Number(a.totalPrice), 0));

  const commissionEntries = payrollEntries.filter((e) => e.type === 'COMMISSION');
  const totalCommissionEarned = r2(commissionEntries.reduce((s, e) => s + Number(e.amount), 0));

  const workedDaysSet = new Set(attendanceRecords.filter((a) => a.status === 'PRESENT').map((a) => toDateStr(a.date)));
  const appointmentDaysSet = new Set(completedAppts.map((a) => toDateStr(a.startAt)));
  const workingDays = Math.max(workedDaysSet.size, appointmentDaysSet.size);

  const summary: Record<string, unknown> = {
    totalServices,
    totalSalesValue,
    totalCommissionEarned,
    workingDays,
  };
  if (specialist.department === 'MASSAGE') {
    const dailyTarget = specialist.dailyTargetSessions ?? 6;
    summary.massageWorkloadPercent = workingDays > 0
      ? r2((totalServices / (workingDays * dailyTarget)) * 100)
      : 0;
  }

  // ── Section 2: Services performed ───────────────────────────────────────────
  let svcSaleTotal = 0;
  let svcCommTotal = 0;
  const services = completedAppts.map((a) => {
    const commEntry = a.payrollEntries[0] ?? null;
    const commPct = commEntry ? r2(Number(commEntry.rate ?? 0) * 100) : 0;
    const commAmt = commEntry ? r2(Number(commEntry.amount)) : 0;
    const svcName = a.services[0]?.service.name ?? '—';
    const saleAmt = r2(Number(a.totalPrice));
    svcSaleTotal += saleAmt;
    svcCommTotal += commAmt;

    // Determine client type (approximation: first-ever appointment = new)
    return {
      appointmentId: a.id,
      date: toDateStr(a.startAt),
      time: fmtTime(a.startAt),
      clientName: maskName(a.client.firstName, a.client.lastName),
      clientType: 'returning' as string,
      procedureName: svcName,
      duration: a.totalDuration,
      saleAmount: saleAmt,
      commissionPercent: commPct,
      commissionAmount: commAmt,
      status: commEntry?.entryStatus ?? 'pending',
      payrollEntryId: commEntry?.id ?? null,
    };
  });

  // Determine client types by checking prior appointments
  const clientIds = [...new Set(completedAppts.map((a) => a.client.id))];
  const priorCounts = await Promise.all(
    clientIds.map((cid) =>
      prisma.appointment.count({
        where: {
          clientId: cid,
          specialistId,
          startAt: { lt: dateFrom },
          status: 'COMPLETED',
        },
      }).then((cnt) => ({ cid, cnt }))
    )
  );
  const priorMap = new Map(priorCounts.map(({ cid, cnt }) => [cid, cnt]));
  const clientObjMap = new Map(completedAppts.map((a) => [a.id, a.client.id]));
  services.forEach((svc, i) => {
    const clientId = clientObjMap.get(completedAppts[i].id);
    if (clientId) {
      svc.clientType = (priorMap.get(clientId) ?? 0) === 0 ? 'new' : 'returning';
    }
  });

  // ── Section 3: Payroll detail ─────────────────────────────────────────────
  const commAndAdjEntries = payrollEntries.filter((e) =>
    ['COMMISSION', 'BONUS', 'DEDUCTION', 'ADJUSTMENT'].includes(e.type)
  );

  const payrollDetail = commAndAdjEntries.map((e) => ({
    entryId: e.id,
    date: toDateStr(e.createdAt),
    appointmentId: e.appointmentId ?? null,
    clientName: e.appointment ? maskName(e.appointment.client.firstName, e.appointment.client.lastName) : '—',
    clientType: 'returning',
    roleOnSale: 'specialist',
    saleTotal: e.appointment ? r2(Number(e.appointment.totalPrice)) : 0,
    commissionPercent: e.rate !== null ? r2(Number(e.rate) * 100) : null,
    commissionAmount: r2(Number(e.amount)),
    isManuallyEdited: e.isManuallyEdited,
    status: e.entryStatus,
    notes: e.entryNotes ?? null,
    type: e.type,
    description: e.description ?? null,
  }));

  const adjustments = payrollEntries
    .filter((e) => e.type === 'ADJUSTMENT')
    .map((e) => ({
      id: e.id,
      description: e.description ?? '',
      amount: r2(Number(e.amount)),
      createdAt: e.createdAt.toISOString(),
    }));

  const periodTotal = r2(
    payrollEntries
      .filter((e) => e.type !== 'BASE_SALARY')
      .reduce((s, e) => {
        const amt = Number(e.amount);
        return e.type === 'DEDUCTION' ? s - Math.abs(amt) : s + amt;
      }, 0)
  );

  // ── Section 4: Client activity ────────────────────────────────────────────
  const newClientCount = services.filter((s) => s.clientType === 'new').length;
  const returningClientCount = services.filter((s) => s.clientType === 'returning').length;

  const visitsByClient = new Map<string, { name: string; visits: number; totalSpent: number; lastDate: string }>();
  completedAppts.forEach((a) => {
    const cid = a.client.id;
    const prev = visitsByClient.get(cid);
    const dateStr = toDateStr(a.startAt);
    if (!prev) {
      visitsByClient.set(cid, {
        name: maskName(a.client.firstName, a.client.lastName),
        visits: 1,
        totalSpent: r2(Number(a.totalPrice)),
        lastDate: dateStr,
      });
    } else {
      prev.visits += 1;
      prev.totalSpent = r2(prev.totalSpent + Number(a.totalPrice));
      if (dateStr > prev.lastDate) prev.lastDate = dateStr;
    }
  });

  const uniqueClients = visitsByClient.size;
  const repeatClients = [...visitsByClient.values()].filter((c) => c.visits > 1).length;
  const repeatClientRate = uniqueClients > 0 ? r2((repeatClients / uniqueClients) * 100) : 0;

  const clientDetail = [...visitsByClient.entries()].map(([, c]) => ({
    clientName: c.name,
    clientType: 'returning',
    visitCount: c.visits,
    lastService: c.lastDate,
    totalSpent: c.totalSpent,
  }));

  // ── Section 5: Attendance ─────────────────────────────────────────────────
  // Build day list for the period
  const days: { date: string; status: string }[] = [];
  const cur = new Date(dateFrom);
  const attendanceMap = new Map(attendanceRecords.map((a) => [toDateStr(a.date), a.status]));
  while (cur <= dateTo) {
    const ds = toDateStr(cur);
    const attStatus = attendanceMap.get(ds);
    const hasAppts = appointmentDaysSet.has(ds);
    let dayStatus = 'absent';
    if (attStatus === 'PRESENT' || hasAppts) dayStatus = 'worked';
    else if (attStatus === 'HOLIDAY') dayStatus = 'day-off';
    else if (attStatus === 'SICK_LEAVE' || attStatus === 'HALF_DAY') dayStatus = 'leave';
    days.push({ date: ds, status: dayStatus });
    cur.setDate(cur.getDate() + 1);
  }

  return R.success({
    specialist: {
      id: specialist.id,
      name: `${specialist.user.firstName} ${specialist.user.lastName}`.trim(),
      department: specialist.department,
      specialization: specialist.specialization,
      status: specialist.status,
      avatarUrl: specialist.user.avatarUrl ?? null,
      totalCommissionPending: r2(Number(specialist.totalCommissionPending)),
      totalCommissionApproved: r2(Number(specialist.totalCommissionApproved)),
    },
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    summary,
    services: {
      items: services,
      total: { saleAmount: r2(svcSaleTotal), commissionAmount: r2(svcCommTotal) },
    },
    payroll: {
      entries: payrollDetail,
      adjustments,
      periodTotal,
    },
    clients: {
      newClients: newClientCount,
      returningClients: returningClientCount,
      subscriptionClients: 0,
      repeatClientRate,
      detail: clientDetail,
    },
    attendance: {
      days,
      workingDays,
      leaveRequests: leaveRequests.map((lr) => ({
        id: lr.id,
        startDate: toDateStr(lr.date),
        endDate: toDateStr(lr.date),
        reason: lr.reason ?? '',
        status: lr.status,
        submittedOn: toDateStr(lr.createdAt),
      })),
    },
  });
}
