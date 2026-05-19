import { PrismaClient, UserRole, UserStatus, ServiceCategory, DayOfWeek } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Service taxonomy ──────────────────────────────────────────────────────────
// Aligned with professional Russian cosmetology/massage salon procedure categories.
// Each service maps to one of the 8 ServiceCategory values defined in the schema.
const SERVICES: Array<{
  name: string;
  category: ServiceCategory;
  basePrice: number;
  baseDuration: number;
  description?: string;
  requiresConsultation?: boolean;
  sortOrder: number;
}> = [
  // ── FACIAL — уход за лицом ─────────────────────────────────────────────────
  { name: 'Базовый уход за лицом',          category: ServiceCategory.FACIAL,          basePrice: 3500,  baseDuration: 60,  description: 'Очищение, тонизирование и базовое увлажнение', sortOrder: 10 },
  { name: 'Глубокое очищение с пилингом',   category: ServiceCategory.FACIAL,          basePrice: 4500,  baseDuration: 75,  description: 'Механическая и химическая эксфолиация кожи',   sortOrder: 11 },
  { name: 'Интенсивный увлажняющий уход',   category: ServiceCategory.FACIAL,          basePrice: 4000,  baseDuration: 60,  description: 'Гиалуроновые маски и питательные сыворотки',   sortOrder: 12 },
  { name: 'Классический массаж лица',       category: ServiceCategory.FACIAL,          basePrice: 2500,  baseDuration: 45,  description: 'Расслабляющий массаж по классическим техникам', sortOrder: 13 },
  // ── COSMETOLOGY — аппаратная косметология ─────────────────────────────────
  { name: 'Ультразвуковая чистка лица',     category: ServiceCategory.COSMETOLOGY,     basePrice: 3500,  baseDuration: 60,  description: 'Ультразвуковое удаление загрязнений и комедонов', sortOrder: 20 },
  { name: 'RF-лифтинг лица',               category: ServiceCategory.COSMETOLOGY,     basePrice: 5500,  baseDuration: 45,  description: 'Радиоволновое укрепление и лифтинг кожи',       sortOrder: 21 },
  { name: 'Микротоковая терапия',           category: ServiceCategory.COSMETOLOGY,     basePrice: 3800,  baseDuration: 45,  description: 'Стимуляция мышц лица микротоками',             sortOrder: 22 },
  // ── MASSAGE — массаж тела ──────────────────────────────────────────────────
  { name: 'SPA-массаж всего тела',          category: ServiceCategory.MASSAGE,         basePrice: 7000,  baseDuration: 90,  description: 'Расслабляющий SPA-массаж с ароматическими маслами', sortOrder: 30 },
  { name: 'Классический массаж спины и шеи', category: ServiceCategory.MASSAGE,        basePrice: 3500,  baseDuration: 60,  description: 'Классический лечебный массаж спины и воротниковой зоны', sortOrder: 31 },
  { name: 'Антицеллюлитный массаж',         category: ServiceCategory.MASSAGE,         basePrice: 5500,  baseDuration: 90,  description: 'Интенсивный массаж проблемных зон тела',        sortOrder: 32 },
  { name: 'Лимфодренажный массаж тела',     category: ServiceCategory.MASSAGE,         basePrice: 6000,  baseDuration: 90,  description: 'Мягкий дренаж лимфатической системы',          sortOrder: 33 },
  // ── INJECTION — инъекционная косметология ─────────────────────────────────
  { name: 'Мезотерапия лица',              category: ServiceCategory.INJECTION,        basePrice: 8000,  baseDuration: 45,  description: 'Мезококтейли для глубокого питания и омоложения', requiresConsultation: true, sortOrder: 40 },
  { name: 'Ботулинотерапия',              category: ServiceCategory.INJECTION,         basePrice: 12000, baseDuration: 30,  description: 'Коррекция мимических морщин препаратами ботулотоксина', requiresConsultation: true, sortOrder: 41 },
  // ── LASER — лазерные процедуры ─────────────────────────────────────────────
  { name: 'Лазерная биоревитализация',     category: ServiceCategory.LASER,            basePrice: 9500,  baseDuration: 60,  description: 'Глубокое увлажнение и регенерация кожи лазером', requiresConsultation: true, sortOrder: 50 },
  // ── HAIR_REMOVAL — эпиляция ────────────────────────────────────────────────
  { name: 'Лазерная эпиляция (малая зона)', category: ServiceCategory.HAIR_REMOVAL,    basePrice: 2000,  baseDuration: 20,  description: 'Верхняя губа, подбородок, подмышки',            sortOrder: 60 },
  { name: 'Лазерная эпиляция (средняя зона)', category: ServiceCategory.HAIR_REMOVAL,  basePrice: 3500,  baseDuration: 30,  description: 'Зона бикини, голень, руки до локтя',            sortOrder: 61 },
  { name: 'Лазерная эпиляция ног (полностью)', category: ServiceCategory.HAIR_REMOVAL, basePrice: 6500,  baseDuration: 60,  description: 'Полная эпиляция ног от бедра до стопы',         sortOrder: 62 },
  // ── BODY_CONTOURING — коррекция фигуры ────────────────────────────────────
  { name: 'LPG-массаж тела',              category: ServiceCategory.BODY_CONTOURING,   basePrice: 4500,  baseDuration: 35,  description: 'Аппаратный эндермологический массаж тела',       sortOrder: 70 },
];

