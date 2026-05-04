'use client'

import { useState, useRef, useEffect } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  topFive?: { name: string; count: number }[]
}

export function StatCard({ label, value, sub, topFive }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={ref}
      onClick={() => topFive && setOpen((o) => !o)}
      className={[
        'relative bg-white rounded-xl p-3.5 border select-none',
        topFive ? 'cursor-pointer' : '',
        open
          ? 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
          : 'border-gray-200',
      ].join(' ')}
    >
      <div className="flex justify-between items-start">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        {topFive && (
          <span className="text-[10px] text-gray-400">{open ? '▲' : '▼'} top 5</span>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}

      {open && topFive && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-10 p-3">
          <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Top 5
          </p>
          <div className="flex flex-col gap-1.5">
            {topFive.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold w-4 ${
                    i === 0 ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`flex-1 text-xs truncate ${
                    i === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-xs text-gray-500">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
