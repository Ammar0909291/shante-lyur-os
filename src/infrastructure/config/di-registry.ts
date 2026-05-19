import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma-client';
import { eventBus } from '@/lib/event-bus';
import type { IEventBus } from '@/application/ports';

// Repositories
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { PrismaRefreshTokenRepository } from '../repositories/prisma-refresh-token.repository';
import { PrismaSessionRepository } from '../repositories/prisma-session.repository';
import { PrismaAppointmentRepository } from '../repositories/prisma-appointment.repository';
import { PrismaCustomerProfileRepository } from '../repositories/prisma-customer-profile.repository';
import { PrismaCustomerAllergyRepository } from '../repositories/prisma-customer-allergy.repository';
import { PrismaCustomerRestrictionRepository } from '../repositories/prisma-customer-restriction.repository';
import { PrismaSpecialistNoteRepository } from '../repositories/prisma-specialist-note.repository';
import { PrismaProcedureHistoryRepository } from '../repositories/prisma-procedure-history.repository';
import { PrismaCustomerTagRepository } from '../repositories/prisma-customer-tag.repository';
import { PrismaServiceRepository } from '../repositories/prisma-service.repository';
import { PrismaLocationRepository } from '../repositories/prisma-location.repository';
import { PrismaSpecialistRepository } from '../repositories/prisma-specialist.repository';
import { PrismaWorkingScheduleRepository } from '../repositories/prisma-working-schedule.repository';
import { PrismaBlockedTimeRepository } from '../repositories/prisma-blocked-time.repository';
import { PrismaVacationRepository } from '../repositories/prisma-vacation.repository';
import { PrismaPaymentRepository } from '../repositories/prisma-payment.repository';
import { PrismaRefundRepository } from '../repositories/prisma-refund.repository';
import { PrismaPromoCodeRepository } from '../repositories/prisma-promo-code.repository';
import { PrismaRevenueRecordRepository } from '../repositories/prisma-revenue-record.repository';
import { PrismaNotificationRepository } from '../repositories/prisma-notification.repository';
import { PrismaAuditLogRepository } from '../repositories/prisma-audit-log.repository';
import { PrismaDailyMetricsRepository } from '../repositories/prisma-daily-metrics.repository';
import { PrismaAIPredictionRepository } from '../repositories/prisma-ai-prediction.repository';
import { PrismaInternalMessageRepository } from '../repositories/prisma-internal-message.repository';

// Services
import { BcryptPasswordHasher } from '../services/bcrypt-password-hasher.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { AuthService } from '../services/auth.service';
import { SmtpEmailService } from '../services/smtp-email.service';
import { NotificationService } from '../services/notification.service';
import { YooKassaGateway } from '../services/yookassa-gateway.service';
import { RobokassaGateway } from '../services/robokassa-gateway.service';
import { PaymentOrchestrator } from '../services/payment-orchestrator.service';
import { SSERealtimeService } from '../services/sse-realtime.service';
import { AIPredictionService } from '../services/ai-prediction.service';

export class DIRegistry {
  private static _instance: DIRegistry;

  // Repositories
  readonly userRepository: PrismaUserRepository;
  readonly refreshTokenRepository: PrismaRefreshTokenRepository;
  readonly sessionRepository: PrismaSessionRepository;
  readonly appointmentRepository: PrismaAppointmentRepository;
  readonly customerProfileRepository: PrismaCustomerProfileRepository;
  readonly customerAllergyRepository: PrismaCustomerAllergyRepository;
  readonly customerRestrictionRepository: PrismaCustomerRestrictionRepository;
  readonly specialistNoteRepository: PrismaSpecialistNoteRepository;
  readonly procedureHistoryRepository: PrismaProcedureHistoryRepository;
  readonly customerTagRepository: PrismaCustomerTagRepository;
  readonly serviceRepository: PrismaServiceRepository;
  readonly locationRepository: PrismaLocationRepository;
  readonly specialistRepository: PrismaSpecialistRepository;
  readonly workingScheduleRepository: PrismaWorkingScheduleRepository;
  readonly blockedTimeRepository: PrismaBlockedTimeRepository;
  readonly vacationRepository: PrismaVacationRepository;
  readonly paymentRepository: PrismaPaymentRepository;
  readonly refundRepository: PrismaRefundRepository;
  readonly promoCodeRepository: PrismaPromoCodeRepository;
  readonly revenueRecordRepository: PrismaRevenueRecordRepository;
  readonly notificationRepository: PrismaNotificationRepository;
  readonly auditLogRepository: PrismaAuditLogRepository;
  readonly dailyMetricsRepository: PrismaDailyMetricsRepository;
  readonly aiPredictionRepository: PrismaAIPredictionRepository;
  readonly internalMessageRepository: PrismaInternalMessageRepository;

  // Services
  readonly passwordHasher: BcryptPasswordHasher;
  readonly tokenService: JwtTokenService;
  readonly authService: AuthService;
  readonly emailService: SmtpEmailService;
  readonly notificationService: NotificationService;
  readonly yooKassaGateway: YooKassaGateway;
  readonly robokassaGateway: RobokassaGateway;
  readonly paymentOrchestrator: PaymentOrchestrator;
  readonly realtimeService: SSERealtimeService;
  readonly aiPredictionService: AIPredictionService;
  readonly eventBus: IEventBus;

