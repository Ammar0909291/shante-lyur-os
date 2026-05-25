/**
 * ClientProfileService — thin orchestration layer between API routes and
 * the ClientProfileRepository. Resolves User.id → Specialist.id when needed.
 */

import { prisma } from '@/infrastructure/config/prisma-client';
import { clientProfileRepository } from '../infrastructure/client-profile.repository';
import type {
  ClientSummaryResponse,
  ClientProfileResponse,
  ClientBookingHistoryResponse,
  ClientTreatmentResponse,
  ClientTransactionResponse,
  ClientNoteResponse,
  ClientTreatmentItem,
  GetClientBookingsQuery,
  GetClientTreatmentsQuery,
  GetClientTransactionsQuery,
  CreateClientNoteDto,
  CreateTreatmentRecordDto,
} from '../domain/client.dto';

export class ClientProfileService {
  async getSummary(clientId: string): Promise<ClientSummaryResponse | null> {
    return clientProfileRepository.getClientSummary(clientId);
  }

  async getProfile(clientId: string): Promise<ClientProfileResponse | null> {
    return clientProfileRepository.getClientProfile(clientId);
  }

  async getBookings(clientId: string, query: GetClientBookingsQuery): Promise<ClientBookingHistoryResponse> {
    return clientProfileRepository.getClientBookings(clientId, query);
  }

  async getTreatments(clientId: string, query: GetClientTreatmentsQuery): Promise<ClientTreatmentResponse> {
    return clientProfileRepository.getClientTreatments(clientId, query);
  }

  async getTransactions(clientId: string, query: GetClientTransactionsQuery): Promise<ClientTransactionResponse> {
    return clientProfileRepository.getClientTransactions(clientId, query);
  }

  /**
   * authorUserId — User.id of the logged-in employee (from x-user-id header).
   * This method resolves it to Specialist.id before saving the note.
   */
  async addNote(
    clientId: string,
    authorUserId: string,
    dto: CreateClientNoteDto,
  ): Promise<ClientNoteResponse> {
    const specialist = await prisma.specialist.findUnique({ where: { userId: authorUserId } });
    if (!specialist) {
      throw new Error('SPECIALIST_PROFILE_REQUIRED');
    }
    return clientProfileRepository.addClientNote(clientId, specialist.id, dto);
  }

  async createTreatmentRecord(
    clientId: string,
    dto: CreateTreatmentRecordDto,
  ): Promise<ClientTreatmentItem> {
    return clientProfileRepository.createTreatmentRecord(clientId, dto);
  }
}

export const clientProfileService = new ClientProfileService();
