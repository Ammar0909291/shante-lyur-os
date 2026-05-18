export interface SpecialistNoteData {
  id: string;
  specialistId: string;
  profileId: string;
  appointmentId?: string | null;
  noteType: string;
  content: string;
  privacy: 'PRIVATE' | 'SHARED' | 'ADMIN_ONLY' | 'CLIENT_VISIBLE';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISpecialistNoteRepository {
  findByProfile(profileId: string, limit?: number): Promise<SpecialistNoteData[]>;
  findByAppointment(appointmentId: string): Promise<SpecialistNoteData[]>;
  findById(id: string): Promise<SpecialistNoteData | null>;
  create(data: Omit<SpecialistNoteData, 'createdAt' | 'updatedAt'>): Promise<SpecialistNoteData>;
  update(id: string, data: Partial<Pick<SpecialistNoteData, 'content' | 'privacy' | 'noteType'>>): Promise<SpecialistNoteData>;
  delete(id: string): Promise<void>;
}
