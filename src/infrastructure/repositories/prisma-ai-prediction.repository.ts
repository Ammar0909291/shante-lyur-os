import { PrismaClient } from '@prisma/client';
import { AIPredictionRepositoryPort } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';

export class PrismaAIPredictionRepository implements AIPredictionRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: { id: string; type: string; entityId: string | null; prediction: number; confidence: number; features: unknown; modelVersion: string; createdAt: Date }): AIPrediction {
    return AIPrediction.reconstitute({
      id: raw.id,
      type: raw.type,
      entityId: raw.entityId ?? undefined,
      prediction: raw.prediction,
      confidence: raw.confidence,
      features: (raw.features as Record<string, unknown>) ?? {},
      modelVersion: raw.modelVersion,
      createdAt: raw.createdAt,
    });
  }

  async findById(id: string): Promise<AIPrediction | null> {
    const raw = await this.db.aIPrediction.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByType(type: string, limit: number): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { type },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async findByEntityId(entityId: string): Promise<AIPrediction[]> {
    const raws = await this.db.aIPrediction.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(r => this.toDomain(r));
  }

  async create(prediction: AIPrediction): Promise<AIPrediction> {
    const raw = await this.db.aIPrediction.create({
      data: {
        id: prediction.id,
        type: prediction.type,
        entityId: prediction.entityId,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        features: prediction.features as Prisma.InputJsonValue,
        modelVersion: prediction.modelVersion,
      },
    });
    return this.toDomain(raw);
  }
}
