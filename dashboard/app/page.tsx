'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchStats } from '../lib/api'
import { computeCumulative, getDateRange, getEnabledRanges } from '../lib/transforms'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { FairyLineChart } from '../components/charts/FairyLineChart'
import { FairyDonut } from '../components/charts/FairyDonut'
import { FairyBars } from '../components/charts/FairyBars'
import { Cloud, Rainbow, SparkleField } from '../components/Decorations'
import type { StatsResponse, TimeRange } from '../lib/types'

const ACCENT = {
  total: '#a78bfa',
  category: '#ff9bd0',
  tech: '#ffd166',
  level: '#88d8c0',
  company: '#c8a8ff',
}

const RANGE_LABEL: Record<TimeRange, string> = {
  month: 'month',
  '3months': '3 months',
  '6months': '6 months',
  year: 'year',
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      className="sj-shimmer rounded-3xl"
      style={{ height }}
    />
  )
}

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('month')
  const [category, setCategory] = useState('all')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    (r: TimeRange, isRefresh = false) => {
      const { from, to } = getDateRange(r)
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      fetchStats(from, to, category === 'all' ? undefined : category)
        .then(setStats)
        .catch((e: Error) => setError(e.message))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    },
    [category]
  )

  useEffect(() => {
    load(range)
  }, [range, load])

  const enabledRanges = getEnabledRanges(stats?.meta.earliestJobDate ?? null)
  const cumulativeData = stats ? computeCumulative(stats.byDay) : []

  const topCategory = stats?.byCategory[0]
  const topTech = stats?.byTech[0]
  const topLevel = stats?.byLevel[0]
  const topCompany = stats?.byCompany[0]

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[60px] left-[-40px] opacity-50"><Cloud size={180} /></div>
        <div className="absolute top-[220px] right-[-60px] opacity-40"><Cloud size={220} /></div>
        <div className="absolute bottom-[120px] left-[80px] opacity-35"><Cloud size={140} /></div>
        <div className="absolute bottom-10 right-[6%] opacity-40"><Rainbow size={90} /></div>
      </div>
      <SparkleField count={28} seed={3} />

      <div className="max-w-7xl mx-auto p-7 relative z-10">
        <Header
          activeRange={range}
          enabledRanges={enabledRanges}
          onRangeChange={setRange}
          onRefresh={() => load(range, true)}
          refreshing={refreshing}
          activeCategory={category}
          onCategoryChange={setCategory}
        />

        {error && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-5 gap-4 mb-6">
          {loading || !stats ? (
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} height={130} />)
          ) : (
            <>
              <StatCard
                label="Total Jobs"
                value={stats.meta.totalJobs.toLocaleString()}
                sub={`across this ${RANGE_LABEL[range]}`}
                accent={ACCENT.total}
              />
              <StatCard
                label="Top Category"
                value={topCategory?.category ?? '—'}
                sub={topCategory ? `${topCategory.count.toLocaleString()} listings` : undefined}
                accent={ACCENT.category}
                topFive={stats.byCategory.slice(0, 5).map((d) => ({ name: d.category, count: d.count }))}
              />
              <StatCard
                label="Top Tech"
                value={topTech?.tech ?? '—'}
                sub={topTech ? `in ${topTech.count.toLocaleString()} listings` : undefined}
                accent={ACCENT.tech}
                topFive={stats.byTech.slice(0, 5).map((d) => ({ name: d.tech, count: d.count }))}
              />
              <StatCard
                label="Common Level"
                value={topLevel?.level ?? '—'}
                sub={
                  topLevel && stats.meta.totalJobs > 0
                    ? `${Math.round((topLevel.count / stats.meta.totalJobs) * 100)}% of listings`
                    : undefined
                }
                accent={ACCENT.level}
                topFive={stats.byLevel.slice(0, 5).map((d) => ({ name: d.level, count: d.count }))}
              />
              <StatCard
                label="Top Hiring"
                value={topCompany?.company ?? '—'}
                sub={topCompany ? `${topCompany.count.toLocaleString()} open roles` : undefined}
                accent={ACCENT.company}
                topFive={stats.byCompany.slice(0, 5).map((d) => ({ name: d.company, count: d.count }))}
              />
            </>
          )}
        </div>

        <div className="bg-white/85 backdrop-blur border border-fairy-border rounded-3xl p-6 mb-6 relative z-10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2
                className="m-0 text-xl font-semibold text-fairy-text whitespace-nowrap flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Jobs Posted <span>🌈</span>
              </h2>
              <p className="text-xs font-semibold text-fairy-muted mt-0.5">
                ↑ Cumulative jobs posted over time
              </p>
            </div>
            {stats && cumulativeData.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-fairy-muted">
                  Total
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'linear-gradient(135deg, #a78bfa, #ff9bd0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {cumulativeData[cumulativeData.length - 1].count.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          {loading || !stats ? (
            <Skeleton height={260} />
          ) : (
            <FairyLineChart data={cumulativeData} />
          )}
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
          <div className="bg-white/85 backdrop-blur border border-fairy-border rounded-3xl p-6 relative z-10 shadow-sm">
            <h2
              className="m-0 text-xl font-semibold text-fairy-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Jobs by Level
            </h2>
            <p className="text-xs font-semibold text-fairy-muted mt-0.5 mb-4">
              Tap a slice to see details
            </p>
            {loading || !stats ? <Skeleton height={300} /> : <FairyDonut data={stats.byLevel} />}
          </div>

          <div className="bg-white/85 backdrop-blur border border-fairy-border rounded-3xl p-6 relative z-10 shadow-sm">
            <h2
              className="m-0 text-xl font-semibold text-fairy-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Top Technologies
            </h2>
            <p className="text-xs font-semibold text-fairy-muted mt-0.5 mb-4">
              Hover or tap a bar to focus
            </p>
            {loading || !stats ? <Skeleton height={300} /> : <FairyBars data={stats.byTech.slice(0, 8)} />}
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-fairy-muted">
          <span>🧚</span>
          <span>Sprinkled with fairy dust by ScanJob — data refreshes every day</span>
          <span>✨</span>
        </footer>
      </div>
    </main>
  )
}
