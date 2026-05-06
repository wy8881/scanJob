import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

const PG_TO_TS: Record<string, string> = {
  int2: 'number', int4: 'number', int8: 'number',
  float4: 'number', float8: 'number', numeric: 'number',
  text: 'string', varchar: 'string', bpchar: 'string',
  bool: 'boolean',
  timestamp: 'Date', timestamptz: 'Date',
  json: 'unknown', jsonb: 'unknown',
}

const rows = await sql<{ table_name: string; column_name: string; udt_name: string; is_nullable: string }[]>`
  SELECT table_name, column_name, udt_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`

const tables: Record<string, typeof rows> = {}
for (const row of rows) {
  ;(tables[row.table_name] ??= []).push(row)
}

let out = '// Auto-generated from DB schema — do not edit by hand\n\n'
for (const [table, cols] of Object.entries(tables)) {
  const typeName = table.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  out += `export type ${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Row = {\n`
  for (const col of cols) {
    const tsType = PG_TO_TS[col.udt_name] ?? 'unknown'
    const nullable = col.is_nullable === 'YES' ? ' | null' : ''
    out += `  ${col.column_name}: ${tsType}${nullable}\n`
  }
  out += '}\n\n'
}

await sql.end()
process.stdout.write(out)
