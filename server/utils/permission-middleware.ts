/**
 * Permission Middleware Utilities
 *
 * Server-side middleware factories for enforcing permissions
 * on API endpoints.
 */

import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import { useParentDb, useTenantDb, parentSchema } from '../db'
import {
  loadUserPermissions,
  checkPermission,
  clearPermissionCache,
  type PermissionCache,
  type PermissionCheckContext,
  type PermissionCheckResult,
} from './permissions'
import { getSessionFromRequest } from './session'

// ============================================================================
// Types
// ============================================================================

declare module 'h3' {
  interface H3EventContext {
    permissionCache?: PermissionCache
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get or create a permission cache for the current user
 */
export async function getPermissionCache(
  db: NeonHttpDatabase<typeof schema>,
  userId: string
): Promise<PermissionCache> {
  return loadUserPermissions(db, userId)
}

/**
 * Invalidate the permission cache for a user
 * Call this when a user's roles or tags change
 */
export function invalidatePermissionCache(userId: string): void {
  clearPermissionCache(userId)
}

// ============================================================================
// Permission Checking (Non-throwing)
// ============================================================================

/**
 * Check if a user has a permission (non-throwing)
 */
export async function canUser(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  permission: string,
  context?: PermissionCheckContext
): Promise<boolean> {
  const cache = await loadUserPermissions(db, userId)
  const result = checkPermission(cache, permission, context)
  return result.allowed
}

/**
 * Check multiple permissions (returns true if user has ALL)
 */
export async function canUserAll(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  permissions: string[],
  context?: PermissionCheckContext
): Promise<boolean> {
  const cache = await loadUserPermissions(db, userId)
  return permissions.every((p) => checkPermission(cache, p, context).allowed)
}

/**
 * Check multiple permissions (returns true if user has ANY)
 */
export async function canUserAny(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  permissions: string[],
  context?: PermissionCheckContext
): Promise<boolean> {
  const cache = await loadUserPermissions(db, userId)
  return permissions.some((p) => checkPermission(cache, p, context).allowed)
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Create middleware that requires a specific permission
 *
 * @example
 * defineEventHandler({
 *   middleware: [requirePermission('users.view.basic.company')],
 *   handler: async (event) => { ... }
 * })
 */
export function requirePermission(
  permission: string,
  getContext?: (event: H3Event) => PermissionCheckContext | Promise<PermissionCheckContext>
) {
  return async (event: H3Event) => {
    const session = getSessionFromRequest(event)
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    // Get tenant database
    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        message: 'Tenant slug required',
      })
    }

    const db = await getTenantDbFromSlug(slug)
    const cache = await loadUserPermissions(db, session.userId)

    // Store cache in context for handler use
    event.context.permissionCache = cache

    // Get context if provided
    const context = getContext ? await getContext(event) : undefined

    const result = checkPermission(cache, permission, context)
    if (!result.allowed) {
      throw createError({
        statusCode: 403,
        message: `Access denied: ${result.reason || 'Insufficient permissions'}`,
        data: { permission, required: permission },
      })
    }
  }
}

/**
 * Create middleware that requires ANY of the specified permissions
 */
export function requireAnyPermission(
  permissions: string[],
  getContext?: (event: H3Event) => PermissionCheckContext | Promise<PermissionCheckContext>
) {
  return async (event: H3Event) => {
    const session = getSessionFromRequest(event)
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        message: 'Tenant slug required',
      })
    }

    const db = await getTenantDbFromSlug(slug)
    const cache = await loadUserPermissions(db, session.userId)
    event.context.permissionCache = cache

    const context = getContext ? await getContext(event) : undefined

    const hasAny = permissions.some((p) => checkPermission(cache, p, context).allowed)
    if (!hasAny) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: Insufficient permissions',
        data: { permissions, required: 'any' },
      })
    }
  }
}

/**
 * Create middleware that requires ALL of the specified permissions
 */
export function requireAllPermissions(
  permissions: string[],
  getContext?: (event: H3Event) => PermissionCheckContext | Promise<PermissionCheckContext>
) {
  return async (event: H3Event) => {
    const session = getSessionFromRequest(event)
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        message: 'Tenant slug required',
      })
    }

    const db = await getTenantDbFromSlug(slug)
    const cache = await loadUserPermissions(db, session.userId)
    event.context.permissionCache = cache

    const context = getContext ? await getContext(event) : undefined

    const missingPermissions: string[] = []
    for (const p of permissions) {
      const result = checkPermission(cache, p, context)
      if (!result.allowed) {
        missingPermissions.push(p)
      }
    }

    if (missingPermissions.length > 0) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: Insufficient permissions',
        data: { missing: missingPermissions, required: 'all' },
      })
    }
  }
}

