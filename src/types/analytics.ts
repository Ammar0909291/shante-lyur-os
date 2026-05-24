/**
 * Shared TypeScript types for the analytics data layer.
 * Matches the /api/analytics/dashboard/summary response shape exactly.
 * Reused by Phase B2 (dashboard UI) and Phase B3+ (specialist performance).
 */

export interface BookingsByType {
  cosmetology: number;
  massage: number;
}

export interface DashboardBookings {
  today: {
    total: number;
    completed: number;
    upcoming: number;
    cancelled: number;
    byType: BookingsByType;
  };
  trend: {
    vsYesterday: number;
    vsLastWeek: number;
  };
}

export interface MassageWorkload {
  meetingTarget: number;
  belowTarget: number;
  overridden: number;
}

export interface DashboardSpecialists {
  total: number;
  active: number;
  byType: BookingsByType;
  workingToday: number;
  massageWorkload: MassageWorkload;
}

export interface RevenueByType {
  cosmetology: number;
  massage: number;
}

export interface DashboardRevenue {
  thisWeek: {
    total: number;
    byType: RevenueByType;
  };
  trend: {
    vsLastWeek: number;
    vsLastMonth: number;
  };
  today: number;
}

export interface DashboardSummary {
  bookings: DashboardBookings;
  specialists: DashboardSpecialists;
  revenue: DashboardRevenue;
  generatedAt: string;
}

// ─── Phase B3: Specialist Performance ────────────────────────────────────────

export interface ServiceCategoryBreakdown {
  category: string;
  sessionCount: number;
  revenue: number;
  avgDuration: number;
}

export interface DailySessionPoint {
  date: string; // YYYY-MM-DD
  count: number;
  revenue: number;
}

export interface TopService {
  serviceId: string;
  serviceName: string;
  sessionCount: number;
  revenue: number;
}

export interface SpecialistPerformanceSummary {
  id: string;
  name: string;
  specialistType: 'MASSAGE' | 'COSMETOLOGY';
  totalSessions: number;
  revenueGenerated: number;
  avgSessionDuration: number;
  clientRetentionRate: number;
  workloadCompliance: number | null;
  trendVsLastMonth: number;
}

export interface SpecialistPerformanceDetail extends SpecialistPerformanceSummary {
  byServiceCategory: ServiceCategoryBreakdown[];
  dailySessions: DailySessionPoint[];
  topServices: TopService[];
  repeatClientRatio: number;
  totalUniqueClients: number;
}

// ─── Phase B4: Massage Workload ───────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface MassageSpecialistWorkload {
  id: string;
  name: string;
  sessionsToday: number;
  sessionWeight: number;
  targetMet: boolean;
  overridden: boolean;
  overrideReason: string | null;
  remainingToTarget: number;
  nextAppointment: string | null;
  schedulingRecommendation: string | null;
}

export interface MassageWorkloadSummary {
  date: string;
  summary: {
    totalMassageSpecialists: number;
    workingToday: number;
    meetingTarget: number;
    belowTarget: number;
    overridden: number;
  };
  specialists: MassageSpecialistWorkload[];
}

export interface WorkloadAlert {
  specialistId: string;
  specialistName: string;
  severity: AlertSeverity;
  sessionWeight: number;
  remainingToTarget: number;
  hoursLeftInDay: number;
  overridden: boolean;
  message: { ru: string; en: string };
}

export interface MassageAlertsResponse {
  generatedAt: string;
  alerts: WorkloadAlert[];
  totalAlerts: number;
  criticalCount: number;
}

export interface WorkloadOverrideRecord {
  id: string;
  specialistId: string;
  date: string;
  reason: string | null;
  overriddenBy: string;
  createdAt: string;
}

// ─── Phase B5: Financial / Profitability ──────────────────────────────────────

export interface FinancialCategoryBreakdown {
  category: string;
  revenue: number;
  sessionCount: number;
  avgTicket: number;
}

export interface FinancialBySpecialistType {
  specialistType: 'MASSAGE' | 'COSMETOLOGY';
  revenue: number;
  sessionCount: number;
}

export interface FinancialDayPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  sessionCount: number;
}

export interface FinancialTopDay {
  date: string;
  revenue: number;
}

export interface FinancialRevenueResponse {
  period: { from: string; to: string };
  total: number;
  byCategory: FinancialCategoryBreakdown[];
  bySpecialistType: FinancialBySpecialistType[];
  byDay: FinancialDayPoint[];
  trend: { vsLastPeriod: number };
  avgTicket: number;
  topEarningDay: FinancialTopDay | null;
}

export interface PeakHourCell {
  dayOfWeek: number; // 0=Mon … 6=Sun
  hour: number;      // 0-23
  bookingCount: number;
  revenue: number;
}

export interface PeakHoursResponse {
  period: { from: string; to: string };
  heatmap: PeakHourCell[];
  peakHour: { dayOfWeek: number; hour: number; bookingCount: number } | null;
  peakDay: { dayOfWeek: number; totalRevenue: number } | null;
}

export type ForecastConfidence = 'high' | 'medium' | 'low';

export interface ForecastPoint {
  date: string; // YYYY-MM-DD
  forecastedRevenue: number;
  confidence: ForecastConfidence;
}

export interface FinancialForecastResponse {
  generatedAt: string;
  historicalDays: FinancialDayPoint[];
  forecast: ForecastPoint[];
  rollingAvgRevenue: number;
  trend: 'up' | 'down' | 'stable';
}
