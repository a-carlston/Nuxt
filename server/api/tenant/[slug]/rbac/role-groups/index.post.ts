import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleGroups } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * POST /api/tenant/[slug]/rbac/role-groups
 *
 * Create a new role group.
 * Requires rbac.manage permission.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

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

    const tenantDb = useTenantDb(tenant.connectionString)

    // Check permission
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    if (!checkPermission(permissionCache, 'rbac.manage')) {
      throw createError({ statusCode: 403, message: 'Permission denied: requires rbac.manage' })
    }

    // Parse body
    const body = await readBody(event)
    const { name, description, displayOrder, isCollapsed } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Name is required' })
    }

    // Create the group
    const [newGroup] = await tenantDb
      .insert(rbacRoleGroups)
      .values({
        info_name: name.trim(),
        info_description: description?.trim() || null,
        config_display_order: displayOrder ?? 0,
        config_is_collapsed: isCollapsed ?? true,
      })
      .returning({
        id: rbacRoleGroups.meta_id,
        name: rbacRoleGroups.info_name,
        description: rbacRoleGroups.info_description,
        displayOrder: rbacRoleGroups.config_display_order,
        isCollapsed: rbacRoleGroups.config_is_collapsed,
      })

    return {
      success: true,
      data: newGroup,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error creating role group:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create role group',
    })
  }
})
