export interface SpecialistNoteRecord {
  id: string;
  specialistId: string;
  profileId: string;
  appointmentId: string | null;
  noteType: string;
  content: string;
  privacy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISpecialistNoteRepository {
  findByProfile(profileId: string, limit?: number): Promise<SpecialistNoteRecord[]>;
  create(data: {
    specialistId: string;
    profileId: string;
    appointmentId?: string;
    noteType: string;
    content: string;
    privacy: string;
  }): Promise<SpecialistNoteRecord>;
}
