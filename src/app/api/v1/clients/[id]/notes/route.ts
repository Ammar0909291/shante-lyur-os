export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import * as R from '@/shared/api/response';
import { logAudit, getRequestMeta } from '@/lib/audit-logger';
import { ClientIdParamSchema, CreateClientNoteSchema } from '@/modules/crm/domain/client.dto';
import { clientProfileService } from '@/modules/crm/application/client-profile.service';

const ALL_EMPLOYEE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!userId || !role) return R.unauthorized();
  if (!ALL_EMPLOYEE_ROLES.includes(role)) return R.forbidden();

  const idParsed = ClientIdParamSchema.safeParse(params);
  if (!idParsed.success) return R.badRequest('Invalid client ID', idParsed.error.issues);

  const body: unknown = await req.json();
  const bodyParsed = CreateClientNoteSchema.safeParse(body);
  if (!bodyParsed.success) return R.badRequest('Invalid request body', bodyParsed.error.issues);

  try {
    const note = await clientProfileService.addNote(idParsed.data.id, userId, bodyParsed.data);

    void logAudit({
      userId,
      role,
      action: 'CREATE',
      entityType: 'SpecialistNote',
      entityId: note.id,
      newValues: { clientId: idParsed.data.id },
      ...getRequestMeta(req),
    });

    return R.created(note);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    if (msg === 'CLIENT_NOT_FOUND') return R.notFound('Client not found');
    if (msg === 'SPECIALIST_PROFILE_REQUIRED') {
      return R.forbidden('Only employees with a specialist profile can add notes');
    }
    return R.internalError(msg);
  }
}
