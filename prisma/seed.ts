import { PrismaClient, UserRole, UserStatus, ServiceCategory, SpecialistStatus, DayOfWeek } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Russian name pools for realistic seeding
const FIRST_NAMES_F = ['Анна', 'Мария', 'Екатерина', 'Наталья', 'Ольга', 'Светлана', 'Татьяна', 'Ирина', 'Елена', 'Юлия', 'Людмила', 'Виктория', 'Галина', 'Надежда', 'Алина', 'Дарья', 'Полина', 'Ксения', 'Валерия', 'Алёна', 'Нина', 'Вера', 'Лариса', 'Маргарита', 'Зоя', 'Кристина', 'Яна', 'Диана', 'Евгения', 'Антонина'];
const FIRST_NAMES_M = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил', 'Никита', 'Павел', 'Роман', 'Владимир', 'Денис', 'Игорь', 'Владислав', 'Иван', 'Антон', 'Олег'];
const LAST_NAMES = ['Иванова', 'Петрова', 'Сидорова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Михайлова', 'Новикова', 'Фёдорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева', 'Орлова', 'Соколова', 'Захарова', 'Чернова', 'Борисова', 'Ефимова', 'Фомина', 'Громова', 'Беляева', 'Антонова', 'Белова', 'Назарова', 'Давыдова', 'Романова', 'Тихонова', 'Макарова', 'Филиппова', 'Голубева', 'Соловьёва', 'Виноградова', 'Богданова', 'Воробьёва', 'Медведева', 'Лазарева', 'Крылова', 'Зайцева', 'Лукьянова', 'Осипова', 'Прокофьева', 'Архипова'];
const REFERRAL_SOURCES = ['instagram', 'vk', 'telegram', 'friend', 'google', 'yandex', 'flyer', 'event', 'repeat'];
const LOYALTY_TIERS = ['BRONZE', 'BRONZE', 'BRONZE', 'SILVER', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Seeding Shante Lyur OS...');

  // ─── Admin ──────────────────────────────────────────────────
  const adminPassword = await hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@shantelyur.ru' },
    update: {},
    create: {
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

  // ─── Location ────────────────────────────────────────────────
  const location = await prisma.location.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'Shante Lyur — Екатеринбург',
      address: 'улица Малышева, 3',
      city: 'Екатеринбург',
      phone: '+7 (343) 000-00-00',
      timezone: 'Asia/Yekaterinburg',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Shante Lyur — Екатеринбург',
      address: 'улица Малышева, 3',
      city: 'Екатеринбург',
      phone: '+7 (343) 000-00-00',
      email: 'info@shantelyur.ru',
      timezone: 'Asia/Yekaterinburg',
      sortOrder: 0,
    },
  });

  // ─── Services ────────────────────────────────────────────────
  const serviceData = [
    { name: 'Классический массаж лица', category: ServiceCategory.MASSAGE, basePrice: 3500, baseDuration: 60, description: 'Расслабляющий массаж лица и шеи' },
    { name: 'RF-лифтинг', category: ServiceCategory.LASER, basePrice: 5500, baseDuration: 45, description: 'Радиоволновой лифтинг кожи' },
    { name: 'Мезотерапия', category: ServiceCategory.INJECTION, basePrice: 8000, baseDuration: 30, requiresConsultation: true, description: 'Инъекционное омоложение' },
    { name: 'SPA-массаж всего тела', category: ServiceCategory.MASSAGE, basePrice: 7000, baseDuration: 90, description: 'Полный расслабляющий массаж' },
    { name: 'Лазерная эпиляция', category: ServiceCategory.HAIR_REMOVAL, basePrice: 2500, baseDuration: 30, description: 'Безболезненное удаление волос' },
    { name: 'Биоревитализация', category: ServiceCategory.INJECTION, basePrice: 9500, baseDuration: 45, requiresConsultation: true, description: 'Глубокое увлажнение кожи' },
    { name: 'Гиалуроновый лифтинг', category: ServiceCategory.COSMETOLOGY, basePrice: 6500, baseDuration: 60, description: 'Лифтинг с гиалуроновой кислотой' },
    { name: 'Антицеллюлитный массаж', category: ServiceCategory.MASSAGE, basePrice: 4500, baseDuration: 60, description: 'Интенсивный массаж проблемных зон' },
    { name: 'Пилинг & Детокс', category: ServiceCategory.FACIAL, basePrice: 4000, baseDuration: 60, description: 'Глубокое очищение кожи' },
    { name: 'Ароматерапевтический массаж', category: ServiceCategory.MASSAGE, basePrice: 5500, baseDuration: 75, description: 'Расслабляющий массаж с эфирными маслами' },
  ];

  const allServices = [];
  for (const svc of serviceData) {
    const service = await prisma.service.upsert({
      where: { id: `00000000-0000-0000-0001-${String(serviceData.indexOf(svc) + 1).padStart(12, '0')}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0001-${String(serviceData.indexOf(svc) + 1).padStart(12, '0')}`,
        ...svc,
        isActive: true,
        sortOrder: serviceData.indexOf(svc),
      },
    });
    allServices.push(service);

    await prisma.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId: service.id, locationId: location.id } },
      update: {},
      create: { serviceId: service.id, locationId: location.id, price: svc.basePrice, duration: svc.baseDuration },
    });
  }

  // ─── Specialists ─────────────────────────────────────────────
  const specialistPassword = await hash('spec123', 10);
  const specialistProfiles = [
    { email: 'specialist1@shantelyur.ru', firstName: 'Елена', lastName: 'Иванова', specialization: 'Косметология, инъекции', bio: 'Сертифицированный косметолог с 8-летним опытом', experienceYears: 8, commissionRate: 0.35, color: '#6366f1' },
    { email: 'specialist2@shantelyur.ru', firstName: 'Мария', lastName: 'Петрова', specialization: 'Массаж, SPA', bio: 'Профессиональный массажист, специалист по антистрессовым техникам', experienceYears: 6, commissionRate: 0.30, color: '#D4AF7A' },
    { email: 'specialist3@shantelyur.ru', firstName: 'Ольга', lastName: 'Ким', specialization: 'Лазерная косметология', bio: 'Специалист по лазерным процедурам с 5-летним опытом', experienceYears: 5, commissionRate: 0.32, color: '#8BA888' },
    { email: 'specialist4@shantelyur.ru', firstName: 'Наталья', lastName: 'Волкова', specialization: 'Инъекционная косметология', bio: 'Врач-косметолог, специалист по инъекционному омоложению', experienceYears: 10, commissionRate: 0.38, color: '#E8C4B8' },
    { email: 'specialist5@shantelyur.ru', firstName: 'Дарья', lastName: 'Соколова', specialization: 'Уходовые процедуры', bio: 'Мастер по уходовым процедурам и массажу лица', experienceYears: 4, commissionRate: 0.28, color: '#B8A8D4' },
  ];

  const createdSpecialists = [];
  for (let i = 0; i < specialistProfiles.length; i++) {
    const sp = specialistProfiles[i];
    const specId = `00000000-0000-0000-0002-${String(i + 1).padStart(12, '0')}`;
    const userId = `00000000-0000-0000-0003-${String(i + 1).padStart(12, '0')}`;

    const user = await prisma.user.upsert({
      where: { email: sp.email },
      update: {},
      create: { id: userId, email: sp.email, passwordHash: specialistPassword, firstName: sp.firstName, lastName: sp.lastName, role: UserRole.SPECIALIST, status: UserStatus.ACTIVE, emailVerified: true },
    });

    const specialist = await prisma.specialist.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: specId, userId: user.id, bio: sp.bio, specialization: sp.specialization,
        experienceYears: sp.experienceYears, commissionRate: sp.commissionRate, color: sp.color,
        status: SpecialistStatus.ACTIVE, reviewCount: 0, sortOrder: i,
      },
    });

    createdSpecialists.push(specialist);

    // Assign services per specialization (index matches specialistProfiles order)
    // Services by seed index: 0=массаж лица(MASSAGE) 1=RF-лифтинг(LASER) 2=Мезотерапия(INJ)
    //   3=SPA-массаж(MASSAGE) 4=Лазерная эпиляция(HAIR_REMOVAL) 5=Биоревитализация(INJ)
    //   6=Гиалуроновый лифтинг(COSMETOLOGY) 7=Антицеллюлитный(MASSAGE) 8=Пилинг(FACIAL)
    //   9=Ароматерапевтический(MASSAGE)
    const servicesBySpec: number[][] = [
      [6, 2, 5, 1, 8],   // Елена Иванова  — косметология+инъекции: гиалурон, мезо, биорев, RF, пилинг
      [3, 7, 9, 0],      // Мария Петрова  — массаж: SPA, антицелл, аромат, массаж лица
      [1, 4, 6],         // Ольга Ким      — лазер: RF, лазер.эпил, гиалурон
      [2, 5, 6],         // Наталья Волкова — инъекции: мезо, биорев, гиалурон
      [0, 8, 7, 9],      // Дарья Соколова — уход: массаж лица, пилинг, антицелл, аромат
    ];
    const myServiceIndices = servicesBySpec[i] ?? [];
    for (const idx of myServiceIndices) {
      const svc = allServices[idx];
      if (!svc) continue;
      await prisma.specialistService.upsert({
        where: { specialistId_serviceId: { specialistId: specialist.id, serviceId: svc.id } },
        update: { isActive: true },
        create: { specialistId: specialist.id, serviceId: svc.id, isActive: true },
      });
    }

    // Working schedule
    const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
    for (const day of days) {
      const existing = await prisma.workingSchedule.findFirst({ where: { specialistId: specialist.id, dayOfWeek: day } });
      if (!existing) {
        await prisma.workingSchedule.create({
          data: {
            specialistId: specialist.id, locationId: location.id, dayOfWeek: day,
            startTime: '09:00', endTime: '20:00', breakStart: '13:00', breakEnd: '14:00',
            validFrom: new Date('2026-01-01'),
          },
        });
      }
    }
  }

  // ─── 500 Clients ─────────────────────────────────────────────
  console.log('   Seeding 500 clients...');
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  let clientsCreated = 0;
  const clientBatch: Array<{ id: string; email: string; firstName: string; lastName: string }> = [];

  for (let i = 0; i < 500; i++) {
    const isFemale = Math.random() > 0.15;
    const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const lastNameRaw = pick(LAST_NAMES);
    const lastName = isFemale ? lastNameRaw : lastNameRaw.replace(/а$/, '').replace(/ова$/, 'ов').replace(/ева$/, 'ев').replace(/ова$/, 'ов');
    const emailId = `${i + 1}`.padStart(5, '0');
    const email = `client${emailId}@salon-demo.ru`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      clientBatch.push({ id: existingUser.id, email, firstName, lastName });
      continue;
    }

    const userId = await prisma.user.create({
      data: {
        email,
        passwordHash: 'CLIENT_NO_LOGIN',
        firstName,
        lastName,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: false,
      },
      select: { id: true },
    });

    clientBatch.push({ id: userId.id, email, firstName, lastName });
    clientsCreated++;
  }

  console.log(`   Created ${clientsCreated} new clients`);

  // Create customer profiles for clients
  console.log('   Creating customer profiles...');
  let profilesCreated = 0;
  for (let i = 0; i < clientBatch.length; i++) {
    const client = clientBatch[i];
    const existing = await prisma.customerProfile.findUnique({ where: { userId: client.id } });
    if (existing) continue;

    const visits = randomInt(0, 24);
    const spent = visits * randomInt(3000, 12000);
    const tier = pick(LOYALTY_TIERS);
    const firstVisit = randomDate(twoYearsAgo, now);
    const lastVisit = visits > 0 ? randomDate(firstVisit, now) : null;

    await prisma.customerProfile.create({
      data: {
        userId: client.id,
        referralSource: pick(REFERRAL_SOURCES),
        totalVisits: visits,
        totalSpent: spent,
        loyaltyTier: tier,
        loyaltyPoints: Math.floor(spent / 100),
        firstVisitAt: visits > 0 ? firstVisit : null,
        lastVisitAt: lastVisit,
        createdAt: randomDate(twoYearsAgo, now),
      },
    });
    profilesCreated++;
  }

  console.log(`   Created ${profilesCreated} customer profiles`);

  // ─── Original single client (for login) ──────────────────────
  const clientPassword = await hash('client123', 10);
  const mainClient = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
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

  await prisma.customerProfile.upsert({
    where: { userId: mainClient.id },
    update: {},
    create: {
      userId: mainClient.id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'female',
      skinType: 'комбинированная',
      preferredLocationId: location.id,
      referralSource: 'instagram',
      totalVisits: 12,
      totalSpent: 48000,
      loyaltyTier: 'GOLD',
      loyaltyPoints: 480,
    },
  });

  // ─── Some historical appointments ────────────────────────────
  console.log('   Creating sample appointments...');
  const specialist = createdSpecialists[0];
  if (specialist && clientBatch.length > 0) {
    const svc = allServices[0];
    for (let i = 0; i < 10 && i < clientBatch.length; i++) {
      const start = randomDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), now);
      start.setMinutes(0, 0, 0);
      const end = new Date(start.getTime() + svc.baseDuration * 60_000);
      try {
        await prisma.appointment.create({
          data: {
            clientId: clientBatch[i].id,
            specialistId: specialist.id,
            locationId: location.id,
            startAt: start,
            endAt: end,
            status: 'COMPLETED',
            totalPrice: svc.basePrice,
            totalDuration: svc.baseDuration,
            source: 'admin',
            services: {
              create: [{ serviceId: svc.id, price: svc.basePrice, duration: svc.baseDuration, sortOrder: 0 }],
            },
          },
        });
      } catch {
        // Skip duplicate time slots
      }
    }
  }

  // ─── Promo Code ──────────────────────────────────────────────
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME2026' },
    update: {},
    create: {
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

  // ─── Daily Metrics ───────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.dailyMetrics.upsert({
    where: { date: today },
    update: {},
    create: { date: today, totalAppointments: 0, totalRevenue: 0 },
  });

  const totalClients = await prisma.user.count({ where: { role: 'CLIENT' } });
  const totalSpecialists = await prisma.specialist.count();

  console.log('✅ Seed completed!');
  console.log(`   Admin:      admin@shantelyur.ru / admin123`);
  console.log(`   Specialist: specialist1@shantelyur.ru / spec123`);
  console.log(`   Client:     client@example.com / client123`);
  console.log(`   Clients in DB: ${totalClients}`);
  console.log(`   Specialists in DB: ${totalSpecialists}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
