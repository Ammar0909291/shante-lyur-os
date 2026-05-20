'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Лидия Т.', bookings: 42 },
  { name: 'Маркус Р.', bookings: 38 },
  { name: 'Софья К.', bookings: 35 },
  { name: 'Таня Б.', bookings: 31 },
  { name: 'Яра Д.', bookings: 29 },
  { name: 'Кенджи Х.', bookings: 24 },
];

const COLORS = ['#7C5CFC', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#94a3b8'];

export function SpecialistLoadChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f0f2f8" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#6b7a99' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7a99' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f4f6fb' }}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e8eaf0',
            borderRadius: 10,
            fontSize: 12,
          }}
          formatter={(v: number) => [v, 'Записей']}
        />
        <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
