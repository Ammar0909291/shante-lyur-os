export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/config/prisma-client';
import { calculateCommission } from '@/lib/commission';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function err(code: string, msg: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message: msg } }, { status });
}
function r2(n: number) { return Math.round(n * 100) / 100; }

const NewClientSchema = z.object({
  firstName:          z.string().min(1).max(100),
  lastName:           z.string().min(1).max(100),
  phone:              z.string().min(5).max(30),
  whatsapp:           z.string().max(30).optional(),
  telegramHandle:     z.string().max(100).optional(),
  dateOfBirth:        z.string().optional(),
  languagePreference: z.enum(['ru', 'en']).default('ru'),
  referredBy:         z.string().max(500).optional(),
  sourceChannel:      z.enum(['WALK_IN','SOCIAL_MEDIA','REFERRAL','ONLINE_BOOKING','OTHER']).default('WALK_IN'),
});

const ServiceLineSchema = z.object({
  serviceId:               z.string().uuid(),
  performedBySpecialistId: z.string().uuid().optional(),
  quantity:                z.number().int().min(1).max(50),
  unitPrice:               z.number().min(0),
});

const EmployeeLineSchema = z.object({
  userId: z.string().uuid(),
  role:   z.enum(['SPECIALIST','MANAGER','OTHER']),
});

const SaleSchema = z.object({
  newClient:        NewClientSchema.optional(),
  existingClientId: z.string().uuid().optional(),
  tradeManagerId:   z.string().uuid(),
  employees:        z.array(EmployeeLineSchema).min(1),
  services:         z.array(ServiceLineSchema).min(1),
  startAt:          z.string(),
  locationId:       z.string().uuid().optional(),
  payment: z.object({
    amountCash:    z.number().min(0).default(0),
    amountCard:    z.number().min(0).default(0),
    amountLoan:    z.number().min(0).default(0),
    amountPackage: z.number().min(0).default(0),
  }),
  comments:     z.string().max(5000).optional(),
  internalNote: z.string().max(5000).optional(),
}).refine(
  (d) => d.newClient !== undefined || d.existingClientId !== undefined,
  { message: 'Either newClient or existingClientId is required' },
);

