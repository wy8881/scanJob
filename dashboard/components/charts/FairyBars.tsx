'use client'

import { useState } from 'react'
import { Sparkle } from '../Decorations'

interface Props {
  data: { tech: string; count: number }[]
}

const COLORS = ['#a78bfa', '#ff9bd0', '#ffd166', '#88d8c0', '#7cc4ff', '#c8a8ff', '#ffb347', '#a8e6cf']

export function FairyBars({ data }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.count)) || 1

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => {
        const isActive = active === i
        const dim = active != null && !isActive
        const pct = (d.count / max) * 100
        const color = COLORS[i % COLORS.length]
        return (
          <div
            key={d.tech}
            onClick={() => setActive(isActive ? null : i)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="cursor-pointer transition-opacity"
            style={{ opacity: dim ? 0.45 : 1 }}
          >
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[13px] font-bold text-fairy-text">{d.tech}</span>
              <span className="text-xs font-bold" style={{ color }}>
                {d.count.toLocaleString()}
              </span>
            </div>
            <div
              className="relative h-[18px] rounded-full overflow-hidden"
              style={{ background: 'var(--color-fairy-track)' }}
            >
              <div
                className="h-full rounded-full relative transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: isActive ? `0 0 0 2px ${color}55, 0 4px 14px ${color}55` : 'none',
                }}
              >
                {isActive && (
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <Sparkle size={12} color="#fff" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
