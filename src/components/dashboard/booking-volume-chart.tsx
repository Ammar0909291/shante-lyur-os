'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const data = [
  { date: '11 мая', cosmo: 18, massage: 10 },
  { date: '12 мая', cosmo: 22, massage: 12 },
  { date: '13 мая', cosmo: 19, massage: 11 },
  { date: '14 мая', cosmo: 27, massage: 15 },
  { date: '15 мая', cosmo: 24, massage: 14 },
  { date: '16 мая', cosmo: 30, massage: 17 },
  { date: '17 мая', cosmo: 26, massage: 16 },
  { date: '18 мая', cosmo: 31, massage: 18 },
  { date: '19 мая', cosmo: 28, massage: 15 },
];

const ACCENT = '#7C5CFC';
const GREEN = '#22c55e';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e8eaf0] rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-[#1a2035] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {p.value} сеансов
        </p>
      ))}
    </div>
  );
}

export function BookingVolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="bvcGradCosmo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="bvcGradMassage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#f0f2f8" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7a99' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7a99' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 40]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cosmo"
          name="Косметология"
          stroke={ACCENT}
          strokeWidth={2.5}
          fill="url(#bvcGradCosmo)"
          dot={{ fill: '#fff', stroke: ACCENT, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Area
          type="monotone"
          dataKey="massage"
          name="Массаж"
          stroke={GREEN}
          strokeWidth={2.5}
          fill="url(#bvcGradMassage)"
          dot={{ fill: '#fff', stroke: GREEN, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
