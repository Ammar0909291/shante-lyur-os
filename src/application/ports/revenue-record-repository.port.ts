import { RevenueRecord } from '@/domain/entities';
import { RevenueType } from '@/domain/enums';

export type RevenueRecordRepositoryPort = IRevenueRecordRepository;

export interface IRevenueRecordRepository {
  findById(id: string): Promise<RevenueRecord | null>;
  findMany(options: {
    from?: Date;
    to?: Date;
    type?: RevenueType;
    specialistId?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: RevenueRecord[]; total: number }>;
  create(record: RevenueRecord): Promise<RevenueRecord>;
  getDailyRevenue(date: Date): Promise<number>;
  getMonthlyRevenue(year: number, month: number): Promise<number>;
  getSpecialistRevenue(specialistId: string, from: Date, to: Date): Promise<number>;
}
