import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { statsRoutes } from './api/stats'

export const app = new Elysia()
  .use(cors())
  .use(statsRoutes)

if (import.meta.main) {
  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server running on port ${app.server?.port}`)
  })
}
