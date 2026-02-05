/**
 * Permission Checking Utilities
 *
 * Server-side utilities for loading and checking user permissions.
 * Implements the RBAC model with cascade scopes and tag-based rules.
 */

import { eq, and, isNull, or, lte, gte } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

// ============================================================================
// Types
// ============================================================================

export type PermissionScope = 'self' | 'direct_reports' | 'department' | 'lob' | 'division' | 'company'
export type DataLevel = 'basic' | 'personal' | 'sensitive'

export interface OrgContext {
  userId: string
  departmentIds: string[]
  lobIds: string[]
  divisionIds: string[]
  locationIds: string[]
  directReportIds: string[]
  supervisorIds: string[]
}

export interface PermissionCache {
  userId: string
  loadedAt: number
  expiresAt: number
  permissions: Set<string>
  roles: Array<{
    code: string
    name: string
    scopeType: string
    scopeId?: string
  }>
  tags: string[]
  tagGrants: Array<{
    tag: string
    targetTags: string[] | null
    permissionCode: string
    effect: 'grant' | 'deny'
    priority: number
  }>
  tagDenies: Array<{
    tag: string
    targetTags: string[] | null
    permissionCode: string
    effect: 'grant' | 'deny'
    priority: number
  }>
  orgContext: OrgContext
}

export interface PermissionCheckContext {
  targetUserId?: string
  targetDepartmentId?: string
  targetLobId?: string
  targetDivisionId?: string
  targetLocationId?: string
  targetTags?: string[]
}

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  matchedPermission?: string
  effectiveScope?: PermissionScope
  effectiveDataLevel?: DataLevel
}

// ============================================================================
// Constants
// ============================================================================

const SCOPE_ORDER: PermissionScope[] = ['self', 'direct_reports', 'department', 'lob', 'division', 'company']
const DATA_LEVEL_ORDER: DataLevel[] = ['basic', 'personal', 'sensitive']

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory permission cache (per-user)
const permissionCaches = new Map<string, PermissionCache>()

// ============================================================================
// Field Data Levels
// ============================================================================

export const FIELD_DATA_LEVELS: Record<string, DataLevel> = {
  // Basic
  personal_first_name: 'basic',
  personal_preferred_name: 'basic',
  personal_last_name: 'basic',
  personal_avatar_url: 'basic',
  company_email: 'basic',
  company_title: 'basic',
  company_department: 'basic',
  company_division: 'basic',
  company_location: 'basic',
  company_avatar_url: 'basic',
  company_employee_id: 'basic',

  // Personal
  personal_email: 'personal',
  personal_phone: 'personal',
  personal_phone_country_code: 'personal',
  personal_date_of_birth: 'personal',
  personal_gender: 'personal',
  personal_nationality: 'personal',
  personal_address_country_code: 'personal',
  personal_address_state_code: 'personal',
  personal_address_city: 'personal',
  personal_address_line1: 'personal',
  personal_address_line2: 'personal',
  personal_address_postal_code: 'personal',
  emergency_contact_name: 'personal',
  emergency_contact_relationship: 'personal',
  emergency_contact_phone: 'personal',
  emergency_contact_email: 'personal',
  emergency_contact_address: 'personal',
  company_phone: 'personal',
  company_phone_ext: 'personal',
  company_start_date: 'personal',
  company_hire_date: 'personal',
  company_termination_date: 'personal',
  company_employment_type: 'personal',

  // Sensitive
  personal_ssn: 'sensitive',
  tax_ssn: 'sensitive',
  tax_id: 'sensitive',
  bank_account_type: 'sensitive',
  bank_name: 'sensitive',
  bank_routing_number: 'sensitive',
  bank_account_number: 'sensitive',
  bank_account_holder_name: 'sensitive',
  pay_type: 'sensitive',
  pay_rate: 'sensitive',
  pay_currency: 'sensitive',
  pay_frequency: 'sensitive',
}

// ============================================================================
// Permission Loading
// ============================================================================

/**
 * Load all permissions for a user and cache them
 */
