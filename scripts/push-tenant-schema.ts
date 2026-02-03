import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as parentSchema from '../server/db/schema/parent'

/**
 * Push missing tables/columns to a tenant database
 * Usage: npx tsx scripts/push-tenant-schema.ts <tenant-slug>
 */

async function main() {
  const slug = process.argv[2]

  if (!slug) {
    console.error('Usage: npx tsx scripts/push-tenant-schema.ts <tenant-slug>')
    process.exit(1)
  }

  const parentDbUrl = process.env.DATABASE_URL
  if (!parentDbUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`Looking up tenant: ${slug}`)

  // Get tenant connection string from parent DB
  const parentSql = neon(parentDbUrl)
  const parentDb = drizzle(parentSql, { schema: parentSchema })

  const [tenant] = await parentDb
    .select({
      connectionString: parentSchema.parentTenants.connection_string,
      companyName: parentSchema.parentTenants.info_company_name,
    })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
    .limit(1)

  if (!tenant || !tenant.connectionString) {
    console.error(`Tenant "${slug}" not found or has no connection string`)
    process.exit(1)
  }

  console.log(`Found tenant: ${tenant.companyName}`)
  console.log('Connecting to tenant database...')

  // Connect to tenant database
  const tenantSql = neon(tenant.connectionString)

  // Create settings_company table if not exists
  console.log('Creating settings_company table if not exists...')
  await tenantSql`
    CREATE TABLE IF NOT EXISTS settings_company (
      meta_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      meta_created_at timestamp with time zone DEFAULT now() NOT NULL,
      meta_updated_at timestamp with time zone DEFAULT now() NOT NULL,
      info_company_name varchar(255) NOT NULL,
      info_company_slug varchar(30) NOT NULL UNIQUE,
      info_tagline varchar(500),
      info_industry varchar(50),
      info_company_size varchar(20),
      info_website varchar(255),
      info_tax_id varchar(100),
      brand_logo_url varchar(500),
      brand_header_image_url varchar(500),
      brand_use_custom_header boolean DEFAULT false NOT NULL,
      config_default_timezone varchar(50) DEFAULT 'UTC' NOT NULL,
      config_date_format varchar(20) DEFAULT 'MM/DD/YYYY' NOT NULL,
      config_time_format varchar(10) DEFAULT '12h' NOT NULL,
      config_week_start varchar(10) DEFAULT 'sunday' NOT NULL,
      config_fiscal_year_start varchar(5) DEFAULT '01-01' NOT NULL,
      config_location_mode varchar(10) DEFAULT 'single' NOT NULL,
      config_department_mode varchar(10) DEFAULT 'single' NOT NULL,
      config_division_mode varchar(10) DEFAULT 'single' NOT NULL,
      config_lob_mode varchar(10) DEFAULT 'single' NOT NULL,
      config_retention_days integer DEFAULT 30,
      config_password_history_count integer DEFAULT 12 NOT NULL,
      config_password_min_length integer DEFAULT 12 NOT NULL,
      config_password_require_special boolean DEFAULT true NOT NULL,
      config_session_timeout_minutes integer DEFAULT 30 NOT NULL,
      config_mfa_required boolean DEFAULT false NOT NULL,
      config_column_labels jsonb
    )
  `

  // Add config_column_labels column if it doesn't exist
  console.log('Adding config_column_labels column if not exists...')
  await tenantSql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings_company'
        AND column_name = 'config_column_labels'
      ) THEN
        ALTER TABLE settings_company ADD COLUMN config_column_labels jsonb;
      END IF;
    END $$
  `

  // Create settings_user table if not exists
  console.log('Creating settings_user table if not exists...')
  await tenantSql`
    CREATE TABLE IF NOT EXISTS settings_user (
      ref_user_id uuid PRIMARY KEY REFERENCES core_users(meta_id) ON DELETE CASCADE,
      meta_updated_at timestamp with time zone DEFAULT now() NOT NULL,
      pref_theme varchar(20) DEFAULT 'system' NOT NULL,
      pref_color_palette varchar(20) DEFAULT 'corporate' NOT NULL,
      pref_timezone varchar(50),
      pref_date_format varchar(20),
      pref_time_format varchar(10),
      pref_language varchar(10) DEFAULT 'en' NOT NULL,
      notif_email boolean DEFAULT true NOT NULL,
      notif_push boolean DEFAULT true NOT NULL,
      notif_sms boolean DEFAULT false NOT NULL,
      ui_directory_columns jsonb
    )
  `

  // Check if settings_company has any rows, if not insert a default
  const companyRows = await tenantSql`SELECT meta_id FROM settings_company LIMIT 1`
  if (companyRows.length === 0) {
    console.log('Inserting default settings_company row...')
    await tenantSql`
      INSERT INTO settings_company (info_company_name, info_company_slug)
      VALUES (${tenant.companyName}, ${slug.toLowerCase()})
    `
  }

  console.log('✅ Tenant schema updated successfully!')
}

main().catch(console.error)
