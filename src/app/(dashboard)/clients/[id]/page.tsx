'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  Clock,
  Star,
  Repeat,
  FileText,
  Camera,
  Plus,
  Droplets,
  Hand,
  Leaf,
  ChevronRight,
  CircleDot,
  MessageSquare,
  Lock,
  Users,
  Eye,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils';

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

const LOYALTY_LABELS: Record<LoyaltyTier, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
};

const LOYALTY_VARIANT: Record<LoyaltyTier, 'bronze' | 'silver' | 'gold' | 'platinum'> = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

const SEVERITY_LABELS = { mild: 'слабая', moderate: 'умеренная', severe: 'сильная' };
const SEVERITY_COLORS = {
  mild: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  moderate: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  severe: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const PRESSURE_LABELS = {
  light: 'Мягкое',
  medium: 'Среднее',
  firm: 'Глубокое',
  deep: 'Интенсивное',
};

const NOTE_TYPE_LABELS = {
  consultation: 'Консультация',
  procedure: 'Процедура',
  followup: 'Наблюдение',
  general: 'Общее',
  complaint: 'Жалоба',
};

const PRIVACY_LABELS = {
  PRIVATE: 'Только я',
  SHARED: 'Для специалистов',
  ADMIN_ONLY: 'Администрация',
  CLIENT_VISIBLE: 'Видно клиенту',
};

const PRIVACY_ICONS = {
  PRIVATE: Lock,
  SHARED: Users,
  ADMIN_ONLY: ShieldAlert,
  CLIENT_VISIBLE: Eye,
};

const CATEGORY_LABELS: Record<string, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE: 'Массаж',
  INJECTION: 'Инъекции',
  LASER: 'Лазер',
  FACIAL: 'Уход за лицом',
  BODY_CONTOURING: 'Коррекция тела',
  HAIR_REMOVAL: 'Эпиляция',
};

const RECOMMENDATION_TYPE_LABELS = {
  treatment: 'Процедура',
  product: 'Продукт',
  lifestyle: 'Образ жизни',
  homecare: 'Домашний уход',
};

interface ClientDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  gender: string;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  firstVisitAt: Date;
  lastVisitAt: Date;
  churnRiskScore: number;
  preferredSpecialist?: string;
  referralSource?: string;
  cosmetologyProfile?: {
    skinType: string;
    skinConcerns: string[];
    lastPeelingDate?: Date;
    lastInjectionDate?: Date;
    homeRoutine?: string;
    reactionHistory?: string;
    sunSensitivity?: string;
  };
  massageProfile?: {
    bodyType?: string;
    pressurePreference: 'light' | 'medium' | 'firm' | 'deep';
    focusAreas: string[];
    avoidAreas?: string[];
    oilPreferences?: string;
    temperaturePreference?: string;
    additionalNotes?: string;
  };
  allergies: Array<{
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction?: string;
    diagnosedAt?: Date;
  }>;
  restrictions: Array<{
    type: 'medical' | 'pregnancy' | 'medication' | 'other';
    description: string;
    validFrom?: Date;
    validUntil?: Date;
    isActive: boolean;
  }>;
  procedureHistory: Array<{
    id: string;
    serviceName: string;
    serviceCategory: string;
    specialistName: string;
    performedAt: Date;
    results?: string;
    sideEffects?: string;
    clientFeedback?: string;
    followUpRequired: boolean;
    followUpDate?: Date;
    rating?: number;
  }>;
  specialistNotes: Array<{
    id: string;
    specialistName: string;
    noteType: keyof typeof NOTE_TYPE_LABELS;
    content: string;
    privacy: keyof typeof PRIVACY_LABELS;
    createdAt: Date;
  }>;
  recurringTreatments: Array<{
    id: string;
    serviceName: string;
    serviceCategory: string;
    frequencyDays: number;
    lastPerformedAt?: Date;
    nextRecommendedAt?: Date;
    specialistName?: string;
    isActive: boolean;
  }>;
  recommendations: Array<{
    id: string;
    type: keyof typeof RECOMMENDATION_TYPE_LABELS;
    text: string;
    specialistName: string;
    createdAt: Date;
    urgency: 'routine' | 'recommended' | 'urgent';
  }>;
  beforeAfterSessions: Array<{
    id: string;
    serviceName: string;
    performedAt: Date;
    specialistName: string;
    hasPhotos: boolean;
  }>;
}

