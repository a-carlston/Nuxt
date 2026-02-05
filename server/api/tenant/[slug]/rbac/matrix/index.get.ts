import { eq, asc } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacPermissions, rbacRolePermissions, rbacRoleTagAssignments, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * GET /api/tenant/[slug]/rbac/matrix
 *
 * Get the permission matrix data for the roles management UI.
 * Returns roles, pages, and current permission assignments in matrix format.
 * Requires rbac.view or rbac.manage permission.
 */

// Action sets for different page types
const VIEW_ONLY_ACTIONS = ['view']
const VIEW_EDIT_ACTIONS = ['view', 'edit']
const STANDARD_ACTIONS = ['view', 'edit', 'create', 'delete']
const MANAGE_ACTIONS = ['view', 'manage']

// UI pages in the application (supports hierarchy via parentId)
const PAGES = [
  // Main pages section
  {
    id: 'main',
    name: 'Main Pages',
    path: '',
    resource: '',
    parentId: null,
    supportsScopes: false,
    supportsDataLevels: false,
    isSection: true,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    resource: 'dashboard',
    parentId: 'main',
    supportsScopes: true,
    supportsDataLevels: false,
  },
  {
    id: 'directory',
    name: 'Directory',
    path: '/directory',
    resource: 'users',
    parentId: 'main',
    supportsScopes: true,
    supportsDataLevels: true,
  },
  {
    id: 'profile',
    name: 'My Profile',
    path: '/settings/profile',
    resource: 'profile',
    parentId: 'main',
    supportsScopes: true,
    supportsDataLevels: true,
  },
  // Admin section
  {
    id: 'admin',
    name: 'Admin',
    path: '/admin',
    resource: 'admin',
    parentId: null,
    supportsScopes: false,
    supportsDataLevels: false,
    isSection: true,
  },
  {
    id: 'admin-fields',
    name: 'Field Manager',
    path: '/admin/fields',
    resource: 'settings',
    parentId: 'admin',
    supportsScopes: false,
    supportsDataLevels: false,
  },
  {
    id: 'admin-roles',
    name: 'Roles & Permissions',
    path: '/admin/roles',
    resource: 'rbac',
    parentId: 'admin',
    supportsScopes: false,
    supportsDataLevels: false,
  },
  // Reports section
  {
    id: 'reports',
    name: 'Reports',
    path: '/reports',
    resource: 'reports',
    parentId: null,
    supportsScopes: false,
    supportsDataLevels: false,
    isSection: true,
  },
  {
    id: 'reports-view',
    name: 'View Reports',
    path: '/reports',
    resource: 'reports',
    parentId: 'reports',
    supportsScopes: false,
    supportsDataLevels: false,
  },
  {
    id: 'audit',
    name: 'Audit Logs',
    path: '/reports/audit',
    resource: 'audit',
    parentId: 'reports',
    supportsScopes: false,
    supportsDataLevels: false,
  },
]

// Add appropriate actions to each page
const PAGES_WITH_ACTIONS = PAGES.map(page => {
  // Sections don't have actions
  if (page.isSection) {
    return { ...page, actions: [] }
  }

  // Assign actions based on page type
  let actions = STANDARD_ACTIONS
  switch (page.id) {
    case 'dashboard':
      actions = VIEW_EDIT_ACTIONS // View/edit dashboard widgets
      break
    case 'directory':
      actions = STANDARD_ACTIONS // Full CRUD on users
      break
    case 'profile':
      actions = VIEW_EDIT_ACTIONS // View/edit own profile
      break
    case 'admin-fields':
    case 'admin-roles':
      actions = MANAGE_ACTIONS // View/manage admin sections
      break
    case 'reports-view':
      actions = ['view', 'create', 'export'] // View, create, export reports
      break
    case 'audit':
      actions = ['view', 'export'] // View and export audit logs
      break
    default:
      actions = VIEW_EDIT_ACTIONS
  }

  return { ...page, actions }
})

