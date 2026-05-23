'use client';

import * as React from 'react';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-champagne/8 flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-champagne" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-2xl font-medium text-text-primary mb-2">Чат</h1>
      <p className="text-sm text-text-tertiary max-w-xs">
        Внутренний мессенджер и коммуникации с клиентами находятся в разработке.
      </p>
    </div>
  );
}
