import { describe, it, expect } from 'bun:test'
import { app } from '../../src/index'

describe('GET /stats', () => {
  it('returns all required keys', async () => {
    const res = await app.handle(new Request('http://localhost/stats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('meta')
    expect(body).toHaveProperty('byCategory')
    expect(body).toHaveProperty('byLevel')
    expect(body).toHaveProperty('byTech')
    expect(body).toHaveProperty('byCompany')
    expect(body).toHaveProperty('byDay')
    expect(typeof body.meta.totalJobs).toBe('number')
  })

  it('accepts from and to query params', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?from=2026-01-01&to=2026-12-31')
    )
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid date', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?from=not-a-date')
    )
    expect(res.status).toBe(400)
  })

  it('accepts a valid category param', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?category=software-engineer')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('meta')
    expect(body).toHaveProperty('byTech')
  })

  it('returns empty results for unknown category', async () => {
    const res = await app.handle(
      new Request('http://localhost/stats?category=does-not-exist')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.totalJobs).toBe(0)
  })
})
