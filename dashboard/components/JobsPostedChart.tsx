'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

interface JobsPostedChartProps {
  data: { date: string; count: number }[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
}

export function JobsPostedChart({ data }: JobsPostedChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 mb-3">
      <p className="text-sm font-semibold text-gray-900 mb-1">Jobs Posted</p>
      <p className="text-[11px] text-gray-400 mb-4">
        Cumulative total jobs posted — hover a point to see exact count
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: '↑ Cumulative jobs posted',
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              style: { fontSize: 9, fill: '#9ca3af' },
            }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(value: number) => [value, 'Total jobs']}
            labelFormatter={formatDate}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
