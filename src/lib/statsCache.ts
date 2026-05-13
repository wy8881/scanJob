import type { StatsResult } from '../db/stats'

const TTL = 60 * 60 * 1000 // 1 hour

type Entry = { data: StatsResult; at: number }
const cache = new Map<string, Entry>()

export function getCached(key: string): StatsResult | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCached(key: string, data: StatsResult): void {
  cache.set(key, { data, at: Date.now() })
}

export function clearCache(): void {
  cache.clear()
}
