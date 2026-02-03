import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config()

// Import schemas
import { parentTenants } from '../server/db/schema/parent'
import { settingsCompany } from '../server/db/schema/settings'

async function updateTagline() {
  const slug = process.argv[2]
  const tagline = process.argv[3]

  if (!slug || !tagline) {
    console.error('Usage: npx tsx scripts/update-tagline.ts <slug> "<tagline>"')
    process.exit(1)
  }

  const parentConnectionString = process.env.NUXT_PARENT_DATABASE_URL
  if (!parentConnectionString) {
    throw new Error('NUXT_PARENT_DATABASE_URL not set')
  }

  // Connect to parent DB
  const parentSql = neon(parentConnectionString)
  const parentDb = drizzle(parentSql)

  // Get tenant connection string
  const [tenant] = await parentDb
    .select({
      connectionString: parentTenants.connection_string
    })
    .from(parentTenants)
    .where(eq(parentTenants.info_company_slug, slug.toLowerCase()))
    .limit(1)

  if (!tenant || !tenant.connectionString) {
    console.error(`Tenant "${slug}" not found`)
    process.exit(1)
  }

  // Connect to tenant DB and update tagline
  const tenantSql = neon(tenant.connectionString)
  const tenantDb = drizzle(tenantSql)

  await tenantDb
    .update(settingsCompany)
    .set({ info_tagline: tagline })

  console.log(`Updated tagline for "${slug}" to: "${tagline}"`)
}

updateTagline().catch(console.error)
