import { Vacation } from '@/domain/entities';

export type VacationRepositoryPort = IVacationRepository;

export interface IVacationRepository {
  findById(id: string): Promise<Vacation | null>;
  findBySpecialist(specialistId: string): Promise<Vacation[]>;
  findActiveVacations(specialistId: string, date: Date): Promise<Vacation[]>;
  create(vacation: Vacation): Promise<Vacation>;
  update(vacation: Vacation): Promise<Vacation>;
  delete(id: string): Promise<void>;
  approve(id: string, approvedBy: string): Promise<Vacation>;
}