export async function loadUserPermissions(
  db: NeonHttpDatabase<typeof schema>,
  userId: string
): Promise<PermissionCache> {
  const now = Date.now()

  // Check if we have a valid cache
  const cached = permissionCaches.get(userId)
  if (cached && cached.expiresAt > now) {
    return cached
  }

  // Load user roles with their permissions
  const userRoles = await db
    .select({
      roleCode: schema.rbacRoles.info_code,
      roleName: schema.rbacRoles.info_name,
      scopeType: schema.rbacUserRoles.info_scope_type,
      scopeId: schema.rbacUserRoles.info_scope_id,
      expiresAt: schema.rbacUserRoles.info_expires_at,
    })
    .from(schema.rbacUserRoles)
    .innerJoin(schema.rbacRoles, eq(schema.rbacUserRoles.ref_role_id, schema.rbacRoles.meta_id))
    .where(
      and(
        eq(schema.rbacUserRoles.ref_user_id, userId),
        eq(schema.rbacRoles.config_is_active, true),
        or(
          isNull(schema.rbacUserRoles.info_expires_at),
          gte(schema.rbacUserRoles.info_expires_at, new Date())
        )
      )
    )

  // Load permissions for all user roles
  const roleIds = await db
    .select({ roleId: schema.rbacUserRoles.ref_role_id })
    .from(schema.rbacUserRoles)
    .where(eq(schema.rbacUserRoles.ref_user_id, userId))

  const permissions = new Set<string>()

  if (roleIds.length > 0) {
    const rolePermissions = await db
      .select({
        permissionCode: schema.rbacPermissions.info_code,
      })
      .from(schema.rbacRolePermissions)
      .innerJoin(
        schema.rbacPermissions,
        eq(schema.rbacRolePermissions.ref_permission_id, schema.rbacPermissions.meta_id)
      )
      .where(
        or(...roleIds.map((r) => eq(schema.rbacRolePermissions.ref_role_id, r.roleId)))
      )

    for (const rp of rolePermissions) {
      permissions.add(rp.permissionCode)
    }
  }

  // Load user tags (table may not exist yet)
  let tags: string[] = []
  try {
    const userTags = await db
      .select({
        tag: schema.rbacUserTags.info_tag,
      })
      .from(schema.rbacUserTags)
      .where(eq(schema.rbacUserTags.ref_user_id, userId))

    tags = userTags.map((t) => t.tag)
  } catch {
    // Table may not exist yet
  }

  // Load tag-based permission rules for user's tags
  const tagRules: PermissionCache['tagGrants'] = []
  const tagDenies: PermissionCache['tagDenies'] = []

  if (tags.length > 0) {
    try {
      const tagPermissions = await db
        .select({
          tag: schema.rbacTagPermissions.info_tag,
          targetTags: schema.rbacTagPermissions.info_target_tags,
          permissionCode: schema.rbacPermissions.info_code,
          effect: schema.rbacTagPermissions.config_effect,
          priority: schema.rbacTagPermissions.config_priority,
        })
        .from(schema.rbacTagPermissions)
        .innerJoin(
          schema.rbacPermissions,
          eq(schema.rbacTagPermissions.ref_permission_id, schema.rbacPermissions.meta_id)
        )
        .where(
          or(...tags.map((t) => eq(schema.rbacTagPermissions.info_tag, t)))
        )

      for (const tp of tagPermissions) {
        const rule = {
          tag: tp.tag,
          targetTags: tp.targetTags,
          permissionCode: tp.permissionCode,
          effect: tp.effect as 'grant' | 'deny',
          priority: tp.priority,
        }

        if (tp.effect === 'deny') {
          tagDenies.push(rule)
        } else {
          tagRules.push(rule)
        }
      }

      // Sort by priority (higher evaluated later, so deny with higher priority wins)
      tagRules.sort((a, b) => a.priority - b.priority)
      tagDenies.sort((a, b) => a.priority - b.priority)
    } catch {
      // Table may not exist yet
    }
  }

  // Load organizational context
  const orgContext = await loadOrgContext(db, userId)

  const cache: PermissionCache = {
    userId,
    loadedAt: now,
    expiresAt: now + CACHE_TTL_MS,
    permissions,
    roles: userRoles.map((r) => ({
      code: r.roleCode,
      name: r.roleName,
      scopeType: r.scopeType,
      scopeId: r.scopeId ?? undefined,
    })),
    tags,
    tagGrants: tagRules,
    tagDenies,
    orgContext,
  }

  permissionCaches.set(userId, cache)
  return cache
}

