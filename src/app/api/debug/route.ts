export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import bcrypt from 'bcryptjs';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. DB connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.db_connection = 'OK';
  } catch (e) {
    results.db_connection = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json(results);
  }

  // 2. Admin user exists
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@shantelyur.ru' },
      select: { id: true, email: true, role: true, status: true, passwordHash: true, emailVerified: true },
    });
    if (!user) {
      results.admin_user = 'NOT FOUND — run: npx prisma migrate reset --force';
      return NextResponse.json(results);
    }
    results.admin_user = { id: user.id, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified };

    // 3. Password check
    const passwordOk = await bcrypt.compare('admin123', user.passwordHash);
    results.password_check = passwordOk ? 'OK — admin123 matches' : 'FAIL — hash mismatch, reset DB';
  } catch (e) {
    results.admin_user = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4. DIRegistry init
  try {
    const { DIRegistry } = await import('@/infrastructure/config/di-registry');
    DIRegistry.reset();
    const reg = DIRegistry.instance;
    results.di_registry = reg ? 'OK' : 'FAIL — returned null';
  } catch (e) {
    results.di_registry = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 5. JWT generation
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET ?? 'dev-access-secret-change-me';
    const token = jwt.sign({ sub: 'test', type: 'access' }, secret, { expiresIn: 60 });
    const decoded = jwt.verify(token, secret);
    results.jwt = decoded ? 'OK' : 'FAIL';
  } catch (e) {
    results.jwt = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results, { status: 200 });
}
