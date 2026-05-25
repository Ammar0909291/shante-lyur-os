export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { SalesBreakdownQuerySchema } from '@/modules/sales/domain/sales.dto';
import { getSalesBreakdown, buildCsvFromBreakdown } from '@/modules/sales/application/sales.service';

const EXPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!EXPORT_ROLES.includes(role)) return R.forbidden('Export requires Manager role or above');

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = SalesBreakdownQuerySchema.safeParse({ ...raw, limit: raw.limit ?? '10000' });
  if (!parsed.success) return R.badRequest('Invalid query parameters', parsed.error.issues);

  const data = await getSalesBreakdown(parsed.data);
  const csv  = buildCsvFromBreakdown(data);

  const filename = `sales-breakdown-${parsed.data.from}-${parsed.data.to}.csv`;

  void logAudit({
    userId, role,
    action: 'EXPORT',
    entityType: 'SalesBreakdown',
    metadata: {
      event: 'SALES_BREAKDOWN_EXPORTED',
      from: parsed.data.from,
      to:   parsed.data.to,
      view: parsed.data.view,
      rows: data.total,
    },
    ...getRequestMeta(req),
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
