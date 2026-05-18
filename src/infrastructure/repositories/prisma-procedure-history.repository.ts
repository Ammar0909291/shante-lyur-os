import { PrismaClient } from '@prisma/client';
import { IProcedureHistoryRepository, ProcedureHistoryData } from '@/application/ports/procedure-history-repository.port';

export class PrismaProcedureHistoryRepository implements IProcedureHistoryRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; profileId: string; appointmentId: string; serviceId: string; specialistId: string;
    performedAt: Date; results: string | null; sideEffects: string | null; clientFeedback: string | null;
    followUpRequired: boolean; followUpDate: Date | null; createdAt: Date;
  }): ProcedureHistoryData {
    return {
      id: raw.id,
      profileId: raw.profileId,
      appointmentId: raw.appointmentId,
      serviceId: raw.serviceId,
      specialistId: raw.specialistId,
      performedAt: raw.performedAt,
      results: raw.results,
      sideEffects: raw.sideEffects,
      clientFeedback: raw.clientFeedback,
      followUpRequired: raw.followUpRequired,
      followUpDate: raw.followUpDate,
      createdAt: raw.createdAt,
    };
  }

  async findByProfile(profileId: string, limit = 20): Promise<ProcedureHistoryData[]> {
    const rows = await this.db.procedureHistory.findMany({
      where: { profileId },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });
    return rows.map(r => this.toDomain(r));
  }

  async findByAppointment(appointmentId: string): Promise<ProcedureHistoryData[]> {
    const rows = await this.db.procedureHistory.findMany({
      where: { appointmentId },
    });
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<ProcedureHistoryData | null> {
    const row = await this.db.procedureHistory.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: Omit<ProcedureHistoryData, 'createdAt'>): Promise<ProcedureHistoryData> {
    const row = await this.db.procedureHistory.create({
      data: {
        id: data.id,
        profileId: data.profileId,
        appointmentId: data.appointmentId,
        serviceId: data.serviceId,
        specialistId: data.specialistId,
        performedAt: data.performedAt,
        results: data.results,
        sideEffects: data.sideEffects,
        clientFeedback: data.clientFeedback,
        followUpRequired: data.followUpRequired,
        followUpDate: data.followUpDate,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Pick<ProcedureHistoryData, 'results' | 'sideEffects' | 'clientFeedback' | 'followUpRequired' | 'followUpDate'>>): Promise<ProcedureHistoryData> {
    const row = await this.db.procedureHistory.update({
      where: { id },
      data,
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.procedureHistory.delete({ where: { id } });
  }
}
