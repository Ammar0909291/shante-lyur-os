export type SpecialistDepartment = 'COSMETOLOGY' | 'MASSAGE' | 'RECEPTION' | 'MANAGEMENT';

export type OperationalStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type SpecialistLiveStatus = 'FREE' | 'BUSY' | 'OVERBOOKED' | 'OFFLINE';

export type AlertType =
  | 'LATE_CLIENT'
  | 'OVERRUN_PROCEDURE'
  | 'LONG_WAIT'
  | 'ROOM_CONFLICT'
  | 'SPECIALIST_OVERLOADED'
  | 'MASSAGE_OVERLOAD';

export interface OperationalAppointment {
  id: string;
  clientName: string;
  clientId: string;
  specialistId: string;
  specialistName: string;
  specialistType: SpecialistDepartment;
  services: string[];
  startAt: string; // ISO
  endAt: string; // ISO
  duration: number; // minutes
  operationalStatus: OperationalStatus;
  dbStatus: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  roomId: string | null;
  roomName: string | null;
  waitMinutes: number | null;
  delayMinutes: number;
  revenue: number;
}

export interface LiveSpecialist {
  id: string;
  name: string;
  type: SpecialistDepartment;
  liveStatus: SpecialistLiveStatus;
  currentAppointment: OperationalAppointment | null;
  nextAppointment: OperationalAppointment | null;
  todayCompleted: number;
  todayScheduled: number;
  massageWeight: number | null;
  massageWeightTarget: number | null; // 6.0 for massage
}

export interface RoomStatus {
  id: string;
  name: string;
  type: 'MASSAGE' | 'COSMETOLOGY' | 'GENERAL';
  isOccupied: boolean;
  currentAppointment: OperationalAppointment | null;
  nextAvailableAt: string | null;
  todayBookings: number;
}

export interface OperationalAlert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  appointmentId: string | null;
  specialistId: string | null;
  detectedAt: string;
}

export interface OperationalMetrics {
  totalBookings: number;
  pending: number;
  confirmed: number;
  arrived: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  avgWaitMinutes: number;
  avgDelayMinutes: number;
  occupancyRate: number;
}

export interface TodayOperationsResponse {
  date: string;
  generatedAt: string;
  metrics: OperationalMetrics;
  queue: OperationalAppointment[];
  specialists: LiveSpecialist[];
  rooms: RoomStatus[];
  alerts: OperationalAlert[];
}

export type TransitionAction =
  | 'confirm'   // PENDING → CONFIRMED
  | 'checkin'   // PENDING | CONFIRMED → sets checkedInAt (status unchanged)
  | 'start'     // PENDING | CONFIRMED → IN_PROGRESS
  | 'complete'  // IN_PROGRESS → COMPLETED
  | 'noshow'    // PENDING | CONFIRMED → NO_SHOW
  | 'cancel';   // PENDING | CONFIRMED | IN_PROGRESS → CANCELLED

export interface RoomCreateBody {
  name: string;
  type: 'MASSAGE' | 'COSMETOLOGY' | 'GENERAL';
  locationId: string;
  notes?: string;
}

export interface RoomAssignBody {
  appointmentId: string;
}
