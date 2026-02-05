import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacFieldSensitivity, settingsCompany } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'
import { validateSensitivityTier, type SensitivityTier } from '../../../../../utils/field-sensitivity'

/**
 * POST /api/tenant/[slug]/rbac/field-sensitivity/bulk
 *
 * Bulk update field sensitivity configurations and column order.
 * Requires rbac.manage permission.
 *
 * Body:
 * {
 *   updates: Array<{
 *     tableName: string,
 *     fieldName: string,
 *     sensitivity: 'basic' | 'personal' | 'company' | 'sensitive',
 *     order: number,
 *     maskingType?: string,
 *     displayName?: string,
 *     description?: string
 *   }>
 * }
 */

const VALID_TIERS: SensitivityTier[] = ['basic', 'personal', 'company', 'sensitive']

interface FieldSensitivityUpdate {
  tableName: string
  fieldName: string
  sensitivity: SensitivityTier
  order: number
  maskingType?: string
  displayName?: string
  description?: string
}

interface BulkUpdateRequest {
  updates: FieldSensitivityUpdate[]
}

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

  // Parse request body
  const body = await readBody<BulkUpdateRequest>(event)

  if (!body.updates || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      message: 'updates array is required',
    })
  }

  if (body.updates.length === 0) {
    return {
      success: true,
      data: { updated: 0 },
    }
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

    // Check rbac.manage permission
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    const canManage = checkPermission(permissionCache, 'rbac.manage')

    if (!canManage.allowed) {
      throw createError({
        statusCode: 403,
        message: 'Permission denied: requires rbac.manage',
      })
    }

    // Validate all updates before processing
    const validationErrors: string[] = []

    body.updates.forEach((update, i) => {
      // Validate required fields
      if (!update.tableName || typeof update.tableName !== 'string') {
        validationErrors.push(`Update ${i}: tableName is required and must be a string`)
        return
      }

      if (!update.fieldName || typeof update.fieldName !== 'string') {
        validationErrors.push(`Update ${i}: fieldName is required and must be a string`)
        return
      }

      if (!update.sensitivity || !VALID_TIERS.includes(update.sensitivity)) {
        validationErrors.push(`Update ${i}: sensitivity must be one of: ${VALID_TIERS.join(', ')}`)
        return
      }

      if (typeof update.order !== 'number' || update.order < 0) {
        validationErrors.push(`Update ${i}: order is required and must be a non-negative number`)
        return
      }

      // Check against system minimums
      const validation = validateSensitivityTier(update.fieldName, update.sensitivity)
      if (!validation.valid) {
        validationErrors.push(`Update ${i}: ${validation.message}`)
      }
    })

    if (validationErrors.length > 0) {
      throw createError({
        statusCode: 400,
        message: 'Validation failed',
        data: { errors: validationErrors },
      })
    }

    // Process all updates
    let updatedCount = 0

    for (const update of body.updates) {
      // Upsert the record using ON CONFLICT DO UPDATE
      await tenantDb
        .insert(rbacFieldSensitivity)
        .values({
          info_table_name: update.tableName,
          info_field_name: update.fieldName,
          config_sensitivity: update.sensitivity,
          config_order: update.order,
          config_masking_type: update.maskingType || 'full',
          info_display_name: update.displayName || null,
          info_description: update.description || null,
          ref_updated_by: session.userId,
        })
        .onConflictDoUpdate({
          target: [rbacFieldSensitivity.info_table_name, rbacFieldSensitivity.info_field_name],
          set: {
            config_sensitivity: update.sensitivity,
            config_order: update.order,
            config_masking_type: update.maskingType || 'full',
            info_display_name: update.displayName || null,
            info_description: update.description || null,
            ref_updated_by: session.userId,
            meta_updated_at: new Date(),
          },
        })

      updatedCount++
    }

    // Rebuild the JSONB cache in settings_company
    const allSensitivityRecords = await tenantDb
      .select({
        tableName: rbacFieldSensitivity.info_table_name,
        fieldName: rbacFieldSensitivity.info_field_name,
        sensitivity: rbacFieldSensitivity.config_sensitivity,
        masking: rbacFieldSensitivity.config_masking_type,
        order: rbacFieldSensitivity.config_order,
      })
      .from(rbacFieldSensitivity)

    // Build the cache structure: { [tableName]: { [fieldName]: { sensitivity, masking, order } } }
    const sensitivityCache: Record<string, Record<string, { sensitivity: string; masking: string; order: number }>> = {}

    for (const record of allSensitivityRecords) {
      if (!sensitivityCache[record.tableName]) {
        sensitivityCache[record.tableName] = {}
      }
      const tableCache = sensitivityCache[record.tableName]
      if (tableCache) {
        tableCache[record.fieldName] = {
          sensitivity: record.sensitivity || 'basic',
          masking: record.masking || 'full',
          order: record.order ?? 0,
        }
      }
    }

    // Update settings_company with the new cache
    await tenantDb
      .update(settingsCompany)
      .set({
        config_field_sensitivity: sensitivityCache,
        meta_updated_at: new Date(),
      })

    return {
      success: true,
      data: {
        updated: updatedCount,
        cache: 'rebuilt',
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error bulk updating field sensitivity:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to bulk update field sensitivity',
    })
  }
})