// ─── Specialist profiles ───────────────────────────────────────────────────────
const SPECIALISTS = [
  {
    firstName: 'Елена',     lastName: 'Иванова',
    email: 'elena.ivanova@shantelyur.ru',
    bio: 'Сертифицированный косметолог-эстетист, 8 лет опыта в эстетической косметологии и уходовых процедурах.',
    specialization: 'Косметолог-эстетист',
    experienceYears: 8,
    commissionRate: 0.35,
    color: '#6366f1',   // indigo
    sortOrder: 1,
    schedule: { days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY], start: '10:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' },
    serviceNames: ['Базовый уход за лицом', 'Глубокое очищение с пилингом', 'Интенсивный увлажняющий уход', 'Классический массаж лица', 'Ультразвуковая чистка лица'],
  },
  {
    firstName: 'Ольга',     lastName: 'Смирнова',
    email: 'olga.smirnova@shantelyur.ru',
    bio: 'Дипломированный массажист с 6-летним стажем. Специализируется на SPA-программах и лечебном массаже.',
    specialization: 'Массажист',
    experienceYears: 6,
    commissionRate: 0.35,
    color: '#22c55e',   // green
    sortOrder: 2,
    schedule: { days: [DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY], start: '10:00', end: '20:00', breakStart: '14:00', breakEnd: '15:00' },
    serviceNames: ['SPA-массаж всего тела', 'Классический массаж спины и шеи', 'Антицеллюлитный массаж', 'Лимфодренажный массаж тела'],
  },
  {
    firstName: 'Анна',      lastName: 'Козлова',
    email: 'anna.kozlova@shantelyur.ru',
    bio: 'Врач-косметолог, специализируется на инъекционной и аппаратной косметологии. Опыт 10 лет.',
    specialization: 'Врач-косметолог',
    experienceYears: 10,
    commissionRate: 0.40,
    color: '#f59e0b',   // amber
    sortOrder: 3,
    schedule: { days: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY], start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    serviceNames: ['RF-лифтинг лица', 'Микротоковая терапия', 'Мезотерапия лица', 'Ботулинотерапия', 'Лазерная биоревитализация'],
  },
  {
    firstName: 'Дарья',     lastName: 'Новикова',
    email: 'daria.novikova@shantelyur.ru',
    bio: 'Специалист по лазерной эпиляции и аппаратной коррекции тела. Сертифицирована по работе с диодными лазерами.',
    specialization: 'Специалист по эпиляции и коррекции тела',
    experienceYears: 5,
    commissionRate: 0.30,
    color: '#ec4899',   // pink
    sortOrder: 4,
    schedule: { days: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY], start: '10:00', end: '19:00', breakStart: '13:30', breakEnd: '14:30' },
    serviceNames: ['Лазерная эпиляция (малая зона)', 'Лазерная эпиляция (средняя зона)', 'Лазерная эпиляция ног (полностью)', 'LPG-массаж тела'],
  },
];

