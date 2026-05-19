export interface ProcedureHistoryRecord {
  id: string;
  profileId: string;
  appointmentId: string;
  serviceId: string;
  specialistId: string;
  performedAt: Date;
  results: string | null;
  sideEffects: string | null;
  clientFeedback: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  createdAt: Date;
}

export interface IProcedureHistoryRepository {
  findByProfile(profileId: string, limit?: number): Promise<ProcedureHistoryRecord[]>;
  create(data: {
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
  }): Promise<ProcedureHistoryRecord>;
}
