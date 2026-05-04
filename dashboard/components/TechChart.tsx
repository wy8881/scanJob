'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface TechChartProps {
  data: { tech: string; count: number }[]
}

export function TechChart({ data }: TechChartProps) {
  const [activeTech, setActiveTech] = useState<string | null>(null)

  function handleClick(tech: string) {
    setActiveTech((prev) => (prev === tech ? null : tech))
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-1">Top Technologies</p>
      <p className="text-[11px] text-gray-400 mb-4">Click a bar to highlight</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="tech"
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            formatter={(value) => [value as number, 'listings']}
          />
          <Bar
            dataKey="count"
            radius={[0, 3, 3, 0]}
            onClick={(entry) => handleClick((entry as unknown as { tech: string }).tech)}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell
                key={entry.tech}
                fill="#6366f1"
                opacity={activeTech && activeTech !== entry.tech ? 0.3 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
