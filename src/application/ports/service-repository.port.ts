import { Service } from '@/domain/entities';
import { ServiceCategory } from '@/domain/enums';

export type ServiceRepositoryPort = IServiceRepository;

export interface IServiceRepository {
  findById(id: string): Promise<Service | null>;
  findByIds(ids: string[]): Promise<Service[]>;
  findMany(options: {
    category?: ServiceCategory;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Service[]; total: number }>;
  create(service: Service): Promise<Service>;
  update(service: Service): Promise<Service>;
  delete(id: string): Promise<void>;
  getLocationPrice(serviceId: string, locationId: string): Promise<{ price: number; duration: number } | null>;
  setLocationPrice(serviceId: string, locationId: string, price: number, duration: number): Promise<void>;
}
