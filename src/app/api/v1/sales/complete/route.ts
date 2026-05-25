export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { SaleCompleteBodySchema } from '@/modules/sales/domain/sales.dto';
import { completeSale } from '@/modules/sales/application/sales.service';
import { enqueueSaleNotification } from '@/shared/queue/enqueue';

const COMPLETE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!COMPLETE_ROLES.includes(role)) return R.forbidden('Sale completion requires Manager role or above');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return R.badRequest('Invalid JSON body');
  }

  const parsed = SaleCompleteBodySchema.safeParse(body);
  if (!parsed.success) return R.badRequest('Invalid request body', parsed.error.issues);

  const { bookingId, transactionId } = parsed.data;

  const event = await completeSale(bookingId, transactionId);

  if (!event) {
    return R.success({ alreadyProcessed: true }, 200);
  }

  await enqueueSaleNotification({
    bookingId:      event.bookingId,
    transactionId:  event.transactionId,
    clientName:     event.clientName,
    specialistName: event.specialistName,
    serviceNames:   event.serviceNames,
    amount:         event.amount,
    currency:       event.currency,
    paidAt:         event.paidAt,
    triggeredAt:    new Date().toISOString(),
  });

  void logAudit({
    userId, role,
    action: 'PAYMENT_PROCESSED',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: {
      event:         'SALE_MANUALLY_COMPLETED',
      transactionId,
      clientName:    event.clientName,
      amount:        event.amount,
      currency:      event.currency,
    },
    ...getRequestMeta(req),
  });

  return R.success(event, 200);
}
