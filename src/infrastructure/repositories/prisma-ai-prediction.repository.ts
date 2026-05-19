import { PrismaClient, Prisma } from '@prisma/client';
import { IAIPredictionRepository } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

type RawAIPrediction = {
  id: string;
  modelType: string;
  entityType: string;
  entityId: string | null;
  prediction: unknown;
  confidence: { toNumber(): number } | number | null;
  actualOutcome: unknown;
  accuracyDelta: { toNumber(): number } | number | null;
  trainedAt: Date;
  createdAt: Date;
};

export class PrismaAIPredictionRepository implements IAIPredictionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toNum(val: { toNumber(): number } | number | null | undefined): number | undefined {
    if (val == null) return undefined;
    return typeof val === 'number' ? val : val.toNumber();
  }

  private toDomain(raw: RawAIPrediction): AIPrediction {
    return new AIPrediction({
      id: raw.id,
      modelType: raw.modelType,
      entityType: raw.entityType,
      entityId: raw.entityId ?? undefined,
      prediction: (raw.prediction as Record<string, unknown>) ?? {},
      confidence: this.toNum(raw.confidence),
      actualOutcome: raw.actualOutcome ? (raw.actualOutcome as Record<string, unknown>) : undefined,
      accuracyDelta: this.toNum(raw.accuracyDelta),
      trainedAt: raw.trainedAt,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as unknown as RawAIPrediction) : null;
  }

  async findByModel(modelType: string, entityType: string, entityId?: string): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType, entityType, ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r as unknown as RawAIPrediction));
  }

  async findLatest(modelType: string, entityType: string, entityId: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findFirst({
      where: { modelType, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raw ? this.toDomain(raw as unknown as RawAIPrediction) : null;
  }

  async create(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.create({
      data: {
        id: prediction.id,
        modelType: prediction.modelType,
        entityType: prediction.entityType,
        entityId: prediction.entityId,
        prediction: prediction.prediction as Prisma.InputJsonValue,
        confidence: prediction.confidence,
        trainedAt: prediction.trainedAt,
      },
    });
    return this.toDomain(raw as unknown as RawAIPrediction);
  }

  async update(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.update({
      where: { id: prediction.id },
      data: {
        prediction: prediction.prediction as Prisma.InputJsonValue,
        confidence: prediction.confidence,
        actualOutcome: prediction.actualOutcome ? (prediction.actualOutcome as Prisma.InputJsonValue) : Prisma.JsonNull,
        accuracyDelta: prediction.accuracyDelta,
      },
    });
    return this.toDomain(raw as unknown as RawAIPrediction);
  }

  async getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
  }> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType, createdAt: { gte: from, lte: to } },
    });
    const totalPredictions = raws.length;
    const correctPredictions = raws.filter(r => r.accuracyDelta != null && this.toNum(r.accuracyDelta as unknown as { toNumber(): number } | number | null)! > 0.5).length;
    const confidenceValues = raws.map(r => this.toNum(r.confidence as unknown as { toNumber(): number } | number | null) ?? 0);
    const avgConfidence = totalPredictions > 0 ? confidenceValues.reduce((a, b) => a + b, 0) / totalPredictions : 0;
    return { totalPredictions, correctPredictions, avgConfidence };
  }
}
