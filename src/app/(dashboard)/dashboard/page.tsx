'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getClientRole } from '@/lib/client-auth';
import OperationsPage from '@/app/(dashboard)/operations/page';

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

export default function DashboardPage() {
  const router = useRouter();
  const role = getClientRole();

  React.useEffect(() => {
    if (SPECIALIST_ROLES.includes(role)) {
      router.replace('/my-panel');
    }
  }, [role, router]);

  // Specialists see nothing briefly before redirect
  if (SPECIALIST_ROLES.includes(role)) return null;

  return <OperationsPage />;
}
