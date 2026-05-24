export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { prisma } from '@/infrastructure/config/prisma-client';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }

  const params = request.nextUrl.searchParams;
  const days = parseInt(params.get('days') ?? '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [byChannelStatus, dailyVolume, recentFailed, prefStats] = await Promise.all([
      // Delivery counts by channel × status
      prisma.outboundMessage.groupBy({
        by: ['channel', 'status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      // Daily send volume (last N days)
      prisma.$queryRaw<Array<{ day: string; count: bigint; channel: string }>>`
        SELECT DATE_TRUNC('day', created_at)::date::text AS day,
               channel,
               COUNT(*) AS count
        FROM outbound_messages
        WHERE created_at >= ${since}
        GROUP BY day, channel
        ORDER BY day ASC
      `,
      // Recent failures for debugging
      prisma.outboundMessage.findMany({
        where: { status: { in: ['FAILED', 'DEAD_LETTER'] }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, channel: true, errorMessage: true, retryCount: true,
          createdAt: true, failedAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      // Communication preferences breakdown
      prisma.communicationPreference.aggregate({
        _count: {
          whatsappEnabled: true,
          telegramEnabled: true,
          maxEnabled: true,
          emailEnabled: true,
        },
        where: {
          OR: [
            { whatsappEnabled: true },
            { telegramEnabled: true },
            { maxEnabled: true },
          ],
        },
      }),
    ]);

    // Compute summary
    let total = 0, sent = 0, delivered = 0, failed = 0;
    const byChannel: Record<string, { total: number; sent: number; delivered: number; failed: number }> = {};

    for (const row of byChannelStatus) {
      const ch = row.channel.toLowerCase();
      if (!byChannel[ch]) byChannel[ch] = { total: 0, sent: 0, delivered: 0, failed: 0 };
      const n = row._count;
      byChannel[ch].total += n;
      total += n;
      if (['SENT', 'DELIVERED', 'READ'].includes(row.status)) { sent += n; byChannel[ch].sent += n; }
      if (['DELIVERED', 'READ'].includes(row.status)) { delivered += n; byChannel[ch].delivered += n; }
      if (['FAILED', 'DEAD_LETTER'].includes(row.status)) { failed += n; byChannel[ch].failed += n; }
    }

    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    return ok({
      summary: { total, sent, delivered, failed, deliveryRate, periodDays: days },
      byChannel,
      dailyVolume: dailyVolume.map((r: { day: string; count: bigint; channel: string }) => ({ day: r.day, channel: r.channel, count: Number(r.count) })),
      recentFailures: recentFailed,
      preferences: {
        whatsappEnabled: prefStats._count.whatsappEnabled,
        telegramEnabled: prefStats._count.telegramEnabled,
        maxEnabled: prefStats._count.maxEnabled,
        emailEnabled: prefStats._count.emailEnabled,
      },
    });
  } catch (err) {
    console.error('[API:messaging/analytics]', err);
    return apiError('INTERNAL_ERROR', 'Failed to load analytics', 500);
  }
}