const MOCK_CLIENTS: Record<string, ClientDetail> = {
  '1': {
    id: '1', firstName: 'Ирина', lastName: 'Волкова',
    phone: '+7 (916) 234-56-78', email: 'ivolkova@mail.ru',
    dateOfBirth: new Date('1985-03-22'), gender: 'female',
    loyaltyTier: 'PLATINUM', loyaltyPoints: 6420,
    totalVisits: 64, totalSpent: 38400000,
    firstVisitAt: new Date('2022-01-15'), lastVisitAt: new Date('2025-05-14'),
    churnRiskScore: 0.04, preferredSpecialist: 'Мария П.',
    referralSource: 'instagram',
    cosmetologyProfile: {
      skinType: 'комбинированная',
      skinConcerns: ['возрастные изменения', 'потеря упругости', 'носогубные складки'],
      lastPeelingDate: new Date('2025-04-10'),
      lastInjectionDate: new Date('2025-03-20'),
      homeRoutine: 'Cerave увлажняющий крем, SPF 50+ утром, ретиноевый крем на ночь',
      reactionHistory: 'Лёгкое покраснение на кислотный пилинг — снижена концентрация',
      sunSensitivity: 'высокая',
    },
    allergies: [],
    restrictions: [],
    procedureHistory: [
      {
        id: 'ph1', serviceName: 'Биоревитализация Juvederm', serviceCategory: 'INJECTION',
        specialistName: 'Мария П.', performedAt: new Date('2025-05-14'),
        results: 'Отличное увлажнение кожи, выраженное сияние. Пациентка довольна результатом.',
        sideEffects: 'Небольшой отёк в зоне введения, прошёл через 24 часа.',
        clientFeedback: 'Очень довольна результатом, кожа стала значительно мягче.',
        followUpRequired: true, followUpDate: new Date('2025-07-14'), rating: 5,
      },
      {
        id: 'ph2', serviceName: 'AHA-пилинг 35%', serviceCategory: 'COSMETOLOGY',
        specialistName: 'Мария П.', performedAt: new Date('2025-04-10'),
        results: 'Выравнивание тона кожи. Незначительное шелушение в течение 3 дней.',
        clientFeedback: 'Кожа выглядит заметно свежее.',
        followUpRequired: false, rating: 5,
      },
      {
        id: 'ph3', serviceName: 'Контурная пластика губ', serviceCategory: 'INJECTION',
        specialistName: 'Мария П.', performedAt: new Date('2025-03-20'),
        results: 'Коррекция объёма, чёткий контур. Натуральный результат.',
        sideEffects: 'Отёк 2 дня, синяк 4 дня.',
        clientFeedback: 'Идеально, именно то, что хотела.',
        followUpRequired: true, followUpDate: new Date('2025-09-20'), rating: 5,
      },
    ],
    specialistNotes: [
      {
        id: 'sn1', specialistName: 'Мария П.',
        noteType: 'consultation', privacy: 'SHARED',
        content: 'Клиентка пришла с жалобой на потерю упругости щёк. Рекомендованы регулярные инъекции биоревитализанта и поддерживающий курс RF-лифтинга. Кожа чувствительна к кислотам выше 35%.',
        createdAt: new Date('2025-05-14'),
      },
      {
        id: 'sn2', specialistName: 'Мария П.',
        noteType: 'procedure', privacy: 'PRIVATE',
        content: 'Использовала Juvederm Volite 1 мл, техника мезотерапии по щёкам и лбу. Следующая процедура через 8-12 недель.',
        createdAt: new Date('2025-05-14'),
      },
    ],
    recurringTreatments: [
      {
        id: 'rt1', serviceName: 'Биоревитализация',
        serviceCategory: 'INJECTION', frequencyDays: 60,
        lastPerformedAt: new Date('2025-05-14'),
        nextRecommendedAt: new Date('2025-07-14'),
        specialistName: 'Мария П.', isActive: true,
      },
      {
        id: 'rt2', serviceName: 'AHA-пилинг',
        serviceCategory: 'COSMETOLOGY', frequencyDays: 28,
        lastPerformedAt: new Date('2025-04-10'),
        nextRecommendedAt: new Date('2025-05-22'),
        specialistName: 'Мария П.', isActive: true,
      },
    ],
    recommendations: [
      {
        id: 'rec1', type: 'product',
        text: 'Использовать SPF 50+ ежедневно, усилить домашний уход с гиалуроновой кислотой.',
        specialistName: 'Мария П.', createdAt: new Date('2025-05-14'), urgency: 'urgent',
      },
      {
        id: 'rec2', type: 'treatment',
        text: 'Курс SMAS-лифтинга (4 сеанса) — для долгосрочного лифтинга без инъекций.',
        specialistName: 'Мария П.', createdAt: new Date('2025-04-10'), urgency: 'recommended',
      },
    ],
    beforeAfterSessions: [
      { id: 'ba1', serviceName: 'Контурная пластика', performedAt: new Date('2025-03-20'), specialistName: 'Мария П.', hasPhotos: true },
      { id: 'ba2', serviceName: 'AHA-пилинг', performedAt: new Date('2025-04-10'), specialistName: 'Мария П.', hasPhotos: false },
    ],
  },
  '2': {
    id: '2', firstName: 'Анна', lastName: 'Соколова',
    phone: '+7 (903) 456-78-90', email: 'anna.sokolova@gmail.com',
    dateOfBirth: new Date('1992-07-08'), gender: 'female',
    loyaltyTier: 'GOLD', loyaltyPoints: 1450,
    totalVisits: 28, totalSpent: 15200000,
    firstVisitAt: new Date('2023-04-12'), lastVisitAt: new Date('2025-05-10'),
    churnRiskScore: 0.11, preferredSpecialist: 'Мария П.',
    cosmetologyProfile: {
      skinType: 'жирная',
      skinConcerns: ['акне', 'расширенные поры', 'жирный блеск', 'постакне'],
      lastPeelingDate: new Date('2025-05-10'),
      homeRoutine: 'La Roche-Posay Effaclar очищение, нiacinamide сыворотка, лёгкий увлажнитель',
      reactionHistory: 'Не переносит ретинол в концентрации выше 0.3% — покраснение и шелушение',
      sunSensitivity: 'средняя',
    },
    allergies: [
      {
        allergen: 'Ретинол (концентрация > 0.3%)',
        severity: 'moderate',
        reaction: 'Выраженное покраснение, шелушение, зуд. При местном применении.',
        diagnosedAt: new Date('2023-06-20'),
      },
      {
        allergen: 'Никель (в украшениях)',
        severity: 'mild',
        reaction: 'Контактный дерматит — покраснение в месте контакта.',
        diagnosedAt: new Date('2023-04-12'),
      },
    ],
    restrictions: [],
    procedureHistory: [
      {
        id: 'ph1', serviceName: 'Пилинг BHA (салициловая 30%)', serviceCategory: 'COSMETOLOGY',
        specialistName: 'Мария П.', performedAt: new Date('2025-05-10'),
        results: 'Хорошее сужение пор, матирование. Кожа заметно чище после 3 дней.',
        clientFeedback: 'Довольна, поры стали значительно меньше.',
        followUpRequired: false, rating: 5,
      },
      {
        id: 'ph2', serviceName: 'Микродермабразия', serviceCategory: 'COSMETOLOGY',
        specialistName: 'Мария П.', performedAt: new Date('2025-04-12'),
        results: 'Выравнивание постакне, улучшение текстуры кожи.',
        sideEffects: 'Небольшое покраснение 4 часа.',
        clientFeedback: 'Хотелось бы более заметного результата — договорились на курс.',
        followUpRequired: true, followUpDate: new Date('2025-05-12'), rating: 4,
      },
      {
        id: 'ph3', serviceName: 'Гиалуроновый лифтинг', serviceCategory: 'FACIAL',
        specialistName: 'Мария П.', performedAt: new Date('2025-03-08'),
        results: 'Выраженное увлажнение, кожа стала мягче.',
        clientFeedback: 'Очень понравилось, расслабляющая процедура.',
        followUpRequired: false, rating: 5,
      },
    ],
    specialistNotes: [
      {
        id: 'sn1', specialistName: 'Мария П.',
        noteType: 'consultation', privacy: 'SHARED',
        content: 'Акне-склонная жирная кожа. НЕЛЬЗЯ использовать ретинол выше 0.3%. Рекомендован курс BHA-пилингов (6 процедур с интервалом 28 дней). Домашний уход согласован.',
        createdAt: new Date('2025-05-10'),
      },
      {
        id: 'sn2', specialistName: 'Мария П.',
        noteType: 'followup', privacy: 'PRIVATE',
        content: 'Ответила хорошо на BHA-курс. Продолжаем. Следующий шаг — добавить AHA в чередование (10% через 2 недели после BHA).',
        createdAt: new Date('2025-05-10'),
      },
    ],
    recurringTreatments: [
      {
        id: 'rt1', serviceName: 'BHA-пилинг',
        serviceCategory: 'COSMETOLOGY', frequencyDays: 28,
        lastPerformedAt: new Date('2025-05-10'),
        nextRecommendedAt: new Date('2025-06-07'),
        specialistName: 'Мария П.', isActive: true,
      },
      {
        id: 'rt2', serviceName: 'Глубокое увлажнение',
        serviceCategory: 'FACIAL', frequencyDays: 21,
        lastPerformedAt: new Date('2025-03-08'),
        nextRecommendedAt: new Date('2025-04-05'),
        specialistName: 'Мария П.', isActive: false,
      },
    ],
    recommendations: [
      {
        id: 'rec1', type: 'homecare',
        text: 'Никакого ретинола выше 0.3%. Заменить на азелаиновую кислоту для акне-коррекции.',
        specialistName: 'Мария П.', createdAt: new Date('2025-05-10'), urgency: 'urgent',
      },
      {
        id: 'rec2', type: 'treatment',
        text: 'Курс LED-терапии (красный + синий) — 8 сеансов для противовоспалительного эффекта.',
        specialistName: 'Мария П.', createdAt: new Date('2025-04-12'), urgency: 'recommended',
      },
    ],
    beforeAfterSessions: [
      { id: 'ba1', serviceName: 'Курс BHA-пилингов', performedAt: new Date('2025-05-10'), specialistName: 'Мария П.', hasPhotos: true },
    ],
  },
  '3': {
    id: '3', firstName: 'Наталья', lastName: 'Волчкова',
    phone: '+7 (921) 567-89-01', email: 'nvolchkova@yandex.ru',
    dateOfBirth: new Date('1978-11-30'), gender: 'female',
    loyaltyTier: 'GOLD', loyaltyPoints: 2310,
    totalVisits: 31, totalSpent: 13800000,
    firstVisitAt: new Date('2022-09-05'), lastVisitAt: new Date('2025-05-08'),
    churnRiskScore: 0.08, preferredSpecialist: 'Наталья В.',
    massageProfile: {
      bodyType: 'нормальное',
      pressurePreference: 'deep',
      focusAreas: ['спина', 'поясница', 'шея и плечи'],
      avoidAreas: ['нижняя часть поясницы (позвоночник L4-L5)'],
      oilPreferences: 'Нейтральное масло без ароматизаторов (без лаванды!)',
      temperaturePreference: 'warm',
      additionalNotes: 'Предпочитает работу с горячими камнями на спине. После массажа 20 мин отдых обязателен.',
    },
    allergies: [
      {
        allergen: 'Лавандовое масло',
        severity: 'mild',
        reaction: 'Зуд и покраснение кожи при контакте.',
        diagnosedAt: new Date('2022-10-15'),
      },
    ],
    restrictions: [
      {
        type: 'medical',
        description: 'Протрузия межпозвонковых дисков L4-L5. Запрещены: осевые нагрузки, глубокое надавливание в зоне поясничного отдела позвоночника, скручивания.',
        validFrom: new Date('2022-09-05'),
        isActive: true,
      },
    ],
    procedureHistory: [
      {
        id: 'ph1', serviceName: 'Нейромышечный массаж (спина + шея)', serviceCategory: 'MASSAGE',
        specialistName: 'Наталья В.', performedAt: new Date('2025-05-08'),
        results: 'Снятие спазма трапециевидной мышцы. Клиентка отметила значительное облегчение.',
        clientFeedback: 'Боль в шее прошла после процедуры. Буду возвращаться.',
        followUpRequired: true, followUpDate: new Date('2025-05-22'), rating: 5,
      },
      {
        id: 'ph2', serviceName: 'Антицеллюлитный массаж (ноги)', serviceCategory: 'BODY_CONTOURING',
        specialistName: 'Наталья В.', performedAt: new Date('2025-04-24'),
        results: 'Улучшение лимфодренажа. Заметное уменьшение отёчности.',
        clientFeedback: 'Приятно, ноги после стали легче.',
        followUpRequired: false, rating: 4,
      },
      {
        id: 'ph3', serviceName: 'Ароматерапевтический массаж (без лаванды)', serviceCategory: 'MASSAGE',
        specialistName: 'Наталья В.', performedAt: new Date('2025-04-10'),
        results: 'Расслабляющий эффект. Использовалось масло бергамота и ромашки.',
        clientFeedback: 'Очень понравилось, хочу такой же в следующий раз.',
        followUpRequired: false, rating: 5,
      },
    ],
    specialistNotes: [
      {
        id: 'sn1', specialistName: 'Наталья В.',
        noteType: 'consultation', privacy: 'SHARED',
        content: 'ВНИМАНИЕ: протрузия L4-L5. Работа только с мышцами спины, без давления на поясничный отдел позвоночника. Избегать лавандового масла. Горячие камни разрешены только в грудном и шейном отделе.',
        createdAt: new Date('2022-09-05'),
      },
      {
        id: 'sn2', specialistName: 'Наталья В.',
        noteType: 'procedure', privacy: 'PRIVATE',
        content: 'Нейромышечный: работала с точками триггера в трапеции и ромбовидной мышце. Интенсивность 8/10. Следующий раз — добавить работу с грудинно-ключично-сосцевидной.',
        createdAt: new Date('2025-05-08'),
      },
    ],
    recurringTreatments: [
      {
        id: 'rt1', serviceName: 'Нейромышечный массаж',
        serviceCategory: 'MASSAGE', frequencyDays: 14,
        lastPerformedAt: new Date('2025-05-08'),
        nextRecommendedAt: new Date('2025-05-22'),
        specialistName: 'Наталья В.', isActive: true,
      },
      {
        id: 'rt2', serviceName: 'Антицеллюлитный массаж',
        serviceCategory: 'BODY_CONTOURING', frequencyDays: 30,
        lastPerformedAt: new Date('2025-04-24'),
        nextRecommendedAt: new Date('2025-05-24'),
        specialistName: 'Наталья В.', isActive: true,
      },
    ],
    recommendations: [
      {
        id: 'rec1', type: 'lifestyle',
        text: 'ЛФК для поясничного отдела 2 раза в неделю. Согласован комплекс упражнений с тренером.',
        specialistName: 'Наталья В.', createdAt: new Date('2025-05-08'), urgency: 'recommended',
      },
      {
        id: 'rec2', type: 'treatment',
        text: 'Курс лимфодренажного массажа (8 сеансов) для выраженного лифтинга ног.',
        specialistName: 'Наталья В.', createdAt: new Date('2025-04-24'), urgency: 'routine',
      },
    ],
    beforeAfterSessions: [],
  },
};

