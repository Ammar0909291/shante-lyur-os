export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { SalesChartQuerySchema } from '@/modules/sales/domain/sales.dto';
import { getSalesChart } from '@/modules/sales/application/sales.service';

const SALES_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!SALES_ROLES.includes(role)) return R.forbidden('Sales access requires Manager role or above');

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });

  const parsed = SalesChartQuerySchema.safeParse(raw);
  if (!parsed.success) return R.badRequest('Invalid query parameters', parsed.error.issues);

  const data = await getSalesChart(parsed.data);
  return R.success(data);
}
