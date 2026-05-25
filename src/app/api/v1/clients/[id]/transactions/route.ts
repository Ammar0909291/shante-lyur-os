export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { ClientIdParamSchema, GetClientTransactionsSchema } from '@/modules/crm/domain/client.dto';
import { clientProfileService } from '@/modules/crm/application/client-profile.service';

const FINANCIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!FINANCIAL_ROLES.includes(role)) return R.forbidden('Financial data requires Manager role or above');

  const idParsed = ClientIdParamSchema.safeParse(params);
  if (!idParsed.success) return R.badRequest('Invalid client ID', idParsed.error.issues);

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });
  const qParsed = GetClientTransactionsSchema.safeParse(raw);
  if (!qParsed.success) return R.badRequest('Invalid query parameters', qParsed.error.issues);

  void logAudit({
    userId,
    role,
    action: 'EXPORT',
    entityType: 'CustomerProfile',
    entityId: idParsed.data.id,
    metadata: { event: 'CLIENT_FINANCIAL_ACCESSED' },
    ...getRequestMeta(req),
  });

  const result = await clientProfileService.getTransactions(idParsed.data.id, qParsed.data);
  return R.success(result);
}
