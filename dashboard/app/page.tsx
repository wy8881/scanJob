'use client'

import { useState, useEffect } from 'react'
import { fetchStats } from '../lib/api'
import { computeCumulative, getDateRange, getEnabledRanges } from '../lib/transforms'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { JobsPostedChart } from '../components/JobsPostedChart'
import { LevelChart } from '../components/LevelChart'
import { TechChart } from '../components/TechChart'
import type { StatsResponse, TimeRange } from '../lib/types'

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('month')
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { from, to } = getDateRange(range)
    setLoading(true)
    setError(null)
    fetchStats(from, to)
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [range])

  const enabledRanges = getEnabledRanges(stats?.meta.earliestJobDate ?? null)
  const cumulativeData = stats ? computeCumulative(stats.byDay) : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    )
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    )
  }
  if (!stats) return null

  const topCategory = stats.byCategory[0]
  const topTech = stats.byTech[0]
  const topLevel = stats.byLevel[0]
  const topCompany = stats.byCompany[0]

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Header
          activeRange={range}
          enabledRanges={enabledRanges}
          onRangeChange={setRange}
        />

        <div className="grid grid-cols-5 gap-2.5 mb-5">
          <StatCard label="Total Jobs" value={stats.meta.totalJobs} />
          <StatCard
            label="Top Category"
            value={topCategory?.category ?? '—'}
            sub={topCategory ? `${topCategory.count} listings` : undefined}
            topFive={stats.byCategory.slice(0, 5).map((d) => ({
              name: d.category,
              count: d.count,
            }))}
          />
          <StatCard
            label="Top Tech"
            value={topTech?.tech ?? '—'}
            sub={topTech ? `in ${topTech.count} listings` : undefined}
            topFive={stats.byTech.slice(0, 5).map((d) => ({
              name: d.tech,
              count: d.count,
            }))}
          />
          <StatCard
            label="Common Level"
            value={topLevel?.level ?? '—'}
            sub={
              topLevel && stats.meta.totalJobs > 0
                ? `${Math.round((topLevel.count / stats.meta.totalJobs) * 100)}% of listings`
                : undefined
            }
            topFive={stats.byLevel.slice(0, 5).map((d) => ({
              name: d.level,
              count: d.count,
            }))}
          />
          <StatCard
            label="Top Hiring Co."
            value={topCompany?.company ?? '—'}
            sub={topCompany ? `${topCompany.count} listings` : undefined}
            topFive={stats.byCompany.slice(0, 5).map((d) => ({
              name: d.company,
              count: d.count,
            }))}
          />
        </div>

        <JobsPostedChart data={cumulativeData} />

        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
          <LevelChart data={stats.byLevel} />
          <TechChart data={stats.byTech} />
        </div>
      </div>
    </main>
  )
}
