import { PrismaClient, UserRole, UserStatus, ServiceCategory, DayOfWeek, AppointmentStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Name Data ──────────────────────────────────────────────────────────────
const femaleFirstNames = ['Анна', 'Мария', 'Елена', 'Ольга', 'Наталья', 'Татьяна', 'Ирина', 'Светлана', 'Юлия', 'Екатерина', 'Дарья', 'Алена', 'Валерия', 'Полина', 'Виктория', 'Алина', 'Кристина', 'Надежда', 'Людмила', 'Вера'];
const maleFirstNames = ['Александр', 'Дмитрий', 'Сергей', 'Андрей', 'Михаил', 'Алексей', 'Иван', 'Николай', 'Павел', 'Владимир'];
const femaleLastNames = ['Иванова', 'Петрова', 'Сидорова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Соколова', 'Новикова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева', 'Орлова', 'Захарова', 'Макарова', 'Федорова', 'Зайцева', 'Виноградова', 'Романова', 'Яковлева', 'Горбунова', 'Антонова', 'Белова'];
const maleLastNames = ['Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Соколов', 'Новиков', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  const prefix = pick(['900', '901', '902', '903', '905', '906', '909', '910', '911', '912', '913', '914', '915', '916', '917', '918', '919', '920', '921', '922', '923', '925', '926', '928', '929', '930', '931', '932', '933', '934', '936', '937', '938', '939', '950', '951', '952', '953', '954', '955', '958', '960', '961', '962', '963', '964', '965', '966', '967', '968', '969', '970', '977', '978', '980', '981', '982', '983', '984', '985', '986', '987', '988', '989', '990', '991', '992', '993', '994', '995', '996', '997', '999']);
  const n1 = String(rand(100, 999));
  const n2 = String(rand(10, 99)).padStart(2, '0');
  const n3 = String(rand(10, 99)).padStart(2, '0');
  return `+7 ${prefix} ${n1}-${n2}-${n3}`;
}

function randomBirthday(): Date {
  const age = rand(20, 65);
  const year = new Date().getFullYear() - age;
  const month = rand(0, 11);
  const day = rand(1, 28);
  return new Date(year, month, day);
}

function randomEmail(firstName: string, lastName: string, idx: number): string {
  const domains = ['mail.ru', 'yandex.ru', 'gmail.com', 'inbox.ru', 'bk.ru', 'rambler.ru'];
  const fn = firstName.toLowerCase().replace(/[а-яё]/g, (c) => {
    const map: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return map[c] ?? c;
  });
  const ln = lastName.toLowerCase().replace(/[а-яё]/g, (c) => {
    const map: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return map[c] ?? c;
  });
  return `${fn}.${ln}${idx}@${pick(domains)}`;
}

const skinTypes = ['нормальная', 'сухая', 'жирная', 'комбинированная', 'чувствительная'];
const allergyNotes = [
  'Аллергия на лидокаин',
  'Непереносимость никеля',
  'Чувствительность к ретинолу',
  'Аллергия на латекс',
  'Реакция на гиалуроновую кислоту',
  '',
  '',
  '',
  '',
  '',
];
const clientNotes = [
  'Предпочитает утренние записи',
  'Любит тишину во время процедур',
  'VIP-клиент, требует особого внимания',
  'Всегда опаздывает на 10 минут',
  'Предпочитает работать с одним специалистом',
  '',
  '',
  '',
];

const customerTags = ['VIP', 'REGULAR', 'NEW'];

// ─── Specialist Data ─────────────────────────────────────────────────────────
const specialistData = [
  { firstName: 'Мария', lastName: 'Петрова', email: 'spec.petrova@shantelyur.ru', specialization: 'Косметолог-эстетист', bio: 'Сертифицированный косметолог с 10-летним опытом. Специализируется на комплексном уходе за лицом.', color: '#D4AF7A', rating: 4.9, experienceYears: 10 },
  { firstName: 'Ольга', lastName: 'Козлова', email: 'spec.kozlova@shantelyur.ru', specialization: 'Лазерный специалист', bio: 'Эксперт в лазерных технологиях. Более 8 лет работы с лазерным оборудованием.', color: '#7898C4', rating: 4.8, experienceYears: 8 },
  { firstName: 'Наталья', lastName: 'Васильева', email: 'spec.vasilieva@shantelyur.ru', specialization: 'Массажист', bio: 'Мастер классического и SPA-массажа. Специализация — антицеллюлитные программы.', color: '#8BA888', rating: 5.0, experienceYears: 12 },
  { firstName: 'Дарья', lastName: 'Смирнова', email: 'spec.smirnova@shantelyur.ru', specialization: 'Инъекционный косметолог', bio: 'Врач-косметолог. Специализация — контурная пластика и биоревитализация.', color: '#E8C4B8', rating: 4.9, experienceYears: 7 },
  { firstName: 'Екатерина', lastName: 'Иванова', email: 'spec.ivanova@shantelyur.ru', specialization: 'Трихолог', bio: 'Дерматолог-трихолог. PRP-терапия, мезотерапия волос, лечение алопеции.', color: '#B8A8D4', rating: 4.7, experienceYears: 6 },
  { firstName: 'Анастасия', lastName: 'Соколова', email: 'spec.sokolova@shantelyur.ru', specialization: 'Косметолог', bio: 'Специалист по химическим пилингам и аппаратной косметологии.', color: '#D4C4A8', rating: 4.8, experienceYears: 5 },
  { firstName: 'Людмила', lastName: 'Морозова', email: 'spec.morozova@shantelyur.ru', specialization: 'Массажист', bio: 'Техники: тайский массаж, лимфодренаж, расслабляющие программы.', color: '#A8C4D4', rating: 4.6, experienceYears: 9 },
  { firstName: 'Татьяна', lastName: 'Новикова', email: 'spec.novikova@shantelyur.ru', specialization: 'Косметолог', bio: 'Эксперт по антивозрастным методикам. Работа с Sculptra и Radiesse.', color: '#C4A8D4', rating: 4.9, experienceYears: 11 },
];

// ─── Service Data ─────────────────────────────────────────────────────────────
const serviceData = [
  { name: 'Гиалуроновый лифтинг', category: ServiceCategory.INJECTION, price: 1200000, duration: 60, description: 'Контурная пластика с использованием гиалуроновой кислоты' },
  { name: 'Антивозрастной массаж лица', category: ServiceCategory.MASSAGE, price: 800000, duration: 50, description: 'Глубокий массаж против морщин и птоза' },
  { name: 'Пилинг & Детокс', category: ServiceCategory.COSMETOLOGY, price: 650000, duration: 45, description: 'Химический пилинг + детокс-маска' },
  { name: 'Ароматерапевтический массаж', category: ServiceCategory.MASSAGE, price: 700000, duration: 60, description: 'Расслабляющий массаж с эфирными маслами' },
  { name: 'Лазерная эпиляция', category: ServiceCategory.LASER, price: 1500000, duration: 90, description: 'Диодная лазерная эпиляция' },
  { name: 'Биоревитализация', category: ServiceCategory.INJECTION, price: 1800000, duration: 60, description: 'Инъекционное увлажнение гиалуроновой кислотой' },
  { name: 'Нейромышечный массаж', category: ServiceCategory.MASSAGE, price: 900000, duration: 75, description: 'Работа с триггерными точками и мышечными блоками' },
  { name: 'Глубокое увлажнение', category: ServiceCategory.FACIAL, price: 550000, duration: 40, description: 'Интенсивное увлажнение с гиалуроновыми масками' },
  { name: 'Контурная пластика', category: ServiceCategory.INJECTION, price: 2200000, duration: 90, description: 'Моделирование овала лица и скул' },
  { name: 'RF-лифтинг', category: ServiceCategory.LASER, price: 1400000, duration: 60, description: 'Радиоволновой лифтинг тканей лица и тела' },
  { name: 'Мезотерапия лица', category: ServiceCategory.INJECTION, price: 1000000, duration: 45, description: 'Коктейли для питания и регенерации кожи' },
  { name: 'Антицеллюлитный массаж', category: ServiceCategory.MASSAGE, price: 750000, duration: 60, description: 'LPG и ручной антицеллюлитный массаж' },
  { name: 'Карбоновый пилинг', category: ServiceCategory.LASER, price: 1200000, duration: 45, description: 'Лазерный карбоновый нанопилинг' },
  { name: 'PRP-терапия волос', category: ServiceCategory.COSMETOLOGY, price: 1600000, duration: 60, description: 'Плазмолифтинг кожи головы' },
  { name: 'Ботокс', category: ServiceCategory.INJECTION, price: 2500000, duration: 45, description: 'Ботулинотерапия мимических морщин' },
];

// ─── Appointment Status Distribution ─────────────────────────────────────────
function randomStatus(): AppointmentStatus {
  const r = Math.random();
  if (r < 0.6) return AppointmentStatus.CONFIRMED;
  if (r < 0.8) return AppointmentStatus.COMPLETED;
  if (r < 0.9) return AppointmentStatus.PENDING;
  return AppointmentStatus.CANCELLED;
}

function loyaltyTier(visits: number, totalSpent: number): string {
  const score = visits * 10 + totalSpent / 100000;
  if (score > 500) return 'PLATINUM';
  if (score > 200) return 'GOLD';
  if (score > 80) return 'SILVER';
  return 'BRONZE';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding Shante Lyur OS v3...');

  // ── Delete in dependency order ──────────────────────────────────────────────
  console.log('   Clearing existing data...');
  await prisma.dailyMetrics.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.procedureHistory.deleteMany();
  await prisma.beforeAfterPhoto.deleteMany();
  await prisma.specialistNote.deleteMany();
  await prisma.customerTag.deleteMany();
  await prisma.customerRestriction.deleteMany();
  await prisma.customerAllergy.deleteMany();
  await prisma.revenueRecord.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.serviceLocationPrice.deleteMany();
  await prisma.specialistService.deleteMany();
  await prisma.specialist.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.service.deleteMany();
  await prisma.location.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminPassword = await hash('admin123', 12);
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

  // ── Location ─────────────────────────────────────────────────────────────────
  const location = await prisma.location.create({
    data: {
      name: 'Shante Lyur — Центральный',
      address: 'ул. Тверская, 12, стр. 1',
      city: 'Москва',
      phone: '+7 (495) 123-45-67',
      email: 'info@shantelyur.ru',
      timezone: 'Europe/Moscow',
    },
  });

  // ── Services ──────────────────────────────────────────────────────────────────
  console.log('   Creating 15 services...');
  const services = await Promise.all(
    serviceData.map((s) =>
      prisma.service.create({
        data: {
          name: s.name,
          category: s.category,
          basePrice: s.price / 100,
          baseDuration: s.duration,
          description: s.description,
          isActive: true,
        },
      }),
    ),
  );

  for (const svc of services) {
    await prisma.serviceLocationPrice.create({
      data: { serviceId: svc.id, locationId: location.id, price: svc.basePrice, duration: svc.baseDuration },
    });
  }

  // ── Specialists ───────────────────────────────────────────────────────────────
  console.log('   Creating 8 specialists...');
  const specPassword = await hash('spec123', 12);
  const specialistIds: string[] = [];

  for (const sd of specialistData) {
    const user = await prisma.user.create({
      data: {
        email: sd.email,
        passwordHash: specPassword,
        firstName: sd.firstName,
        lastName: sd.lastName,
        phone: randomPhone(),
        role: UserRole.SPECIALIST,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });

    const spec = await prisma.specialist.create({
      data: {
        userId: user.id,
        bio: sd.bio,
        specialization: sd.specialization,
        experienceYears: sd.experienceYears,
        rating: sd.rating,
        commissionRate: 0.35,
        status: 'ACTIVE',
        color: sd.color,
      },
    });

    specialistIds.push(spec.id);

    // Assign services to specialist
    const svcSlice = services.slice(0, rand(3, 8));
    for (const svc of svcSlice) {
      await prisma.specialistService.create({
        data: { specialistId: spec.id, serviceId: svc.id },
      });
    }

    // Working schedule Mon–Sat
    const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
    for (const day of days) {
      await prisma.workingSchedule.create({
        data: {
          specialistId: spec.id,
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

  // ── 500 Customers ─────────────────────────────────────────────────────────────
  console.log('   Creating 500 customers...');
  const clientPassword = await hash('client123', 12);
  const customerProfileIds: string[] = [];
  const customerUserIds: string[] = [];

  for (let i = 0; i < 500; i++) {
    const isFemale = Math.random() > 0.15;
    const firstName = isFemale ? pick(femaleFirstNames) : pick(maleFirstNames);
    const lastName = isFemale ? pick(femaleLastNames) : pick(maleLastNames);
    const email = randomEmail(firstName, lastName, i);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: clientPassword,
          firstName,
          lastName,
          phone: randomPhone(),
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: Math.random() > 0.2,
        },
      });
    } catch {
      // email collision - skip
      continue;
    }

    customerUserIds.push(user.id);

    const visits = rand(0, 35);
    const spent = visits * rand(3000, 25000);
    const tier = loyaltyTier(visits, spent);
    const preferredSpecialistId = Math.random() > 0.4 ? pick(specialistIds) : null;

    const profile = await prisma.customerProfile.create({
      data: {
        userId: user.id,
        dateOfBirth: randomBirthday(),
        gender: isFemale ? 'female' : 'male',
        skinType: Math.random() > 0.3 ? pick(skinTypes) : null,
        preferredLocationId: location.id,
        preferredSpecialistId,
        totalVisits: visits,
        totalSpent: spent,
        loyaltyTier: tier,
        notes: Math.random() > 0.6 ? pick(clientNotes) : null,
        firstVisitAt: visits > 0 ? new Date(Date.now() - rand(30, 540) * 24 * 60 * 60 * 1000) : null,
        lastVisitAt: visits > 0 ? new Date(Date.now() - rand(1, 90) * 24 * 60 * 60 * 1000) : null,
      },
    });

    customerProfileIds.push(profile.id);

    // Tag
    const tag = pick(customerTags);
    await prisma.customerTag.create({
      data: { profileId: profile.id, tag, color: tag === 'VIP' ? '#f59e0b' : tag === 'REGULAR' ? '#6366f1' : '#10b981' },
    });

    // Allergy (30% chance)
    const allergyNote = pick(allergyNotes);
    if (allergyNote) {
      await prisma.customerAllergy.create({
        data: { profileId: profile.id, allergen: allergyNote.replace('Аллергия на ', '').replace('Непереносимость ', '').replace('Чувствительность к ', '').replace('Реакция на ', ''), severity: 'moderate', reaction: allergyNote },
      });
    }
  }

  // ── 800 Appointments ──────────────────────────────────────────────────────────
  console.log('   Creating 800 appointments...');
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const timeRange = twoWeeksAhead.getTime() - sixMonthsAgo.getTime();

  let appointmentsCreated = 0;
  for (let i = 0; i < 800; i++) {
    if (customerUserIds.length === 0) break;

    const clientId = pick(customerUserIds);
    const specialistId = pick(specialistIds);
    const service = pick(services);
    const status = randomStatus();

    const startMs = sixMonthsAgo.getTime() + Math.random() * timeRange;
    const startAt = new Date(startMs);
    // Round to nearest 30 min
    startAt.setMinutes(Math.round(startAt.getMinutes() / 30) * 30, 0, 0);
    // Only 10am–8pm
    const hours = startAt.getHours();
    if (hours < 10) startAt.setHours(10, 0, 0, 0);
    if (hours >= 20) startAt.setHours(19, 0, 0, 0);

    const duration = Number(service.baseDuration);
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

    try {
      await prisma.appointment.create({
        data: {
          clientId,
          specialistId,
          locationId: location.id,
          startAt,
          endAt,
          status,
          totalPrice: Number(service.basePrice),
          totalDuration: duration,
          source: pick(['web', 'phone', 'admin', 'walkin']),
          services: {
            create: {
              serviceId: service.id,
              price: Number(service.basePrice),
              duration,
            },
          },
        },
      });
      appointmentsCreated++;
    } catch {
      // skip conflicts
    }
  }

  // ── Promo Code ────────────────────────────────────────────────────────────────
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

  // ── Daily Metrics ─────────────────────────────────────────────────────────────
  await prisma.dailyMetrics.create({
    data: {
      date: new Date(),
      totalAppointments: appointmentsCreated,
      totalRevenue: appointmentsCreated * 1000,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   Customers: ${customerUserIds.length}`);
  console.log(`   Specialists: ${specialistIds.length}`);
  console.log(`   Services: ${services.length}`);
  console.log(`   Appointments: ${appointmentsCreated}`);
  console.log('');
  console.log('   Admin: admin@shantelyur.ru / admin123');
  console.log('   Specialists: spec.petrova@shantelyur.ru / spec123 (and others)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
