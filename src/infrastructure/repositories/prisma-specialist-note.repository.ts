import { PrismaClient } from '@prisma/client';
import { ISpecialistNoteRepository, SpecialistNoteData } from '@/application/ports/specialist-note-repository.port';

export class PrismaSpecialistNoteRepository implements ISpecialistNoteRepository {
  constructor(private readonly db: PrismaClient) {}

  private toDomain(raw: {
    id: string; specialistId: string; profileId: string; appointmentId: string | null;
    noteType: string; content: string; privacy: string; createdAt: Date; updatedAt: Date;
  }): SpecialistNoteData {
    return {
      id: raw.id,
      specialistId: raw.specialistId,
      profileId: raw.profileId,
      appointmentId: raw.appointmentId,
      noteType: raw.noteType,
      content: raw.content,
      privacy: raw.privacy as SpecialistNoteData['privacy'],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async findByProfile(profileId: string, limit = 20): Promise<SpecialistNoteData[]> {
    const rows = await this.db.specialistNote.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(r => this.toDomain(r));
  }

  async findByAppointment(appointmentId: string): Promise<SpecialistNoteData[]> {
    const rows = await this.db.specialistNote.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<SpecialistNoteData | null> {
    const row = await this.db.specialistNote.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(data: Omit<SpecialistNoteData, 'createdAt' | 'updatedAt'>): Promise<SpecialistNoteData> {
    const row = await this.db.specialistNote.create({
      data: {
        id: data.id,
        specialistId: data.specialistId,
        profileId: data.profileId,
        appointmentId: data.appointmentId,
        noteType: data.noteType,
        content: data.content,
        privacy: data.privacy,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, data: Partial<Pick<SpecialistNoteData, 'content' | 'privacy' | 'noteType'>>): Promise<SpecialistNoteData> {
    const row = await this.db.specialistNote.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.specialistNote.delete({ where: { id } });
  }
}