// Scope order from narrowest to broadest
const SCOPE_ORDER = ['self', 'direct_reports', 'department', 'division', 'company']

// Data levels for user data (4-tier system)
const DATA_LEVELS = ['basic', 'personal', 'company', 'sensitive']

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  // Require authentication and tenant access
  const session = requireTenantAccess(event, slug)
  const parentDb = useParentDb()

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

    // Check permission
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    if (!checkPermission(permissionCache, 'rbac.manage') && !checkPermission(permissionCache, 'rbac.view')) {
      throw createError({ statusCode: 403, message: 'Permission denied: requires rbac.view or rbac.manage' })
    }

    // Fetch all roles (try with new columns, fall back if they don't exist)
    let rolesRaw: Array<{
      id: string
      code: string
      name: string
      description: string | null
      isSystem: boolean
      isActive: boolean
      groupId: string | null
      displayOrder: number
    }>

    try {
      rolesRaw = await tenantDb
        .select({
          id: rbacRoles.meta_id,
          code: rbacRoles.info_code,
          name: rbacRoles.info_name,
          description: rbacRoles.info_description,
          isSystem: rbacRoles.config_is_system,
          isActive: rbacRoles.config_is_active,
          groupId: rbacRoles.ref_group_id,
          displayOrder: rbacRoles.config_display_order,
        })
        .from(rbacRoles)
        .orderBy(asc(rbacRoles.config_display_order), asc(rbacRoles.info_name))
    } catch {
      // Fall back to query without new columns if they don't exist
      console.warn('Falling back to basic roles query (new columns may not exist yet)')
      const basicRoles = await tenantDb
        .select({
          id: rbacRoles.meta_id,
          code: rbacRoles.info_code,
          name: rbacRoles.info_name,
          description: rbacRoles.info_description,
          isSystem: rbacRoles.config_is_system,
          isActive: rbacRoles.config_is_active,
        })
        .from(rbacRoles)
        .orderBy(asc(rbacRoles.info_name))

      rolesRaw = basicRoles.map(r => ({ ...r, groupId: null, displayOrder: 0 }))
    }

    // Fetch tags for all roles (gracefully handle if tables don't exist yet)
    let tagsByRole = new Map<string, Array<{ id: string; name: string; color: string }>>()
    try {
      const tagAssignments = await tenantDb
        .select({
          roleId: rbacRoleTagAssignments.ref_role_id,
          tagId: rbacRoleTags.meta_id,
          tagName: rbacRoleTags.info_name,
          tagColor: rbacRoleTags.info_color,
        })
        .from(rbacRoleTagAssignments)
        .innerJoin(rbacRoleTags, eq(rbacRoleTagAssignments.ref_tag_id, rbacRoleTags.meta_id))

      // Group tags by role
      for (const assignment of tagAssignments) {
        if (!tagsByRole.has(assignment.roleId)) {
          tagsByRole.set(assignment.roleId, [])
        }
        tagsByRole.get(assignment.roleId)!.push({
          id: assignment.tagId,
          name: assignment.tagName,
          color: assignment.tagColor,
        })
      }
    } catch (e) {
      // Tables might not exist yet - continue without tags
      console.warn('Could not fetch role tags (tables may not exist yet):', e)
    }

    // Combine roles with their tags
    const roles = rolesRaw.map(role => ({
      ...role,
      tags: tagsByRole.get(role.id) || [],
    }))

    // Fetch all permissions
    const permissions = await tenantDb
      .select({
        id: rbacPermissions.meta_id,
        code: rbacPermissions.info_code,
      })
      .from(rbacPermissions)

    // Create permission code to ID lookup
    const permissionCodeToId = new Map<string, string>()
    for (const perm of permissions) {
      permissionCodeToId.set(perm.code, perm.id)
    }

    // Fetch all role-permission assignments
    const rolePermissions = await tenantDb
      .select({
        roleId: rbacRolePermissions.ref_role_id,
        permissionId: rbacRolePermissions.ref_permission_id,
      })
      .from(rbacRolePermissions)

    // Group permissions by role
    const rolePermissionMap = new Map<string, Set<string>>()
    for (const rp of rolePermissions) {
      if (!rolePermissionMap.has(rp.roleId)) {
        rolePermissionMap.set(rp.roleId, new Set())
      }
      rolePermissionMap.get(rp.roleId)!.add(rp.permissionId)
    }

    // Create permission ID to code lookup
    const permissionIdToCode = new Map<string, string>()
    for (const perm of permissions) {
      permissionIdToCode.set(perm.id, perm.code)
    }

    // Build page access matrix: matrix[roleId][pageId][action] = scope | 'granted' | null
    const pageMatrix: Record<string, Record<string, Record<string, string | null>>> = {}

    for (const role of roles) {
      pageMatrix[role.id] = {}
      const rolePermIds = rolePermissionMap.get(role.id) || new Set()

      // Convert permission IDs to codes for this role
      const roleCodes = new Set<string>()
      for (const permId of rolePermIds) {
        const code = permissionIdToCode.get(permId)
        if (code) roleCodes.add(code)
      }

      for (const page of PAGES_WITH_ACTIONS) {
        pageMatrix[role.id][page.id] = {}

        for (const action of page.actions) {
          let bestScope: string | null = null

          // Check for scoped permissions
          if (page.supportsScopes) {
            // Check each scope level
            for (const scope of SCOPE_ORDER) {
              // Check with data levels
              for (const dataLevel of DATA_LEVELS) {
                const code = `${page.resource}.${action}.${dataLevel}.${scope}`
                if (roleCodes.has(code)) {
                  bestScope = scope
                }
              }
              // Also check without data level
              const simpleCode = `${page.resource}.${action}.${scope}`
              if (roleCodes.has(simpleCode)) {
                bestScope = scope
              }
            }
          } else {
            // Simple non-scoped permission
            const code = `${page.resource}.${action}`
            if (roleCodes.has(code)) {
              bestScope = 'granted'
            }
          }

          pageMatrix[role.id][page.id][action] = bestScope
        }
      }
    }

    // Build data level matrix: dataLevelMatrix[roleId][action] = { scope, dataLevel }
    const dataLevelMatrix: Record<string, Record<string, { scope: string | null; dataLevel: string | null }>> = {}

    for (const role of roles) {
      dataLevelMatrix[role.id] = {}
      const rolePermIds = rolePermissionMap.get(role.id) || new Set()

      // Convert permission IDs to codes
      const roleCodes = new Set<string>()
      for (const permId of rolePermIds) {
        const code = permissionIdToCode.get(permId)
        if (code) roleCodes.add(code)
      }

      for (const action of ['view', 'edit']) {
        let bestScope: string | null = null
        let bestDataLevel: string | null = null

        // Find the best scope and data level combination
        for (let s = SCOPE_ORDER.length - 1; s >= 0; s--) {
          const scope = SCOPE_ORDER[s]
          for (let d = DATA_LEVELS.length - 1; d >= 0; d--) {
            const dataLevel = DATA_LEVELS[d]
            const code = `users.${action}.${dataLevel}.${scope}`
            if (roleCodes.has(code)) {
              if (!bestScope || SCOPE_ORDER.indexOf(scope) > SCOPE_ORDER.indexOf(bestScope)) {
                bestScope = scope
              }
              if (!bestDataLevel || DATA_LEVELS.indexOf(dataLevel) > DATA_LEVELS.indexOf(bestDataLevel)) {
                bestDataLevel = dataLevel
              }
            }
          }
        }

        dataLevelMatrix[role.id][action] = { scope: bestScope, dataLevel: bestDataLevel }
      }
    }

    return {
      success: true,
      data: {
        roles,
        pages: PAGES_WITH_ACTIONS,
        pageMatrix,
        dataLevelMatrix,
        scopes: SCOPE_ORDER,
        dataLevels: DATA_LEVELS,
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching permission matrix:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch permission matrix',
    })
  }
})
