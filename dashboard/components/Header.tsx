'use client'

import type { TimeRange } from '../lib/types'

interface HeaderProps {
  activeRange: TimeRange
  enabledRanges: Record<TimeRange, boolean>
  onRangeChange: (range: TimeRange) => void
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '3months', label: '3 months' },
  { value: '6months', label: '6 months' },
  { value: 'year', label: 'This year' },
]

export function Header({ activeRange, enabledRanges, onRangeChange }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Scan<span className="text-indigo-500">Job</span>
        </h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
          Australian IT Job Market Trends
        </p>
      </div>
      <div className="flex gap-2">
        {RANGES.map(({ value, label }) => {
          const enabled = enabledRanges[value]
          const active = activeRange === value
          return (
            <button
              key={value}
              disabled={!enabled}
              onClick={() => enabled && onRangeChange(value)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                active
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : enabled
                    ? 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 cursor-pointer'
                    : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
