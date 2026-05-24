import { prisma } from '@/infrastructure/config/prisma-client';
import type { NextRequest } from 'next/server';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  userId?: string | null;
  role?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  appointmentId?: string | null;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRequestMeta(req: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;
  return { ipAddress: ip, userAgent: req.headers.get('user-agent') };
}

// ─── Core logger ─────────────────────────────────────────────────────────────

/**
 * Write an audit log entry. Non-fatal — errors are caught and printed.
 * Always use void/fire-and-forget unless you need the result.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const meta: Record<string, unknown> = {
      ...(entry.metadata ?? {}),
      ...(entry.role ? { role: entry.role } : {}),
    };

    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? undefined,
        action: entry.action as never,
        entityType: entry.entityType,
        entityId: entry.entityId ?? undefined,
        appointmentId: entry.appointmentId ?? undefined,
        oldValues: entry.oldValues as never ?? undefined,
        newValues: entry.newValues as never ?? undefined,
        ipAddress: entry.ipAddress ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        metadata: Object.keys(meta).length > 0 ? (meta as never) : undefined,
      },
    });
  } catch (err) {
    console.error('[audit] write failed:', err instanceof Error ? err.message : err);
  }
}
