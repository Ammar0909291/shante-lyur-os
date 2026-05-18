import { BlockedTime } from '@/domain/entities';
import { DateRange } from '@/domain/value-objects';

export interface IBlockedTimeRepository {
  findById(id: string): Promise<BlockedTime | null>;
  findBySpecialist(specialistId: string, from?: Date, to?: Date): Promise<BlockedTime[]>;
  findByLocation(locationId: string, from?: Date, to?: Date): Promise<BlockedTime[]>;
  findOverlapping(specialistId: string, timeRange: DateRange): Promise<BlockedTime[]>;
  create(blockedTime: BlockedTime): Promise<BlockedTime>;
  update(blockedTime: BlockedTime): Promise<BlockedTime>;
  delete(id: string): Promise<void>;
}

export type BlockedTimeRepositoryPort = IBlockedTimeRepository;
