export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { TEMPLATES } from '@/lib/communication/templates/definitions';

// GET /api/messaging/templates — list all built-in templates
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role ?? '')) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }

  // Sample variables for template preview — department-aware, no hardcoded service defaults
  const sampleVars = {
    clientName: 'Анна Смирнова',
    specialistName: 'Ирина Владимирова',
    serviceName: '{{название_услуги}}',
    department: '{{отдел}}',
    date: '1 июня',
    time: '14:00',
    room: 'Кабинет №2',
    salonName: process.env['SALON_NAME'] ?? 'Shante Lyur',
    amount: '3 500',
    currency: 'руб.',
  };

  const templates = Object.values(TEMPLATES).map((t) => ({
    key: t.key,
    name: t.nameRu,
    hasEnglish: Boolean(t.bodyEn),
    whatsappTemplateName: t.whatsappTemplateName ?? null,
    variables: ['clientName', 'specialistName', 'serviceName', 'date', 'time', 'room', 'salonName', 'department'],
    preview: {
      ru: t.bodyRu(sampleVars),
      en: t.bodyEn ? t.bodyEn(sampleVars) : null,
    },
  }));

  return ok({ templates, total: templates.length });
}
