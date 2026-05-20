import * as React from 'react';
import { Calendar, Users, TrendingUp } from 'lucide-react';
import { NexusStatCard } from '@/components/dashboard/nexus-stat-card';
import { BookingVolumeChart } from '@/components/dashboard/booking-volume-chart';
import { ServiceBreakdownChart } from '@/components/dashboard/service-breakdown-chart';
import { SpecialistLoadChart } from '@/components/dashboard/specialist-load-chart';
import { RightPanel } from '@/components/dashboard/right-panel';

const DATE_RANGE_OPTIONS = ['7д', '9д', '30д', '90д'];

export default function DashboardPage() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto min-w-0 p-5 lg:p-6 space-y-5">

        {/* Stat cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          role="region"
          aria-label="Ключевые показатели"
        >
          <NexusStatCard
            title="Записи сегодня"
            data-i18n="stat.bookings"
            value={34}
            trend={{ value: 12.4, positive: true, label: 'vs вчера' }}
            iconBg="#ede9ff"
            icon={<Calendar className="w-4 h-4" style={{ color: '#7C5CFC' }} aria-hidden="true" />}
            sparkData={[18, 22, 17, 28, 25, 30, 27, 32, 34]}
            sparkColor="#7C5CFC"
            gradientId="sg-bookings"
            detailsHref="/bookings"
          />
          <NexusStatCard
            title="Активные специалисты"
            data-i18n="stat.specialists"
            value="8 / 10"
            trend={{ value: 2, positive: false, label: 'в отпуске' }}
            iconBg="#dcfce7"
            icon={<Users className="w-4 h-4" style={{ color: '#16a34a' }} aria-hidden="true" />}
            sparkData={[10, 9, 10, 8, 9, 10, 8, 9, 8]}
            sparkColor="#22c55e"
            gradientId="sg-specialists"
            detailsHref="/specialists"
          />
          <NexusStatCard
            title="Выручка за неделю"
            data-i18n="stat.revenue"
            value="₽184 600"
            trend={{ value: 8.7, positive: true, label: 'vs пред. неделя' }}
            iconBg="#fff7ed"
            icon={<TrendingUp className="w-4 h-4" style={{ color: '#ea580c' }} aria-hidden="true" />}
            sparkData={[52, 61, 58, 72, 69, 81, 78, 91, 95]}
            sparkColor="#f97316"
            gradientId="sg-revenue"
            detailsHref="/analytics"
          />
        </div>

        {/* Booking Volume chart */}
        <div className="bg-white border border-[#e8eaf0] rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2
                className="text-[14.5px] font-bold text-[#1a2035]"
                data-i18n="chart.bookingVolume"
              >
                Объём записей
              </h2>
              <p className="text-[11.5px] text-[#6b7a99] mt-0.5" data-i18n="chart.bookingSubtitle">
                Косметология vs Массаж — последние 9 дней
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {DATE_RANGE_OPTIONS.map((r, i) => (
                <button
                  key={r}
                  className={`text-[11.5px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    i === 1
                      ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                      : 'bg-[#F4F6FB] text-[#6b7a99] border-[#e8eaf0] hover:border-[#7C5CFC] hover:text-[#7C5CFC]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-5 mb-3">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6b7a99] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC] inline-block" aria-hidden="true" />
              Косметология
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#6b7a99] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" aria-hidden="true" />
              Массаж
            </div>
          </div>
          <BookingVolumeChart />
        </div>

        {/* Bottom row: donut + bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
          <div className="bg-white border border-[#e8eaf0] rounded-xl p-5 shadow-sm">
            <h2
              className="text-[14.5px] font-bold text-[#1a2035]"
              data-i18n="chart.serviceBreakdown"
            >
              Услуги
            </h2>
            <p className="text-[11.5px] text-[#6b7a99] mt-0.5 mb-4" data-i18n="chart.serviceSubtitle">
              По категориям за месяц
            </p>
            <ServiceBreakdownChart />
          </div>
          <div className="bg-white border border-[#e8eaf0] rounded-xl p-5 shadow-sm">
            <h2
              className="text-[14.5px] font-bold text-[#1a2035]"
              data-i18n="chart.specialistLoad"
            >
              Нагрузка специалистов
            </h2>
            <p className="text-[11.5px] text-[#6b7a99] mt-0.5 mb-4" data-i18n="chart.specialistSubtitle">
              Записей за неделю
            </p>
            <SpecialistLoadChart />
          </div>
        </div>

      </div>

      {/* ── Right panel ── */}
      <RightPanel />
    </div>
  );
}
