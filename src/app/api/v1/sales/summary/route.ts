export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { SalesQueryParamsSchema } from '@/modules/sales/domain/sales.dto';
import { getSalesSummary } from '@/modules/sales/application/sales.service';

const SALES_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!SALES_ROLES.includes(role)) return R.forbidden('Sales access requires Manager role or above');

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = SalesQueryParamsSchema.safeParse(raw);
  if (!parsed.success) return R.badRequest('Invalid query parameters', parsed.error.issues);

  const data = await getSalesSummary(parsed.data);

  void logAudit({
    userId, role,
    action: 'EXPORT',
    entityType: 'SalesPage',
    metadata: { event: 'SALES_SUMMARY_ACCESSED', from: parsed.data.from, to: parsed.data.to },
    ...getRequestMeta(req),
  });

  return R.success(data);
}
