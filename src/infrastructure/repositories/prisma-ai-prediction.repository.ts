import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { IAIPredictionRepository } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

type PrismaAIPrediction = {
  id: string;
  modelType: string;
  entityType: string;
  entityId: string | null;
  prediction: unknown;
  confidence: { toNumber(): number } | null;
  actualOutcome: unknown;
  accuracyDelta: { toNumber(): number } | null;
  trainedAt: Date;
  createdAt: Date;
};

export class PrismaAIPredictionRepository implements IAIPredictionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaAIPrediction): AIPrediction {
    return AIPrediction.reconstitute({
      id: raw.id,
      modelType: raw.modelType,
      entityType: raw.entityType,
      entityId: raw.entityId ?? undefined,
      prediction: (raw.prediction as Record<string, unknown>) ?? {},
      confidence: raw.confidence ? raw.confidence.toNumber() : undefined,
      actualOutcome: raw.actualOutcome ? (raw.actualOutcome as Record<string, unknown>) : undefined,
      accuracyDelta: raw.accuracyDelta ? raw.accuracyDelta.toNumber() : undefined,
      trainedAt: raw.trainedAt,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findUnique({ where: { id } });
    return raw ? this.toDomain(raw as PrismaAIPrediction) : null;
  }

  async findByModel(modelType: string, entityType: string, entityId?: string): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType, entityType, ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r as PrismaAIPrediction));
  }

  async findLatest(modelType: string, entityType: string, entityId: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findFirst({
      where: { modelType, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raw ? this.toDomain(raw as PrismaAIPrediction) : null;
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
        actualOutcome: prediction.actualOutcome as Prisma.InputJsonValue | undefined,
        accuracyDelta: prediction.accuracyDelta,
        trainedAt: prediction.trainedAt,
      },
    });
    return this.toDomain(raw as PrismaAIPrediction);
  }

  async update(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.update({
      where: { id: prediction.id },
      data: {
        prediction: prediction.prediction as Prisma.InputJsonValue,
        confidence: prediction.confidence,
        actualOutcome: prediction.actualOutcome as Prisma.InputJsonValue | undefined,
        accuracyDelta: prediction.accuracyDelta,
      },
    });
    return this.toDomain(raw as PrismaAIPrediction);
  }

  async getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
  }> {
    const results = await this.db.aIPrediction.findMany({
      where: {
        modelType,
        createdAt: { gte: from, lte: to },
        actualOutcome: { not: Prisma.AnyNull },
      },
      select: { confidence: true, accuracyDelta: true },
    });
    const total = results.length;
    const correct = results.filter(r => r.accuracyDelta !== null && r.accuracyDelta.toNumber() > 0.5).length;
    const avgConfidence = total > 0
      ? results.reduce((sum, r) => sum + (r.confidence?.toNumber() ?? 0), 0) / total
      : 0;
    return { totalPredictions: total, correctPredictions: correct, avgConfidence };
  }
}
