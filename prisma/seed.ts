import {
  PrismaClient, UserRole, UserStatus,
  ServiceCategory, SpecialistType, SpecialistStatus,
  DayOfWeek, AppointmentStatus, PaymentProvider, PaymentStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }
function rng(seed: number, max: number) { return ((seed * 1664525 + 1013904223) >>> 0) % max; }

function russianPhone(i: number): string {
  const area = 900 + (i % 100);
  const n1 = String(100 + (i % 900)).padStart(3, '0');
  const n2 = String(10 + (i % 90)).padStart(2, '0');
  const n3 = String(10 + ((i * 7) % 90)).padStart(2, '0');
  return `+7 (${area}) ${n1}-${n2}-${n3}`;
}

function pastDate(daysAgo: number, hourOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(10 + hourOffset, 0, 0, 0);
  return d;
}

// ─── Name data ────────────────────────────────────────────────────────────────

const FIRST_NAMES_F = [
  'Анна','Мария','Светлана','Ирина','Наталья','Елена','Татьяна','Ольга',
  'Людмила','Александра','Юлия','Екатерина','Виктория','Анастасия','Галина',
  'Валентина','Надежда','Тамара','Лариса','Вера','Алина','Карина','Оксана',
  'Дарья','Полина','Кристина','Ксения','Вероника','Диана','Маргарита',
  'Любовь','Жанна','Регина','Инна','Нелли','Лидия','Зинаида','Алёна',
  'Нина','Валерия','Яна','Евгения','Наталия','Снежана','Камила',
  'Диляра','Гузель','Лилия','Тамила','Эльвира',
];

const LAST_NAMES_F = [
  'Иванова','Петрова','Сидорова','Козлова','Новикова','Морозова','Соколова',
  'Волкова','Лебедева','Семёнова','Егорова','Павлова','Попова','Фёдорова',
  'Михайлова','Алексеева','Ильина','Захарова','Зайцева','Соловьёва',
  'Кузнецова','Никитина','Степанова','Орлова','Белова','Комарова','Громова',
  'Смирнова','Жукова','Борисова','Климова','Антонова','Гусева','Романова',
  'Дмитриева','Кириллова','Андреева','Макарова','Назарова','Тихонова',
  'Виноградова','Воробьёва','Кирова','Савельева','Ефимова','Беляева',
  'Осипова','Зимина','Русакова','Чернова',
];

// ─── Seed data ────────────────────────────────────────────────────────────────

const STAFF_SPECS = [
  // Massagists
  { firstName: 'Елена',     lastName: 'Иванова',     email: 'elena.ivanova@shantelyur.ru',     type: SpecialistType.MASSAGE_THERAPIST, spec: 'Классический, Тайский, SPA', color: '#6366f1', exp: 8 },
  { firstName: 'Людмила',   lastName: 'Морозова',    email: 'ludmila.morozova@shantelyur.ru',   type: SpecialistType.MASSAGE_THERAPIST, spec: 'Антицеллюлитный, Спортивный', color: '#8b5cf6', exp: 6 },
  { firstName: 'Анастасия', lastName: 'Соколова',    email: 'anastasia.sokolova@shantelyur.ru', type: SpecialistType.MASSAGE_THERAPIST, spec: 'Горячий камень, Ароматерапия', color: '#06b6d4', exp: 5 },
  // Cosmetologists
  { firstName: 'Мария',     lastName: 'Петрова',     email: 'maria.petrova@shantelyur.ru',      type: SpecialistType.COSMETOLOGIST,    spec: 'Биоревитализация, Ботокс, RF-лифтинг', color: '#f59e0b', exp: 10 },
  { firstName: 'Дарья',     lastName: 'Смирнова',    email: 'darya.smirnova@shantelyur.ru',     type: SpecialistType.COSMETOLOGIST,    spec: 'Контурная пластика, PRP, Пилинги', color: '#10b981', exp: 7 },
  { firstName: 'Татьяна',   lastName: 'Новикова',    email: 'tatyana.novikova@shantelyur.ru',   type: SpecialistType.COSMETOLOGIST,    spec: 'Мезотерапия, Микронидлинг, RF', color: '#ec4899', exp: 9 },
];

