export interface ProcedureHistoryData {
  id: string;
  profileId: string;
  appointmentId: string;
  serviceId: string;
  specialistId: string;
  performedAt: Date;
  results?: string | null;
  sideEffects?: string | null;
  clientFeedback?: string | null;
  followUpRequired: boolean;
  followUpDate?: Date | null;
  createdAt: Date;
}

export interface IProcedureHistoryRepository {
  findByProfile(profileId: string, limit?: number): Promise<ProcedureHistoryData[]>;
  findByAppointment(appointmentId: string): Promise<ProcedureHistoryData[]>;
  findById(id: string): Promise<ProcedureHistoryData | null>;
  create(data: Omit<ProcedureHistoryData, 'createdAt'>): Promise<ProcedureHistoryData>;
  update(id: string, data: Partial<Pick<ProcedureHistoryData, 'results' | 'sideEffects' | 'clientFeedback' | 'followUpRequired' | 'followUpDate'>>): Promise<ProcedureHistoryData>;
  delete(id: string): Promise<void>;
}
