import { PrismaClient, Prisma } from '@prisma/client';
import { IAIPredictionRepository } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

type PrismaAIPrediction = {
  id: string;
  createdAt: Date;
  entityType: string;
  entityId: string | null;
  modelType: string;
  prediction: Prisma.JsonValue;
  confidence: { toNumber(): number } | null;
  actualOutcome: Prisma.JsonValue;
  accuracyDelta: { toNumber(): number } | null;
  trainedAt: Date;
};

export class PrismaAIPredictionRepository implements IAIPredictionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: PrismaAIPrediction): AIPrediction {
    return new AIPrediction({
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
    return raw ? this.toDomain(raw) : null;
  }

  async findByModel(modelType: string, entityType: string, entityId?: string): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType, entityType, ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findLatest(modelType: string, entityType: string, entityId: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findFirst({
      where: { modelType, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raw ? this.toDomain(raw) : null;
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
        actualOutcome: prediction.actualOutcome ? prediction.actualOutcome as Prisma.InputJsonValue : Prisma.JsonNull,
        accuracyDelta: prediction.accuracyDelta,
        trainedAt: prediction.trainedAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.update({
      where: { id: prediction.id },
      data: {
        actualOutcome: prediction.actualOutcome ? prediction.actualOutcome as Prisma.InputJsonValue : Prisma.JsonNull,
        accuracyDelta: prediction.accuracyDelta,
      },
    });
    return this.toDomain(raw);
  }

  async getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{ totalPredictions: number; correctPredictions: number; avgConfidence: number }> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType, createdAt: { gte: from, lte: to } },
    });
    const total = raws.length;
    const withOutcome = raws.filter(r => r.actualOutcome !== null);
    const avgConfidence = total > 0
      ? raws.reduce((s, r) => s + (r.confidence ? r.confidence.toNumber() : 0), 0) / total
      : 0;
    return { totalPredictions: total, correctPredictions: withOutcome.length, avgConfidence };
  }
}
