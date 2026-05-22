export const dynamic = 'force-dynamic';

import * as React from 'react';
import { cookies } from 'next/headers';
import { UIPageWrapper } from '@/next-ui/components/UIPageWrapper';
import { NextDashboard } from '@/next-ui/dashboard/NextDashboard';
import { LegacyDashboardContent } from './_components/LegacyDashboardContent';
import type { DashboardSummary } from '@/types/analytics';

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getSummary(): Promise<DashboardSummary | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/analytics/dashboard/summary`, {
      cache: 'no-store',
      headers: token ? { Cookie: `access_token=${token}` } : {},
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: DashboardSummary };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

const EMPTY_SUMMARY: DashboardSummary = {
  bookings: {
    today: { total: 0, completed: 0, upcoming: 0, cancelled: 0, byType: { cosmetology: 0, massage: 0 } },
    trend: { vsYesterday: 0, vsLastWeek: 0 },
  },
  specialists: {
    total: 0,
    active: 0,
    byType: { cosmetology: 0, massage: 0 },
    workingToday: 0,
    massageWorkload: { meetingTarget: 0, belowTarget: 0, overridden: 0 },
  },
  revenue: {
    thisWeek: { total: 0, byType: { cosmetology: 0, massage: 0 } },
    trend: { vsLastWeek: 0, vsLastMonth: 0 },
    today: 0,
  },
  generatedAt: new Date().toISOString(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const summary = (await getSummary()) ?? EMPTY_SUMMARY;

  const legacyData = {
    todayBookings: summary.bookings.today.total,
    pendingCount: summary.bookings.today.upcoming,
    revenueMtd: summary.revenue.thisWeek.total,
    revenueTrend: summary.revenue.trend.vsLastWeek,
    totalClients: 0,
    newClientsThisMonth: 0,
    appointments: [] as {
      id: string;
      client: string;
      service: string;
      specialist: string;
      time: Date;
      status: string;
      amount: number;
    }[],
  };

  return (
    <UIPageWrapper
      legacy={<LegacyDashboardContent summary={summary} />}
      next={<NextDashboard data={legacyData} />}
    />
  );
}
