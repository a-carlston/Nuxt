/**
 * Delete a tenant and their Neon branch
 *
 * Run with: npx tsx scripts/delete-tenant.ts [slug]
 * Or run without slug to list all tenants and delete all
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config()

const NEON_API_BASE = 'https://console.neon.tech/api/v2'

async function deleteTenantBranch(branchId: string, apiKey: string, projectId: string) {
  const response = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Failed to delete branch ${branchId}:`, error)
    return false
  }

  return true
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const neonApiKey = process.env.NEON_API_KEY
  const neonProjectId = process.env.NEON_PROJECT_ID

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  if (!neonApiKey || !neonProjectId) {
    console.error('NEON_API_KEY or NEON_PROJECT_ID is not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const slugArg = process.argv[2]

  // Get all tenants
  const tenants = await sql`
    SELECT meta_id, info_company_name, info_company_slug, neon_branch_id, meta_created_at
    FROM parent_tenants
    ${slugArg ? sql`WHERE info_company_slug = ${slugArg}` : sql``}
    ORDER BY meta_created_at DESC
  `

  if (tenants.length === 0) {
    console.log(slugArg ? `No tenant found with slug: ${slugArg}` : 'No tenants found')
    process.exit(0)
  }

  console.log('\nTenants found:')
  console.log('─'.repeat(80))
  for (const tenant of tenants) {
    console.log(`  ${tenant.info_company_slug} - ${tenant.info_company_name}`)
    console.log(`    ID: ${tenant.meta_id}`)
    console.log(`    Branch: ${tenant.neon_branch_id}`)
    console.log(`    Created: ${tenant.meta_created_at}`)
    console.log('')
  }

  // Delete each tenant
  for (const tenant of tenants) {
    console.log(`\nDeleting tenant: ${tenant.info_company_slug}...`)

    // Delete Neon branch if it exists
    if (tenant.neon_branch_id) {
      console.log(`  Deleting Neon branch: ${tenant.neon_branch_id}`)
      const deleted = await deleteTenantBranch(tenant.neon_branch_id, neonApiKey, neonProjectId)
      if (deleted) {
        console.log('  ✓ Branch deleted')
      } else {
        console.log('  ✗ Branch deletion failed (may not exist)')
      }
    }

    // Delete related records first (foreign key constraints)
    console.log('  Deleting subscription records...')
    await sql`DELETE FROM parent_subscriptions WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting audit logs...')
    await sql`DELETE FROM parent_audit_logs WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting tenant contacts...')
    await sql`DELETE FROM parent_tenant_contacts WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting invoices...')
    await sql`DELETE FROM parent_invoices WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting payments...')
    await sql`DELETE FROM parent_payments WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting usage metrics...')
    await sql`DELETE FROM parent_usage_metrics WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting support tickets...')
    await sql`DELETE FROM parent_support_tickets WHERE ref_tenant_id = ${tenant.meta_id}`

    console.log('  Deleting feature overrides...')
    await sql`DELETE FROM parent_tenant_feature_overrides WHERE ref_tenant_id = ${tenant.meta_id}`

    // Delete tenant record
    console.log('  Deleting tenant record...')
    await sql`DELETE FROM parent_tenants WHERE meta_id = ${tenant.meta_id}`

    console.log(`  ✓ Tenant "${tenant.info_company_slug}" deleted successfully`)
  }

  console.log('\n✓ All done!')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
