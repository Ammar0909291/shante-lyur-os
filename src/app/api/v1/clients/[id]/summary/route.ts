export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { ClientIdParamSchema } from '@/modules/crm/domain/client.dto';
import { clientProfileService } from '@/modules/crm/application/client-profile.service';

const ALL_EMPLOYEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!ALL_EMPLOYEE_ROLES.includes(role)) return R.forbidden();

  const parsed = ClientIdParamSchema.safeParse(params);
  if (!parsed.success) return R.badRequest('Invalid client ID', parsed.error.issues);

  const summary = await clientProfileService.getSummary(parsed.data.id);
  if (!summary) return R.notFound('Client not found');

  void logAudit({
    userId,
    role,
    action: 'EXPORT',
    entityType: 'CustomerProfile',
    entityId: parsed.data.id,
    metadata: { event: 'CLIENT_PROFILE_VIEWED' },
    ...getRequestMeta(req),
  });

  return R.success(summary);
}
