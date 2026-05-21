export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';

function ok<T>(data: T) { return NextResponse.json({ success: true, data }); }
function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const sevenDays  = new Date(now.getTime() +  7 * 24 * 3600 * 1000);

    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, category: true, unit: true,
        currentStock: true, minStock: true, expiresAt: true,
      },
    });

    const lowStock = items
      .filter((i) => Number(i.currentStock) <= Number(i.minStock))
      .map((i) => ({
        id: i.id, name: i.name, category: i.category, unit: i.unit,
        currentStock: Number(i.currentStock), minStock: Number(i.minStock),
        severity: Number(i.currentStock) <= 0 ? 'critical' : Number(i.currentStock) <= Number(i.minStock) * 0.5 ? 'high' : 'medium',
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    const expiring = items
      .filter((i) => i.expiresAt && i.expiresAt <= thirtyDays && i.expiresAt >= now)
      .map((i) => ({
        id: i.id, name: i.name, category: i.category, unit: i.unit,
        expiresAt: i.expiresAt!,
        daysLeft: Math.ceil((i.expiresAt!.getTime() - now.getTime()) / 86400000),
        severity: i.expiresAt! <= sevenDays ? 'critical' : 'warning',
      }))
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

    const expired = items
      .filter((i) => i.expiresAt && i.expiresAt < now)
      .map((i) => ({ id: i.id, name: i.name, category: i.category, expiresAt: i.expiresAt! }));

    return ok({ lowStock, expiring, expired, counts: { lowStock: lowStock.length, expiring: expiring.length, expired: expired.length } });
  } catch (err) {
    if (err instanceof Error) return apiError('INTERNAL_ERROR', err.message, 500);
    return apiError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
}
