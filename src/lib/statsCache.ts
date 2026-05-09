import type { StatsResult } from '../db/stats'

const cache = new Map<string, StatsResult>()

export function getCached(key: string): StatsResult | null {
  return cache.get(key) ?? null
}

export function setCached(key: string, data: StatsResult): void {
  cache.set(key, data)
}

export function clearCache(): void {
  cache.clear()
}
