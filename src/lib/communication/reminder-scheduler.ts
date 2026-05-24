import { appointmentRemindersQueue } from '@/infrastructure/queues/queue-registry';
import type { AppointmentReminderJob } from '@/infrastructure/queues/job-types';

const MS = { h: 60 * 60 * 1000 };

const WINDOWS: Array<{ type: '24h' | '2h'; hoursBeforeMs: number }> = [
  { type: '24h', hoursBeforeMs: 24 * MS.h },
  { type: '2h', hoursBeforeMs: 2 * MS.h },
];

function jobId(appointmentId: string, type: string): string {
  return `reminder:${appointmentId}:${type}`;
}

export async function scheduleReminders(params: {
  appointmentId: string;
  clientUserId: string;
  specialistUserId?: string;
  startAt: Date;
}): Promise<void> {
  const { appointmentId, clientUserId, specialistUserId, startAt } = params;
  const now = Date.now();
  const startMs = startAt.getTime();

  for (const { type, hoursBeforeMs } of WINDOWS) {
    const fireAt = startMs - hoursBeforeMs;
    if (fireAt <= now) continue; // appointment too soon — skip

    const delay = fireAt - now;
    const jid = jobId(appointmentId, type);

    // Remove existing delayed job (handles reschedule)
    try {
      const existing = await appointmentRemindersQueue.getJob(jid);
      if (existing) await existing.remove();
    } catch { /* job already processed or not found */ }

    const jobData: AppointmentReminderJob = {
      appointmentId,
      customerId: clientUserId,
      specialistId: specialistUserId ?? '',
      scheduledAt: new Date(fireAt).toISOString(),
      reminderType: type,
    };

    await appointmentRemindersQueue.add(jid, jobData, {
      delay,
      jobId: jid,
      removeOnComplete: true,
      removeOnFail: { count: 10 },
      attempts: 2,
      backoff: { type: 'fixed', delay: 30_000 },
    }).catch((err: unknown) => {
      // Non-fatal: log and continue (Redis unavailable)
      console.warn(`[ReminderScheduler] Failed to schedule ${type} for ${appointmentId}:`,
        err instanceof Error ? err.message : err);
    });

    console.info(`[ReminderScheduler] Scheduled ${type} reminder for appointment ${appointmentId} in ${Math.round(delay / MS.h * 10) / 10}h`);
  }
}

export async function cancelReminders(appointmentId: string): Promise<void> {
  for (const { type } of WINDOWS) {
    try {
      const job = await appointmentRemindersQueue.getJob(jobId(appointmentId, type));
      if (job) {
        await job.remove();
        console.info(`[ReminderScheduler] Cancelled ${type} reminder for appointment ${appointmentId}`);
      }
    } catch { /* already fired or not found — safe to ignore */ }
  }
}
