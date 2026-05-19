import { PrismaClient } from '@prisma/client';
import type { ISpecialistNoteRepository, SpecialistNoteRecord } from '@/application/ports';

export class PrismaSpecialistNoteRepository implements ISpecialistNoteRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByProfile(profileId: string, limit = 20): Promise<SpecialistNoteRecord[]> {
    return this.db.specialistNote.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: {
    specialistId: string;
    profileId: string;
    appointmentId?: string;
    noteType: string;
    content: string;
    privacy: string;
  }): Promise<SpecialistNoteRecord> {
    return this.db.specialistNote.create({
      data: {
        specialistId: data.specialistId,
        profileId: data.profileId,
        appointmentId: data.appointmentId ?? null,
        noteType: data.noteType,
        content: data.content,
        privacy: data.privacy as never,
      },
    });
  }
}
