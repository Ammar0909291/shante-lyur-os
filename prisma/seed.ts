import { PrismaClient, UserRole, UserStatus, ServiceCategory, SpecialistStatus, DayOfWeek } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Real service catalog imported from Shante Lyur price list ───────────────
const REAL_SERVICES = [
  // Лицо / Шея / Декольте
  { code: 'FACIAL-001', displayCategory: 'Лицо / Шея / Декольте', name: 'Мышечно-структурный уход по лицу, шее и зоне декольте', category: ServiceCategory.FACIAL, baseDuration: 90, basePrice: 5600 },
  { code: 'FACIAL-002', displayCategory: 'Лицо / Шея / Декольте', name: '3D Моделирование по лицу, шее и зоне декольте', category: ServiceCategory.FACIAL, baseDuration: 60, basePrice: 4900 },
  { code: 'FACIAL-003', displayCategory: 'Лицо / Шея / Декольте', name: 'Французский уход по лицу, шее и зоне декольте', category: ServiceCategory.FACIAL, baseDuration: 60, basePrice: 4900 },
  { code: 'FACIAL-004', displayCategory: 'Лицо / Шея / Декольте', name: '«MIX» Уход по лицу, шее и зоне декольте', category: ServiceCategory.FACIAL, baseDuration: 60, basePrice: 4900 },
  // Тело / Массаж
  { code: 'MASSAGE-001', displayCategory: 'Тело / Массаж', name: 'Расслабляющий уход при помощи камней', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'MASSAGE-002', displayCategory: 'Тело / Массаж', name: 'Программа «Удвартана»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 6500 },
  { code: 'MASSAGE-003', displayCategory: 'Тело / Массаж', name: 'Уход по телу «4 Руки»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 6200 },
  { code: 'MASSAGE-004', displayCategory: 'Тело / Массаж', name: 'Индийский уход по телу', category: ServiceCategory.MASSAGE, baseDuration: 90, basePrice: 6500 },
  { code: 'MASSAGE-005', displayCategory: 'Тело / Массаж', name: 'Поющие чаши', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'MASSAGE-006', displayCategory: 'Тело / Массаж', name: 'Работа по Меридианам', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'MASSAGE-007', displayCategory: 'Тело / Массаж', name: 'Программа «Жиротоп»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 6200 },
  { code: 'MASSAGE-008', displayCategory: 'Тело / Массаж', name: 'Антистрессовый уход по телу (Спина)', category: ServiceCategory.MASSAGE, baseDuration: 40, basePrice: 3000 },
  { code: 'MASSAGE-009', displayCategory: 'Тело / Массаж', name: 'Антистрессовый уход по телу (Шейно-воротниковая зона)', category: ServiceCategory.MASSAGE, baseDuration: 40, basePrice: 3000 },
  { code: 'MASSAGE-010', displayCategory: 'Тело / Массаж', name: 'Антистрессовый уход по телу (Стопы)', category: ServiceCategory.MASSAGE, baseDuration: 40, basePrice: 3000 },
  // Косметология
  { code: 'COSM-001', displayCategory: 'Косметология', name: 'Пилинг «Peach Peel»', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 7000 },
  { code: 'COSM-002', displayCategory: 'Косметология', name: 'УЗ Чистка (Лицо) + Маска по типу кожи', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4000 },
  { code: 'COSM-003', displayCategory: 'Косметология', name: 'Комбинированная Чистка', category: ServiceCategory.COSMETOLOGY, baseDuration: 105, basePrice: 4900 },
  { code: 'COSM-004', displayCategory: 'Косметология', name: 'Биолифтинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-005', displayCategory: 'Косметология', name: 'Криолифтинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-006', displayCategory: 'Косметология', name: 'Барофорез', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-007', displayCategory: 'Косметология', name: 'Ультра Фоно Форез', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-008', displayCategory: 'Косметология', name: 'Программа «Индибо»', category: ServiceCategory.COSMETOLOGY, baseDuration: 90, basePrice: 6500 },
  { code: 'COSM-009', displayCategory: 'Косметология', name: 'Интенсивная лифтинг программа (RF)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-010', displayCategory: 'Косметология', name: 'Фракционное увлажнение (Др)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 6500 },
  { code: 'COSM-011', displayCategory: 'Косметология', name: 'Антикуперозная программа', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 6900 },
  { code: 'COSM-012', displayCategory: 'Косметология', name: 'Экспресс омоложение', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4600 },
  { code: 'COSM-013', displayCategory: 'Косметология', name: 'Эффективное и глубокое очищение кожи лица + Маска по типу кожи (Am)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 5200 },
  { code: 'COSM-014', displayCategory: 'Косметология', name: 'Обогащение кожи кислородом (Кр)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-015', displayCategory: 'Косметология', name: 'Пилинг «Anti Age»', category: ServiceCategory.COSMETOLOGY, baseDuration: 30, basePrice: 4200 },
  { code: 'COSM-016', displayCategory: 'Косметология', name: 'Поверхностный пилинг (Всесезонный)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4200 },
  { code: 'COSM-017', displayCategory: 'Косметология', name: 'Коралловый пилинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 7000 },
  { code: 'COSM-018', displayCategory: 'Косметология', name: 'Азелаиновый пилинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  { code: 'COSM-019', displayCategory: 'Косметология', name: 'Ангельский пилинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 5000 },
  { code: 'COSM-020', displayCategory: 'Косметология', name: 'Пилинг «BTX»', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 4500 },
  // Аппаратная косметология
  { code: 'HARDWARE-001', displayCategory: 'Аппаратная косметология', name: 'Дермальный стимулятор («Peach Peel» / PRX)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 7000 },
  { code: 'HARDWARE-002', displayCategory: 'Аппаратная косметология', name: 'Фракционная мезотерапия («Rosalex» / Multi pep)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 9000 },
  { code: 'HARDWARE-003', displayCategory: 'Аппаратная косметология', name: 'Фото-омоложение (1 Посещение)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 8000 },
  { code: 'HARDWARE-004', displayCategory: 'Аппаратная косметология', name: 'Карбоновый пилинг', category: ServiceCategory.COSMETOLOGY, baseDuration: 40, basePrice: 6000 },
  { code: 'HARDWARE-005', displayCategory: 'Аппаратная косметология', name: 'Программа «Контраст»', category: ServiceCategory.COSMETOLOGY, baseDuration: 40, basePrice: 4500 },
  { code: 'HARDWARE-006', displayCategory: 'Аппаратная косметология', name: 'Бьютификация (Лицо, шея, зона декольте)', category: ServiceCategory.COSMETOLOGY, baseDuration: 60, basePrice: 29000 },
  // Тело / Аппаратные процедуры
  { code: 'BODY-HW-001', displayCategory: 'Тело / Аппаратные процедуры', name: 'Антистрессовый уход по телу (Живот)', category: ServiceCategory.BODY_CONTOURING, baseDuration: 30, basePrice: 4500 },
  { code: 'BODY-HW-002', displayCategory: 'Тело / Аппаратные процедуры', name: 'Триггерный уход по телу', category: ServiceCategory.BODY_CONTOURING, baseDuration: 60, basePrice: 4600 },
  { code: 'BODY-HW-003', displayCategory: 'Тело / Аппаратные процедуры', name: 'Программа «Тайский Слим»', category: ServiceCategory.BODY_CONTOURING, baseDuration: 60, basePrice: 5200 },
  { code: 'BODY-HW-004', displayCategory: 'Тело / Аппаратные процедуры', name: 'Программа «Эндосфера»', category: ServiceCategory.BODY_CONTOURING, baseDuration: 70, basePrice: 6500 },
  { code: 'BODY-HW-005', displayCategory: 'Тело / Аппаратные процедуры', name: 'Программа «Индибо»', category: ServiceCategory.BODY_CONTOURING, baseDuration: 60, basePrice: 5800 },
  { code: 'BODY-HW-006', displayCategory: 'Тело / Аппаратные процедуры', name: 'RF Тело', category: ServiceCategory.BODY_CONTOURING, baseDuration: 40, basePrice: 3500 },
  { code: 'BODY-HW-007', displayCategory: 'Тело / Аппаратные процедуры', name: 'Программа «УВТ»', category: ServiceCategory.BODY_CONTOURING, baseDuration: 45, basePrice: 3200 },
  { code: 'BODY-HW-008', displayCategory: 'Тело / Аппаратные процедуры', name: 'Миостимуляция', category: ServiceCategory.BODY_CONTOURING, baseDuration: 45, basePrice: 3200 },
  { code: 'BODY-HW-009', displayCategory: 'Тело / Аппаратные процедуры', name: 'Криолиполиз (1 Насадка)', category: ServiceCategory.BODY_CONTOURING, baseDuration: 60, basePrice: 3500 },
  // Тело / SPA
  { code: 'SPA-001', displayCategory: 'Тело / SPA', name: 'Обще-расслабляющий, антистрессовый уход по телу (Спина, ноги, стопы, руки)', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'SPA-002', displayCategory: 'Тело / SPA', name: 'Обще-расслабляющий, антистрессовый уход по телу', category: ServiceCategory.MASSAGE, baseDuration: 90, basePrice: 6500 },
  { code: 'SPA-003', displayCategory: 'Тело / SPA', name: 'Программа «Легкость»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'SPA-004', displayCategory: 'Тело / SPA', name: 'Триггерный уход по телу', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'SPA-005', displayCategory: 'Тело / SPA', name: '«Медовый рай» (Спина, ноги, руки, живот)', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4800 },
  { code: 'SPA-006', displayCategory: 'Тело / SPA', name: 'Ци-сюэ-тонг', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'SPA-007', displayCategory: 'Тело / SPA', name: 'Программа «Силуэт»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4600 },
  { code: 'SPA-008', displayCategory: 'Тело / SPA', name: 'Индийский уход по телу', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4700 },
  { code: 'SPA-009', displayCategory: 'Тело / SPA', name: 'Коррекционный уход по телу', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4700 },
  { code: 'SPA-010', displayCategory: 'Тело / SPA', name: '«Сибирское здоровье»', category: ServiceCategory.MASSAGE, baseDuration: 60, basePrice: 4700 },
] as const;

// Old demo service fixed IDs created by previous seed — deactivate, do not delete
const OLD_DEMO_SERVICE_IDS = Array.from({ length: 10 }, (_, i) =>
  `00000000-0000-0000-0001-${String(i + 1).padStart(12, '0')}`,
);

const FIRST_NAMES_F = ['Анна', 'Мария', 'Екатерина', 'Наталья', 'Ольга', 'Светлана', 'Татьяна', 'Ирина', 'Елена', 'Юлия', 'Людмила', 'Виктория', 'Галина', 'Надежда', 'Алина', 'Дарья', 'Полина', 'Ксения', 'Валерия', 'Алёна', 'Нина', 'Вера', 'Лариса', 'Маргарита', 'Зоя', 'Кристина', 'Яна', 'Диана', 'Евгения', 'Антонина'];
const FIRST_NAMES_M = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил', 'Никита', 'Павел', 'Роман', 'Владимир', 'Денис', 'Игорь', 'Владислав', 'Иван', 'Антон', 'Олег'];
const LAST_NAMES = ['Иванова', 'Петрова', 'Сидорова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Михайлова', 'Новикова', 'Фёдорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова', 'Павлова', 'Козлова', 'Степанова', 'Николаева', 'Орлова', 'Соколова', 'Захарова', 'Чернова', 'Борисова', 'Ефимова', 'Фомина', 'Громова', 'Беляева', 'Антонова'];
const REFERRAL_SOURCES = ['instagram', 'vk', 'telegram', 'friend', 'google', 'yandex', 'flyer', 'event', 'repeat'];
const LOYALTY_TIERS = ['BRONZE', 'BRONZE', 'BRONZE', 'SILVER', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];

function pick<T>(arr: readonly T[]): T {
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

  // ─── Deactivate old demo services ────────────────────────────
  const deactivated = await prisma.service.updateMany({
    where: { id: { in: OLD_DEMO_SERVICE_IDS } },
    data: { isActive: false },
  });
  if (deactivated.count > 0) {
    console.log(`   Deactivated ${deactivated.count} legacy demo service(s)`);
  }

  // ─── Real service catalog (60 procedures) ────────────────────
  console.log(`   Importing ${REAL_SERVICES.length} real procedures...`);
  const allServices: { id: string; category: ServiceCategory; baseDuration: number; basePrice: number }[] = [];

  for (let i = 0; i < REAL_SERVICES.length; i++) {
    const svc = REAL_SERVICES[i];
    const service = await prisma.service.upsert({
      where: { serviceCode: svc.code },
      update: {
        name: svc.name,
        displayCategory: svc.displayCategory,
        category: svc.category,
        basePrice: svc.basePrice,
        baseDuration: svc.baseDuration,
        isActive: true,
      },
      create: {
        serviceCode: svc.code,
        displayCategory: svc.displayCategory,
        name: svc.name,
        category: svc.category,
        basePrice: svc.basePrice,
        baseDuration: svc.baseDuration,
        isActive: true,
        sortOrder: i,
      },
    });

    await prisma.serviceLocationPrice.upsert({
      where: { serviceId_locationId: { serviceId: service.id, locationId: location.id } },
      update: {},
      create: { serviceId: service.id, locationId: location.id, price: svc.basePrice, duration: svc.baseDuration },
    });

    allServices.push({ id: service.id, category: service.category, baseDuration: service.baseDuration, basePrice: Number(service.basePrice) });
  }
  console.log(`   ✓ ${allServices.length} services ready`);

  // ─── Real specialists (from Соревнования МАЙ 2026 roster) ────
  const specialistPassword = await hash('spec123', 10);
  const specialistProfiles = [
    { email: 'specialist1@shantelyur.ru',  firstName: 'Олеся',     lastName: 'Хвесько',      specialization: 'Косметология, уходовые процедуры', experienceYears: 5,  color: '#6366f1', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist2@shantelyur.ru',  firstName: 'Марина',    lastName: 'Мищенко',      specialization: 'Массаж, SPA',                       experienceYears: 6,  color: '#D4AF7A', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist3@shantelyur.ru',  firstName: 'Анна',      lastName: 'Степанова',    specialization: 'Косметология',                      experienceYears: 7,  color: '#8BA888', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist4@shantelyur.ru',  firstName: 'Ирина',     lastName: 'Шипицина',     specialization: 'Массаж, антистресс',                experienceYears: 5,  color: '#E8C4B8', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist5@shantelyur.ru',  firstName: 'Варвара',   lastName: 'Сырачева',     specialization: 'Уходовые процедуры, SPA',           experienceYears: 4,  color: '#B8A8D4', serviceCategories: [ServiceCategory.FACIAL, ServiceCategory.MASSAGE] },
    { email: 'specialist6@shantelyur.ru',  firstName: 'Ирина',     lastName: 'Болищук',      specialization: 'Косметология, аппаратные процедуры',experienceYears: 6,  color: '#4ECDC4', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist7@shantelyur.ru',  firstName: 'Кирилл',    lastName: 'Красильников', specialization: 'Массаж, телесные практики',         experienceYears: 5,  color: '#45B7D1', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist8@shantelyur.ru',  firstName: 'Кристина',  lastName: 'Тоноян',       specialization: 'Косметология',                      experienceYears: 4,  color: '#96CEB4', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist9@shantelyur.ru',  firstName: 'Денис',     lastName: 'Николаев',     specialization: 'Массаж, реабилитация',              experienceYears: 6,  color: '#DDA0DD', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist10@shantelyur.ru', firstName: 'Ирина',     lastName: 'Доронина',     specialization: 'Уходовые процедуры, SPA',           experienceYears: 5,  color: '#98D8C8', serviceCategories: [ServiceCategory.FACIAL, ServiceCategory.MASSAGE] },
    { email: 'specialist11@shantelyur.ru', firstName: 'Петр',      lastName: 'Леминов',      specialization: 'Массаж',                            experienceYears: 4,  color: '#F0B27A', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist12@shantelyur.ru', firstName: 'Елена',     lastName: 'Крутикова',    specialization: 'Косметология, уходовые процедуры', experienceYears: 5,  color: '#BB8FCE', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist13@shantelyur.ru', firstName: 'Влад',      lastName: 'Борисов',      specialization: 'Массаж, телесные практики',         experienceYears: 4,  color: '#85C1E9', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist14@shantelyur.ru', firstName: 'Мохамад',   lastName: '',             specialization: 'Массаж',                            experienceYears: 3,  color: '#82E0AA', serviceCategories: [ServiceCategory.MASSAGE] },
    { email: 'specialist15@shantelyur.ru', firstName: 'Александр', lastName: 'Сафин',        specialization: 'Массаж, SPA',                       experienceYears: 4,  color: '#F1948A', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist16@shantelyur.ru', firstName: 'Анастасия', lastName: 'Кочкина',      specialization: 'Косметология',                      experienceYears: 3,  color: '#AED6F1', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist17@shantelyur.ru', firstName: 'Алина',     lastName: 'Артемьева',    specialization: 'Уходовые процедуры, SPA',           experienceYears: 3,  color: '#A9DFBF', serviceCategories: [ServiceCategory.FACIAL, ServiceCategory.MASSAGE] },
    { email: 'specialist18@shantelyur.ru', firstName: 'Лиана',     lastName: 'Акмалова',     specialization: 'Косметология, уходовые процедуры', experienceYears: 3,  color: '#FAD7A0', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist19@shantelyur.ru', firstName: 'Антон',     lastName: 'Василюк',      specialization: 'Массаж',                            experienceYears: 4,  color: '#D2B4DE', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
    { email: 'specialist20@shantelyur.ru', firstName: 'Анастасия', lastName: 'Хворостова',   specialization: 'Косметология',                      experienceYears: 2,  color: '#FFDAB9', serviceCategories: [ServiceCategory.COSMETOLOGY, ServiceCategory.FACIAL] },
    { email: 'specialist21@shantelyur.ru', firstName: 'Борислав',  lastName: 'Карипов',      specialization: 'Массаж, телесные практики',         experienceYears: 3,  color: '#C8E6C9', serviceCategories: [ServiceCategory.MASSAGE, ServiceCategory.BODY_CONTOURING] },
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
      update: { specialization: sp.specialization },
      create: {
        id: specId, userId: user.id, specialization: sp.specialization,
        experienceYears: sp.experienceYears, commissionRate: 0.30, color: sp.color,
        status: SpecialistStatus.ACTIVE, reviewCount: 0, sortOrder: i,
      },
    });

    createdSpecialists.push(specialist);

    // Link to real services matching this specialist's categories
    const myServices = allServices.filter((s) => (sp.serviceCategories as ServiceCategory[]).includes(s.category));

    await prisma.specialistService.deleteMany({
      where: { specialistId: specialist.id, serviceId: { notIn: myServices.map((s) => s.id) } },
    });

    for (const svc of myServices) {
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
  const clientBatch: Array<{ id: string; email: string }> = [];

  for (let i = 0; i < 500; i++) {
    const isFemale = Math.random() > 0.15;
    const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const lastNameRaw = pick(LAST_NAMES);
    const lastName = isFemale ? lastNameRaw : lastNameRaw.replace(/а$/, '').replace(/ова$/, 'ов').replace(/ева$/, 'ев');
    const emailId = `${i + 1}`.padStart(5, '0');
    const email = `client${emailId}@salon-demo.ru`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      clientBatch.push({ id: existingUser.id, email });
      continue;
    }

    const userId = await prisma.user.create({
      data: { email, passwordHash: 'CLIENT_NO_LOGIN', firstName, lastName, role: UserRole.CLIENT, status: UserStatus.ACTIVE, emailVerified: false },
      select: { id: true },
    });
    clientBatch.push({ id: userId.id, email });
    clientsCreated++;
  }
  console.log(`   Created ${clientsCreated} new clients`);

  let profilesCreated = 0;
  for (const client of clientBatch) {
    const existing = await prisma.customerProfile.findUnique({ where: { userId: client.id } });
    if (existing) continue;

    const visits = randomInt(0, 24);
    const spent = visits * randomInt(3000, 12000);
    await prisma.customerProfile.create({
      data: {
        userId: client.id,
        referralSource: pick(REFERRAL_SOURCES),
        totalVisits: visits,
        totalSpent: spent,
        loyaltyTier: pick(LOYALTY_TIERS),
        loyaltyPoints: Math.floor(spent / 100),
        firstVisitAt: visits > 0 ? randomDate(twoYearsAgo, now) : null,
        lastVisitAt: visits > 0 ? randomDate(twoYearsAgo, now) : null,
        createdAt: randomDate(twoYearsAgo, now),
      },
    });
    profilesCreated++;
  }
  console.log(`   Created ${profilesCreated} customer profiles`);

  // ─── Test client (for login) ──────────────────────────────────
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

  // ─── Sample appointments ──────────────────────────────────────
  console.log('   Creating sample appointments...');
  const firstSpecialist = createdSpecialists[0];
  const firstService = allServices[0];
  if (firstSpecialist && firstService && clientBatch.length > 0) {
    for (let i = 0; i < 10 && i < clientBatch.length; i++) {
      const start = randomDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), now);
      start.setMinutes(0, 0, 0);
      const end = new Date(start.getTime() + firstService.baseDuration * 60_000);
      try {
        await prisma.appointment.create({
          data: {
            clientId: clientBatch[i].id,
            specialistId: firstSpecialist.id,
            locationId: location.id,
            startAt: start,
            endAt: end,
            status: 'COMPLETED',
            totalPrice: firstService.basePrice,
            totalDuration: firstService.baseDuration,
            source: 'admin',
            services: { create: [{ serviceId: firstService.id, price: firstService.basePrice, duration: firstService.baseDuration, sortOrder: 0 }] },
          },
        });
      } catch { /* skip duplicate time slots */ }
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

  // ─── Inventory Items ─────────────────────────────────────────
  const { randomUUID } = await import('crypto');
  const inventoryData = [
    { name: 'Масло для массажа лица', category: 'MASSAGE_OILS', unit: 'мл', currentStock: 2400, minStock: 500, costPerUnit: 1.2, supplier: 'SPA Supply Co', notes: 'Гипоаллергенное, без отдушек' },
    { name: 'Масло антицеллюлитное', category: 'MASSAGE_OILS', unit: 'мл', currentStock: 1800, minStock: 400, costPerUnit: 0.9, supplier: 'SPA Supply Co' },
    { name: 'Масло ароматерапевтическое (лаванда)', category: 'MASSAGE_OILS', unit: 'мл', currentStock: 800, minStock: 300, costPerUnit: 2.5, supplier: 'EssentialOils RU' },
    { name: 'Полотенца одноразовые', category: 'MASSAGE_CONSUMABLES', unit: 'шт', currentStock: 500, minStock: 100, costPerUnit: 15, supplier: 'МедСнаб' },
    { name: 'Простыни одноразовые', category: 'MASSAGE_CONSUMABLES', unit: 'шт', currentStock: 300, minStock: 80, costPerUnit: 25, supplier: 'МедСнаб' },
    { name: 'Мезотерапевтические иглы 30G', category: 'COSMETOLOGY_INJECTABLES', unit: 'шт', currentStock: 200, minStock: 50, costPerUnit: 45, supplier: 'MesoTech', expiresAt: new Date('2027-06-01') },
    { name: 'Гиалуроновая кислота 1мл', category: 'COSMETOLOGY_INJECTABLES', unit: 'флакон', currentStock: 30, minStock: 10, costPerUnit: 3500, supplier: 'PharmBeauty', expiresAt: new Date('2026-12-31') },
    { name: 'Сыворотка для биоревитализации', category: 'COSMETOLOGY_SKINCARE', unit: 'мл', currentStock: 400, minStock: 100, costPerUnit: 8.5, supplier: 'DermaCare Pro', expiresAt: new Date('2026-09-30') },
    { name: 'Пилинг-крем', category: 'COSMETOLOGY_SKINCARE', unit: 'мл', currentStock: 600, minStock: 150, costPerUnit: 3.2, supplier: 'SkinLab' },
    { name: 'RF-гель проводящий', category: 'COSMETOLOGY_CONSUMABLES', unit: 'мл', currentStock: 1200, minStock: 200, costPerUnit: 1.5, supplier: 'MediDevice' },
    { name: 'Перчатки нитриловые (S)', category: 'GENERAL', unit: 'пара', currentStock: 400, minStock: 100, costPerUnit: 12, supplier: 'МедСнаб' },
    { name: 'Перчатки нитриловые (M)', category: 'GENERAL', unit: 'пара', currentStock: 350, minStock: 100, costPerUnit: 12, supplier: 'МедСнаб' },
    { name: 'Антисептик для рук 500мл', category: 'GENERAL', unit: 'фл', currentStock: 20, minStock: 10, costPerUnit: 180, supplier: 'SanitarMarket' },
    { name: 'Воск депиляционный', category: 'COSMETOLOGY_CONSUMABLES', unit: 'г', currentStock: 3000, minStock: 500, costPerUnit: 0.3, supplier: 'EpilPro' },
  ];

  for (const item of inventoryData) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      const created = await prisma.inventoryItem.create({
        data: {
          id: randomUUID(),
          name: item.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: item.category as any,
          unit: item.unit,
          currentStock: item.currentStock,
          minStock: item.minStock,
          costPerUnit: item.costPerUnit,
          supplier: item.supplier ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresAt: (item as any).expiresAt ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes: (item as any).notes ?? null,
          isActive: true,
        },
      });
      await prisma.stockMovement.create({
        data: {
          id: randomUUID(),
          inventoryItemId: created.id,
          type: 'PURCHASE',
          quantity: item.currentStock,
          balanceAfter: item.currentStock,
          reason: 'Начальный остаток при инициализации',
          userId: superAdmin.id,
        },
      });
    }
  }
  console.log(`   Inventory items seeded: ${inventoryData.length}`);

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
  console.log(`   Admin:       admin@shantelyur.ru / admin123`);
  console.log(`   Specialist:  specialist1@shantelyur.ru / spec123`);
  console.log(`   Client:      client@example.com / client123`);
  console.log(`   Services:    ${allServices.length} real procedures imported`);
  console.log(`   Clients:     ${totalClients}`);
  console.log(`   Specialists: ${totalSpecialists} (add real staff via admin panel)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
