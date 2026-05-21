export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_VERSION: string = (require('../../../../package.json') as { version: string }).version ?? 'unknown';

type DbStatus = 'connected' | 'disconnected';
type HealthStatus = 'ok' | 'degraded' | 'down';

interface HealthData {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: DbStatus;
      latencyMs: number | null;
    };
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  let dbStatus: DbStatus = 'disconnected';
  let latencyMs: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - t0;
    dbStatus = 'connected';
  } catch {
    latencyMs = null;
    dbStatus = 'disconnected';
  }

  const overallStatus: HealthStatus = dbStatus === 'connected' ? 'ok' : 'degraded';

  const data: HealthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: APP_VERSION,
    checks: {
      database: {
        status: dbStatus,
        latencyMs,
      },
    },
  };

  return NextResponse.json(
    { success: true, data },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
