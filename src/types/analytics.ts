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