/**
 * Load user's organizational context for scope checking
 */
async function loadOrgContext(
  db: NeonHttpDatabase<typeof schema>,
  userId: string
): Promise<OrgContext> {
  const today = new Date().toISOString().split('T')[0] as string

  // Load user assignments (table may not exist yet)
  let assignments: Array<{
    departmentId: string | null
    lobId: string | null
    divisionId: string | null
    locationId: string | null
  }> = []
  try {
    assignments = await db
      .select({
        departmentId: schema.coreUserAssignments.ref_department_id,
        lobId: schema.coreUserAssignments.ref_lob_id,
        divisionId: schema.coreUserAssignments.ref_division_id,
        locationId: schema.coreUserAssignments.ref_location_id,
      })
      .from(schema.coreUserAssignments)
      .where(
        and(
          eq(schema.coreUserAssignments.ref_user_id, userId),
          or(
            isNull(schema.coreUserAssignments.info_end_date),
            gte(schema.coreUserAssignments.info_end_date, today)
          )
        )
      )
  } catch {
    // Table may not exist yet
  }

  // Load direct reports (table may not exist yet)
  let directReports: Array<{ userId: string }> = []
  try {
    directReports = await db
      .select({
        userId: schema.coreUserSupervisors.ref_user_id,
      })
      .from(schema.coreUserSupervisors)
      .where(
        and(
          eq(schema.coreUserSupervisors.ref_supervisor_id, userId),
          or(
            isNull(schema.coreUserSupervisors.info_end_date),
            gte(schema.coreUserSupervisors.info_end_date, today)
          )
        )
      )
  } catch {
    // Table may not exist yet
  }

  // Load supervisors (table may not exist yet)
  let supervisors: Array<{ supervisorId: string }> = []
  try {
    supervisors = await db
      .select({
        supervisorId: schema.coreUserSupervisors.ref_supervisor_id,
      })
      .from(schema.coreUserSupervisors)
      .where(
        and(
          eq(schema.coreUserSupervisors.ref_user_id, userId),
          or(
            isNull(schema.coreUserSupervisors.info_end_date),
            gte(schema.coreUserSupervisors.info_end_date, today)
          )
        )
      )
  } catch {
    // Table may not exist yet
  }

  return {
    userId,
    departmentIds: [...new Set(assignments.map((a) => a.departmentId).filter(Boolean) as string[])],
    lobIds: [...new Set(assignments.map((a) => a.lobId).filter(Boolean) as string[])],
    divisionIds: [...new Set(assignments.map((a) => a.divisionId).filter(Boolean) as string[])],
    locationIds: [...new Set(assignments.map((a) => a.locationId).filter(Boolean) as string[])],
    directReportIds: directReports.map((d) => d.userId),
    supervisorIds: supervisors.map((s) => s.supervisorId),
  }
}

/**
 * Clear the permission cache for a user (call when roles change)
 */
