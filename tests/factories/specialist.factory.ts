/**
 * Realistic test-data factories for specialists and related DB rows.
 * All names, emails and specializations are salon-plausible (Russian context).
 */

import { randomUUID } from 'crypto';

export interface SpecialistUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export interface SpecialistRow {
  id: string;
  userId: string;
  specialization: string | null;
  bio: string | null;
  experienceYears: number | null;
  rating: { toNumber: () => number } | null;
  reviewCount: number;
  commissionRate: { toNumber: () => number };
  status: string;
  color: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  user: Pick<SpecialistUserRow, 'firstName' | 'lastName' | 'email'>;
}

// Realistic salon specialist profiles
const PROFILES = [
  {
    firstName: 'Мария', lastName: 'Петрова',
    email: 'maria.petrova@shantelyur-test.ru',
    specialization: 'Косметолог-эстетист', bio: 'Специалист по уходу за кожей лица',
    experienceYears: 7, commissionRate: 0.35,
  },
  {
    firstName: 'Анна', lastName: 'Смирнова',
    email: 'anna.smirnova@shantelyur-test.ru',
    specialization: 'Массажист SPA', bio: 'Сертифицированный SPA-массажист',
    experienceYears: 5, commissionRate: 0.30,
  },
  {
    firstName: 'Екатерина', lastName: 'Кузнецова',
    email: 'ekaterina.kuznetsova@shantelyur-test.ru',
    specialization: 'Косметолог-инъекционист', bio: 'Специализация: контурная пластика',
    experienceYears: 10, commissionRate: 0.40,
  },
  {
    firstName: 'Светлана', lastName: 'Иванова',
    email: 'svetlana.ivanova@shantelyur-test.ru',
    specialization: 'Массажист', bio: null,
    experienceYears: 3, commissionRate: 0.30,
  },
];

let _profileIdx = 0;

export function makeSpecialistUser(overrides: Partial<SpecialistUserRow> = {}): SpecialistUserRow {
  const profile = PROFILES[_profileIdx % PROFILES.length];
  _profileIdx++;
  return {
    id: randomUUID(),
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    passwordHash: 'SPECIALIST_NO_LOGIN',
    role: 'SPECIALIST',
    status: 'ACTIVE',
    emailVerified: false,
    ...overrides,
  };
}

export function makeSpecialistRow(
  userId: string,
  user: Pick<SpecialistUserRow, 'firstName' | 'lastName' | 'email'>,
  overrides: Partial<SpecialistRow> = {},
): SpecialistRow {
  const profile = PROFILES[(_profileIdx - 1) % PROFILES.length];
  const now = new Date();
  return {
    id: randomUUID(),
    userId,
    specialization: profile.specialization,
    bio: profile.bio,
    experienceYears: profile.experienceYears,
    rating: null,
    reviewCount: 0,
    commissionRate: { toNumber: () => profile.commissionRate },
    status: 'ACTIVE',
    color: '#C9A96E',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    user,
    ...overrides,
  };
}

/** Minimal POST body accepted by POST /api/specialists */
export function makeCreateSpecialistBody(overrides: Record<string, unknown> = {}) {
  const profile = PROFILES[_profileIdx % PROFILES.length];
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: `test-${Date.now()}-${randomUUID().slice(0, 8)}@shantelyur-test.ru`,
    specialization: profile.specialization ?? undefined,
    bio: profile.bio ?? undefined,
    experienceYears: profile.experienceYears,
    commissionRate: profile.commissionRate,
    color: '#C9A96E',
    ...overrides,
  };
}

export function resetFactoryCounter() {
  _profileIdx = 0;
}
