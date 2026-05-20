import * as React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Настройки</h2>
        <p className="text-text-secondary mt-1 text-sm">Настройки студии и системы</p>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
        <Settings className="w-12 h-12 text-text-tertiary" />
        <p className="text-text-secondary text-sm">Настройки появятся здесь</p>
      </div>
    </div>
  );
}
