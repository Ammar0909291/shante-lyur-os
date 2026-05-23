import { PrismaClient, UserRole, UserStatus, ServiceCategory, DayOfWeek } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Shante Lyur OS...');

  // ─── Users (idempotent: upsert by unique email) ───────────
  const adminPassword = await hash('admin123', 12);
  const specialistPassword = await hash('spec123', 12);
  const clientPassword = await hash('client123', 12);

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

  const specialistUser = await prisma.user.upsert({
    where: { email: 'specialist@shantelyur.ru' },
    update: {},
    create: {
      email: 'specialist@shantelyur.ru',
      passwordHash: specialistPassword,
      firstName: 'Елена',
      lastName: 'Иванова',
      phone: '+7 (999) 000-00-02',
      role: UserRole.SPECIALIST,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const clientUser = await prisma.user.upsert({
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

  // ─── Location (no unique field — findFirst by name) ────────
  const location =
    (await prisma.location.findFirst({ where: { name: 'Shante Lyur — Центральный' } })) ??
    (await prisma.location.create({
      data: {
        name: 'Shante Lyur — Центральный',
        address: 'ул. Пушкина, д. 10, офис 5',
        city: 'Москва',
        phone: '+7 (495) 123-45-67',
        email: 'info@shantelyur.ru',
        timezone: 'Europe/Moscow',
      },
    }));

  // ─── Services (no unique on name — findFirst per record) ──
  const serviceSeeds = [
    { name: 'Классический расслабляющий массаж', category: ServiceCategory.MASSAGE, basePrice: 4500, baseDuration: 60 },
    { name: 'Тайский массаж', category: ServiceCategory.MASSAGE, basePrice: 7500, baseDuration: 90 },
    { name: 'RF-лифтинг', category: ServiceCategory.COSMETOLOGY, basePrice: 10000, baseDuration: 60, description: 'Радиоволновой лифтинг' },
    { name: 'Мезотерапия', category: ServiceCategory.COSMETOLOGY, basePrice: 15000, baseDuration: 45, requiresConsultation: true },
    { name: 'Биоревитализация', category: ServiceCategory.COSMETOLOGY, basePrice: 18000, baseDuration: 60 },
  ];

  for (const s of serviceSeeds) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.service.create({ data: s });
  }

  const allServices = await prisma.service.findMany();

  // ─── Service Location Prices (unique [serviceId, locationId]) ─
  for (const svc of allServices) {
    await prisma.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId: svc.id, locationId: location.id } },
      update: {},
      create: {
        serviceId: svc.id,
        locationId: location.id,
        price: svc.basePrice,
        duration: svc.baseDuration,
      },
    });
  }

  // ─── Specialist (unique userId) ────────────────────────────
  const specialist = await prisma.specialist.upsert({
    where: { userId: specialistUser.id },
    update: {},
    create: {
      userId: specialistUser.id,
      bio: 'Сертифицированный косметолог с 8-летним опытом',
      specialization: 'Косметология, массаж',
      experienceYears: 8,
      commissionRate: 0.35,
      color: '#6366f1',
    },
  });

  // ─── Specialist Services (unique [specialistId, serviceId]) ─
  for (const svc of allServices.slice(0, 3)) {
    await prisma.specialistService.upsert({
      where: { specialistId_serviceId: { specialistId: specialist.id, serviceId: svc.id } },
      update: {},
      create: { specialistId: specialist.id, serviceId: svc.id },
    });
  }

  // ─── Working Schedule (no unique — findFirst per day) ──────
  const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  for (const day of days) {
    const existing = await prisma.workingSchedule.findFirst({
      where: { specialistId: specialist.id, dayOfWeek: day },
    });
    if (!existing) {
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

  // ─── Customer Profile (unique userId) ──────────────────────
  const profile = await prisma.customerProfile.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'female',
      skinType: 'комбинированная',
      preferredLocationId: location.id,
      referralSource: 'instagram',
    },
  });

  // ─── Customer Allergy (no unique — findFirst by allergen) ──
  const existingAllergy = await prisma.customerAllergy.findFirst({
    where: { profileId: profile.id, allergen: 'Лидокаин' },
  });
  if (!existingAllergy) {
    await prisma.customerAllergy.create({
      data: {
        profileId: profile.id,
        allergen: 'Лидокаин',
        severity: 'moderate',
        reaction: 'Покраснение, зуд',
      },
    });
  }

  // ─── Customer Tag (unique [profileId, tag]) ────────────────
  await prisma.customerTag.upsert({
    where: { profileId_tag: { profileId: profile.id, tag: 'VIP' } },
    update: {},
    create: { profileId: profile.id, tag: 'VIP', color: '#f59e0b' },
  });

  // ─── Promo Code (unique code) ──────────────────────────────
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

  // ─── Daily Metrics (unique date) ───────────────────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.dailyMetrics.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      totalAppointments: 0,
      totalRevenue: 0,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   Admin: admin@shantelyur.ru / admin123`);
  console.log(`   Specialist: specialist@shantelyur.ru / spec123`);
  console.log(`   Client: client@example.com / client123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
