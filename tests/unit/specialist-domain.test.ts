/**
 * Unit tests — Specialist domain entity.
 * Tests the pure business logic with no I/O or mocks.
 */

import { Specialist, SpecialistProps } from '@/domain/entities/specialist.entity';
import { SpecialistStatus } from '@/domain/enums';
import { Money } from '@/domain/value-objects/money.vo';

function makeProps(overrides: Partial<SpecialistProps> = {}): SpecialistProps {
  const now = new Date();
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    userId: 'a1b2c3d4-0000-0000-0000-000000000002',
    specialization: 'Косметолог-эстетист',
    bio: 'Специалист по уходу за кожей лица, опыт 7 лет',
    experienceYears: 7,
    commissionRate: 0.35,
    reviewCount: 0,
    status: SpecialistStatus.ACTIVE,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── Status transitions ───────────────────────────────────────────────────────
describe('Specialist — status transitions', () => {
  it('starts as ACTIVE and isActive returns true', () => {
    const s = new Specialist(makeProps());
    expect(s.status).toBe(SpecialistStatus.ACTIVE);
    expect(s.isActive).toBe(true);
  });

  it('setOnVacation() changes status and isActive becomes false', () => {
    const s = new Specialist(makeProps());
    s.setOnVacation();
    expect(s.status).toBe(SpecialistStatus.ON_VACATION);
    expect(s.isActive).toBe(false);
  });

  it('setActive() restores an inactive specialist', () => {
    const s = new Specialist(makeProps({ status: SpecialistStatus.INACTIVE }));
    expect(s.isActive).toBe(false);
    s.setActive();
    expect(s.isActive).toBe(true);
  });

  it('terminate() sets TERMINATED status', () => {
    const s = new Specialist(makeProps());
    s.terminate();
    expect(s.status).toBe(SpecialistStatus.TERMINATED);
    expect(s.isActive).toBe(false);
  });
});

// ─── Commission calculation ───────────────────────────────────────────────────
describe('Specialist — calculateCommission', () => {
  it('calculates 35% commission on 10 000 ₽ service', () => {
    const s = new Specialist(makeProps({ commissionRate: 0.35 }));
    const amount = Money.create(10_000, 'RUB');
    const commission = s.calculateCommission(amount);
    expect(commission.amount).toBe(3_500);
  });

  it('calculates 0% commission when rate is 0', () => {
    const s = new Specialist(makeProps({ commissionRate: 0 }));
    const commission = s.calculateCommission(Money.create(5_000, 'RUB'));
    expect(commission.amount).toBe(0);
  });

  it('calculates 100% commission when rate is 1', () => {
    const s = new Specialist(makeProps({ commissionRate: 1 }));
    const commission = s.calculateCommission(Money.create(8_000, 'RUB'));
    expect(commission.amount).toBe(8_000);
  });

  it('does not mutate the original Money object', () => {
    const s = new Specialist(makeProps({ commissionRate: 0.3 }));
    const amount = Money.create(5_000, 'RUB');
    s.calculateCommission(amount);
    expect(amount.amount).toBe(5_000); // unchanged
  });
});

// ─── Review / rating ──────────────────────────────────────────────────────────
describe('Specialist — addReview', () => {
  it('first review sets rating equal to that review score', () => {
    const s = new Specialist(makeProps({ reviewCount: 0 }));
    s.addReview(5);
    expect(s.reviewCount).toBe(1);
    expect(s.rating).toBeCloseTo(5, 5);
  });

  it('second review averages correctly', () => {
    const s = new Specialist(makeProps({ reviewCount: 0 }));
    s.addReview(4);
    s.addReview(2);
    expect(s.reviewCount).toBe(2);
    expect(s.rating).toBeCloseTo(3, 5); // (4 + 2) / 2
  });

  it('accumulates correctly over many reviews (Анна, 20 reviews at 4.5)', () => {
    const s = new Specialist(makeProps({ reviewCount: 0 }));
    for (let i = 0; i < 20; i++) s.addReview(4.5);
    expect(s.reviewCount).toBe(20);
    expect(s.rating).toBeCloseTo(4.5, 3);
  });

  it('throws on rating below 0', () => {
    const s = new Specialist(makeProps());
    expect(() => s.addReview(-1)).toThrow('Rating must be between 0 and 5');
  });

  it('throws on rating above 5', () => {
    const s = new Specialist(makeProps());
    expect(() => s.addReview(5.1)).toThrow('Rating must be between 0 and 5');
  });

  it('accepts boundary values 0 and 5', () => {
    const s = new Specialist(makeProps());
    expect(() => s.addReview(0)).not.toThrow();
    expect(() => s.addReview(5)).not.toThrow();
  });
});

// ─── Reconstitute ─────────────────────────────────────────────────────────────
describe('Specialist — reconstitute', () => {
  it('preserves all props through reconstitute', () => {
    const props = makeProps({ experienceYears: 12, bio: 'Опыт 12 лет в люксовой косметологии' });
    const s = Specialist.reconstitute(props);
    expect(s.id).toBe(props.id);
    expect(s.userId).toBe(props.userId);
    expect(s.experienceYears).toBe(12);
    expect(s.bio).toBe('Опыт 12 лет в люксовой косметологии');
    expect(s.commissionRate).toBe(0.35);
  });
});
