export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import {
  ClientIdParamSchema,
  GetClientTreatmentsSchema,
  CreateTreatmentRecordSchema,
} from '@/modules/crm/domain/client.dto';
import { clientProfileService } from '@/modules/crm/application/client-profile.service';

const ALL_EMPLOYEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];
const WRITE_TREATMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

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
  const qParsed = GetClientTreatmentsSchema.safeParse(raw);
  if (!qParsed.success) return R.badRequest('Invalid query parameters', qParsed.error.issues);

  const result = await clientProfileService.getTreatments(idParsed.data.id, qParsed.data);
  return R.success(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!WRITE_TREATMENT_ROLES.includes(role)) return R.forbidden('Only managers and above can create treatment records');

  const idParsed = ClientIdParamSchema.safeParse(params);
  if (!idParsed.success) return R.badRequest('Invalid client ID', idParsed.error.issues);

  const body: unknown = await req.json();
  const bodyParsed = CreateTreatmentRecordSchema.safeParse(body);
  if (!bodyParsed.success) return R.badRequest('Invalid request body', bodyParsed.error.issues);

  try {
    const record = await clientProfileService.createTreatmentRecord(idParsed.data.id, bodyParsed.data);

    void logAudit({
      userId,
      role,
      action: 'CREATE',
      entityType: 'ProcedureHistory',
      entityId: record.id,
      newValues: { clientId: idParsed.data.id, serviceId: record.serviceId },
      ...getRequestMeta(req),
    });

    return R.created(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    if (msg === 'CLIENT_NOT_FOUND') return R.notFound('Client not found');
    if (msg === 'APPOINTMENT_ID_REQUIRED') return R.badRequest('appointmentId is required');
    return R.internalError(msg);
  }
}
