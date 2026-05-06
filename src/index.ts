import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { Cron } from 'croner'
import { statsRoutes } from './api/stats'
import { runScrape } from './scrapers'

export const app = new Elysia()
  .use(cors())
  .use(statsRoutes)

if (import.meta.main) {
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server running on port ${app.server?.port}`)
  })

  runScrape(7)
  new Cron('0 0 * * *', () => runScrape(1))
}
