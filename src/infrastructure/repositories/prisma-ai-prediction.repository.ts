import { PrismaClient } from '@prisma/client';
import { AIPredictionRepositoryPort } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

export class PrismaAIPredictionRepository implements AIPredictionRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(raw: any): AIPrediction {
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
        prediction: prediction.prediction as never,
        confidence: prediction.confidence,
        trainedAt: prediction.trainedAt,
      },
    });
    return this.toDomain(raw);
  }

  async update(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.update({
      where: { id: prediction.id },
      data: {
        actualOutcome: prediction.actualOutcome as never,
        accuracyDelta: prediction.accuracyDelta,
      },
    });
    return this.toDomain(raw);
  }

  async getAccuracyMetrics(modelType: string, from: Date, to: Date): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
  }> {
    const [total, withOutcomes, avgResult] = await Promise.all([
      this.db.aIPrediction.count({
        where: { modelType, createdAt: { gte: from, lte: to } },
      }),
      this.db.aIPrediction.count({
        where: {
          modelType,
          createdAt: { gte: from, lte: to },
          NOT: { actualOutcome: { equals: 'JsonNull' as never } },
        },
      }),
      this.db.aIPrediction.aggregate({
        where: { modelType, createdAt: { gte: from, lte: to } },
        _avg: { confidence: true },
      }),
    ]);

    const avgConf = avgResult._avg.confidence;
    return {
      totalPredictions: total,
      correctPredictions: withOutcomes,
      avgConfidence: avgConf ? (avgConf as unknown as { toNumber(): number }).toNumber() : 0,
    };
  }
}