const MASSAGE_SERVICES = [
  { name: 'Классический расслабляющий массаж', basePrice: 3500, baseDuration: 60,  desc: 'Глубокое расслабление мышц, снятие стресса и напряжения', sort: 1 },
  { name: 'Тайский массаж',                   basePrice: 7500, baseDuration: 90,  desc: 'Традиционные тайские техники растяжки и точечного воздействия', sort: 2 },
  { name: 'Спортивный массаж',                basePrice: 5500, baseDuration: 60,  desc: 'Восстановление мышц после физических нагрузок', sort: 3 },
  { name: 'Антицеллюлитный массаж',           basePrice: 4000, baseDuration: 45,  desc: 'Коррекция фигуры, улучшение лимфодренажа и тонуса', sort: 4 },
  { name: 'Ароматерапевтический массаж',      basePrice: 6000, baseDuration: 60,  desc: 'Эфирные масла премиум-класса, полное расслабление', sort: 5 },
  { name: 'Горячий камень (стоун-массаж)',    basePrice: 9500, baseDuration: 90,  desc: 'Вулканические базальтовые камни, глубокое прогревание мышц', sort: 6 },
  { name: 'Нейромышечный массаж',             basePrice: 7000, baseDuration: 75,  desc: 'Работа с триггерными точками, снятие хронических болей', sort: 7 },
  { name: 'Глубокотканный массаж',            basePrice: 8500, baseDuration: 90,  desc: 'Воздействие на глубокие мышечные слои, коррекция осанки', sort: 8 },
  { name: 'SPA-ритуал «Шанте Люр»',          basePrice: 12000, baseDuration: 120, desc: 'Фирменный SPA-ритуал: массаж + пилинг + обёртывание', sort: 9 },
  { name: 'Лимфодренажный массаж',            basePrice: 6500, baseDuration: 60,  desc: 'Снятие отёков, детокс, ускорение метаболизма', sort: 10 },
];

const COSMO_SERVICES = [
  { name: 'Биоревитализация',          basePrice: 18000, baseDuration: 60,  desc: 'Гиалуроновые инъекции для глубокого увлажнения и молодости кожи', sort: 11 },
  { name: 'Ботокс / Диспорт',          basePrice: 20000, baseDuration: 45,  desc: 'Коррекция мимических морщин, профилактика возрастных изменений', sort: 12 },
  { name: 'RF-лифтинг',                basePrice: 10000, baseDuration: 60,  desc: 'Радиоволновое омоложение без инъекций, подтяжка кожи', sort: 13 },
  { name: 'Контурная пластика',        basePrice: 25000, baseDuration: 60,  desc: 'Филлеры на основе гиалуроновой кислоты, коррекция овала лица', sort: 14 },
  { name: 'Мезотерапия',               basePrice: 15000, baseDuration: 45,  desc: 'Витаминные коктейли для восстановления кожи', sort: 15 },
  { name: 'PRP-терапия',               basePrice: 22000, baseDuration: 60,  desc: 'Плазмолифтинг собственной обогащённой плазмой', sort: 16 },
  { name: 'Химический пилинг',         basePrice: 8000,  baseDuration: 45,  desc: 'Обновление кожи, выравнивание тона и текстуры', sort: 17 },
  { name: 'Микронидлинг',              basePrice: 12000, baseDuration: 60,  desc: 'Стимуляция выработки коллагена, лечение рубцов', sort: 18 },
  { name: 'Гиалуроновый лифтинг',      basePrice: 14000, baseDuration: 60,  desc: 'Нитевой лифтинг без хирургического вмешательства', sort: 19 },
  { name: 'Антивозрастной уход VIP',   basePrice: 35000, baseDuration: 120, desc: 'Комплексная программа омоложения премиум-класса', sort: 20 },
];

const SKIN_TYPES = ['нормальная', 'сухая', 'жирная', 'комбинированная', 'чувствительная'];
const REFERRAL_SOURCES = ['instagram', 'vk', 'яндекс', 'рекомендация', 'флаер', 'google', '2gis'];
const GENDERS = ['female', 'female', 'female', 'male']; // mostly female for beauty salon

