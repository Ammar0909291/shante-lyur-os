import { NotFoundError } from '@/domain/errors';
import {
  ICustomerProfileRepository,
  IAppointmentRepository,
  IPaymentRepository,
  ISpecialistNoteRepository,
  IProcedureHistoryRepository,
} from '@/application/ports';

export interface CustomerDetailResult {
  profile: NonNullable<Awaited<ReturnType<ICustomerProfileRepository['findById']>>>;
  recentAppointments: Awaited<ReturnType<IAppointmentRepository['findMany']>>;
  totalSpent: number;
  recentNotes: Awaited<ReturnType<ISpecialistNoteRepository['findByProfile']>>;
  procedureHistory: Awaited<ReturnType<IProcedureHistoryRepository['findByProfile']>>;
}

// Placeholder interfaces for repos that don't exist yet in ports
interface ISpecialistNoteRepository {
  findByProfile(profileId: string, limit: number): Promise<unknown[]>;
}
interface IProcedureHistoryRepository {
  findByProfile(profileId: string, limit: number): Promise<unknown[]>;
}

export class GetCustomerDetailUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly paymentRepo: IPaymentRepository,
    private readonly noteRepo: ISpecialistNoteRepository,
    private readonly procedureRepo: IProcedureHistoryRepository,
  ) {}

  async execute(profileId: string): Promise<CustomerDetailResult> {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile) {
      throw new NotFoundError('CustomerProfile', profileId);
    }

    const [recentAppointments, payments, recentNotes, procedureHistory] = await Promise.all([
      this.appointmentRepo.findMany({ clientId: profile.userId, limit: 10 }),
      this.paymentRepo.findMany({ from: new Date('2000-01-01'), to: new Date(), limit: 1000 }),
      this.noteRepo.findByProfile(profileId, 10),
      this.procedureRepo.findByProfile(profileId, 10),
    ]);

    // Calculate total from payments (simplified)
    const totalSpent = 0; // Would filter by appointment IDs

    return {
      profile,
      recentAppointments,
      totalSpent,
      recentNotes,
      procedureHistory,
    };
  }
}
