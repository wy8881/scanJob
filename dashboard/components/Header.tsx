'use client'

import type { TimeRange } from '../lib/types'
import { FairyMascot, Sparkle } from './Decorations'

interface HeaderProps {
  activeRange: TimeRange
  enabledRanges: Record<TimeRange, boolean>
  onRangeChange: (range: TimeRange) => void
  onRefresh?: () => void
  refreshing?: boolean
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '3months', label: '3 months' },
  { value: '6months', label: '6 months' },
  { value: 'year', label: 'This year' },
]

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'software-engineer', label: 'Software Engineer' },
  { value: 'backend-developer', label: 'Backend' },
  { value: 'web-development', label: 'Web / Frontend' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'data-engineer', label: 'Data Engineer' },
  { value: 'ai-ml-engineer', label: 'AI / ML' },
  { value: 'it-support', label: 'IT Support' },
  { value: 'cyber-security', label: 'Cyber Security' },
  { value: 'qa-tester', label: 'QA / Testing' },
  { value: 'devops', label: 'DevOps' },
  { value: 'mobile-developer', label: 'Mobile' },
  { value: 'developer', label: 'Developer' },
]

export function Header({
  activeRange,
  enabledRanges,
  onRangeChange,
  onRefresh,
  refreshing,
  activeCategory,
  onCategoryChange,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-6 mb-7 relative z-10">
      <div className="flex items-center gap-4 flex-nowrap shrink-0">
        <div className="sj-float shrink-0">
          <FairyMascot size={72} />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-nowrap whitespace-nowrap">
            <h1
              className="text-[38px] font-bold leading-none tracking-tight m-0 text-fairy-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Scan
              <span className="text-fairy-accent relative">
                Job
                <Sparkle size={16} color="#ffd166" style={{ position: 'absolute', top: -8, right: -14 }} />
              </span>
            </h1>
            <span className="bg-fairy-accent/15 text-fairy-accent-deep text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              ✦ live
            </span>
          </div>
          <p className="text-sm font-semibold text-fairy-muted mt-1">
            Australian IT job market trends — sprinkled with a little magic ✨
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-white border border-fairy-border rounded-full px-3.5 py-2 flex items-center gap-2 text-[13px] font-bold text-fairy-text transition-all hover:-translate-y-px hover:shadow-md whitespace-nowrap disabled:cursor-wait"
          >
            <span className={refreshing ? 'sj-spin' : ''}>✦</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}

        <div className="inline-flex items-center gap-2 bg-white border border-fairy-border rounded-full px-3.5 py-2 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fairy-muted whitespace-nowrap">
            Category
          </span>
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border-none outline-none bg-transparent text-xs font-bold text-fairy-text cursor-pointer"
          >
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="inline-flex bg-white border border-fairy-border rounded-full p-1 gap-0.5 shadow-sm">
          {RANGES.map(({ value, label }) => {
            const enabled = enabledRanges[value]
            const active = activeRange === value
            return (
              <button
                key={value}
                disabled={!enabled}
                onClick={() => enabled && onRangeChange(value)}
                className={[
                  'rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
                  active
                    ? 'text-white shadow-md'
                    : enabled
                      ? 'text-fairy-muted hover:text-fairy-text cursor-pointer'
                      : 'text-fairy-muted/40 cursor-not-allowed',
                ].join(' ')}
                style={
                  active
                    ? { background: 'linear-gradient(135deg, #a78bfa, #7c5fe6)' }
                    : undefined
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
