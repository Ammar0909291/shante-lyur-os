'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getClientRole } from '@/lib/client-auth';

const SPECIALIST_ROLES = ['COSMETOLOGIST', 'MASSAGIST'];

export default function DashboardPage() {
  const router = useRouter();
  const role = getClientRole();

  React.useEffect(() => {
    if (SPECIALIST_ROLES.includes(role)) {
      router.replace('/my-panel');
    } else {
      router.replace('/operations');
    }
  }, [role, router]);

  return null;
}