async function main() {
  console.log('🌱 Seeding Shante Lyur OS — full operational dataset...');

  // ─── Admin password ────────────────────────────────────────────────────────
  const adminPwd   = await hash('admin123',  12);
  const staffPwd   = await hash('staff123',  12);
  const clientPwd  = await hash('client123', 12);

  // ─── Super Admin ───────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@shantelyur.ru' },
    update: {},
    create: {
      email: 'admin@shantelyur.ru',
      passwordHash: adminPwd,
      firstName: 'Аммар',
      lastName: 'Администратор',
      phone: '+7 (999) 000-00-01',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // ─── Receptionist ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'reception@shantelyur.ru' },
    update: {},
    create: {
      email: 'reception@shantelyur.ru',
      passwordHash: adminPwd,
      firstName: 'Оксана',
      lastName: 'Ресепшн',
      phone: '+7 (999) 000-00-09',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // ─── Location ──────────────────────────────────────────────────────────────
  const location =
    (await prisma.location.findFirst({ where: { name: 'Shante Lyur — Центральный' } })) ??
    (await prisma.location.create({
      data: {
        name: 'Shante Lyur — Центральный',
        address: 'ул. Малышева, д. 3',
        city: 'Екатеринбург',
        phone: '+7 (343) 123-45-67',
        email: 'info@shantelyur.ru',
        timezone: 'Asia/Yekaterinburg',
      },
    }));

  // ─── Services ──────────────────────────────────────────────────────────────
  const massageServiceIds: string[] = [];
  const cosmoServiceIds:   string[] = [];

  for (let idx = 0; idx < MASSAGE_SERVICES.length; idx++) {
    const s = MASSAGE_SERVICES[idx];
    let svc = await prisma.service.findFirst({ where: { name: s.name } });
    if (!svc) {
      svc = await prisma.service.create({
        data: {
          name: s.name,
          category: ServiceCategory.MASSAGE,
          basePrice: s.basePrice,
          baseDuration: s.baseDuration,
          description: s.desc,
          sortOrder: idx,
          isActive: true,
        },
      });
    }
    massageServiceIds.push(svc.id);
    await prisma.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId: svc.id, locationId: location.id } },
      update: {},
      create: { serviceId: svc.id, locationId: location.id, price: s.basePrice, duration: s.baseDuration },
    });
  }

  for (let idx = 0; idx < COSMO_SERVICES.length; idx++) {
    const s = COSMO_SERVICES[idx];
    let svc = await prisma.service.findFirst({ where: { name: s.name } });
    if (!svc) {
      svc = await prisma.service.create({
        data: {
          name: s.name,
          category: ServiceCategory.COSMETOLOGY,
          basePrice: s.basePrice,
          baseDuration: s.baseDuration,
          description: s.desc,
          sortOrder: MASSAGE_SERVICES.length + idx,
          isActive: true,
        },
      });
    }
    cosmoServiceIds.push(svc.id);
    await prisma.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId: svc.id, locationId: location.id } },
      update: {},
      create: { serviceId: svc.id, locationId: location.id, price: s.basePrice, duration: s.baseDuration },
    });
  }

  console.log(`  ✓ ${massageServiceIds.length} massage services`);
  console.log(`  ✓ ${cosmoServiceIds.length} cosmetology services`);

  // ─── Specialists ───────────────────────────────────────────────────────────
  const specialistIds: string[] = [];

  for (let i = 0; i < STAFF_SPECS.length; i++) {
    const sp = STAFF_SPECS[i];
    const user = await prisma.user.upsert({
      where: { email: sp.email },
      update: {},
      create: {
        email: sp.email,
        passwordHash: staffPwd,
        firstName: sp.firstName,
        lastName: sp.lastName,
        phone: russianPhone(200 + i),
        role: UserRole.SPECIALIST,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });

    const specialist = await prisma.specialist.upsert({
      where: { userId: user.id },
      update: { specialistType: sp.type, specialization: sp.spec, color: sp.color },
      create: {
        userId: user.id,
        specialistType: sp.type,
        specialization: sp.spec,
        experienceYears: sp.exp,
        commissionRate: 0.35,
        color: sp.color,
        status: SpecialistStatus.ACTIVE,
        sortOrder: i,
      },
    });

    specialistIds.push(specialist.id);

    // Assign services by type
    const serviceIds = sp.type === SpecialistType.MASSAGE_THERAPIST ? massageServiceIds : cosmoServiceIds;
    for (const serviceId of serviceIds) {
      await prisma.specialistService.upsert({
        where: { specialistId_serviceId: { specialistId: specialist.id, serviceId } },
        update: {},
        create: { specialistId: specialist.id, serviceId },
      });
    }

    // Working schedule (Mon–Sat 10:00–20:00)
    const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
    for (const day of days) {
      const exists = await prisma.workingSchedule.findFirst({ where: { specialistId: specialist.id, dayOfWeek: day } });
      if (!exists) {
        await prisma.workingSchedule.create({
          data: {
            specialistId: specialist.id,
            locationId: location.id,
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '20:00',
            breakStart: '14:00',
            breakEnd: '15:00',
            validFrom: new Date('2026-01-01'),
          },
        });
      }
    }
  }

  console.log(`  ✓ ${specialistIds.length} specialists (3 massage, 3 cosmetology)`);

  // ─── Promo codes ───────────────────────────────────────────────────────────
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME2026' },
    update: {},
    create: {
      code: 'WELCOME2026',
      description: 'Скидка 15% на первое посещение',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxUses: 500,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      createdBy: superAdmin.id,
    },
  });

  await prisma.promoCode.upsert({
    where: { code: 'VIP2026' },
    update: {},
    create: {
      code: 'VIP2026',
      description: 'VIP-скидка 20% для постоянных клиентов',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxUses: 100,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      createdBy: superAdmin.id,
    },
  });

  // ─── 500 Clients ───────────────────────────────────────────────────────────
  console.log('  → seeding 500 clients...');

  const clientUserIds: string[] = [];
  const BATCH = 50;

  for (let i = 0; i < 500; i++) {
    const firstName = pick(FIRST_NAMES_F, i);
    const lastName  = pick(LAST_NAMES_F,  rng(i, LAST_NAMES_F.length));
    const email = `client.${String(i + 1).padStart(3, '0')}@shantelyur-demo.ru`;
    const phone = russianPhone(i);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: clientPwd,
        firstName,
        lastName,
        phone,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: i % 5 !== 0, // 20% not verified
      },
    });
    clientUserIds.push(user.id);

    // Customer profile
    const existingProfile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
    if (!existingProfile) {
      const birthYear = 1970 + rng(i * 7, 35);
      const birthMonth = 1 + rng(i * 13, 12);
      const birthDay = 1 + rng(i * 17, 28);
      await prisma.customerProfile.create({
        data: {
          userId: user.id,
          dateOfBirth: new Date(`${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`),
          gender: pick(GENDERS, i),
          skinType: pick(SKIN_TYPES, rng(i, SKIN_TYPES.length)),
          preferredLocationId: location.id,
          referralSource: pick(REFERRAL_SOURCES, rng(i * 3, REFERRAL_SOURCES.length)),
          notes: i % 20 === 0 ? 'VIP-клиент, особое внимание' : undefined,
        },
      });
    }

    // VIP tags for top 50 clients
    if (i < 50) {
      const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await prisma.customerTag.upsert({
          where: { profileId_tag: { profileId: profile.id, tag: 'VIP' } },
          update: {},
          create: { profileId: profile.id, tag: 'VIP', color: '#f59e0b' },
        });
      }
    }

    if ((i + 1) % BATCH === 0) console.log(`    ${i + 1}/500 clients seeded`);
  }

  console.log(`  ✓ 500 clients seeded`);

  // ─── Historical bookings (past 180 days) ───────────────────────────────────
  console.log('  → seeding historical bookings...');

  const allServices = [...massageServiceIds, ...cosmoServiceIds];
  const statusWeights: AppointmentStatus[] = [
    AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED, AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CONFIRMED,
  ];

  let bookingCount = 0;

  for (let b = 0; b < 300; b++) {
    const daysAgo  = 2 + rng(b * 11, 178);
    const hourOff  = rng(b * 7, 9);   // 10+0 → 10+9 = 10:00–19:00
    const specIdx  = rng(b * 3, specialistIds.length);
    const clientIdx = rng(b * 13, clientUserIds.length);
    const status   = pick(statusWeights, b);

    const specialistId = specialistIds[specIdx];
    const clientUserId = clientUserIds[clientIdx];

    // Pick a compatible service for this specialist
    const isMassageSpec = specIdx < 3;
    const compatServices = isMassageSpec ? massageServiceIds : cosmoServiceIds;
    const serviceId = pick(compatServices, rng(b * 5, compatServices.length));
    const service = isMassageSpec
      ? MASSAGE_SERVICES[massageServiceIds.indexOf(serviceId)]
      : COSMO_SERVICES[cosmoServiceIds.indexOf(serviceId)];
    if (!service) continue;

    const startAt = pastDate(daysAgo, hourOff);
    const endAt   = new Date(startAt.getTime() + service.baseDuration * 60000);

    try {
      const appt = await prisma.appointment.create({
        data: {
          clientId:      clientUserId,
          specialistId:  specialistId,
          locationId:    location.id,
          startAt,
          endAt,
          status,
          totalPrice:    service.basePrice,
          totalDuration: service.baseDuration,
          source:        pick(['web', 'phone', 'admin', 'walkin'], rng(b, 4)),
          checkedInAt:   status === AppointmentStatus.COMPLETED ? new Date(startAt.getTime() - 5 * 60000) : undefined,
          checkedOutAt:  status === AppointmentStatus.COMPLETED ? endAt : undefined,
          cancelledAt:   status === AppointmentStatus.CANCELLED ? new Date(startAt.getTime() - 3600000) : undefined,
          cancellationReason: status === AppointmentStatus.CANCELLED ? 'CLIENT_REQUEST' : undefined,
          noShowAt:      status === AppointmentStatus.NO_SHOW ? startAt : undefined,
          services: {
            create: [{
              serviceId,
              price:    service.basePrice,
              duration: service.baseDuration,
              sortOrder: 0,
            }],
          },
        },
      });

      // Payment for completed bookings
      if (status === AppointmentStatus.COMPLETED) {
        await prisma.payment.create({
          data: {
            appointmentId: appt.id,
            provider: pick([PaymentProvider.CASH, PaymentProvider.CARD_TERMINAL, PaymentProvider.YOOKASSA], rng(b, 3)),
            amount:   service.basePrice,
            currency: 'RUB',
            status:   PaymentStatus.CAPTURED,
            paidAt:   endAt,
            commissionAmount:       service.basePrice * 0.35,
            specialistCommission:   service.basePrice * 0.35,
          },
        });
      }

      bookingCount++;
    } catch {
      // Skip duplicate time conflicts silently
    }
  }

  console.log(`  ✓ ${bookingCount} historical bookings seeded`);

  // ─── Daily metrics (today) ─────────────────────────────────────────────────
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  await prisma.dailyMetrics.upsert({
    where: { date: today },
    update: {},
    create: { date: today, totalAppointments: 0, totalRevenue: 0 },
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('   Admin:      admin@shantelyur.ru / admin123');
  console.log('   Reception:  reception@shantelyur.ru / admin123');
  console.log('   Specialists: elena.ivanova@shantelyur.ru / staff123 (and 5 more)');
  console.log('   Clients:    client.001@shantelyur-demo.ru ... client.500@shantelyur-demo.ru / client123');
  console.log('\n   Specialists:');
  STAFF_SPECS.forEach((s, i) => {
    console.log(`   [${i + 1}] ${s.firstName} ${s.lastName} — ${s.type === SpecialistType.MASSAGE_THERAPIST ? 'Массажист' : 'Косметолог'}`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
