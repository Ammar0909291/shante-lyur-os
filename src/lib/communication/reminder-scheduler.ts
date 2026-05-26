import { appointmentRemindersQueue } from '@/infrastructure/queues/queue-registry';
import type { AppointmentReminderJob } from '@/infrastructure/queues/job-types';

const MS = { h: 60 * 60 * 1000 };

const FIXED_WINDOWS: Array<{ type: '48h' | '24h' | '2h'; hoursBeforeMs: number }> = [
  { type: '48h', hoursBeforeMs: 48 * MS.h },
  { type: '24h', hoursBeforeMs: 24 * MS.h },
  { type: '2h',  hoursBeforeMs: 2  * MS.h },
];

function jobId(appointmentId: string, type: string): string {
  return `reminder:${appointmentId}:${type}`;
}

// Returns ms until 9:00 AM on the day of the appointment (Asia/Yekaterinburg = UTC+5)
function morningFireAt(startAt: Date): number {
  const YEKT_OFFSET_MS = 5 * MS.h;
  const localMs = startAt.getTime() + YEKT_OFFSET_MS;
  const dayStartLocal = Math.floor(localMs / (24 * MS.h)) * (24 * MS.h);
  const morningLocal = dayStartLocal + 9 * MS.h; // 09:00 YEKT
  return morningLocal - YEKT_OFFSET_MS; // back to UTC ms
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

  const windows: Array<{ type: string; fireAt: number }> = [
    ...FIXED_WINDOWS.map(({ type, hoursBeforeMs }) => ({
      type,
      fireAt: startMs - hoursBeforeMs,
    })),
    { type: 'morning', fireAt: morningFireAt(startAt) },
  ];

  for (const { type, fireAt } of windows) {
    if (fireAt <= now) continue;

    const delay = fireAt - now;
    const jid = jobId(appointmentId, type);

    try {
      const existing = await appointmentRemindersQueue.getJob(jid);
      if (existing) await existing.remove();
    } catch { /* already processed or not found */ }

    const jobData: AppointmentReminderJob = {
      appointmentId,
      customerId: clientUserId,
      specialistId: specialistUserId ?? '',
      scheduledAt: new Date(fireAt).toISOString(),
      reminderType: type as AppointmentReminderJob['reminderType'],
    };

    await appointmentRemindersQueue.add(jid, jobData, {
      delay,
      jobId: jid,
      removeOnComplete: true,
      removeOnFail: { count: 10 },
      attempts: 2,
      backoff: { type: 'fixed', delay: 30_000 },
    }).catch((err: unknown) => {
      console.warn(`[ReminderScheduler] Failed to schedule ${type} for ${appointmentId}:`,
        err instanceof Error ? err.message : err);
    });

    console.info(`[ReminderScheduler] Scheduled ${type} reminder for appointment ${appointmentId} in ${Math.round(delay / MS.h * 10) / 10}h`);
  }
}

export async function cancelReminders(appointmentId: string): Promise<void> {
  const types = [...FIXED_WINDOWS.map((w) => w.type), 'morning'];
  for (const type of types) {
    try {
      const job = await appointmentRemindersQueue.getJob(jobId(appointmentId, type));
      if (job) {
        await job.remove();
        console.info(`[ReminderScheduler] Cancelled ${type} reminder for appointment ${appointmentId}`);
      }
    } catch { /* already fired or not found */ }
  }
}
