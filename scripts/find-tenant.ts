import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const tenants = await sql`SELECT info_company_slug, info_company_name FROM parent_tenants LIMIT 5`
  console.log('Found tenants:')
  console.log(JSON.stringify(tenants, null, 2))
}

main().catch(console.error)
