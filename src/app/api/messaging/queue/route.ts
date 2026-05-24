export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { ok, apiError } from '@/app/api/analytics/dashboard/_utils';
import { omnichannelQueue } from '@/infrastructure/queues/queue-registry';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role ?? '')) {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      omnichannelQueue.getWaitingCount(),
      omnichannelQueue.getActiveCount(),
      omnichannelQueue.getCompletedCount(),
      omnichannelQueue.getFailedCount(),
      omnichannelQueue.getDelayedCount(),
    ]);

    const failedJobs = await omnichannelQueue.getFailed(0, 10);
    const recentFailed = failedJobs.map((j) => ({
      id: j.id,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    }));

    return ok({ queue: { waiting, active, completed, failed, delayed }, recentFailed });
  } catch (err) {
    console.error('[API:messaging/queue]', err);
    return apiError('INTERNAL_ERROR', 'Failed to get queue status', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!['SUPER_ADMIN'].includes(role ?? '')) {
    return apiError('FORBIDDEN', 'Super admin access required', 403);
  }

  const params = request.nextUrl.searchParams;
  const action = params.get('action');

  try {
    if (action === 'retry-failed') {
      const failedJobs = await omnichannelQueue.getFailed(0, 100);
      await Promise.all(failedJobs.map((j) => j.retry()));
      return ok({ retriedCount: failedJobs.length });
    }

    if (action === 'drain') {
      await omnichannelQueue.drain();
      return ok({ drained: true });
    }

    return apiError('BAD_REQUEST', 'Unknown action. Use action=retry-failed or action=drain', 400);
  } catch (err) {
    console.error('[API:messaging/queue] DELETE', err);
    return apiError('INTERNAL_ERROR', 'Queue operation failed', 500);
  }
}