  private constructor(db: PrismaClient = prisma) {
    // Repositories
    this.userRepository = new PrismaUserRepository(db);
    this.refreshTokenRepository = new PrismaRefreshTokenRepository(db);
    this.sessionRepository = new PrismaSessionRepository(db);
    this.appointmentRepository = new PrismaAppointmentRepository(db);
    this.customerProfileRepository = new PrismaCustomerProfileRepository(db);
    this.customerAllergyRepository = new PrismaCustomerAllergyRepository(db);
    this.customerRestrictionRepository = new PrismaCustomerRestrictionRepository(db);
    this.specialistNoteRepository = new PrismaSpecialistNoteRepository(db);
    this.procedureHistoryRepository = new PrismaProcedureHistoryRepository(db);
    this.customerTagRepository = new PrismaCustomerTagRepository(db);
    this.serviceRepository = new PrismaServiceRepository(db);
    this.locationRepository = new PrismaLocationRepository(db);
    this.specialistRepository = new PrismaSpecialistRepository(db);
    this.workingScheduleRepository = new PrismaWorkingScheduleRepository(db);
    this.blockedTimeRepository = new PrismaBlockedTimeRepository(db);
    this.vacationRepository = new PrismaVacationRepository(db);
    this.paymentRepository = new PrismaPaymentRepository(db);
    this.refundRepository = new PrismaRefundRepository(db);
    this.promoCodeRepository = new PrismaPromoCodeRepository(db);
    this.revenueRecordRepository = new PrismaRevenueRecordRepository(db);
    this.notificationRepository = new PrismaNotificationRepository(db);
    this.auditLogRepository = new PrismaAuditLogRepository(db);
    this.dailyMetricsRepository = new PrismaDailyMetricsRepository(db);
    this.aiPredictionRepository = new PrismaAIPredictionRepository(db);
    this.internalMessageRepository = new PrismaInternalMessageRepository(db);

    // Services
    this.passwordHasher = new BcryptPasswordHasher();
    this.tokenService = new JwtTokenService();
    this.authService = new AuthService(
      this.userRepository,
      this.passwordHasher,
      this.tokenService,
      this.refreshTokenRepository,
      this.sessionRepository
    );
    this.emailService = new SmtpEmailService();
    this.notificationService = new NotificationService(
      this.emailService,
      this.notificationRepository
    );
    this.yooKassaGateway = new YooKassaGateway();
    this.robokassaGateway = new RobokassaGateway();
    this.paymentOrchestrator = new PaymentOrchestrator(
      this.yooKassaGateway,
      this.robokassaGateway,
      this.paymentRepository
    );
    this.realtimeService = new SSERealtimeService();
    this.aiPredictionService = new AIPredictionService(
      this.appointmentRepository,
      this.revenueRecordRepository,
      this.aiPredictionRepository
    );

    // ── Event bus wiring ──────────────────────────────────────────────────────
    this.eventBus = eventBus;
    this._wireEventHandlers();
  }

  private _wireEventHandlers(): void {
    const aptRepo    = this.appointmentRepository;
    const userRepo   = this.userRepository;
    const notifySvc  = this.notificationService;
    const sse        = this.realtimeService;

    const MOSCOW = 'Europe/Moscow';

    eventBus.subscribe('APPOINTMENT_BOOKED', async (event) => {
      sse.broadcast('appointments', 'appointment:updated', {
        appointmentId: event.aggregateId,
        type: 'booked',
      });
    });

    eventBus.subscribe('APPOINTMENT_CONFIRMED', async (event) => {
      try {
        const apt = await aptRepo.findById(event.aggregateId);
        if (!apt) return;
        const client = await userRepo.findById(apt.clientId);
        if (!client) return;
        const serviceName = apt.services[0]?.name ?? 'услугу';
        const date = apt.startAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', timeZone: MOSCOW });
        const time = apt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: MOSCOW });
        await notifySvc.sendBookingConfirmation(
          client.id,
          client.email.value,
          `${client.firstName} ${client.lastName}`,
          { serviceName, specialistName: '', date, time },
        );
      } catch (err) {
        console.error('[EventBus] APPOINTMENT_CONFIRMED handler error:', err);
      }
      sse.broadcast('appointments', 'appointment:updated', {
        appointmentId: event.aggregateId,
        type: 'confirmed',
      });
    });

    eventBus.subscribe('APPOINTMENT_CANCELLED', async (event) => {
      try {
        const apt = await aptRepo.findById(event.aggregateId);
        if (!apt) return;
        const client = await userRepo.findById(apt.clientId);
        if (!client) return;
        const serviceName = apt.services[0]?.name ?? 'услугу';
        const date = apt.startAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', timeZone: MOSCOW });
        const time = apt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: MOSCOW });
        await notifySvc.sendCancellationNotice(client.id, { serviceName, date, time });
      } catch (err) {
        console.error('[EventBus] APPOINTMENT_CANCELLED handler error:', err);
      }
      sse.broadcast('appointments', 'appointment:updated', {
        appointmentId: event.aggregateId,
        type: 'cancelled',
      });
    });

    eventBus.subscribe('APPOINTMENT_RESCHEDULED', async (event) => {
      sse.broadcast('appointments', 'appointment:updated', {
        appointmentId: event.aggregateId,
        type: 'rescheduled',
      });
    });

    eventBus.subscribe('APPOINTMENT_COMPLETED', async (event) => {
      sse.broadcast('appointments', 'appointment:updated', {
        appointmentId: event.aggregateId,
        type: 'completed',
      });
    });
  }

  static get instance(): DIRegistry {
    if (!DIRegistry._instance) {
      DIRegistry._instance = new DIRegistry();
    }
    return DIRegistry._instance;
  }

  static reset(): void {
    DIRegistry._instance = undefined as unknown as DIRegistry;
  }
}

export const di = () => DIRegistry.instance;
