export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';

  const report: Record<string, unknown> = {};

  // 1. Total CLIENT users
  try {
    report.totalClientUsers = await prisma.user.count({ where: { role: 'CLIENT' } });
  } catch (e) {
    report.totalClientUsers = `ERROR: ${String(e)}`;
  }

  // 2. Total non-suspended CLIENT users
  try {
    report.totalActiveClientUsers = await prisma.user.count({
      where: { role: 'CLIENT', status: { not: 'SUSPENDED' } },
    });
  } catch (e) {
    report.totalActiveClientUsers = `ERROR: ${String(e)}`;
  }

  // 3. Sample of 5 CLIENT users (no profile join)
  try {
    const sample = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    report.sampleUsers = sample;
  } catch (e) {
    report.sampleUsers = `ERROR: ${String(e)}`;
  }

  // 4. Check if customerProfile.clientType column is accessible
  try {
    await prisma.customerProfile.findFirst({ select: { clientType: true } });
    report.clientTypeColumnExists = true;
  } catch (e) {
    report.clientTypeColumnExists = false;
    report.clientTypeError = String(e);
  }

  // 5. Count profiles with NULL client_type
  try {
    const nullCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM customer_profiles WHERE client_type IS NULL
    `;
    report.profilesWithNullClientType = Number(nullCount[0]?.count ?? 0);
  } catch (e) {
    report.profilesWithNullClientType = `ERROR: ${String(e)}`;
  }

  // 6. If query provided, run the actual search and return result/error
  if (q.trim().length >= 2) {
    try {
      const results = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          status: { not: 'SUSPENDED' },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { email:     { contains: q, mode: 'insensitive' } },
            { phone:     { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, firstName: true, lastName: true,
          customerProfile: { select: { clientType: true } },
        },
        take: 10,
      });
      report.searchResults = results;
      report.searchError = null;
    } catch (e) {
      report.searchResults = [];
      report.searchError = String(e);
    }

    // Also try search WITHOUT clientType to isolate the issue
    try {
      const results = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          status: { not: 'SUSPENDED' },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { email:     { contains: q, mode: 'insensitive' } },
            { phone:     { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, firstName: true, lastName: true },
        take: 10,
      });
      report.searchWithoutProfileResults = results;
      report.searchWithoutProfileError = null;
    } catch (e) {
      report.searchWithoutProfileResults = [];
      report.searchWithoutProfileError = String(e);
    }
  }

  return NextResponse.json({ success: true, data: report }, { status: 200 });
}
