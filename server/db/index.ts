import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import * as parentSchema from './schema/parent'

// =============================================================================
// PARENT DATABASE (Main/Control Plane)
// =============================================================================
// Stores tenant metadata and Neon branch info
// Uses DATABASE_URL from env

const getParentDatabaseUrl = () => {
  const config = useRuntimeConfig()
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }
  return config.databaseUrl
}

let _parentDb: ReturnType<typeof drizzle<typeof parentSchema>> | null = null

export const useParentDb = () => {
  if (!_parentDb) {
    const sql = neon(getParentDatabaseUrl())
    _parentDb = drizzle(sql, { schema: parentSchema })
  }
  return _parentDb
}

// =============================================================================
// TENANT DATABASE (Per-tenant branches)
// =============================================================================
// Each tenant gets their own Neon branch with full schema
// Connection strings are stored encrypted in parent_tenants table

// Cache of tenant DB connections
const _tenantDbCache = new Map<string, ReturnType<typeof drizzle<typeof schema>>>()

export const useTenantDb = (connectionString: string) => {
  if (!_tenantDbCache.has(connectionString)) {
    const sql = neon(connectionString)
    _tenantDbCache.set(connectionString, drizzle(sql, { schema }))
  }
  return _tenantDbCache.get(connectionString)!
}

// Legacy export for backwards compatibility during migration
// TODO: Remove once all code is updated to use useParentDb or useTenantDb
export const useDb = useParentDb

// Export schemas for use in other files
export * from './schema'
export { schema, parentSchema }
