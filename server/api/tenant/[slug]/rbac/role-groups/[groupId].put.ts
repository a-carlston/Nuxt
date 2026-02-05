import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoleGroups } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'

/**
 * PUT /api/tenant/[slug]/rbac/role-groups/[groupId]
 *
 * Update a role group.
 * Requires rbac.manage permission.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const groupId = getRouterParam(event, 'groupId')

  if (!slug || !groupId) {
    throw createError({ statusCode: 400, message: 'Slug and groupId are required' })
  }

  const session = requireTenantAccess(event, slug)
  const parentDb = useParentDb()

  try {
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status,
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant || tenant.status !== 'active' || !tenant.connectionString) {
      throw createError({ statusCode: 404, message: 'Workspace not found or inactive' })
    }

    const tenantDb = useTenantDb(tenant.connectionString)

    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    if (!checkPermission(permissionCache, 'rbac.manage')) {
      throw createError({ statusCode: 403, message: 'Permission denied' })
    }

    const body = await readBody(event)
    const { name, description, displayOrder, isCollapsed } = body

    const updateData: Record<string, unknown> = {
      meta_updated_at: new Date(),
    }

    if (name !== undefined) updateData.info_name = name.trim()
    if (description !== undefined) updateData.info_description = description?.trim() || null
    if (displayOrder !== undefined) updateData.config_display_order = displayOrder
    if (isCollapsed !== undefined) updateData.config_is_collapsed = isCollapsed

    const [updated] = await tenantDb
      .update(rbacRoleGroups)
      .set(updateData)
      .where(eq(rbacRoleGroups.meta_id, groupId))
      .returning({
        id: rbacRoleGroups.meta_id,
        name: rbacRoleGroups.info_name,
        description: rbacRoleGroups.info_description,
        displayOrder: rbacRoleGroups.config_display_order,
        isCollapsed: rbacRoleGroups.config_is_collapsed,
      })

    if (!updated) {
      throw createError({ statusCode: 404, message: 'Group not found' })
    }

    return { success: true, data: updated }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('Error updating role group:', error)
    throw createError({ statusCode: 500, message: 'Failed to update role group' })
  }
})
