import { PrismaClient, Prisma } from '@prisma/client';
import { IAIPredictionRepository } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

type RawAIPrediction = {
  id: string;
  modelType: string;
  entityType: string;
  entityId: string | null;
  prediction: Prisma.JsonValue;
  confidence: { toNumber(): number } | null;
  actualOutcome: Prisma.JsonValue | null;
  accuracyDelta: { toNumber(): number } | null;
  trainedAt: Date;
  createdAt: Date;
};

export class PrismaAIPredictionRepository implements IAIPredictionRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: RawAIPrediction): AIPrediction {
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
    return raw ? this.toDomain(raw) : null;
  }

  async findByType(type: string, limit: number): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { modelType: type },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findByModel(modelType: string, entityType: string, entityId?: string): Promise<AIPrediction[]> {
    const where: Prisma.AIPredictionWhereInput = { modelType, entityType };
    if (entityId) where.entityId = entityId;
    const raws = await this.db.aIPrediction.findMany({ where, orderBy: { createdAt: 'desc' } });
    return raws.map(r => this.toDomain(r));
  }

  async findLatest(modelType: string, entityType: string, entityId: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findFirst({
      where: { modelType, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async findByEntityId(entityId: string): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
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
    return this.toDomain(raw);
  }

  async getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{ totalPredictions: number; correctPredictions: number; avgConfidence: number }> {
    const [total, avgResult] = await Promise.all([
      this.db.aIPrediction.count({ where: { modelType, createdAt: { gte: from, lte: to } } }),
      this.db.aIPrediction.aggregate({ _avg: { confidence: true }, where: { modelType, createdAt: { gte: from, lte: to } } }),
    ]);
    const avgConf = avgResult._avg.confidence ? Number(avgResult._avg.confidence) : 0;
    return {
      totalPredictions: total,
      correctPredictions: Math.round(total * avgConf),
      avgConfidence: avgConf,
    };
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
    return this.toDomain(raw);
  }
}
