import { NotFoundError } from '@/domain/errors';
import {
  ICustomerProfileRepository,
  IAppointmentRepository,
  ISpecialistNoteRepository,
  IProcedureHistoryRepository,
} from '@/application/ports';
import type { SpecialistNoteData } from '@/application/ports/specialist-note-repository.port';
import type { ProcedureHistoryData } from '@/application/ports/procedure-history-repository.port';

export interface CustomerDetailResult {
  profile: NonNullable<Awaited<ReturnType<ICustomerProfileRepository['findById']>>>;
  recentAppointments: Awaited<ReturnType<IAppointmentRepository['findMany']>>;
  totalSpent: number;
  recentNotes: SpecialistNoteData[];
  procedureHistory: ProcedureHistoryData[];
}

export class GetCustomerDetailUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly noteRepo: ISpecialistNoteRepository,
    private readonly procedureRepo: IProcedureHistoryRepository,
  ) {}

  async execute(profileId: string): Promise<CustomerDetailResult> {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile) {
      throw new NotFoundError('CustomerProfile', profileId);
    }

    const [recentAppointments, recentNotes, procedureHistory] = await Promise.all([
      this.appointmentRepo.findMany({ clientId: profile.userId, limit: 10 }),
      this.noteRepo.findByProfile(profileId, 10),
      this.procedureRepo.findByProfile(profileId, 10),
    ]);

    return {
      profile,
      recentAppointments,
      totalSpent: profile.totalSpent.amount,
      recentNotes,
      procedureHistory,
    };
  }
}
