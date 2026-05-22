export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import { checkAuth, apiError } from '@/app/api/analytics/dashboard/_utils';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function r2(n: number) { return Math.round(n * 100) / 100; }

interface Risk {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  code: string;
  message: string;
  detail: string;
  metric?: number;
  threshold?: number;
}

// ─── GET /api/executive/risks ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId  = req.headers.get('x-user-id');
  const role    = req.headers.get('x-user-role') ?? '';
  const authErr = checkAuth(userId, role);
  if (authErr) return authErr;

  const now   = new Date();
  const from7  = new Date(now.getTime() - 7 * 86_400_000);
  const from30 = new Date(now.getTime() - 30 * 86_400_000);
  const prev30 = new Date(from30.getTime() - 30 * 86_400_000);

  console.log('[executive/risks] computing');

  try {
    const [
      apts7, apts30, prevApts30,
      payments30, refunds30,
      expenses30,
      inventoryAlerts,
      specialists,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: { startAt: { gte: from7, lte: now } },
        select: { status: true, specialistId: true, clientId: true },
      }),
      prisma.appointment.findMany({
        where: { startAt: { gte: from30, lte: now } },
        select: { status: true, specialistId: true, clientId: true },
      }),
      prisma.appointment.findMany({
        where: { startAt: { gte: prev30, lt: from30 }, status: 'COMPLETED' },
        select: { clientId: true, totalPrice: true },
      }),
      prisma.payment.findMany({
        where: { status: 'CAPTURED', paidAt: { gte: from30, lte: now } },
        select: { amount: true },
      }),
      prisma.refund.findMany({
        where: { status: 'COMPLETED', processedAt: { gte: from30, lte: now } },
        select: { amount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from30, lte: now } },
        select: { amount: true },
      }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentStock: true, minStock: true, unit: true, expiresAt: true },
      }),
      prisma.specialist.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
          appointments: {
            where: { startAt: { gte: from7, lte: now } },
            select: { status: true, startAt: true },
          },
        },
      }),
    ]);

    const risks: Risk[] = [];
    let id = 0;
    const nextId = () => `risk-${++id}`;

    // ── 1. Cancellation spike (7-day) ──────────────────────────────────────────
    const total7   = apts7.length;
    const cancel7  = apts7.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length;
    const cancelR7 = total7 > 0 ? r2(cancel7 / total7 * 100) : 0;
    if (cancelR7 > 25) {
      risks.push({ id: nextId(), severity: 'HIGH', category: 'BOOKINGS', code: 'CANCELLATION_SPIKE',
        message: 'Резкий рост отмен за последние 7 дней',
        detail: `${cancel7} отмен из ${total7} записей (${cancelR7}%). Порог: 25%`,
        metric: cancelR7, threshold: 25 });
    } else if (cancelR7 > 15) {
      risks.push({ id: nextId(), severity: 'MEDIUM', category: 'BOOKINGS', code: 'CANCELLATION_ELEVATED',
        message: 'Повышенный уровень отмен',
        detail: `${cancel7} отмен из ${total7} записей (${cancelR7}%)`,
        metric: cancelR7, threshold: 15 });
    }

    // ── 2. Revenue drop (30-day vs prior 30) ──────────────────────────────────
    const rev30      = payments30.reduce((s, p) => s + Number(p.amount), 0);
    const prevRev30  = prevApts30.reduce((s, a) => s + Number(a.totalPrice), 0);
    const revChange  = prevRev30 > 0 ? r2((rev30 - prevRev30) / prevRev30 * 100) : 0;
    if (revChange < -20) {
      risks.push({ id: nextId(), severity: 'HIGH', category: 'REVENUE', code: 'REVENUE_DROP',
        message: 'Значительное падение выручки',
        detail: `Выручка упала на ${Math.abs(revChange)}% по сравнению с прошлым периодом`,
        metric: revChange, threshold: -20 });
    } else if (revChange < -10) {
      risks.push({ id: nextId(), severity: 'MEDIUM', category: 'REVENUE', code: 'REVENUE_DECLINING',
        message: 'Снижение выручки',
        detail: `Выручка снизилась на ${Math.abs(revChange)}% по сравнению с прошлым периодом`,
        metric: revChange, threshold: -10 });
    }

    // ── 3. Excessive refunds ───────────────────────────────────────────────────
    const totalRefunds = refunds30.reduce((s, r) => s + Number(r.amount), 0);
    const refundPct    = rev30 > 0 ? r2(totalRefunds / rev30 * 100) : 0;
    if (refundPct > 10) {
      risks.push({ id: nextId(), severity: 'HIGH', category: 'FINANCE', code: 'EXCESSIVE_REFUNDS',
        message: 'Высокий уровень возвратов',
        detail: `Возвраты составляют ${refundPct}% выручки за 30 дней`,
        metric: refundPct, threshold: 10 });
    } else if (refundPct > 5) {
      risks.push({ id: nextId(), severity: 'MEDIUM', category: 'FINANCE', code: 'ELEVATED_REFUNDS',
        message: 'Повышенный уровень возвратов',
        detail: `Возвраты составляют ${refundPct}% выручки`,
        metric: refundPct, threshold: 5 });
    }

    // ── 4. Low occupancy (30-day) ──────────────────────────────────────────────
    const completed30 = apts30.filter(a => a.status === 'COMPLETED').length;
    const occupancy30 = apts30.length > 0 ? r2(completed30 / apts30.length * 100) : 0;
    if (occupancy30 < 40 && apts30.length > 0) {
      risks.push({ id: nextId(), severity: 'HIGH', category: 'OCCUPANCY', code: 'LOW_OCCUPANCY',
        message: 'Критически низкая загруженность',
        detail: `Коэффициент завершения: ${occupancy30}%. Порог: 40%`,
        metric: occupancy30, threshold: 40 });
    } else if (occupancy30 < 60 && apts30.length > 0) {
      risks.push({ id: nextId(), severity: 'MEDIUM', category: 'OCCUPANCY', code: 'OCCUPANCY_WARNING',
        message: 'Пониженная загруженность',
        detail: `Коэффициент завершения: ${occupancy30}%`,
        metric: occupancy30, threshold: 60 });
    }

    // ── 5. Retention risk ─────────────────────────────────────────────────────
    const clients30     = new Set(apts30.filter(a => a.status === 'COMPLETED').map(a => a.clientId));
    const prevClients30 = new Set(prevApts30.map(a => a.clientId));
    const atRisk        = [...prevClients30].filter(id => !clients30.has(id)).length;
    if (atRisk > 10) {
      risks.push({ id: nextId(), severity: 'MEDIUM', category: 'RETENTION', code: 'RETENTION_RISK',
        message: 'Высокий отток клиентов',
        detail: `${atRisk} клиентов из прошлого периода не вернулись`,
        metric: atRisk });
    } else if (atRisk > 5) {
      risks.push({ id: nextId(), severity: 'LOW', category: 'RETENTION', code: 'CHURN_DETECTED',
        message: 'Признаки оттока клиентов',
        detail: `${atRisk} клиентов не вернулись за последние 30 дней`,
        metric: atRisk });
    }

    // ── 6. Specialist overload (7-day) ────────────────────────────────────────
    for (const spec of specialists) {
      const specApts    = spec.appointments;
      const specByDay   = new Map<string, number>();
      for (const a of specApts) {
        const d = a.startAt.toISOString().split('T')[0];
        specByDay.set(d, (specByDay.get(d) ?? 0) + 1);
      }
      const maxPerDay = specByDay.size > 0 ? Math.max(...specByDay.values()) : 0;
      if (maxPerDay >= 10) {
        risks.push({ id: nextId(), severity: 'HIGH', category: 'SPECIALISTS', code: 'SPECIALIST_OVERLOAD',
          message: `Перегрузка специалиста: ${spec.user.firstName} ${spec.user.lastName}`,
          detail: `Максимум ${maxPerDay} записей за один день`,
          metric: maxPerDay, threshold: 10 });
      } else if (maxPerDay >= 7) {
        risks.push({ id: nextId(), severity: 'MEDIUM', category: 'SPECIALISTS', code: 'SPECIALIST_HIGH_LOAD',
          message: `Высокая нагрузка: ${spec.user.firstName} ${spec.user.lastName}`,
          detail: `Максимум ${maxPerDay} записей за один день`,
          metric: maxPerDay, threshold: 7 });
      }
    }

    // ── 7. Inventory alerts ────────────────────────────────────────────────────
    const now0 = new Date();
    for (const item of inventoryAlerts) {
      const stock = Number(item.currentStock);
      const min   = Number(item.minStock);
      if (stock <= 0) {
        risks.push({ id: nextId(), severity: 'HIGH', category: 'INVENTORY', code: 'OUT_OF_STOCK',
          message: `Нет в наличии: ${item.name}`,
          detail: `Остаток 0 ${item.unit}. Требуется срочное пополнение`,
          metric: 0 });
      } else if (stock <= min) {
        risks.push({ id: nextId(), severity: 'MEDIUM', category: 'INVENTORY', code: 'LOW_STOCK',
          message: `Низкий запас: ${item.name}`,
          detail: `Остаток ${stock} ${item.unit}, минимум ${min} ${item.unit}`,
          metric: stock, threshold: min });
      }
      // Expiry check
      if (item.expiresAt && item.expiresAt <= new Date(now0.getTime() + 14 * 86_400_000)) {
        risks.push({ id: nextId(), severity: 'HIGH', category: 'INVENTORY', code: 'EXPIRING_SOON',
          message: `Истекает срок годности: ${item.name}`,
          detail: `Срок годности: ${item.expiresAt.toISOString().split('T')[0]}`,
        });
      }
    }

    // ── 8. Negative profitability ─────────────────────────────────────────────
    const totalExpenses = expenses30.reduce((s, e) => s + Number(e.amount), 0);
    if (rev30 > 0 && totalExpenses > rev30) {
      risks.push({ id: nextId(), severity: 'HIGH', category: 'FINANCE', code: 'NEGATIVE_MARGIN',
        message: 'Расходы превышают выручку',
        detail: `Выручка: ${r2(rev30)}, расходы: ${r2(totalExpenses)}`,
        metric: r2(totalExpenses - rev30) });
    }

    // ── Sort: HIGH first ───────────────────────────────────────────────────────
    const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    risks.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

    const summary = {
      total:  risks.length,
      high:   risks.filter(r => r.severity === 'HIGH').length,
      medium: risks.filter(r => r.severity === 'MEDIUM').length,
      low:    risks.filter(r => r.severity === 'LOW').length,
    };

    console.log('[executive/risks] done', summary);

    return ok({
      generatedAt: now.toISOString(),
      summary,
      risks,
      context: {
        cancelRate7d:   cancelR7,
        occupancy30d:   occupancy30,
        refundRate30d:  refundPct,
        revenueTrend:   revChange,
        atRiskClients:  atRisk,
        inventoryAlerts: inventoryAlerts.length,
      },
    });
  } catch (err) {
    console.error('[executive/risks] error', err);
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Risk analysis failed', 500);
  }
}
