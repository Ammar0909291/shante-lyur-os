/**
 * Integration tests — Financial Operations module
 */
import { NextRequest } from 'next/server';

// ─── UUID constants ───────────────────────────────────────────────────────────
const UUID_APT  = '550e8400-e29b-41d4-a716-446655440010';
const UUID_PAY  = '550e8400-e29b-41d4-a716-446655440011';
const UUID_REF  = '550e8400-e29b-41d4-a716-446655440012';
const UUID_EXP  = '550e8400-e29b-41d4-a716-446655440013';
const UUID_USER = '550e8400-e29b-41d4-a716-446655440014';
const UUID_SPEC = '550e8400-e29b-41d4-a716-446655440015';
const UUID_SVC  = '550e8400-e29b-41d4-a716-446655440016';

// ─── Prisma mock (inline — must not reference outer variables) ────────────────
jest.mock('@/infrastructure/config/prisma-client', () => ({
  prisma: {
    payment: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      count:      jest.fn(),
      aggregate:  jest.fn(),
    },
    refund: {
      findMany:   jest.fn(),
      create:     jest.fn(),
      aggregate:  jest.fn(),
    },
    appointment: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    expense: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
    stockMovement: {
      findMany:   jest.fn(),
      aggregate:  jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// ─── Route imports (after mock) ───────────────────────────────────────────────
import { GET as listPayments, POST as createPayment } from '@/app/api/finance/payments/route';
import { GET as getPayment } from '@/app/api/finance/payments/[id]/route';
import { POST as createRefund } from '@/app/api/finance/payments/[id]/refund/route';
import { GET as getClosing } from '@/app/api/finance/closing/route';
import { GET as getReconciliation } from '@/app/api/finance/reconciliation/route';
import { GET as listExpenses, POST as createExpense } from '@/app/api/finance/expenses/route';
import { PATCH as patchExpense, DELETE as deleteExpense } from '@/app/api/finance/expenses/[id]/route';
import { GET as getReports } from '@/app/api/finance/reports/route';

// ─── Typed mock accessor ──────────────────────────────────────────────────────
import { prisma as _prisma } from '@/infrastructure/config/prisma-client';
type AnyFn = jest.Mock;
const p = _prisma as unknown as {
  payment:    { findMany: AnyFn; findUnique: AnyFn; create: AnyFn; update: AnyFn; count: AnyFn; aggregate: AnyFn };
  refund:     { findMany: AnyFn; create: AnyFn; aggregate: AnyFn };
  appointment:{ findMany: AnyFn; findUnique: AnyFn; update: AnyFn };
  expense:    { findMany: AnyFn; findUnique: AnyFn; create: AnyFn; update: AnyFn; delete: AnyFn };
  stockMovement: { findMany: AnyFn; aggregate: AnyFn };
  auditLog:   { create: AnyFn };
  $transaction: AnyFn;
};

// ─── Decimal mock ─────────────────────────────────────────────────────────────
function dec(n: number) {
  return { toNumber: () => n, valueOf: () => n, toString: () => String(n) };
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const PAYMENT = {
  id:              UUID_PAY,
  appointmentId:   UUID_APT,
  provider:        'CASH',
  amount:          dec(5000),
  currency:        'RUB',
  status:          'CAPTURED',
  isDeposit:       false,
  description:     null,
  paidAt:          new Date(),
  failedAt:        null,
  failureReason:   null,
  idempotencyKey:  null,
  commissionAmount: null,
  specialistCommission: null,
  createdAt:       new Date(),
  updatedAt:       new Date(),
};

const APT = {
  id:             UUID_APT,
  totalPrice:     dec(5000),
  paidAmount:     dec(0),
  discountAmount: null,
  paymentStatus:  'UNPAID',
  status:         'PENDING',
  checkedOutAt:   null,
  startAt:        new Date(),
  client:   { id: UUID_USER, firstName: 'Анна', lastName: 'Иванова', phone: null },
  specialist: { id: UUID_SPEC, commissionRate: dec(0.3), user: { firstName: 'Мария', lastName: 'Петрова' } },
  services: [{ service: { id: UUID_SVC, name: 'Массаж', category: 'MASSAGE', inventoryLinks: [] }, price: dec(5000) }],
};

const EXPENSE_RECORD = {
  id:          UUID_EXP,
  date:        new Date('2026-01-15'),
  category:    'RENT',
  amount:      dec(50000),
  description: 'Аренда за январь',
  supplier:    null,
  receiptRef:  null,
  createdBy:   UUID_USER,
  createdAt:   new Date(),
  updatedAt:   new Date(),
  creator:     { firstName: 'Иван', lastName: 'Админ' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function req(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-user-id': UUID_USER, 'x-user-role': 'ADMIN' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function idParam(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS — LIST
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/payments', () => {
  it('returns paginated payment list', async () => {
    const pmtWithRelations = {
      ...PAYMENT,
      appointment: {
        id: UUID_APT, status: 'PENDING', paymentStatus: 'UNPAID',
        totalPrice: dec(5000), paidAmount: dec(0), discountAmount: null,
        client: { firstName: 'Анна', lastName: 'Иванова' },
        specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
      },
      refunds: [],
    };
    p.payment.count.mockResolvedValue(1);
    p.payment.findMany.mockResolvedValue([pmtWithRelations]);

    const res = await listPayments(req('/api/finance/payments'));
    const json = await res.json() as { success: boolean; data: { payments: unknown[]; total: number } };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(1);
    expect(Array.isArray(json.data.payments)).toBe(true);
    expect(json.data.payments).toHaveLength(1);
  });

  it('returns 401 without auth headers', async () => {
    const r = new NextRequest('http://localhost/api/finance/payments');
    const res = await listPayments(r);
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS — CREATE
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/finance/payments', () => {
  function setupCreate(overrides = {}) {
    p.payment.findUnique.mockResolvedValue(null); // no idempotency match
    p.appointment.findUnique.mockResolvedValue({ ...APT, ...overrides });
    p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<void>) => {
      await fn(p);
    });
    p.payment.create.mockResolvedValue({
      id: UUID_PAY, amount: dec(5000), status: 'CAPTURED',
      provider: 'CASH', isDeposit: false, paidAt: new Date(), createdAt: new Date(),
    });
    p.appointment.update.mockResolvedValue({});
    p.auditLog.create.mockResolvedValue({});
  }

  it('creates payment and updates appointment to PAID', async () => {
    setupCreate();
    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 5000,
    }));
    const json = await res.json() as { success: boolean; data: { appointment: { paymentStatus: string; paidAmount: number } } };

    expect(res.status).toBe(201);
    expect(json.data.appointment.paymentStatus).toBe('PAID');
    expect(json.data.appointment.paidAmount).toBe(5000);
  });

  it('marks DEPOSIT_PAID when isDeposit=true and partial amount', async () => {
    setupCreate();
    p.payment.create.mockResolvedValue({
      id: UUID_PAY, amount: dec(2000), status: 'CAPTURED',
      provider: 'CASH', isDeposit: true, paidAt: new Date(), createdAt: new Date(),
    });

    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 2000, isDeposit: true,
    }));
    const json = await res.json() as { success: boolean; data: { appointment: { paymentStatus: string } } };

    expect(res.status).toBe(201);
    expect(json.data.appointment.paymentStatus).toBe('DEPOSIT_PAID');
  });

  it('marks PARTIAL_PAID when amount < total and not deposit', async () => {
    setupCreate();
    p.payment.create.mockResolvedValue({
      id: UUID_PAY, amount: dec(3000), status: 'CAPTURED',
      provider: 'CASH', isDeposit: false, paidAt: new Date(), createdAt: new Date(),
    });

    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 3000,
    }));
    const json = await res.json() as { success: boolean; data: { appointment: { paymentStatus: string } } };

    expect(res.status).toBe(201);
    expect(json.data.appointment.paymentStatus).toBe('PARTIAL_PAID');
  });

  it('rejects overpayment', async () => {
    p.payment.findUnique.mockResolvedValue(null);
    p.appointment.findUnique.mockResolvedValue(APT);

    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 9999,
    }));
    const json = await res.json() as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('OVERPAYMENT');
  });

  it('prevents duplicate via idempotency key', async () => {
    p.payment.findUnique.mockResolvedValue(PAYMENT);

    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 5000, idempotencyKey: 'dup-key-123',
    }));
    const json = await res.json() as { success: boolean; data: { duplicate: boolean } };

    expect(res.status).toBe(200);
    expect(json.data.duplicate).toBe(true);
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown appointment', async () => {
    p.payment.findUnique.mockResolvedValue(null);
    p.appointment.findUnique.mockResolvedValue(null);

    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 1000,
    }));
    expect(res.status).toBe(404);
  });

  it('rejects invalid provider', async () => {
    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'BITCOIN', amount: 1000,
    }));
    expect(res.status).toBe(400);
  });

  it('rejects zero amount', async () => {
    const res = await createPayment(req('/api/finance/payments', 'POST', {
      appointmentId: UUID_APT, provider: 'CASH', amount: 0,
    }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS — GET SINGLE
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/payments/[id]', () => {
  it('returns payment with details and netAmount', async () => {
    p.payment.findUnique.mockResolvedValue({
      ...PAYMENT,
      appointment: {
        id: UUID_APT, status: 'COMPLETED', paymentStatus: 'PAID',
        totalPrice: dec(5000), paidAmount: dec(5000), discountAmount: null, discountReason: null,
        startAt: new Date(),
        client: { id: UUID_USER, firstName: 'Анна', lastName: 'Иванова', phone: null },
        specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
        services: [{ service: { name: 'Массаж' }, price: dec(5000) }],
      },
      refunds: [],
    });

    const res = await getPayment(req(`/api/finance/payments/${UUID_PAY}`), idParam(UUID_PAY));
    const json = await res.json() as { success: boolean; data: { id: string; netAmount: number } };

    expect(res.status).toBe(200);
    expect(json.data.id).toBe(UUID_PAY);
    expect(json.data.netAmount).toBe(5000);
  });

  it('returns 404 for unknown payment', async () => {
    p.payment.findUnique.mockResolvedValue(null);
    const res = await getPayment(req(`/api/finance/payments/${UUID_PAY}`), idParam(UUID_PAY));
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REFUNDS
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/finance/payments/[id]/refund', () => {
  const pmtWithApt = {
    ...PAYMENT,
    amount: dec(5000),
    status: 'CAPTURED',
    refunds: [],
    appointment: {
      id: UUID_APT, totalPrice: dec(5000), paidAmount: dec(5000), discountAmount: null, paymentStatus: 'PAID',
    },
  };

  function setupRefund() {
    p.payment.findUnique.mockResolvedValue(pmtWithApt);
    p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<void>) => { await fn(p); });
    p.refund.create.mockResolvedValue({
      id: UUID_REF, amount: dec(5000), status: 'COMPLETED', reason: null, processedAt: new Date(), createdAt: new Date(),
    });
    p.payment.update.mockResolvedValue({});
    p.appointment.update.mockResolvedValue({});
    p.auditLog.create.mockResolvedValue({});
  }

  it('creates full refund → FULLY_REFUNDED + REFUNDED', async () => {
    setupRefund();

    const res = await createRefund(
      req(`/api/finance/payments/${UUID_PAY}/refund`, 'POST', { amount: 5000, reason: 'Отмена' }),
      idParam(UUID_PAY),
    );
    const json = await res.json() as {
      success: boolean;
      data: { payment: { status: string }; appointment: { paymentStatus: string; paidAmount: number } };
    };

    expect(res.status).toBe(201);
    expect(json.data.payment.status).toBe('FULLY_REFUNDED');
    expect(json.data.appointment.paymentStatus).toBe('REFUNDED');
    expect(json.data.appointment.paidAmount).toBe(0);
  });

  it('creates partial refund → PARTIALLY_REFUNDED + PARTIAL_PAID', async () => {
    p.payment.findUnique.mockResolvedValue(pmtWithApt);
    p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<void>) => { await fn(p); });
    p.refund.create.mockResolvedValue({
      id: UUID_REF, amount: dec(2000), status: 'COMPLETED', reason: null, processedAt: new Date(), createdAt: new Date(),
    });
    p.payment.update.mockResolvedValue({});
    p.appointment.update.mockResolvedValue({});
    p.auditLog.create.mockResolvedValue({});

    const res = await createRefund(
      req(`/api/finance/payments/${UUID_PAY}/refund`, 'POST', { amount: 2000 }),
      idParam(UUID_PAY),
    );
    const json = await res.json() as { data: { payment: { status: string }; appointment: { paymentStatus: string } } };

    expect(res.status).toBe(201);
    expect(json.data.payment.status).toBe('PARTIALLY_REFUNDED');
    expect(json.data.appointment.paymentStatus).toBe('PARTIAL_PAID');
  });

  it('prevents double refund', async () => {
    p.payment.findUnique.mockResolvedValue({
      ...pmtWithApt,
      refunds: [{ status: 'COMPLETED', amount: dec(5000) }],
    });

    const res = await createRefund(
      req(`/api/finance/payments/${UUID_PAY}/refund`, 'POST', { amount: 5000 }),
      idParam(UUID_PAY),
    );
    const json = await res.json() as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('ALREADY_REFUNDED');
    expect(p.$transaction).not.toHaveBeenCalled();
  });

  it('rejects refund exceeding payment amount', async () => {
    p.payment.findUnique.mockResolvedValue(pmtWithApt);

    const res = await createRefund(
      req(`/api/finance/payments/${UUID_PAY}/refund`, 'POST', { amount: 9999 }),
      idParam(UUID_PAY),
    );
    const json = await res.json() as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('REFUND_EXCEEDS_AMOUNT');
  });

  it('rejects refund on CANCELLED payment', async () => {
    p.payment.findUnique.mockResolvedValue({ ...pmtWithApt, status: 'CANCELLED', refunds: [] });

    const res = await createRefund(
      req(`/api/finance/payments/${UUID_PAY}/refund`, 'POST', { amount: 100 }),
      idParam(UUID_PAY),
    );
    const json = await res.json() as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_STATE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CLOSING REPORT
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/closing', () => {
  it('generates closing with revenue breakdown', async () => {
    const completedApt = {
      ...APT, status: 'COMPLETED', paymentStatus: 'PAID', checkedOutAt: new Date(), paidAmount: dec(5000), discountAmount: null,
    };

    p.payment.findMany.mockResolvedValue([
      { id: UUID_PAY, amount: dec(5000), provider: 'CASH', appointmentId: UUID_APT, isDeposit: false },
    ]);
    p.refund.findMany.mockResolvedValue([]);
    p.appointment.findMany
      .mockResolvedValueOnce([completedApt])
      .mockResolvedValueOnce([]);
    p.expense.findMany.mockResolvedValue([]);

    const res = await getClosing(req('/api/finance/closing?date=2026-01-15'));
    const json = await res.json() as {
      success: boolean;
      data: { revenue: { total: number; byCash: number }; netRevenue: number; completedBookings: number };
    };

    expect(res.status).toBe(200);
    expect(json.data.revenue.total).toBe(5000);
    expect(json.data.revenue.byCash).toBe(5000);
    expect(json.data.netRevenue).toBe(5000);
    expect(json.data.completedBookings).toBe(1);
  });

  it('shows zero outstanding when all paid', async () => {
    p.payment.findMany.mockResolvedValue([]);
    p.refund.findMany.mockResolvedValue([]);
    p.appointment.findMany.mockResolvedValue([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    p.expense.findMany.mockResolvedValue([]);

    const res = await getClosing(req('/api/finance/closing'));
    const json = await res.json() as { data: { outstanding: { total: number } } };

    expect(res.status).toBe(200);
    expect(json.data.outstanding.total).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/reconciliation', () => {
  it('detects gap when appointment unpaid', async () => {
    const completedApt = {
      id: UUID_APT, totalPrice: dec(5000), paidAmount: dec(0), discountAmount: null,
      paymentStatus: 'UNPAID', checkedOutAt: new Date(),
      client: { firstName: 'Анна', lastName: 'Иванова' },
      specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    };
    p.appointment.findMany.mockResolvedValue([completedApt]);
    p.payment.findMany.mockResolvedValue([]);
    p.refund.findMany.mockResolvedValue([]);

    const res = await getReconciliation(req('/api/finance/reconciliation'));
    const json = await res.json() as {
      data: { summary: { expectedRevenue: number; outstanding: number; reconciled: boolean }; outstandingItems: unknown[] };
    };

    expect(res.status).toBe(200);
    expect(json.data.summary.expectedRevenue).toBe(5000);
    expect(json.data.summary.outstanding).toBe(5000);
    expect(json.data.summary.reconciled).toBe(false);
    expect(json.data.outstandingItems).toHaveLength(1);
  });

  it('marks reconciled when all received', async () => {
    const completedApt = {
      id: UUID_APT, totalPrice: dec(5000), paidAmount: dec(5000), discountAmount: null,
      paymentStatus: 'PAID', checkedOutAt: new Date(),
      client: { firstName: 'Анна', lastName: 'Иванова' },
      specialist: { user: { firstName: 'Мария', lastName: 'Петрова' } },
    };
    p.appointment.findMany.mockResolvedValue([completedApt]);
    p.payment.findMany.mockResolvedValue([
      { id: UUID_PAY, amount: dec(5000), provider: 'CASH', appointmentId: UUID_APT, paidAt: new Date() },
    ]);
    p.refund.findMany.mockResolvedValue([]);

    const res = await getReconciliation(req('/api/finance/reconciliation'));
    const json = await res.json() as { data: { summary: { reconciled: boolean; outstanding: number } } };

    expect(res.status).toBe(200);
    expect(json.data.summary.reconciled).toBe(true);
    expect(json.data.summary.outstanding).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/expenses', () => {
  it('returns expenses with category totals', async () => {
    p.expense.findMany.mockResolvedValue([EXPENSE_RECORD]);

    const res = await listExpenses(req('/api/finance/expenses'));
    const json = await res.json() as {
      data: { expenses: unknown[]; total: number; byCategory: Record<string, number> };
    };

    expect(res.status).toBe(200);
    expect(json.data.expenses).toHaveLength(1);
    expect(json.data.total).toBe(50000);
    expect(json.data.byCategory['RENT']).toBe(50000);
  });
});

describe('POST /api/finance/expenses', () => {
  it('creates expense and writes audit log', async () => {
    p.expense.create.mockResolvedValue(EXPENSE_RECORD);
    p.auditLog.create.mockResolvedValue({});

    const res = await createExpense(req('/api/finance/expenses', 'POST', {
      date: '2026-01-15', category: 'RENT', amount: 50000, description: 'Аренда за январь',
    }));
    const json = await res.json() as { success: boolean; data: { id: string; category: string } };

    expect(res.status).toBe(201);
    expect(json.data.id).toBe(UUID_EXP);
    expect(json.data.category).toBe('RENT');
    expect(p.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects missing description', async () => {
    const res = await createExpense(req('/api/finance/expenses', 'POST', { date: '2026-01-15', category: 'RENT', amount: 100 }));
    expect(res.status).toBe(400);
  });

  it('rejects negative amount', async () => {
    const res = await createExpense(req('/api/finance/expenses', 'POST', {
      date: '2026-01-15', category: 'RENT', amount: -500, description: 'test',
    }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/finance/expenses/[id]', () => {
  it('updates expense amount', async () => {
    p.expense.findUnique.mockResolvedValue(EXPENSE_RECORD);
    p.expense.update.mockResolvedValue({ ...EXPENSE_RECORD, amount: dec(60000) });
    p.auditLog.create.mockResolvedValue({});

    const res = await patchExpense(
      req(`/api/finance/expenses/${UUID_EXP}`, 'PATCH', { amount: 60000 }),
      idParam(UUID_EXP),
    );
    const json = await res.json() as { data: { amount: number } };

    expect(res.status).toBe(200);
    expect(json.data.amount).toBe(60000);
  });

  it('returns 404 for unknown expense', async () => {
    p.expense.findUnique.mockResolvedValue(null);
    const res = await patchExpense(
      req(`/api/finance/expenses/${UUID_EXP}`, 'PATCH', { amount: 100 }),
      idParam(UUID_EXP),
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/finance/expenses/[id]', () => {
  it('deletes expense and logs audit', async () => {
    p.expense.findUnique.mockResolvedValue(EXPENSE_RECORD);
    p.expense.delete.mockResolvedValue(EXPENSE_RECORD);
    p.auditLog.create.mockResolvedValue({});

    const res = await deleteExpense(
      req(`/api/finance/expenses/${UUID_EXP}`, 'DELETE'),
      idParam(UUID_EXP),
    );
    const json = await res.json() as { data: { deleted: boolean } };

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(p.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for unknown expense', async () => {
    p.expense.findUnique.mockResolvedValue(null);
    const res = await deleteExpense(
      req(`/api/finance/expenses/${UUID_EXP}`, 'DELETE'),
      idParam(UUID_EXP),
    );
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/finance/reports', () => {
  it('generates P&L with revenue, expenses, net profit', async () => {
    const completedApt = {
      id: UUID_APT,
      totalPrice: dec(5000), paidAmount: dec(5000), discountAmount: dec(0), paymentStatus: 'PAID',
      checkedOutAt: new Date(),
      specialist: { id: UUID_SPEC, commissionRate: dec(0.3), user: { firstName: 'Мария', lastName: 'Петрова' } },
      services: [{ service: { id: UUID_SVC, name: 'Массаж', category: 'MASSAGE' }, price: dec(5000) }],
    };

    p.appointment.findMany
      .mockResolvedValueOnce([completedApt])
      .mockResolvedValueOnce([]);
    p.payment.findMany.mockResolvedValue([
      { id: UUID_PAY, amount: dec(5000), provider: 'CASH', isDeposit: false, paidAt: new Date(), appointmentId: UUID_APT },
    ]);
    p.refund.findMany.mockResolvedValue([]);
    p.expense.findMany.mockResolvedValue([
      { id: UUID_EXP, amount: dec(1000), category: 'OPERATIONAL', description: 'Прочее', date: new Date() },
    ]);
    p.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: dec(-5) } });
    p.stockMovement.findMany.mockResolvedValue([]);

    const res = await getReports(req('/api/finance/reports'));
    const json = await res.json() as {
      success: boolean;
      data: {
        summary: {
          totalRevenue: number; netRevenue: number;
          totalExpenses: number; netProfit: number; completedBookings: number;
        };
        specialists: { name: string }[];
        services:    { name: string }[];
      };
    };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.summary.totalRevenue).toBe(5000);
    expect(json.data.summary.netRevenue).toBe(5000);
    expect(json.data.summary.totalExpenses).toBe(1000);
    expect(json.data.summary.netProfit).toBe(4000);
    expect(json.data.summary.completedBookings).toBe(1);
    expect(json.data.specialists).toHaveLength(1);
    expect(json.data.services).toHaveLength(1);
  });
});
