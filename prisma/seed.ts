import { PrismaClient, UserRole, UserStatus, ServiceCategory, DayOfWeek } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Shante Lyur OS...');

  // ─── Users ─────────────────────────────────────────────────
  const adminPassword = await hash('admin123', 12);
  const specialistPassword = await hash('spec123', 12);
  const clientPassword = await hash('client123', 12);

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

  const specialistUser = await prisma.user.create({
    data: {
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

  // ─── Locations ─────────────────────────────────────────────
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

  // ─── Services ──────────────────────────────────────────────
  const services = await prisma.service.createMany({
    data: [
      { name: 'Классический массаж лица', category: ServiceCategory.COSMETOLOGY, basePrice: 3500, baseDuration: 60, description: 'Расслабляющий массаж лица' },
      { name: 'RF-лифтинг', category: ServiceCategory.LASER, basePrice: 5500, baseDuration: 45, description: 'Радиоволновой лифтинг' },
      { name: 'Мезотерапия', category: ServiceCategory.INJECTION, basePrice: 8000, baseDuration: 30, requiresConsultation: true },
      { name: 'SPA-массаж всего тела', category: ServiceCategory.MASSAGE, basePrice: 7000, baseDuration: 90 },
      { name: 'Лазерная эпиляция', category: ServiceCategory.HAIR_REMOVAL, basePrice: 2500, baseDuration: 30 },
    ],
  });

  const allServices = await prisma.service.findMany();

  // ─── Service Location Prices ───────────────────────────────
  for (const svc of allServices) {
    await prisma.serviceLocationPrice.create({
      data: {
        serviceId: svc.id,
        locationId: location.id,
        price: svc.basePrice,
        duration: svc.baseDuration,
      },
    });
  }

  // ─── Specialist ────────────────────────────────────────────
  const specialist = await prisma.specialist.create({
    data: {
      userId: specialistUser.id,
      bio: 'Сертифицированный косметолог с 8-летним опытом',
      specialization: 'Косметология, массаж',
      experienceYears: 8,
      commissionRate: 0.35,
      color: '#6366f1',
    },
  });

  // ─── Specialist Services ───────────────────────────────────
  for (const svc of allServices.slice(0, 3)) {
    await prisma.specialistService.create({
      data: {
        specialistId: specialist.id,
        serviceId: svc.id,
      },
    });
  }

  // ─── Working Schedule ──────────────────────────────────────
  const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  for (const day of days) {
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

  // ─── Customer Profile ──────────────────────────────────────
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

  // ─── Customer Allergies ────────────────────────────────────
  await prisma.customerAllergy.create({
    data: {
      profileId: profile.id,
      allergen: 'Лидокаин',
      severity: 'moderate',
      reaction: 'Покраснение, зуд',
    },
  });

  // ─── Customer Tags ─────────────────────────────────────────
  await prisma.customerTag.create({
    data: {
      profileId: profile.id,
      tag: 'VIP',
      color: '#f59e0b',
    },
  });

  // ─── Promo Code ────────────────────────────────────────────
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

  // ─── Daily Metrics (today) ─────────────────────────────────
  await prisma.dailyMetrics.create({
    data: {
      date: new Date(),
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
