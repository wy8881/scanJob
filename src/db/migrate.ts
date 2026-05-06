import { readFileSync } from 'fs'
import sql from './client'

const schema = readFileSync('./src/db/schema.sql', 'utf-8')
await sql.unsafe(schema)
await sql.end()
console.log('Migration complete')
