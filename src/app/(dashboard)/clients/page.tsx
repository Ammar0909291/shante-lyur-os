import * as React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientsPage() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Клиенты</h2>
          <p className="text-text-secondary mt-1 text-sm">База клиентов студии</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Новый клиент
        </Button>
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
        <Users className="w-12 h-12 text-text-tertiary" />
        <p className="text-text-secondary text-sm">Список клиентов появится здесь</p>
        <Button variant="secondary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Добавить клиента
        </Button>
      </div>
    </div>
  );
}