export function clearPermissionCache(userId: string): void {
  permissionCaches.delete(userId)
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCaches(): void {
  permissionCaches.clear()
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if a user has a specific permission
 */
export function checkPermission(
  cache: PermissionCache,
  permission: string,
  context?: PermissionCheckContext
): PermissionCheckResult {
  // Parse the requested permission
  const parsed = parsePermission(permission)

  // Check for tag-based denies first (deny takes precedence)
  for (const deny of cache.tagDenies) {
    if (matchesPermission(deny.permissionCode, permission)) {
      // Check target tags if specified
      if (deny.targetTags && context?.targetTags) {
        const hasTargetTag = deny.targetTags.some((t) => context.targetTags!.includes(t))
        if (hasTargetTag) {
          return {
            allowed: false,
            reason: `Denied by tag rule: ${deny.tag}`,
          }
        }
      } else if (!deny.targetTags) {
        // No target tags = applies to all
        return {
          allowed: false,
          reason: `Denied by tag rule: ${deny.tag}`,
        }
      }
    }
  }

  // Check role-based permissions
  const roleResult = checkRolePermission(cache, parsed, context)
  if (roleResult.allowed) {
    return roleResult
  }

  // Check tag-based grants
  for (const grant of cache.tagGrants) {
    if (matchesPermission(grant.permissionCode, permission)) {
      // Check target tags if specified
      if (grant.targetTags && context?.targetTags) {
        const hasTargetTag = grant.targetTags.some((t) => context.targetTags!.includes(t))
        if (hasTargetTag) {
          return {
            allowed: true,
            reason: `Granted by tag rule: ${grant.tag}`,
            matchedPermission: grant.permissionCode,
          }
        }
      } else if (!grant.targetTags) {
        return {
          allowed: true,
          reason: `Granted by tag rule: ${grant.tag}`,
          matchedPermission: grant.permissionCode,
        }
      }
    }
  }

  return roleResult
}

/**
 * Check role-based permissions with scope resolution
 */
function checkRolePermission(
  cache: PermissionCache,
  parsed: ParsedPermission,
  context?: PermissionCheckContext
): PermissionCheckResult {
  // Build all possible permission variations to check
  const permutations = buildPermissionPermutations(parsed)

  for (const perm of permutations) {
    // Check if user has this exact permission
    if (cache.permissions.has(perm.code)) {
      // If scope is specified, verify the user has access to the target
      if (perm.scope && context) {
        const scopeValid = validateScope(cache, perm.scope, context)
        if (scopeValid) {
          return {
            allowed: true,
            matchedPermission: perm.code,
            effectiveScope: perm.scope,
            effectiveDataLevel: perm.dataLevel,
          }
        }
      } else {
        return {
          allowed: true,
          matchedPermission: perm.code,
          effectiveScope: perm.scope,
          effectiveDataLevel: perm.dataLevel,
        }
      }
    }

    // Check for wildcard permissions
    const wildcardCode = perm.code.replace(/\.[^.]+$/, '.*')
    if (cache.permissions.has(wildcardCode)) {
      if (perm.scope && context) {
        const scopeValid = validateScope(cache, perm.scope, context)
        if (scopeValid) {
          return {
            allowed: true,
            matchedPermission: wildcardCode,
            effectiveScope: perm.scope,
            effectiveDataLevel: perm.dataLevel,
          }
        }
      } else {
        return {
          allowed: true,
          matchedPermission: wildcardCode,
          effectiveScope: perm.scope,
          effectiveDataLevel: perm.dataLevel,
        }
      }
    }
  }

  return {
    allowed: false,
    reason: 'No matching permission found',
  }
}

/**
 * Validate that the user's scope allows access to the target
 */
function validateScope(
  cache: PermissionCache,
  scope: PermissionScope,
  context: PermissionCheckContext
): boolean {
  const { orgContext } = cache

  switch (scope) {
    case 'self':
      return context.targetUserId === orgContext.userId

    case 'direct_reports':
      if (context.targetUserId === orgContext.userId) return true
      return orgContext.directReportIds.includes(context.targetUserId!)

    case 'department':
      if (context.targetUserId === orgContext.userId) return true
      if (orgContext.directReportIds.includes(context.targetUserId!)) return true
      if (context.targetDepartmentId) {
        return orgContext.departmentIds.includes(context.targetDepartmentId)
      }
      return false

    case 'lob':
      if (context.targetUserId === orgContext.userId) return true
      if (orgContext.directReportIds.includes(context.targetUserId!)) return true
      if (context.targetLobId) {
        return orgContext.lobIds.includes(context.targetLobId)
      }
      if (context.targetDepartmentId) {
        return orgContext.departmentIds.includes(context.targetDepartmentId)
      }
      return false

    case 'division':
      if (context.targetUserId === orgContext.userId) return true
      if (orgContext.directReportIds.includes(context.targetUserId!)) return true
      if (context.targetDivisionId) {
        return orgContext.divisionIds.includes(context.targetDivisionId)
      }
      if (context.targetLobId) {
        return orgContext.lobIds.includes(context.targetLobId)
      }
      if (context.targetDepartmentId) {
        return orgContext.departmentIds.includes(context.targetDepartmentId)
      }
      return false

    case 'company':
      // Company scope = access to everything
      return true

    default:
      return false
  }
}

// ============================================================================
// Permission Parsing
// ============================================================================

interface ParsedPermission {
  resource: string
  action: string
  dataLevel?: DataLevel
  scope?: PermissionScope
}

function parsePermission(code: string): ParsedPermission {
  const parts = code.split('.')

  if (parts.length < 2) {
    throw new Error(`Invalid permission code: ${code}`)
  }

  const result: ParsedPermission = {
    resource: parts[0] ?? '',
    action: parts[1] ?? '',
  }

  if (parts.length >= 3) {
    const third = parts[2]
    if (third && DATA_LEVEL_ORDER.includes(third as DataLevel)) {
      result.dataLevel = third as DataLevel
      if (parts.length >= 4 && parts[3]) {
        result.scope = parts[3] as PermissionScope
      }
    } else if (third && SCOPE_ORDER.includes(third as PermissionScope)) {
      result.scope = third as PermissionScope
    }
  }

  return result
}

/**
 * Build all permission permutations to check (broader scopes include narrower)
 */
function buildPermissionPermutations(
  parsed: ParsedPermission
): Array<{ code: string; scope?: PermissionScope; dataLevel?: DataLevel }> {
  const permutations: Array<{ code: string; scope?: PermissionScope; dataLevel?: DataLevel }> = []

  // If scope is specified, check from that scope up to company
  const startScopeIndex = parsed.scope ? SCOPE_ORDER.indexOf(parsed.scope) : 0
  const scopesToCheck = SCOPE_ORDER.slice(startScopeIndex)

  // If data level is specified, check from that level up to sensitive
  const startDataLevelIndex = parsed.dataLevel ? DATA_LEVEL_ORDER.indexOf(parsed.dataLevel) : 0
  const dataLevelsToCheck = DATA_LEVEL_ORDER.slice(startDataLevelIndex)

  // Build permutations from most specific to most general
  for (const scope of scopesToCheck.reverse()) {
    for (const dataLevel of dataLevelsToCheck.reverse()) {
      permutations.push({
        code: `${parsed.resource}.${parsed.action}.${dataLevel}.${scope}`,
        scope,
        dataLevel,
      })
    }

    // Also check permission without data level
    permutations.push({
      code: `${parsed.resource}.${parsed.action}.${scope}`,
      scope,
    })
  }

  // Check permission without scope
  for (const dataLevel of dataLevelsToCheck.reverse()) {
    permutations.push({
      code: `${parsed.resource}.${parsed.action}.${dataLevel}`,
      dataLevel,
    })
  }

  // Most general: just resource.action
  permutations.push({
    code: `${parsed.resource}.${parsed.action}`,
  })

  return permutations
}

/**
 * Check if a permission code matches another (supports wildcards)
 */
function matchesPermission(pattern: string, permission: string): boolean {
  if (pattern === permission) return true

  // Handle wildcards
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
    return regex.test(permission)
  }

  return false
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the data level for a field
 */
export function getFieldDataLevel(field: string): DataLevel {
  return FIELD_DATA_LEVELS[field] ?? 'basic'
}

/**
 * Check if a user can access a specific data level for a target
 */
export function canAccessDataLevel(
  cache: PermissionCache,
  resource: string,
  action: string,
  dataLevel: DataLevel,
  context?: PermissionCheckContext
): boolean {
  const permission = `${resource}.${action}.${dataLevel}`
  const result = checkPermission(cache, permission, context)
  return result.allowed
}

/**
 * Get the highest data level a user can access for a target
 */
export function getMaxDataLevel(
  cache: PermissionCache,
  resource: string,
  action: string,
  context?: PermissionCheckContext
): DataLevel | null {
  // Check from most sensitive to least
  for (const level of [...DATA_LEVEL_ORDER].reverse()) {
    if (canAccessDataLevel(cache, resource, action, level, context)) {
      return level
    }
  }
  return null
}

/**
 * Check if a user is accessing their own data
 */
export function isSelfAccess(cache: PermissionCache, targetUserId: string): boolean {
  return cache.orgContext.userId === targetUserId
}
