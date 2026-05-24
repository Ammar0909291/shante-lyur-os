export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { TEMPLATES } from '@/lib/communication/templates/definitions';

// GET /api/messaging/templates — list all built-in templates
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(role ?? '')) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }

  const templates = Object.values(TEMPLATES).map((t) => ({
    key: t.key,
    name: t.nameRu,
    hasEnglish: Boolean(t.bodyEn),
    whatsappTemplateName: t.whatsappTemplateName ?? null,
    preview: { ru: t.bodyRu({ clientName: 'Анна', specialistName: 'Ирина', serviceName: 'Маникюр', date: '01.06', time: '14:00' }) },
  }));

  return ok({ templates, total: templates.length });
}
