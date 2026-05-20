'use client';

import * as React from 'react';

const recentClients = [
  {
    initials: 'АМ',
    name: 'Амара Митчелл',
    service: 'Балаяж',
    specialist: 'Лидия Т.',
    bg: 'linear-gradient(135deg,#7C5CFC,#a78bfa)',
  },
  {
    initials: 'СК',
    name: 'Светлана Ким',
    service: 'Тканевый массаж',
    specialist: 'Маркус Р.',
    bg: 'linear-gradient(135deg,#22c55e,#86efac)',
  },
  {
    initials: 'ДП',
    name: 'Жадэ Патель',
    service: 'Кератиновое лечение',
    specialist: 'Лидия Т.',
    bg: 'linear-gradient(135deg,#f97316,#fbbf24)',
  },
  {
    initials: 'РН',
    name: 'Рашель Новак',
    service: 'Пренатальный массаж',
    specialist: 'Таня Б.',
    bg: 'linear-gradient(135deg,#3b82f6,#93c5fd)',
  },
  {
    initials: 'ОА',
    name: 'Оливия Адейеми',
    service: 'Окрашивание + глосс',
    specialist: 'Софья К.',
    bg: 'linear-gradient(135deg,#ec4899,#f9a8d4)',
  },
];

const adminTasks = [
  {
    date: '20 мая · 9:00',
    title: 'Пополнить запасы Olaplex',
    tag: 'Срочно',
    tagCls: 'bg-orange-50 text-orange-600',
    avs: [{ label: 'SL', bg: '#7C5CFC' }],
  },
  {
    date: '21 мая · весь день',
    title: 'Повышение квалификации: шведские техники',
    tag: 'Обучение',
    tagCls: 'bg-blue-50 text-blue-700',
    avs: [{ label: 'МР', bg: '#22c55e' }, { label: 'ТБ', bg: '#3b82f6' }],
  },
  {
    date: '22 мая · 14:00',
    title: 'Встреча по ценовой политике Q2',
    tag: 'Бизнес',
    tagCls: 'bg-purple-50 text-[#7C5CFC]',
    avs: [{ label: 'SL', bg: '#7C5CFC' }, { label: 'ЛТ', bg: '#f97316' }],
  },
  {
    date: '23 мая · 11:00',
    title: 'Акции в Instagram на май',
    tag: 'Маркетинг',
    tagCls: 'bg-green-50 text-green-700',
    avs: [{ label: 'СК', bg: '#ec4899' }],
  },
];

export function RightPanel() {
  return (
    <aside
      className="hidden xl:flex flex-col w-72 shrink-0 border-l border-[#e8eaf0] bg-white overflow-y-auto"
      style={{ scrollbarWidth: 'thin' }}
      aria-label="Последние события"
    >
      <div className="p-5">
        {/* Recent Clients */}
        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-[13.5px] font-bold text-[#1a2035]"
              data-i18n="panel.recentClients"
            >
              Последние клиенты
            </h3>
            <a
              href="/clients"
              className="text-[11px] font-medium text-[#7C5CFC] hover:text-[#5b3ee0] transition-colors"
            >
              Все →
            </a>
          </div>
          <ul className="divide-y divide-[#e8eaf0]">
            {recentClients.map((c) => (
              <li key={c.name} className="flex items-center gap-2.5 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: c.bg }}
                  aria-hidden="true"
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1a2035] truncate">{c.name}</p>
                  <p className="text-[11px] text-[#6b7a99] truncate">{c.service}</p>
                  <p className="text-[10.5px] font-medium text-[#7C5CFC]">у {c.specialist}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Admin Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-[13.5px] font-bold text-[#1a2035]"
              data-i18n="panel.tasks"
            >
              Задачи
            </h3>
            <a
              href="/settings"
              className="text-[11px] font-medium text-[#7C5CFC] hover:text-[#5b3ee0] transition-colors"
            >
              Управлять →
            </a>
          </div>
          <ul className="divide-y divide-[#e8eaf0]">
            {adminTasks.map((t) => (
              <li key={t.title} className="py-2.5 flex flex-col gap-1">
                <span className="text-[10.5px] text-[#6b7a99]">{t.date}</span>
                <span className="text-[12.5px] font-semibold text-[#1a2035] leading-tight">
                  {t.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.tagCls}`}>
                    {t.tag}
                  </span>
                  <div className="flex ml-auto">
                    {t.avs.map((av, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white"
                        style={{ background: av.bg, marginLeft: i > 0 ? -6 : 0 }}
                        aria-hidden="true"
                      >
                        {av.label}
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
