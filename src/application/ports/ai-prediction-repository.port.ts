import { AIPrediction } from '@/domain/entities';

export type AIPredictionRepositoryPort = IAIPredictionRepository;

export interface IAIPredictionRepository {
  findById(id: string): Promise<AIPrediction | null>;
  findByModel(modelType: string, entityType: string, entityId?: string): Promise<AIPrediction[]>;
  findLatest(modelType: string, entityType: string, entityId: string): Promise<AIPrediction | null>;
  create(prediction: AIPrediction): Promise<AIPrediction>;
  update(prediction: AIPrediction): Promise<AIPrediction>;
  getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
  }>;
}