export async function POST(req: NextRequest) {
  const actorId = req.headers.get('x-user-id');
  if (!actorId) return err('UNAUTHORIZED', 'Authentication required', 401);

  let body: unknown;
  try { body = await req.json(); } catch { return err('VALIDATION_ERROR', 'Invalid JSON', 400); }

  const parsed = SaleSchema.safeParse(body);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', 400);
  }

  const d = parsed.data;

  // ── Payment validation ─────────────────────────────────────────────────────
  const saleTotal    = d.services.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
  const paymentTotal = d.payment.amountCash + d.payment.amountCard +
                       d.payment.amountLoan + d.payment.amountPackage;

  if (Math.abs(paymentTotal - saleTotal) > 0.01) {
    return err('PAYMENT_MISMATCH',
      `Сумма платежей (${paymentTotal}) не совпадает с итогом продажи (${saleTotal})`, 422);
  }

  // ── Resolve location ────────────────────────────────────────────────────────
  let locationId = d.locationId;
  if (!locationId) {
    const loc = await prisma.location.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!loc) return err('NOT_FOUND', 'No active location found', 404);
    locationId = loc.id;
  }

  // ── Resolve specialist records for ALL specialist-role employees ────────────
  const specialistEmployeeIds = d.employees
    .filter((e) => e.role === 'SPECIALIST')
    .map((e) => e.userId);

  if (specialistEmployeeIds.length === 0) {
    return err('VALIDATION_ERROR', 'At least one SPECIALIST employee is required', 422);
  }

  const specialistUsers = await prisma.user.findMany({
    where: { id: { in: specialistEmployeeIds } },
    select: { id: true, specialist: { select: { id: true } } },
  });

  // userId → specialist.id map
  const userToSpecialistId = new Map(
    specialistUsers
      .filter((u) => u.specialist)
      .map((u) => [u.id, u.specialist!.id]),
  );

  const primarySpecialistEntry = d.employees.find((e) => e.role === 'SPECIALIST')!;
  const primarySpecialistId    = userToSpecialistId.get(primarySpecialistEntry.userId);
  if (!primarySpecialistId) {
    return err('VALIDATION_ERROR', 'Primary specialist employee has no specialist record', 422);
  }

  // ── Resolve services ────────────────────────────────────────────────────────
  const serviceIds  = [...new Set(d.services.map((s) => s.serviceId))];
  const serviceRecs = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, baseDuration: true },
  });
  const svcMap = new Map(serviceRecs.map((s) => [s.id, s]));

  const totalDuration = d.services.reduce((sum, line) => {
    const svc = svcMap.get(line.serviceId);
    return sum + (svc?.baseDuration ?? 30) * line.quantity;
  }, 0);

  const startAt    = new Date(d.startAt);
  const endAt      = new Date(startAt.getTime() + totalDuration * 60_000);
  const periodMonth = startAt.toISOString().slice(0, 7);

  // ── Transaction ─────────────────────────────────────────────────────────────
  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1. Resolve or create client
      let clientId: string;

      if (d.newClient) {
        const nc = d.newClient;
        const existing = await tx.user.findFirst({
          where: { email: `${nc.phone.replace(/\D/g, '')}@noemail.shantelyur.ru` },
          select: { id: true },
        });
        if (existing) {
          clientId = existing.id;
        } else {
          const newUser = await tx.user.create({
            data: {
              email:         `${nc.phone.replace(/\D/g, '')}@noemail.shantelyur.ru`,
              passwordHash:  'CLIENT_NO_LOGIN',
              firstName:     nc.firstName,
              lastName:      nc.lastName,
              phone:         nc.phone,
              role:          'CLIENT',
              status:        'ACTIVE',
              emailVerified: false,
            },
          });
          clientId = newUser.id;

          await tx.customerProfile.create({
            data: {
              userId:        clientId,
              clientType:    'NEW',
              sourceChannel: nc.sourceChannel as 'WALK_IN'|'SOCIAL_MEDIA'|'REFERRAL'|'ONLINE_BOOKING'|'OTHER',
              referredBy:    nc.referredBy,
              firstVisitAt:  startAt,
              lastVisitAt:   startAt,
              totalVisits:   1,
            },
          });
        }
      } else {
        clientId = d.existingClientId!;
        await tx.customerProfile.updateMany({
          where: { userId: clientId },
          data:  { lastVisitAt: startAt, totalVisits: { increment: 1 } },
        });
      }

      // 2. Determine clientType for this sale
      const clientProfile = await tx.customerProfile.findUnique({
        where:  { userId: clientId },
        select: { clientType: true, prepaidBalance: true },
      });
      const clientTypeAtSale = clientProfile?.clientType ?? 'RETURNING';

      // 3. Create appointment — COMPLETED because this is a recorded sale
      const appointment = await tx.appointment.create({
        data: {
          clientId,
          specialistId:     primarySpecialistId,
          locationId,
          startAt,
          endAt,
          status:           'COMPLETED',
          totalPrice:       saleTotal,
          totalDuration,
          notes:            d.comments,
          internalNote:     d.internalNote,
          source:           'admin',
          soldByUserId:     actorId,
          tradeManagerId:   d.tradeManagerId,
          clientTypeAtSale: clientTypeAtSale as 'NEW'|'RETURNING'|'SUBSCRIPTION',
          amountCash:       d.payment.amountCash,
          amountCard:       d.payment.amountCard,
          amountLoan:       d.payment.amountLoan,
          amountPackage:    d.payment.amountPackage,
          paymentStatus:    paymentTotal >= saleTotal ? 'PAID' : 'PARTIAL_PAID',
          paidAmount:       paymentTotal,
        },
      });

      // 4. Create appointment service lines
      let sortIdx = 0;
      for (const line of d.services) {
        const svc = svcMap.get(line.serviceId);
        for (let i = 0; i < line.quantity; i++) {
          await tx.appointmentService.create({
            data: {
              appointmentId:           appointment.id,
              serviceId:               line.serviceId,
              price:                   line.unitPrice,
              duration:                svc?.baseDuration ?? 30,
              sortOrder:               sortIdx++,
              performedBySpecialistId: line.performedBySpecialistId ?? null,
            },
          });
        }
      }

      // 5. Create commission entries for every employee
      for (const emp of d.employees) {
        const commission = await calculateCommission(emp.userId, saleTotal, emp.role);

        const saleEmp = await tx.saleEmployee.create({
          data: {
            appointmentId: appointment.id,
            userId:        emp.userId,
            roleOnSale:    emp.role,
          },
        });

        // SaleCommissionEntry — used by payroll commission-summary
        await tx.saleCommissionEntry.create({
          data: {
            userId:           emp.userId,
            appointmentId:    appointment.id,
            saleEmployeeId:   saleEmp.id,
            saleDate:         startAt,
            roleOnSale:       emp.role,
            commissionType:   commission.commissionType,
            commissionBasis:  commission.commissionBasis,
            commissionAmount: commission.commissionAmount,
            status:           'PENDING',
          },
        });

        // PayrollEntry — used by payroll main page and specialist activity page
        if (emp.role === 'SPECIALIST') {
          const specId = userToSpecialistId.get(emp.userId);
          if (specId && commission.commissionAmount > 0) {
            await tx.payrollEntry.create({
              data: {
                specialistId:    specId,
                type:            'COMMISSION',
                amount:          r2(commission.commissionAmount),
                rate:            r2(commission.commissionBasis / 100),
                periodMonth,
                appointmentId:   appointment.id,
                description:     `Комиссия ${commission.commissionBasis}% с продажи ${saleTotal} ₽`,
                entryStatus:     'pending',
                isManuallyEdited: false,
                createdBy:       actorId,
              },
            });

            await tx.specialist.update({
              where: { id: specId },
              data:  { totalCommissionPending: { increment: r2(commission.commissionAmount) } },
            });
          }
        }
      }

      // 6. Deduct package balance if used
      if (d.payment.amountPackage > 0 && clientProfile) {
        await tx.customerProfile.updateMany({
          where: { userId: clientId },
          data:  { prepaidBalance: { decrement: d.payment.amountPackage } },
        });
      }

      return appointment;
    });

    return ok({ appointmentId: result.id, saleTotal, clientId: result.clientId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return err('INTERNAL_ERROR', msg, 500);
  }
}
