import { DailyMetrics } from '@/domain/entities';

export type DailyMetricsRepositoryPort = IDailyMetricsRepository;

export interface IDailyMetricsRepository {
  findByDate(date: Date): Promise<DailyMetrics | null>;
  findRange(from: Date, to: Date): Promise<DailyMetrics[]>;
  create(metrics: DailyMetrics): Promise<DailyMetrics>;
  update(metrics: DailyMetrics): Promise<DailyMetrics>;
  getLatest(): Promise<DailyMetrics | null>;
}
