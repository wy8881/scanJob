import type { CSSProperties } from 'react'

export function Sparkle({
  size = 14,
  color = '#fff',
  style,
}: {
  size?: number
  color?: string
  style?: CSSProperties
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path
        d="M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z"
        fill={color}
      />
    </svg>
  )
}

export function Cloud({
  size = 80,
  color = '#fff',
  opacity = 0.7,
  style,
}: {
  size?: number
  color?: string
  opacity?: number
  style?: CSSProperties
}) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 80 48" style={style}>
      <g fill={color} opacity={opacity}>
        <ellipse cx="20" cy="32" rx="16" ry="12" />
        <ellipse cx="40" cy="24" rx="20" ry="16" />
        <ellipse cx="60" cy="32" rx="16" ry="12" />
        <rect x="14" y="32" width="52" height="14" rx="7" />
      </g>
    </svg>
  )
}

export function Rainbow({ size = 60, style }: { size?: number; style?: CSSProperties }) {
  const stripes: [string, number][] = [
    ['#ff9bd0', 4],
    ['#ffd166', 8],
    ['#a7e8c1', 12],
    ['#9ec5ff', 16],
    ['#c8a8ff', 20],
  ]
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" style={style}>
      {stripes.map(([c], i) => (
        <path
          key={i}
          d={`M ${4 + i * 2} 32 A ${26 - i * 2} ${26 - i * 2} 0 0 1 ${56 - i * 2} 32`}
          stroke={c}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

export function FairyMascot({ size = 64, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={style}>
      <g>
        <ellipse cx="22" cy="32" rx="14" ry="20" fill="#e0d4ff" opacity="0.85" transform="rotate(-18 22 32)" />
        <ellipse cx="22" cy="46" rx="10" ry="14" fill="#f3d8ff" opacity="0.85" transform="rotate(18 22 46)" />
        <ellipse cx="58" cy="32" rx="14" ry="20" fill="#e0d4ff" opacity="0.85" transform="rotate(18 58 32)" />
        <ellipse cx="58" cy="46" rx="10" ry="14" fill="#f3d8ff" opacity="0.85" transform="rotate(-18 58 46)" />
        <circle cx="20" cy="28" r="1.6" fill="#fff" />
        <circle cx="60" cy="28" r="1.6" fill="#fff" />
      </g>
      <ellipse cx="40" cy="46" rx="14" ry="16" fill="#ffd6ec" />
      <circle cx="40" cy="32" r="13" fill="#ffe9d6" />
      <path d="M27 30 Q28 18 40 17 Q52 18 53 30 Q50 24 40 25 Q30 24 27 30 Z" fill="#c8a8ff" />
      <circle cx="40" cy="20" r="3" fill="#ffd166" />
      <circle cx="35" cy="33" r="1.6" fill="#3a2a5e" />
      <circle cx="45" cy="33" r="1.6" fill="#3a2a5e" />
      <circle cx="35.5" cy="32.5" r="0.5" fill="#fff" />
      <circle cx="45.5" cy="32.5" r="0.5" fill="#fff" />
      <circle cx="32" cy="37" r="1.8" fill="#ffb3cc" opacity="0.7" />
      <circle cx="48" cy="37" r="1.8" fill="#ffb3cc" opacity="0.7" />
      <path d="M37 37 Q40 39 43 37" stroke="#3a2a5e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <line x1="58" y1="52" x2="68" y2="42" stroke="#c8a8ff" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M68 38 L70 42 L74 42 L71 45 L72 49 L68 47 L64 49 L65 45 L62 42 L66 42 Z"
        fill="#ffd166"
        stroke="#e8a93c"
        strokeWidth="0.6"
      />
    </svg>
  )
}

export function SparkleField({ count = 24, seed = 3 }: { count?: number; seed?: number }) {
  const rng = (i: number) => {
    const x = Math.sin(i * 9301 + seed * 49297) * 10000
    return x - Math.floor(x)
  }
  const items = Array.from({ length: count }).map((_, i) => ({
    left: rng(i + 1) * 100,
    top: rng(i + 11) * 100,
    size: 6 + rng(i + 21) * 10,
    delay: rng(i + 31) * 4,
    color: ['#fff', '#ffd166', '#ffc4e6', '#d9c4ff'][Math.floor(rng(i + 41) * 4)],
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((it, i) => (
        <div
          key={i}
          className="sj-twinkle absolute"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            animationDelay: `${it.delay}s`,
          }}
        >
          <Sparkle size={it.size} color={it.color} />
        </div>
      ))}
    </div>
  )
}
