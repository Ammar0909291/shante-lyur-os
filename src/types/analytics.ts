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
