'use client';

import * as React from 'react';
import { useLocale } from '@/components/providers/locale-provider';

export default function Page() {
  const { t } = useLocale();
  return (
    <div className="p-6 lg:p-8">
      <div className="card-luxury p-8 text-center">
        <p className="text-text-secondary">{t('page.under_construction')}</p>
      </div>
    </div>
  );
}
