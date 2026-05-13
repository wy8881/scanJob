'use client'

import { useState } from 'react'

interface Props {
  data: { level: string; count: number }[]
}

const COLORS = ['#c8a8ff', '#ff9bd0', '#ffd166', '#88d8c0']

export function FairyDonut({ data }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const size = 240
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 18
  const innerR = r * 0.62

  let cursor = -Math.PI / 2
  const segments = data.map((d, i) => {
    const ang = (d.count / total) * Math.PI * 2
    const start = cursor
    const end = cursor + ang
    cursor = end
    const large = ang > Math.PI ? 1 : 0
    const x1 = cx + Math.cos(start) * r
    const y1 = cy + Math.sin(start) * r
    const x2 = cx + Math.cos(end) * r
    const y2 = cy + Math.sin(end) * r
    const xi1 = cx + Math.cos(end) * innerR
    const yi1 = cy + Math.sin(end) * innerR
    const xi2 = cx + Math.cos(start) * innerR
    const yi2 = cy + Math.sin(start) * innerR
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${innerR} ${innerR} 0 ${large} 0 ${xi2} ${yi2} Z`
    const mid = (start + end) / 2
    const pct = Math.round((d.count / total) * 100)
    return { ...d, path, mid, pct, color: COLORS[i % COLORS.length] }
  })

  const activeSeg = active != null ? segments[active] : null

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative">
        <svg width={size} height={size}>
          {segments.map((s, i) => {
            const isActive = active === i
            const dim = active != null && !isActive
            return (
              <g
                key={s.level}
                style={{
                  transform: isActive ? `translate(${Math.cos(s.mid) * 6}px, ${Math.sin(s.mid) * 6}px)` : 'none',
                  transition: 'transform .25s ease',
                  opacity: dim ? 0.35 : 1,
                  cursor: 'pointer',
                }}
                onClick={() => setActive(isActive ? null : i)}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
              </g>
            )
          })}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            const sx = cx + Math.cos(a) * (r + 12)
            const sy = cy + Math.sin(a) * (r + 12)
            return (
              <g key={i} className="sj-twinkle" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${sx}px ${sy}px` }}>
                <path
                  d={`M ${sx} ${sy - 4} L ${sx + 1} ${sy - 1} L ${sx + 4} ${sy} L ${sx + 1} ${sy + 1} L ${sx} ${sy + 4} L ${sx - 1} ${sy + 1} L ${sx - 4} ${sy} L ${sx - 1} ${sy - 1} Z`}
                  fill={i % 2 === 0 ? '#ffd166' : '#ff9bd0'}
                />
              </g>
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeSeg ? (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wide text-fairy-muted">
                {activeSeg.level}
              </div>
              <div
                className="text-4xl font-bold leading-none"
                style={{ fontFamily: 'var(--font-display)', color: activeSeg.color }}
              >
                {activeSeg.pct}%
              </div>
              <div className="text-xs font-semibold text-fairy-muted mt-1">
                {activeSeg.count.toLocaleString()} listings
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wide text-fairy-muted">Total</div>
              <div className="text-4xl font-bold leading-none text-fairy-text" style={{ fontFamily: 'var(--font-display)' }}>
                {total.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-fairy-muted mt-1">
                across {data.length} levels
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-2 w-full">
        {segments.map((s, i) => (
          <button
            key={s.level}
            onClick={() => setActive(active === i ? null : i)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors text-left"
            style={{ background: active === i ? `${s.color}1f` : 'transparent' }}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ background: s.color, boxShadow: `0 0 0 3px ${s.color}33` }}
            />
            <span className="flex-1 text-[13px] font-semibold capitalize text-fairy-text">{s.level}</span>
            <span className="text-[13px] font-bold" style={{ color: s.color }}>{s.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
