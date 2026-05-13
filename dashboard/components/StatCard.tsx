'use client'

import { useState } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent: string
  topFive?: { name: string; count: number }[]
}

export function StatCard({ label, value, sub, accent, topFive }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const isClickable = !!topFive
  const max = topFive ? Math.max(...topFive.map((x) => x.count)) || 1 : 1

  return (
    <div
      onClick={() => isClickable && setOpen((o) => !o)}
      className="sj-card relative bg-white/85 backdrop-blur border border-fairy-border rounded-3xl p-5 select-none overflow-hidden"
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: open
          ? `0 14px 40px ${accent}33, 0 4px 12px rgba(167,139,250,0.18)`
          : '0 6px 20px rgba(167,139,250,0.10)',
      }}
    >
      <p className="text-[12px] font-bold uppercase tracking-wider text-fairy-muted mb-1.5">
        {label}
      </p>
      <p
        className="font-bold leading-tight text-fairy-text"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 1.6vw, 22px)',
          letterSpacing: -0.3,
          wordBreak: 'normal',
          overflowWrap: 'break-word',
          hyphens: 'auto',
          textWrap: 'balance',
        }}
      >
        {value}
      </p>
      {sub && <p className="text-[12px] font-semibold text-fairy-muted mt-1">{sub}</p>}

      {isClickable && (
        <div
          className="flex items-center gap-1 text-[11px] font-bold mt-2.5 whitespace-nowrap"
          style={{ color: accent, opacity: 0.9 }}
        >
          <span>{open ? 'Hide top 5' : 'See top 5'}</span>
          <span
            className="inline-block transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            ▾
          </span>
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-dashed border-fairy-border">
          {topFive!.map((item, i) => {
            const pct = (item.count / max) * 100
            return (
              <div key={item.name} className={i === topFive!.length - 1 ? '' : 'mb-2'}>
                <div className="flex justify-between mb-[3px]">
                  <span className="text-xs font-bold text-fairy-text">
                    <span className="mr-1.5" style={{ color: accent }}>{i + 1}</span>
                    {item.name}
                  </span>
                  <span className="text-[11px] font-bold text-fairy-muted">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: `${accent}1a` }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
