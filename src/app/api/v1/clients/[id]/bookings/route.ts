export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { ClientIdParamSchema, GetClientBookingsSchema } from '@/modules/crm/domain/client.dto';
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

  const idParsed = ClientIdParamSchema.safeParse(params);
  if (!idParsed.success) return R.badRequest('Invalid client ID', idParsed.error.issues);

  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { raw[k] = v; });
  const qParsed = GetClientBookingsSchema.safeParse(raw);
  if (!qParsed.success) return R.badRequest('Invalid query parameters', qParsed.error.issues);

  const result = await clientProfileService.getBookings(idParsed.data.id, qParsed.data);
  return R.success(result);
}
