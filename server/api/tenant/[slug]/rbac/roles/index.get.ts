import { eq, asc, sql } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacRoles, rbacRolePermissions, rbacRoleTagAssignments, rbacRoleTags } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'

/**
 * GET /api/tenant/[slug]/rbac/roles
 *
 * List all roles available in the tenant with permission counts, tags, and group info.
 * Requires authentication.
 *
 * Query params:
 * - activeOnly: boolean (default: false) - If true, only return active roles
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  // Require authentication and tenant access
  requireTenantAccess(event, slug)
  const parentDb = useParentDb()

  // Check query params
  const query = getQuery(event)
  const activeOnly = query.activeOnly === 'true'

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

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Fetch all roles with permission counts using a subquery
    const rolesQuery = tenantDb
      .select({
        id: rbacRoles.meta_id,
        code: rbacRoles.info_code,
        name: rbacRoles.info_name,
        description: rbacRoles.info_description,
        isSystem: rbacRoles.config_is_system,
        isActive: rbacRoles.config_is_active,
        groupId: rbacRoles.ref_group_id,
        displayOrder: rbacRoles.config_display_order,
        createdAt: rbacRoles.meta_created_at,
        updatedAt: rbacRoles.meta_updated_at,
        permissionCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${rbacRolePermissions}
          WHERE ${rbacRolePermissions.ref_role_id} = ${rbacRoles.meta_id}
        )`.as('permission_count'),
      })
      .from(rbacRoles)

    // Apply active filter if requested
    const roles = activeOnly
      ? await rolesQuery
          .where(eq(rbacRoles.config_is_active, true))
          .orderBy(asc(rbacRoles.config_display_order), asc(rbacRoles.info_name))
      : await rolesQuery.orderBy(asc(rbacRoles.config_display_order), asc(rbacRoles.info_name))

    // Fetch tags for all roles
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
    const tagsByRole = new Map<string, Array<{ id: string; name: string; color: string }>>()
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

    // Combine roles with their tags
    const rolesWithTags = roles.map(role => ({
      ...role,
      tags: tagsByRole.get(role.id) || [],
    }))

    return {
      success: true,
      data: rolesWithTags,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error fetching roles:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch roles',
    })
  }
})
