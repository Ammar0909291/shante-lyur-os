'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Окрашивание', value: 28 },
  { name: 'Стрижки', value: 22 },
  { name: 'Глубокий массаж', value: 18 },
  { name: 'Шведский массаж', value: 14 },
  { name: 'Кератин', value: 10 },
  { name: 'Другое', value: 8 },
];

const COLORS = ['#7C5CFC', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#94a3b8'];

export function ServiceBreakdownChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="35%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          dataKey="value"
          stroke="none"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [`${v}%`, '']}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e8eaf0',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={9}
          wrapperStyle={{ fontSize: 11, color: '#6b7a99', lineHeight: '22px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
