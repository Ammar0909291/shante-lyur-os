import * as React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Аналитика</h2>
        <p className="text-text-secondary mt-1 text-sm">Операционная аналитика и отчёты</p>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
        <BarChart3 className="w-12 h-12 text-text-tertiary" />
        <p className="text-text-secondary text-sm">Аналитика появится здесь</p>
      </div>
    </div>
  );
}
