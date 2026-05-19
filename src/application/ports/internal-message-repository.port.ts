import { MessageVisibility } from '@/domain/enums';

export interface InternalMessageRecord {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string | null;
  recipientName: string | null;
  content: string;
  appointmentId: string | null;
  profileId: string | null;
  visibility: MessageVisibility;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface IInternalMessageRepository {
  /**
   * Returns messages visible to the given user:
   *   - BROADCAST messages (no recipient) visible to all staff
   *   - DIRECT messages where userId is sender or recipient
   * Ordered by createdAt desc.
   */
  findForUser(
    userId: string,
    options?: {
      appointmentId?: string;
      profileId?: string;
      visibility?: MessageVisibility;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: InternalMessageRecord[]; total: number }>;

  create(data: {
    senderId: string;
    recipientId?: string;
    content: string;
    appointmentId?: string;
    profileId?: string;
    visibility: MessageVisibility;
  }): Promise<InternalMessageRecord>;

  markRead(id: string, userId: string): Promise<void>;

  countUnread(userId: string): Promise<number>;
}
