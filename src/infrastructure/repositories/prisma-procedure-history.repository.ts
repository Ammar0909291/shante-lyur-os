import { PrismaClient } from '@prisma/client';
import type { IProcedureHistoryRepository, ProcedureHistoryRecord } from '@/application/ports';

export class PrismaProcedureHistoryRepository implements IProcedureHistoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProfile(profileId: string, limit = 20): Promise<ProcedureHistoryRecord[]> {
    return this.db.procedureHistory.findMany({
      where: { profileId },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });
  }

  async create(data: {
    profileId: string;
    appointmentId: string;
    serviceId: string;
    specialistId: string;
    performedAt: Date;
    results?: string;
    sideEffects?: string;
    clientFeedback?: string;
    followUpRequired?: boolean;
    followUpDate?: Date;
  }): Promise<ProcedureHistoryRecord> {
    return this.db.procedureHistory.create({
      data: {
        profileId: data.profileId,
        appointmentId: data.appointmentId,
        serviceId: data.serviceId,
        specialistId: data.specialistId,
        performedAt: data.performedAt,
        results: data.results ?? null,
        sideEffects: data.sideEffects ?? null,
        clientFeedback: data.clientFeedback ?? null,
        followUpRequired: data.followUpRequired ?? false,
        followUpDate: data.followUpDate ?? null,
      },
    });
  }
}
