'use client';

import * as React from 'react';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-champagne/8 flex items-center justify-center mb-4">
        <Package className="w-7 h-7 text-champagne" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-2xl font-medium text-text-primary mb-2">Склад</h1>
      <p className="text-sm text-text-tertiary max-w-xs">
        Управление товарными запасами и расходными материалами находится в разработке.
      </p>
    </div>
  );
}
