'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  data: { date: string; count: number }[]
}

const ACCENT = '#a78bfa'
const GRID = '#d9c4ff'
const MUTED = '#8b7ca8'
const TEXT = '#3a2a5e'

function formatDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

export function FairyLineChart({ data }: Props) {
  const padding = { top: 20, right: 28, bottom: 36, left: 56 }
  const height = 260
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  const cachedRect = useRef<DOMRect | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      cachedRect.current = null
      setW(entries[0].contentRect.width)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) return null

  const innerW = Math.max(0, w - padding.left - padding.right)
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(...data.map((d) => d.count)) * 1.05 || 1
  const x = (i: number) => padding.left + (i / Math.max(1, data.length - 1)) * innerW
  const y = (v: number) => padding.top + (1 - v / max) * innerH

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.count)}`).join(' ')
  const areaPath = `${path} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`

  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i)
  const xTickIdx = data.map((_, i) => i).filter((i) => i % Math.max(1, Math.ceil(data.length / 6)) === 0 || i === data.length - 1)

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    if (!cachedRect.current) cachedRect.current = ref.current.getBoundingClientRect()
    const px = e.clientX - cachedRect.current.left
    const step = innerW / Math.max(1, data.length - 1)
    const i = Math.max(0, Math.min(data.length - 1, Math.round((px - padding.left) / step)))
    setHover((prev) => (prev === i ? prev : i))
  }

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={w}
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        className="block"
      >
        <defs>
          <linearGradient id="fairyArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.45" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="fairyLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff9bd0" />
            <stop offset="50%" stopColor={ACCENT} />
            <stop offset="100%" stopColor="#88d8c0" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {tickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={padding.left + innerW}
              y1={y(tv)}
              y2={y(tv)}
              stroke={GRID}
              strokeWidth="1"
              strokeDasharray="2 5"
              opacity="0.7"
            />
            <text
              x={padding.left - 12}
              y={y(tv) + 4}
              fontSize="11"
              fill={MUTED}
              textAnchor="end"
              fontWeight="600"
            >
              {Math.round(tv).toLocaleString()}
            </text>
          </g>
        ))}

        {xTickIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 12} fontSize="11" fill={MUTED} textAnchor="middle" fontWeight="600">
            {formatDate(data[i].date)}
          </text>
        ))}

        <path d={areaPath} fill="url(#fairyArea)" />
        <path d={path} fill="none" stroke="url(#fairyLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" />

        {data.map((d, i) =>
          i % 4 === 0 ? (
            <g key={i} className="sj-twinkle" style={{ transformOrigin: `${x(i)}px ${y(d.count)}px`, animationDelay: `${i * 0.1}s` }}>
              <circle cx={x(i)} cy={y(d.count)} r="3" fill="#fff" />
              <circle cx={x(i)} cy={y(d.count)} r="1.5" fill={ACCENT} />
            </g>
          ) : null
        )}

        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={padding.top} y2={padding.top + innerH} stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(hover)} cy={y(data[hover].count)} r="9" fill="#fff" stroke={ACCENT} strokeWidth="2.5" />
            <circle cx={x(hover)} cy={y(data[hover].count)} r="4" fill={ACCENT} />
            <g transform={`translate(${Math.min(Math.max(x(hover) - 60, 8), w - 128)}, ${Math.max(y(data[hover].count) - 56, 8)})`}>
              <rect width="120" height="44" rx="14" fill="#fff" stroke={ACCENT} strokeWidth="1.5" />
              <text x="60" y="18" fontSize="11" fill={MUTED} textAnchor="middle" fontWeight="600">
                {formatDate(data[hover].date)}
              </text>
              <text x="60" y="35" fontSize="14" fill={TEXT} textAnchor="middle" fontWeight="700">
                ✨ {data[hover].count.toLocaleString()} jobs
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  )
}