function getClient(id: string): ClientDetail | null {
  return MOCK_CLIENTS[id] ?? null;
}

function RecurringStatusBadge({ nextDate }: { nextDate?: Date }) {
  if (!nextDate) return null;
  const today = new Date();
  const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <span className="text-[10px] font-semibold text-red-400">просрочено</span>;
  if (diffDays <= 7) return <span className="text-[10px] font-semibold text-amber-400">скоро</span>;
  return <span className="text-[10px] font-semibold text-sage">по плану</span>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn('w-3 h-3', s <= rating ? 'text-champagne fill-champagne' : 'text-border-luxury')}
        />
      ))}
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const client = getClient(id);

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary">Клиент не найден</p>
        <Link href="/clients" className="text-champagne text-sm mt-2 hover:underline inline-block">
          ← Вернуться к списку
        </Link>
      </div>
    );
  }

  const ageYears = Math.floor(
    (new Date().getTime() - client.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  const memberYears = Math.floor(
    (new Date().getTime() - client.firstVisitAt.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  const hasAlerts = client.allergies.length > 0 || client.restrictions.some((r) => r.isActive);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-champagne transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Клиенты
      </Link>

      {/* Client header */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Avatar name={`${client.firstName} ${client.lastName}`} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="font-serif text-2xl font-medium text-text-primary">
                {client.firstName} {client.lastName}
              </h2>
              <Badge variant={LOYALTY_VARIANT[client.loyaltyTier]}>
                {LOYALTY_LABELS[client.loyaltyTier]}
              </Badge>
              {hasAlerts && (
                <Badge variant="warning">
                  <AlertTriangle className="w-3 h-3" />
                  Есть предупреждения
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary mb-4">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                {client.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                {client.email}
              </span>
              <span className="text-text-tertiary">{ageYears} лет</span>
              {client.preferredSpecialist && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-text-tertiary" />
                  Специалист: {client.preferredSpecialist}
                </span>
              )}
            </div>

            {/* Key metrics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Визитов', value: String(client.totalVisits) },
                { label: 'Оборот', value: formatCurrency(client.totalSpent) },
                { label: 'Последний визит', value: formatDateShort(client.lastVisitAt) },
                { label: 'В студии', value: `${memberYears} ${memberYears === 1 ? 'год' : memberYears < 5 ? 'года' : 'лет'}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-charcoal rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button variant="primary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Записать
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
              Заметка
            </Button>
          </div>
        </div>
      </div>

      {/* Allergy & Contraindication alerts — shown prominently when present */}
      {hasAlerts && (
        <div className="space-y-3">
          {client.allergies.length > 0 && (
            <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-semibold text-amber-400 text-sm uppercase tracking-wide">
                  Аллергии ({client.allergies.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {client.allergies.map((a, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col gap-0.5 px-3 py-2 rounded-xl border text-xs',
                      SEVERITY_COLORS[a.severity],
                    )}
                  >
                    <span className="font-semibold">{a.allergen}</span>
                    <span className="opacity-75">
                      {SEVERITY_LABELS[a.severity]}
                      {a.reaction && ` · ${a.reaction}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {client.restrictions.filter((r) => r.isActive).map((r, i) => (
            <div key={i} className="bg-red-500/8 border border-red-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <h3 className="font-semibold text-red-400 text-sm uppercase tracking-wide">
                  Противопоказание ·{' '}
                  {{
                    medical: 'Медицинское',
                    pregnancy: 'Беременность',
                    medication: 'Лекарственное',
                    other: 'Прочее',
                  }[r.type]}
                </h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{r.description}</p>
              {r.validFrom && (
                <p className="text-xs text-text-tertiary mt-1">
                  с {formatDateShort(r.validFrom)}
                  {r.validUntil && ` по ${formatDateShort(r.validUntil)}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: profiles + history */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cosmetology profile */}
          {client.cosmetologyProfile && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blush" />
                  <CardTitle>Профиль косметолога</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Тип кожи</p>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {client.cosmetologyProfile.skinType}
                    </p>
                  </div>
                  {client.cosmetologyProfile.sunSensitivity && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Солнечная чувствительность</p>
                      <p className="text-sm font-medium text-text-primary">
                        {client.cosmetologyProfile.sunSensitivity}
                      </p>
                    </div>
                  )}
                  {client.cosmetologyProfile.lastPeelingDate && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Последний пилинг</p>
                      <p className="text-sm font-medium text-text-primary">
                        {formatDate(client.cosmetologyProfile.lastPeelingDate)}
                      </p>
                    </div>
                  )}
                  {client.cosmetologyProfile.lastInjectionDate && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Последние инъекции</p>
                      <p className="text-sm font-medium text-text-primary">
                        {formatDate(client.cosmetologyProfile.lastInjectionDate)}
                      </p>
                    </div>
                  )}
                </div>

                {client.cosmetologyProfile.skinConcerns.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-2">Проблемы кожи</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.cosmetologyProfile.skinConcerns.map((concern) => (
                        <span
                          key={concern}
                          className="px-2.5 py-1 rounded-lg bg-blush/10 text-blush border border-blush/20 text-xs font-medium"
                        >
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {client.cosmetologyProfile.homeRoutine && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Домашний уход</p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {client.cosmetologyProfile.homeRoutine}
                    </p>
                  </div>
                )}

                {client.cosmetologyProfile.reactionHistory && (
                  <div className="mt-4 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">
                      История реакций
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {client.cosmetologyProfile.reactionHistory}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Massage profile */}
          {client.massageProfile && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4 text-lavender" />
                  <CardTitle>Профиль массажа</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Давление</p>
                    <p className="text-sm font-medium text-text-primary">
                      {PRESSURE_LABELS[client.massageProfile.pressurePreference]}
                    </p>
                  </div>
                  {client.massageProfile.temperaturePreference && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Температурный режим</p>
                      <p className="text-sm font-medium text-text-primary">
                        {{ warm: 'Тёплый', hot: 'Горячий', neutral: 'Нейтральный' }[client.massageProfile.temperaturePreference]}
                      </p>
                    </div>
                  )}
                  {client.massageProfile.bodyType && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Тип телосложения</p>
                      <p className="text-sm font-medium text-text-primary capitalize">
                        {client.massageProfile.bodyType}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-widest text-text-tertiary mb-2">Зоны воздействия</p>
                  <div className="flex flex-wrap gap-1.5">
                    {client.massageProfile.focusAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2.5 py-1 rounded-lg bg-lavender/10 text-lavender border border-lavender/20 text-xs font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {client.massageProfile.avoidAreas && client.massageProfile.avoidAreas.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/8 border border-red-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
                      Зоны исключения
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.massageProfile.avoidAreas.map((area) => (
                        <span key={area} className="text-xs text-red-400">{area}</span>
                      ))}
                    </div>
                  </div>
                )}

                {client.massageProfile.oilPreferences && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">
                      Предпочтения по маслу
                    </p>
                    <p className="text-sm text-text-secondary">{client.massageProfile.oilPreferences}</p>
                  </div>
                )}

                {client.massageProfile.additionalNotes && (
                  <div className="mt-4 p-3 bg-charcoal rounded-xl">
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">
                      Дополнительно
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {client.massageProfile.additionalNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Treatment history */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-champagne" />
                  <CardTitle>История процедур</CardTitle>
                </div>
                <span className="text-xs text-text-tertiary">
                  {client.procedureHistory.length} записей
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {client.procedureHistory.length === 0 ? (
                <p className="text-text-tertiary text-sm text-center py-4">
                  Процедуры не зафиксированы
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-border-luxury" />
                  <div className="space-y-5">
                    {client.procedureHistory.map((ph) => (
                      <div key={ph.id} className="flex gap-4 relative">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-charcoal border border-border-luxury flex items-center justify-center z-10 mt-0.5">
                          <CircleDot className="w-3 h-3 text-champagne" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                            <div>
                              <p className="font-medium text-text-primary text-sm">{ph.serviceName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-text-tertiary">
                                  {formatDate(ph.performedAt)} · {ph.specialistName}
                                </span>
                                <Badge variant="default" className="text-[10px]">
                                  {CATEGORY_LABELS[ph.serviceCategory] ?? ph.serviceCategory}
                                </Badge>
                              </div>
                            </div>
                            {ph.rating && <StarRating rating={ph.rating} />}
                          </div>

                          {ph.results && (
                            <p className="text-xs text-text-secondary leading-relaxed mt-2">
                              <span className="font-medium text-text-tertiary">Результат: </span>
                              {ph.results}
                            </p>
                          )}
                          {ph.sideEffects && (
                            <p className="text-xs text-amber-400/80 leading-relaxed mt-1">
                              <span className="font-medium">Побочные эффекты: </span>
                              {ph.sideEffects}
                            </p>
                          )}
                          {ph.clientFeedback && (
                            <p className="text-xs text-sage leading-relaxed mt-1">
                              <span className="font-medium">Отзыв: </span>
                              {ph.clientFeedback}
                            </p>
                          )}
                          {ph.followUpRequired && ph.followUpDate && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-champagne/8 border border-champagne/20">
                              <Calendar className="w-3 h-3 text-champagne" />
                              <span className="text-[10px] font-semibold text-champagne">
                                Контроль {formatDateShort(ph.followUpDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Before / After documentation */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sage" />
                  <CardTitle>Фотодокументация До/После</CardTitle>
                </div>
                <Button variant="ghost" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.beforeAfterSessions.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-border-luxury rounded-xl">
                  <Camera className="w-7 h-7 text-text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-text-tertiary">Фотографии не добавлены</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Добавьте фото До/После для документирования результата
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.beforeAfterSessions.map((ba) => (
                    <div
                      key={ba.id}
                      className="flex items-center justify-between px-4 py-3 bg-charcoal rounded-xl border border-border-luxury"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{ba.serviceName}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {formatDateShort(ba.performedAt)} · {ba.specialistName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ba.hasPhotos ? (
                          <Badge variant="success">Фото есть</Badge>
                        ) : (
                          <Badge variant="default">Нет фото</Badge>
                        )}
                        <Button variant="ghost" size="icon-sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: notes, recurring treatments, recommendations */}
        <div className="space-y-6">
          {/* Specialist notes */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-champagne" />
                  <CardTitle className="text-base">Заметки специалистов</CardTitle>
                </div>
                <Button variant="ghost" size="icon-sm">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.specialistNotes.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-3">Заметок нет</p>
              ) : (
                client.specialistNotes.map((note) => {
                  const PrivacyIcon = PRIVACY_ICONS[note.privacy];
                  return (
                    <div key={note.id} className="p-3 bg-charcoal rounded-xl border border-border-luxury">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">
                            {note.specialistName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-champagne/10 text-champagne border border-champagne/20 uppercase tracking-wide">
                            {NOTE_TYPE_LABELS[note.noteType]}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1 text-[10px] text-text-tertiary"
                          title={PRIVACY_LABELS[note.privacy]}
                        >
                          <PrivacyIcon className="w-3 h-3" />
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{note.content}</p>
                      <p className="text-[10px] text-text-tertiary mt-2">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recurring treatments */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-sage" />
                <CardTitle className="text-base">Периодические процедуры</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.recurringTreatments.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-3">
                  Нет запланированных курсов
                </p>
              ) : (
                client.recurringTreatments.map((rt) => (
                  <div
                    key={rt.id}
                    className={cn(
                      'p-3 rounded-xl border',
                      rt.isActive
                        ? 'bg-charcoal border-border-luxury'
                        : 'bg-charcoal/50 border-border-luxury opacity-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{rt.serviceName}</p>
                      <RecurringStatusBadge nextDate={rt.nextRecommendedAt} />
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      каждые {rt.frequencyDays} дней · {rt.specialistName}
                    </p>
                    {rt.nextRecommendedAt && (
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="w-3 h-3 text-text-tertiary" />
                        <span className="text-xs text-text-secondary">
                          Следующий: {formatDateShort(rt.nextRecommendedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Skincare recommendations */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-sage" />
                <CardTitle className="text-base">Рекомендации</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.recommendations.length === 0 ? (
                <p className="text-text-tertiary text-xs text-center py-3">
                  Нет рекомендаций
                </p>
              ) : (
                client.recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 bg-charcoal rounded-xl border border-border-luxury">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-semibold border',
                        rec.urgency === 'urgent'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : rec.urgency === 'recommended'
                            ? 'bg-champagne/10 text-champagne border-champagne/20'
                            : 'bg-charcoal text-text-tertiary border-border-luxury',
                      )}>
                        {RECOMMENDATION_TYPE_LABELS[rec.type]}
                      </span>
                      {rec.urgency === 'urgent' && (
                        <span className="text-[10px] font-semibold text-red-400">срочно</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{rec.text}</p>
                    <p className="text-[10px] text-text-tertiary mt-2">
                      {rec.specialistName} · {formatDateShort(rec.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Loyalty points */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-text-tertiary">Бонусные баллы</p>
              <Badge variant={LOYALTY_VARIANT[client.loyaltyTier]}>
                {LOYALTY_LABELS[client.loyaltyTier]}
              </Badge>
            </div>
            <p className="font-serif text-3xl font-medium text-champagne tabular-nums">
              {client.loyaltyPoints.toLocaleString('ru-RU')}
            </p>
            <p className="text-xs text-text-tertiary mt-1">баллов доступно</p>
          </div>
        </div>
      </div>
    </div>
  );
}
