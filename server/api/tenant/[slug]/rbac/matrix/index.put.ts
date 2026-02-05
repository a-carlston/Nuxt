import { eq, and, inArray } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacPermissions, rbacRolePermissions } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission, clearAllPermissionCaches } from '../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/matrix
 *
 * Update role permissions based on matrix changes.
 * Requires rbac.manage permission.
 *
 * Body:
 * {
 *   roleId: string,
 *   pageId: string,
 *   action: string,
 *   scope: string | null,
 *   dataLevel?: string | null
 * }
 */

interface MatrixUpdate {
  roleId: string
  pageId: string
  action: string
  scope: string | null
  dataLevel?: string | null
}

// Page definitions for permission code building (must match PAGES in index.get.ts)
// All pages now support scopes and data levels
const PAGE_RESOURCES: Record<string, { resource: string }> = {
  // Main pages
  dashboard: { resource: 'dashboard' },
  directory: { resource: 'users' },
  profile: { resource: 'profile' },
  // Admin section
  'admin-fields': { resource: 'settings' },
  'admin-roles': { resource: 'rbac' },
  // Reports section
  'reports-view': { resource: 'reports' },
  'audit': { resource: 'audit' },
}

const SCOPE_ORDER = ['self', 'direct_reports', 'department', 'division', 'company']
const DATA_LEVELS = ['basic', 'personal', 'company', 'sensitive']

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug is required' })
  }

  // Require authentication and tenant access
  const session = requireTenantAccess(event, slug)
  const parentDb = useParentDb()

  // Parse request body
  const body = await readBody<MatrixUpdate>(event)

  if (!body.roleId || !body.pageId || !body.action) {
    throw createError({
      statusCode: 400,
      message: 'roleId, pageId, and action are required',
    })
  }

  try {
    // Get tenant connection string
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status,
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      throw createError({ statusCode: 404, message: 'Workspace not found' })
    }

    if (tenant.status !== 'active') {
      throw createError({ statusCode: 403, message: 'This workspace is currently inactive' })
    }

    if (!tenant.connectionString) {
      throw createError({ statusCode: 500, message: 'Workspace database not configured' })
    }

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Check rbac.manage permission
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    if (!checkPermission(permissionCache, 'rbac.manage')) {
      throw createError({ statusCode: 403, message: 'Permission denied: requires rbac.manage' })
    }

    // Get the role
    const [role] = await tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        isSystem: rbacRoles.config_is_system,
      })
      .from(rbacRoles)
      .where(eq(rbacRoles.meta_id, body.roleId))
      .limit(1)

    if (!role) {
      throw createError({ statusCode: 404, message: 'Role not found' })
    }

    // Super admin role (super_admin) cannot have permissions modified
    if (role.code === 'super_admin') {
      throw createError({
        statusCode: 403,
        message: 'Super Administrator permissions cannot be modified',
      })
    }

    // Get page configuration
    const pageConfig = PAGE_RESOURCES[body.pageId]
    if (!pageConfig) {
      throw createError({ statusCode: 400, message: `Unknown page: ${body.pageId}` })
    }

    // Build the list of permission codes to add/remove
    // All pages now use scope + dataLevel format: resource.action.dataLevel.scope
    const permissionCodesToRemove: string[] = []
    const permissionCodesToAdd: string[] = []

    // Remove all existing permissions for this action (all scope + dataLevel combinations)
    for (const scope of SCOPE_ORDER) {
      for (const dataLevel of DATA_LEVELS) {
        permissionCodesToRemove.push(`${pageConfig.resource}.${body.action}.${dataLevel}.${scope}`)
      }
    }
    // Also remove simple permission format for backwards compatibility
    permissionCodesToRemove.push(`${pageConfig.resource}.${body.action}`)

    // Add permissions up to the selected scope and data level
    if (body.scope && body.dataLevel) {
      const scopeIndex = SCOPE_ORDER.indexOf(body.scope)
      const dataLevelIndex = DATA_LEVELS.indexOf(body.dataLevel)

      if (scopeIndex >= 0 && dataLevelIndex >= 0) {
        // Add all scope levels up to selected
        for (let s = 0; s <= scopeIndex; s++) {
          // Add all data levels up to selected
          for (let d = 0; d <= dataLevelIndex; d++) {
            permissionCodesToAdd.push(`${pageConfig.resource}.${body.action}.${DATA_LEVELS[d]}.${SCOPE_ORDER[s]}`)
          }
        }
      }
    }

    // Get permission IDs for the codes
    const allCodes = [...new Set([...permissionCodesToRemove, ...permissionCodesToAdd])]

    const permissions = await tenantDb
      .select({
        id: rbacPermissions.meta_id,
        code: rbacPermissions.info_code,
      })
      .from(rbacPermissions)
      .where(inArray(rbacPermissions.info_code, allCodes))

    const codeToId = new Map<string, string>()
    for (const perm of permissions) {
      codeToId.set(perm.code, perm.id)
    }

    // Remove existing permissions
    const idsToRemove = permissionCodesToRemove
      .map((code) => codeToId.get(code))
      .filter((id): id is string => id !== undefined)

    if (idsToRemove.length > 0) {
      await tenantDb
        .delete(rbacRolePermissions)
        .where(
          and(
            eq(rbacRolePermissions.ref_role_id, body.roleId),
            inArray(rbacRolePermissions.ref_permission_id, idsToRemove)
          )
        )
    }

    // Add new permissions
    const idsToAdd = permissionCodesToAdd
      .map((code) => codeToId.get(code))
      .filter((id): id is string => id !== undefined)

    if (idsToAdd.length > 0) {
      // Insert one at a time to handle conflicts (ON CONFLICT DO NOTHING behavior)
      for (const permId of idsToAdd) {
        try {
          await tenantDb.insert(rbacRolePermissions).values({
            ref_role_id: body.roleId,
            ref_permission_id: permId,
          })
        } catch (err: unknown) {
          // Ignore duplicate key errors
          if (err && typeof err === 'object' && 'code' in err && err.code !== '23505') {
            throw err
          }
        }
      }
    }

    // Clear permission caches for all users with this role
    await clearAllPermissionCaches()

    return {
      success: true,
      data: {
        roleId: body.roleId,
        pageId: body.pageId,
        action: body.action,
        scope: body.scope,
        dataLevel: body.dataLevel,
        permissionsAdded: permissionCodesToAdd.length,
        permissionsRemoved: permissionCodesToRemove.length,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating permission matrix:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update permission matrix',
    })
  }
})
