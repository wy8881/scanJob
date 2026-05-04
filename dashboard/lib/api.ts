import type { StatsResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchStats(from: Date, to: Date): Promise<StatsResponse> {
  const params = new URLSearchParams({
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  })
  const res = await fetch(`${API_URL}/stats?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json()
}
