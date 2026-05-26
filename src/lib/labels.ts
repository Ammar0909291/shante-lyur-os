const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    'Суперадмин',
  ADMIN:          'Администратор',
  MANAGER:        'Менеджер',
  RECEPTIONIST:   'Ресепционист',
  COSMETOLOGIST:  'Косметолог',
  MASSAGIST:      'Массажист',
  CLIENT:         'Клиент',
  SPECIALIST:     'Специалист',
  OTHER:          'Другой',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE:     'Массаж',
  RECEPTION:   'Ресепшн',
  MANAGEMENT:  'Менеджмент',
};

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  STANDARD_SALE:    'Стандартная',
  NEW_CLIENT:       'Новый клиент',
  RETURNING_CLIENT: 'Возврат клиента',
  UPSELL:           'Допродажа',
  REFERRAL:         'Реферал',
  TARGET_BONUS:     'За план',
  QUALITY_BONUS:    'За качество',
  CUSTOM:           'Особый',
  PERCENTAGE:       'Процент',
  FIXED:            'Фиксированная',
  BONUS:            'Бонус',
};

export function getUserRoleLabel(role: string): string {
  return USER_ROLE_LABELS[role] ?? role;
}

export function getDepartmentLabel(dept: string | null | undefined): string | null {
  if (!dept) return null;
  return DEPARTMENT_LABELS[dept] ?? dept;
}

export function getCommissionTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return COMMISSION_TYPE_LABELS[type] ?? type;
}