/**
 * Create middleware that requires a specific role
 */
export function requireRole(roleCode: string) {
  return async (event: H3Event) => {
    const session = getSessionFromRequest(event)
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        message: 'Tenant slug required',
      })
    }

    const db = await getTenantDbFromSlug(slug)
    const cache = await loadUserPermissions(db, session.userId)
    event.context.permissionCache = cache

    const hasRole = cache.roles.some((r) => r.code === roleCode)
    if (!hasRole) {
      throw createError({
        statusCode: 403,
        message: `Access denied: Requires ${roleCode} role`,
        data: { required: roleCode },
      })
    }
  }
}

/**
 * Create middleware that requires admin role (hierarchy level <= 2)
 */
export function requireAdmin() {
  return async (event: H3Event) => {
    const session = getSessionFromRequest(event)
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required',
      })
    }

    const slug = getRouterParam(event, 'slug')
    if (!slug) {
      throw createError({
        statusCode: 400,
        message: 'Tenant slug required',
      })
    }

    const db = await getTenantDbFromSlug(slug)
    const cache = await loadUserPermissions(db, session.userId)
    event.context.permissionCache = cache

    const isAdmin = cache.roles.some((r) => r.hierarchyLevel <= 2)
    if (!isAdmin) {
      throw createError({
        statusCode: 403,
        message: 'Access denied: Admin access required',
      })
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tenant database from event and slug
 */
async function getTenantDbFromSlug(
  slug: string
): Promise<NeonHttpDatabase<typeof schema>> {
  const parentDb = useParentDb()

  const [tenant] = await parentDb
    .select({
      connectionString: parentSchema.parentTenants.connection_string,
      status: parentSchema.parentTenants.meta_status,
    })
    .from(parentSchema.parentTenants)
    .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
    .limit(1)

  if (!tenant) {
    throw createError({
      statusCode: 404,
      message: 'Workspace not found',
    })
  }

  if (tenant.status !== 'active') {
    throw createError({
      statusCode: 403,
      message: 'This workspace is currently inactive',
    })
  }

  if (!tenant.connectionString) {
    throw createError({
      statusCode: 500,
      message: 'Workspace database not configured',
    })
  }

  return useTenantDb(tenant.connectionString)
}

/**
 * Check permission from event context (after middleware has run)
 */
export function checkPermissionFromContext(
  event: H3Event,
  permission: string,
  context?: PermissionCheckContext
): PermissionCheckResult {
  const cache = event.context.permissionCache
  if (!cache) {
    return {
      allowed: false,
      reason: 'Permission cache not initialized - ensure middleware ran',
    }
  }
  return checkPermission(cache, permission, context)
}

/**
 * Get permission cache from event context
 */
export function getPermissionCacheFromContext(event: H3Event): PermissionCache | undefined {
  return event.context.permissionCache
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log sensitive data access for compliance
 */
export async function logSensitiveDataAccess(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  sessionId: string | null,
  resourceType: string,
  resourceId: string,
  dataLevel: 'basic' | 'personal' | 'sensitive',
  fieldsAccessed: string[],
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    ref_user_id: userId,
    ref_session_id: sessionId,
    audit_action: 'view',
    audit_resource_type: resourceType,
    audit_resource_id: resourceId,
    audit_data_level: dataLevel,
    audit_fields_accessed: fieldsAccessed,
    audit_ip_address: ipAddress,
    audit_user_agent: userAgent,
  })
}

/**
 * Log sensitive data modification for compliance
 */
export async function logSensitiveDataEdit(
  db: NeonHttpDatabase<typeof schema>,
  userId: string,
  sessionId: string | null,
  resourceType: string,
  resourceId: string,
  dataLevel: 'basic' | 'personal' | 'sensitive',
  changes: Record<string, { old: unknown; new: unknown }>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    ref_user_id: userId,
    ref_session_id: sessionId,
    audit_action: 'update',
    audit_resource_type: resourceType,
    audit_resource_id: resourceId,
    audit_data_level: dataLevel,
    audit_fields_accessed: Object.keys(changes),
    audit_changes: changes,
    audit_ip_address: ipAddress,
    audit_user_agent: userAgent,
  })
}
