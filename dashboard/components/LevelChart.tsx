'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f87171']

interface LevelChartProps {
  data: { level: string; count: number }[]
}

export function LevelChart({ data }: LevelChartProps) {
  const [activeLevel, setActiveLevel] = useState<string | null>(null)

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const active = activeLevel ? data.find((d) => d.level === activeLevel) : null

  function handleClick(level: string) {
    setActiveLevel((prev) => (prev === level ? null : level))
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-1">Jobs by Level</p>
      <p className="text-[11px] text-gray-400 mb-4">Click a segment to highlight</p>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-[120px] h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={52}
                dataKey="count"
                onClick={(entry) => handleClick(entry.level)}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.level}
                    fill={COLORS[i % COLORS.length]}
                    opacity={activeLevel && activeLevel !== entry.level ? 0.3 : 1}
                    cursor="pointer"
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-gray-900 capitalize">
              {active?.level ?? 'All'}
            </span>
            <span className="text-[10px] text-gray-500">
              {active ? `${Math.round((active.count / total) * 100)}%` : total}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {data.map((entry, i) => (
            <button
              key={entry.level}
              onClick={() => handleClick(entry.level)}
              className="flex items-center gap-1.5 text-[11px]"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span
                className={
                  activeLevel === entry.level
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500'
                }
              >
                {entry.level} {Math.round((entry.count / total) * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
