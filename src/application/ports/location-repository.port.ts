import { Location } from '@/domain/entities';

export interface ILocationRepository {
  findById(id: string): Promise<Location | null>;
  findMany(options: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: Location[]; total: number }>;
  create(location: Location): Promise<Location>;
  update(location: Location): Promise<Location>;
  delete(id: string): Promise<void>;
}

export type LocationRepositoryPort = ILocationRepository;
