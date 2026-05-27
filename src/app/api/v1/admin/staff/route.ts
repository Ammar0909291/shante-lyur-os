export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/config/prisma-client';
import bcrypt from 'bcryptjs';

function ok<T>(data: T, status = 200) { return NextResponse.json({ success: true, data }, { status }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: { message: msg } }, { status });
}

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];
const DEPT_MAP: Record<string, 'COSMETOLOGY' | 'MASSAGE'> = {
  COSMETOLOGIST: 'COSMETOLOGY',
  MASSAGIST:     'MASSAGE',
};

export async function POST(req: NextRequest) {
  const callerRole = req.headers.get('x-user-role') ?? '';
  const callerId   = req.headers.get('x-user-id')   ?? '';
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(callerRole)) return err('Forbidden', 403);

  let body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    password: string;
    department?: string;
  };

  try { body = await req.json(); }
  catch { return err('Invalid JSON'); }

  const { firstName, lastName, email, phone, role, password, department } = body;
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !role || !password) {
    return err('firstName, lastName, email, role, password are required');
  }
  if (password.length < 6) return err('Пароль должен содержать минимум 6 символов');
  if (!['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST','COSMETOLOGIST','MASSAGIST'].includes(role)) {
    return err('Invalid role');
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return err('Пользователь с таким email уже существует', 409);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email:         email.trim().toLowerCase(),
      passwordHash,
      firstName:     firstName.trim(),
      lastName:      lastName.trim(),
      phone:         phone?.trim() || null,
      role:          role as never,
      status:        'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
    },
  });

  // Create Specialist record for specialist roles
  if (SPECIALIST_ROLES.includes(role)) {
    const dept = (department ?? DEPT_MAP[role]) as 'COSMETOLOGY' | 'MASSAGE';
    await prisma.specialist.create({
      data: {
        userId:     user.id,
        department: dept,
        status:     'ACTIVE',
      },
    });
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId:     callerId || null,
        action:     'CREATE',
        entityType: 'User',
        entityId:   user.id,
        newValues:  { email: user.email, role, firstName, lastName } as never,
        ipAddress:  req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      },
    });
  } catch {}

  return ok({
    id:        user.id,
    firstName: user.firstName,
    lastName:  user.lastName,
    email:     user.email,
    role:      user.role,
    status:    user.status,
  }, 201);
}