async function main() {
  console.log('🌱 Seeding Shante Lyur OS...');

  // ─── Auth users ─────────────────────────────────────────────────────────────
  const adminPassword      = await hash('admin123', 12);
  const specialistPassword = await hash('spec123', 12);
  const clientPassword     = await hash('client123', 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@shantelyur.ru',
      passwordHash: adminPassword,
      firstName: 'Аммар',
      lastName: 'Администратор',
      phone: '+7 (999) 000-00-01',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@example.com',
      passwordHash: clientPassword,
      firstName: 'Мария',
      lastName: 'Петрова',
      phone: '+7 (999) 000-00-03',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // ─── Location ────────────────────────────────────────────────────────────────
  const location = await prisma.location.create({
    data: {
      name: 'Shante Lyur — Центральный',
      address: 'ул. Пушкина, д. 10, офис 5',
      city: 'Москва',
      phone: '+7 (495) 123-45-67',
      email: 'info@shantelyur.ru',
      timezone: 'Europe/Moscow',
    },
  });

  // ─── Services ────────────────────────────────────────────────────────────────
  await prisma.service.createMany({ data: SERVICES });
  const allServices = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } });
  const serviceByName = new Map(allServices.map(s => [s.name, s]));

  // Location prices match base prices
  for (const svc of allServices) {
    await prisma.serviceLocationPrice.create({
      data: { serviceId: svc.id, locationId: location.id, price: svc.basePrice, duration: svc.baseDuration },
    });
  }

  // ─── Specialists + schedules ─────────────────────────────────────────────────
  for (let i = 0; i < SPECIALISTS.length; i++) {
    const spec = SPECIALISTS[i];

    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash: specialistPassword,
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: `+7 (999) 000-01-0${i + 1}`,
        role: UserRole.SPECIALIST,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });

    const specialist = await prisma.specialist.create({
      data: {
        userId: user.id,
        bio: spec.bio,
        specialization: spec.specialization,
        experienceYears: spec.experienceYears,
        commissionRate: spec.commissionRate,
        color: spec.color,
        sortOrder: spec.sortOrder,
      },
    });

    // Assign services
    for (const name of spec.serviceNames) {
      const svc = serviceByName.get(name);
      if (svc) {
        await prisma.specialistService.create({
          data: { specialistId: specialist.id, serviceId: svc.id },
        });
      }
    }

    // Working schedule
    for (const day of spec.schedule.days) {
      await prisma.workingSchedule.create({
        data: {
          specialistId: specialist.id,
          locationId: location.id,
          dayOfWeek: day,
          startTime:  spec.schedule.start,
          endTime:    spec.schedule.end,
          breakStart: spec.schedule.breakStart,
          breakEnd:   spec.schedule.breakEnd,
          validFrom:  new Date('2026-01-01'),
        },
      });
    }
  }

  // ─── Customer profile ────────────────────────────────────────────────────────
  const profile = await prisma.customerProfile.create({
    data: {
      userId: clientUser.id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'female',
      skinType: 'комбинированная',
      preferredLocationId: location.id,
      referralSource: 'instagram',
    },
  });

  await prisma.customerAllergy.create({
    data: { profileId: profile.id, allergen: 'Лидокаин', severity: 'moderate', reaction: 'Покраснение, зуд' },
  });

  await prisma.customerTag.create({
    data: { profileId: profile.id, tag: 'VIP', color: '#f59e0b' },
  });

  // ─── Promo code ──────────────────────────────────────────────────────────────
  await prisma.promoCode.create({
    data: {
      code: 'WELCOME2026',
      description: 'Скидка 15% на первое посещение',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxUses: 100,
      validFrom: new Date(),
      validUntil: new Date('2026-12-31'),
      createdBy: superAdmin.id,
    },
  });

  // ─── Daily metrics ───────────────────────────────────────────────────────────
  await prisma.dailyMetrics.create({
    data: { date: new Date(), totalAppointments: 0, totalRevenue: 0 },
  });

  const specialistCount = SPECIALISTS.length;
  const serviceCount = allServices.length;

  console.log('✅ Seed completed successfully!');
  console.log(`   Admin:       admin@shantelyur.ru / admin123`);
  console.log(`   Client:      client@example.com / client123`);
  console.log(`   Specialists: ${specialistCount} (${SPECIALISTS.map(s => s.firstName).join(', ')})`);
  console.log(`   Services:    ${serviceCount} across 7 categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
