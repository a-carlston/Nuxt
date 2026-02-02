/**
 * Clean up old tenant tables from the parent database
 * These tables should only exist in tenant branches, not the main database.
 *
 * Run with: npx tsx scripts/cleanup-old-tables.ts
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config()

async function cleanupOldTables() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment')
    process.exit(1)
  }

  console.log('Connecting to parent database...')
  const sql = neon(databaseUrl)

  console.log('Dropping old tenant tables from parent database...')

  // Drop each table individually
  try { await sql`DROP TABLE IF EXISTS audit_data_access_logs CASCADE`; console.log('  Dropped: audit_data_access_logs') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS audit_logs CASCADE`; console.log('  Dropped: audit_logs') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS audit_sessions CASCADE`; console.log('  Dropped: audit_sessions') } catch (e) {}

  try { await sql`DROP TABLE IF EXISTS rbac_user_roles CASCADE`; console.log('  Dropped: rbac_user_roles') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS rbac_role_permissions CASCADE`; console.log('  Dropped: rbac_role_permissions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS rbac_permissions CASCADE`; console.log('  Dropped: rbac_permissions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS rbac_roles CASCADE`; console.log('  Dropped: rbac_roles') } catch (e) {}

  try { await sql`DROP TABLE IF EXISTS billing_invoices CASCADE`; console.log('  Dropped: billing_invoices') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS billing_payment_methods CASCADE`; console.log('  Dropped: billing_payment_methods') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS billing_addresses CASCADE`; console.log('  Dropped: billing_addresses') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS billing_compliance CASCADE`; console.log('  Dropped: billing_compliance') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS billing_subscription CASCADE`; console.log('  Dropped: billing_subscription') } catch (e) {}

  try { await sql`DROP TABLE IF EXISTS settings_user CASCADE`; console.log('  Dropped: settings_user') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS settings_company CASCADE`; console.log('  Dropped: settings_company') } catch (e) {}

  try { await sql`DROP TABLE IF EXISTS core_user_custom_fields CASCADE`; console.log('  Dropped: core_user_custom_fields') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_custom_field_definitions CASCADE`; console.log('  Dropped: core_custom_field_definitions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_password_history CASCADE`; console.log('  Dropped: core_password_history') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_department_skills CASCADE`; console.log('  Dropped: core_department_skills') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_skills CASCADE`; console.log('  Dropped: core_user_skills') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_skills CASCADE`; console.log('  Dropped: core_skills') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_assignments CASCADE`; console.log('  Dropped: core_user_assignments') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_lines_of_business CASCADE`; console.log('  Dropped: core_lines_of_business') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_departments CASCADE`; console.log('  Dropped: core_departments') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_divisions CASCADE`; console.log('  Dropped: core_divisions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_locations CASCADE`; console.log('  Dropped: core_locations') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_tax CASCADE`; console.log('  Dropped: core_user_tax') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_compensation CASCADE`; console.log('  Dropped: core_user_compensation') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_banking CASCADE`; console.log('  Dropped: core_user_banking') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_languages CASCADE`; console.log('  Dropped: core_user_languages') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_users CASCADE`; console.log('  Dropped: core_users') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS core_user_types CASCADE`; console.log('  Dropped: core_user_types') } catch (e) {}

  // Drop all parent tables
  try { await sql`DROP TABLE IF EXISTS parent_tenant_subscriptions CASCADE`; console.log('  Dropped: parent_tenant_subscriptions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_tenant_feature_overrides CASCADE`; console.log('  Dropped: parent_tenant_feature_overrides') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_feature_flags CASCADE`; console.log('  Dropped: parent_feature_flags') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_announcements CASCADE`; console.log('  Dropped: parent_announcements') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_support_tickets CASCADE`; console.log('  Dropped: parent_support_tickets') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_audit_logs CASCADE`; console.log('  Dropped: parent_audit_logs') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_usage_metrics CASCADE`; console.log('  Dropped: parent_usage_metrics') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_payments CASCADE`; console.log('  Dropped: parent_payments') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_invoices CASCADE`; console.log('  Dropped: parent_invoices') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_subscriptions CASCADE`; console.log('  Dropped: parent_subscriptions') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_tenant_contacts CASCADE`; console.log('  Dropped: parent_tenant_contacts') } catch (e) {}
  try { await sql`DROP TABLE IF EXISTS parent_tenants CASCADE`; console.log('  Dropped: parent_tenants') } catch (e) {}

  console.log('\nOld tables dropped successfully!')
}

cleanupOldTables().catch((err) => {
  console.error('Failed to cleanup tables:', err)
  process.exit(1)
})
