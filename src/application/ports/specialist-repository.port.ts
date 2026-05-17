import { Specialist } from '@/domain/entities';
import { SpecialistStatus } from '@/domain/enums';

export interface ISpecialistRepository {
  findById(id: string): Promise<Specialist | null>;
  findByUserId(userId: string): Promise<Specialist | null>;
  findMany(options: {
    status?: SpecialistStatus;
    serviceId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Specialist[]; total: number }>;
  create(specialist: Specialist): Promise<Specialist>;
  update(specialist: Specialist): Promise<Specialist>;
  delete(id: string): Promise<void>;
  updateRating(specialistId: string, newRating: number): Promise<void>;
  assignService(specialistId: string, serviceId: string, priceOverride?: number, durationOverride?: number): Promise<void>;
  removeService(specialistId: string, serviceId: string): Promise<void>;
}
