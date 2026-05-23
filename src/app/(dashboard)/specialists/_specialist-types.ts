// Shared types and helpers for the Specialists module

export type SpecialistType = 'MASSAGE_THERAPIST' | 'COSMETOLOGIST';
export type SpecialistStatus = 'ACTIVE' | 'INACTIVE' | 'ON_VACATION' | 'TERMINATED';

export type WorkDay =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'
  | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Specialist {
  id: string;
  status: SpecialistStatus;
  isActive: boolean;
  type?: SpecialistType;
  rating?: number;
  totalBookings?: number;
  revenue?: number;
  specializations: string[];
  bio?: string;
  experienceYears?: number;
  commissionRate?: number;
  color?: string;
  todayBookings?: number;
  user: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface ScheduleEntry {
  dayOfWeek: WorkDay;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  isActive: boolean;
}

export const ALL_DAYS: WorkDay[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

export const DAY_LABELS: Record<WorkDay, string> = {
  MONDAY: 'Понедельник', TUESDAY: 'Вторник', WEDNESDAY: 'Среда',
  THURSDAY: 'Четверг', FRIDAY: 'Пятница', SATURDAY: 'Суббота', SUNDAY: 'Воскресенье',
};

export const DAY_SHORT: Record<WorkDay, string> = {
  MONDAY: 'Пн', TUESDAY: 'Вт', WEDNESDAY: 'Ср',
  THURSDAY: 'Чт', FRIDAY: 'Пт', SATURDAY: 'Сб', SUNDAY: 'Вс',
};

export function getStatusLabel(status: SpecialistStatus): string {
  const m: Record<SpecialistStatus, string> = {
    ACTIVE: 'Активен', INACTIVE: 'Неактивен', ON_VACATION: 'В отпуске', TERMINATED: 'Уволен',
  };
  return m[status];
}

export function getStatusVariant(
  status: SpecialistStatus,
): 'success' | 'warning' | 'default' | 'error' {
  const m: Record<SpecialistStatus, 'success' | 'warning' | 'default' | 'error'> = {
    ACTIVE: 'success', INACTIVE: 'default', ON_VACATION: 'warning', TERMINATED: 'error',
  };
  return m[status];
}

export function getTypeLabel(type: SpecialistType): string {
  return type === 'MASSAGE_THERAPIST' ? 'Массажист' : 'Косметолог';
}

export const MASSAGE_SPECIALIZATIONS: string[] = [
  'Классический расслабляющий массаж', 'Тайский массаж', 'Спортивный массаж',
  'Лечебный массаж', 'Глубокотканный массаж', 'Ароматерапевтический массаж',
  'Горячий камень (стоун-терапия)', 'Антицеллюлитный массаж',
  'Лимфодренажный массаж', 'Нейромышечный массаж', 'СПА-массаж (4 руки)',
];

export const COSMETOLOGY_SPECIALIZATIONS: string[] = [
  'Гиалуроновый лифтинг', 'Биоревитализация', 'Мезотерапия',
  'Химический пилинг', 'Аппаратная косметология', 'Антивозрастной уход',
  'Глубокое увлажнение', 'RF-лифтинг', 'Лазерная эпиляция', 'Детокс-программа',
];

export const ALL_SPECIALIZATIONS: string[] = [
  ...MASSAGE_SPECIALIZATIONS,
  ...COSMETOLOGY_SPECIALIZATIONS,
];

export const MOCK_SPECIALISTS: Specialist[] = [
  {
    id: 's1', status: 'ACTIVE', isActive: true, type: 'MASSAGE_THERAPIST',
    rating: 4.9, totalBookings: 312, revenue: 154000000, todayBookings: 6,
    specializations: ['Тайский массаж', 'Ароматерапевтический массаж', 'Классический расслабляющий массаж'],
    bio: 'Сертифицированный массажист с 8-летним опытом. Специализируется на тайских техниках и ароматерапии. Прошла обучение в Бангкоке.',
    experienceYears: 8, commissionRate: 0.35,
    user: { name: 'Наталья Владимирова', email: 'n.vladimirova@shantelyur.ru', phone: '+7 916 111-22-33' },
  },
  {
    id: 's2', status: 'ACTIVE', isActive: true, type: 'MASSAGE_THERAPIST',
    rating: 4.8, totalBookings: 278, revenue: 126000000, todayBookings: 5,
    specializations: ['Спортивный массаж', 'Нейромышечный массаж', 'Глубокотканный массаж'],
    bio: 'Массажист-реабилитолог. Работает со спортсменами и людьми с хроническими болями. Диплом по спортивной медицине.',
    experienceYears: 6, commissionRate: 0.30,
    user: { name: 'Ольга Козлова', email: 'o.kozlova@shantelyur.ru', phone: '+7 903 222-33-44' },
  },
  {
    id: 's3', status: 'ACTIVE', isActive: true, type: 'MASSAGE_THERAPIST',
    rating: 4.7, totalBookings: 241, revenue: 118500000, todayBookings: 4,
    specializations: ['Горячий камень (стоун-терапия)', 'Антицеллюлитный массаж', 'СПА-массаж (4 руки)'],
    bio: 'Специалист по СПА-программам и стоун-терапии. Создаёт индивидуальные ритуалы расслабления для каждого клиента.',
    experienceYears: 5, commissionRate: 0.32,
    user: { name: 'Дарья Соколова', email: 'd.sokolova@shantelyur.ru', phone: '+7 925 333-44-55' },
  },
  {
    id: 's4', status: 'ACTIVE', isActive: true, type: 'COSMETOLOGIST',
    rating: 4.6, totalBookings: 189, revenue: 95000000, todayBookings: 3,
    specializations: ['Биоревитализация', 'Гиалуроновый лифтинг', 'Мезотерапия'],
    bio: 'Врач-косметолог, специалист по инъекционным методикам. Работает с гиалуроновой кислотой и мезотерапевтическими препаратами.',
    experienceYears: 4, commissionRate: 0.30,
    user: { name: 'Мария Волкова', email: 'm.volkova@shantelyur.ru', phone: '+7 916 444-55-66' },
  },
  {
    id: 's5', status: 'INACTIVE', isActive: false, type: 'MASSAGE_THERAPIST',
    rating: 4.5, totalBookings: 156, revenue: 72000000, todayBookings: 0,
    specializations: ['Лимфодренажный массаж', 'Классический расслабляющий массаж'],
    bio: 'Дипломированный массажист. Специализируется на лимфодренаже и расслабляющих техниках.',
    experienceYears: 7, commissionRate: 0.30,
    user: { name: 'Юлия Новикова', email: 'yu.novikova@shantelyur.ru', phone: '+7 903 555-66-77' },
  },
  {
    id: 's6', status: 'ACTIVE', isActive: true, type: 'COSMETOLOGIST',
    rating: 4.8, totalBookings: 203, revenue: 108000000, todayBookings: 7,
    specializations: ['Химический пилинг', 'Аппаратная косметология', 'Лазерная эпиляция'],
    bio: 'Косметолог с медицинским образованием. Специалист по аппаратным процедурам, сертифицирована по работе с лазерным оборудованием.',
    experienceYears: 5, commissionRate: 0.30,
    user: { name: 'Ирина Соколова', email: 'i.sokolova@shantelyur.ru', phone: '+7 925 666-77-88' },
  },
];

export const MOCK_SCHEDULES: Record<string, ScheduleEntry[]> = {
  s1: [
    { dayOfWeek: 'MONDAY',    startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'TUESDAY',   startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'THURSDAY',  startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'FRIDAY',    startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'SATURDAY',  startTime: '11:00', endTime: '17:00', isActive: true },
    { dayOfWeek: 'SUNDAY',    startTime: '10:00', endTime: '18:00', isActive: false },
  ],
  s2: [
    { dayOfWeek: 'MONDAY',    startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'TUESDAY',   startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'THURSDAY',  startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'FRIDAY',    startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'SATURDAY',  startTime: '10:00', endTime: '16:00', isActive: true },
    { dayOfWeek: 'SUNDAY',    startTime: '10:00', endTime: '16:00', isActive: false },
  ],
  default: [
    { dayOfWeek: 'MONDAY',    startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'TUESDAY',   startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'THURSDAY',  startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'FRIDAY',    startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00', isActive: true },
    { dayOfWeek: 'SATURDAY',  startTime: '11:00', endTime: '16:00', isActive: false },
    { dayOfWeek: 'SUNDAY',    startTime: '10:00', endTime: '16:00', isActive: false },
  ],
};
