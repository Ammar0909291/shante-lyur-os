import { NotFoundError } from '@/domain/errors';
import type {
  ICustomerProfileRepository,
  ICustomerAllergyRepository,
  ICustomerRestrictionRepository,
  ISpecialistNoteRepository,
  IProcedureHistoryRepository,
  ICustomerTagRepository,
  IAppointmentRepository,
} from '@/application/ports';

export class GetCustomerDetailUseCase {
  constructor(
    private readonly profileRepo: ICustomerProfileRepository,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly allergyRepo: ICustomerAllergyRepository,
    private readonly restrictionRepo: ICustomerRestrictionRepository,
    private readonly noteRepo: ISpecialistNoteRepository,
    private readonly procedureRepo: IProcedureHistoryRepository,
    private readonly tagRepo: ICustomerTagRepository,
  ) {}

  async execute(profileId: string) {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile) {
      throw new NotFoundError('CustomerProfile', profileId);
    }

    const [recentAppointments, allergies, restrictions, tags, notes, procedureHistory] = await Promise.all([
      this.appointmentRepo.findMany({ clientId: profile.userId, limit: 10 }),
      this.allergyRepo.findByProfile(profileId),
      this.restrictionRepo.findByProfile(profileId),
      this.tagRepo.findByProfile(profileId),
      this.noteRepo.findByProfile(profileId, 15),
      this.procedureRepo.findByProfile(profileId, 20),
    ]);

    return {
      profile,
      recentAppointments,
      allergies,
      restrictions,
      tags,
      notes,
      procedureHistory,
    };
  }
}
