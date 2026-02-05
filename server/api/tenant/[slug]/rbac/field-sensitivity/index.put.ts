import { eq, and, sql } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, rbacFieldSensitivity } from '../../../../../db'
import { requireTenantAccess } from '../../../../../utils/session'
import { loadUserPermissions, checkPermission } from '../../../../../utils/permissions'
import { validateSensitivityTier, type SensitivityTier } from '../../../../../utils/field-sensitivity'

const VALID_TIERS: SensitivityTier[] = ['basic', 'personal', 'company', 'sensitive']

/**
 * PUT /api/tenant/[slug]/rbac/field-sensitivity
 *
 * Update a single field's sensitivity configuration.
 * Requires rbac.manage permission.
 *
 * Body:
 * - tableName: string (required) - The database table name
 * - fieldName: string (required) - The field/column name
 * - sensitivity: 'basic' | 'personal' | 'company' | 'sensitive' (required)
 * - order: number (optional) - Display order for the field
 * - maskingType: string (optional) - Masking type (full, partial, last4, email, phone, date, currency)
 * - displayName: string (optional) - Human-readable display name
 * - description: string (optional) - Description of why this field is sensitive
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

    // Check permission to manage RBAC
    const permissionCache = await loadUserPermissions(tenantDb, session.userId)
    const canManage = checkPermission(permissionCache, 'rbac.manage')

    if (!canManage.allowed) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to manage field sensitivity',
      })
    }

    // Parse and validate request body
    const body = await readBody(event)

    if (!body.tableName || typeof body.tableName !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'tableName is required and must be a string',
      })
    }

    if (!body.fieldName || typeof body.fieldName !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'fieldName is required and must be a string',
      })
    }

    if (!body.sensitivity || !VALID_TIERS.includes(body.sensitivity)) {
      throw createError({
        statusCode: 400,
        message: `sensitivity must be one of: ${VALID_TIERS.join(', ')}`,
      })
    }

    // Validate against system minimum tiers
    const systemValidation = validateSensitivityTier(body.fieldName, body.sensitivity)
    if (!systemValidation.valid) {
      throw createError({
        statusCode: 400,
        message: systemValidation.message || `Field must be at least "${systemValidation.minimumTier}" sensitivity`,
      })
    }

    // Check if there's an existing config with a min_sensitivity restriction
    const [existingConfig] = await tenantDb
      .select({
        id: rbacFieldSensitivity.meta_id,
        minSensitivity: rbacFieldSensitivity.config_min_sensitivity,
        isSystem: rbacFieldSensitivity.config_is_system,
      })
      .from(rbacFieldSensitivity)
      .where(
        and(
          eq(rbacFieldSensitivity.info_table_name, body.tableName),
          eq(rbacFieldSensitivity.info_field_name, body.fieldName)
        )
      )
      .limit(1)

    // If field has config_min_sensitivity set, validate against it
    if (existingConfig?.minSensitivity) {
      const minValidation = validateSensitivityTier(body.fieldName, body.sensitivity)
      if (!minValidation.valid) {
        throw createError({
          statusCode: 400,
          message: `Field has a minimum sensitivity of "${existingConfig.minSensitivity}". Cannot set less restrictive.`,
        })
      }
    }

    // Validate optional fields
    if (body.maskingType !== undefined && typeof body.maskingType !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'maskingType must be a string',
      })
    }

    if (body.displayName !== undefined && typeof body.displayName !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'displayName must be a string',
      })
    }

    if (body.description !== undefined && typeof body.description !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'description must be a string',
      })
    }

    // Validate masking type if provided
    const validMaskingTypes = ['full', 'partial', 'last4', 'email', 'phone', 'date', 'currency', 'none']
    if (body.maskingType && !validMaskingTypes.includes(body.maskingType)) {
      throw createError({
        statusCode: 400,
        message: `Invalid maskingType. Must be one of: ${validMaskingTypes.join(', ')}`,
      })
    }

    // Upsert the field sensitivity configuration
    const [updatedRecord] = await tenantDb
      .insert(rbacFieldSensitivity)
      .values({
        info_table_name: body.tableName.trim(),
        info_field_name: body.fieldName.trim(),
        info_display_name: body.displayName?.trim() || null,
        info_description: body.description?.trim() || null,
        config_sensitivity: body.sensitivity,
        config_order: body.order ?? 0,
        config_masking_type: body.maskingType || 'full',
        config_is_system: false,
        ref_updated_by: session.userId,
      })
      .onConflictDoUpdate({
        target: [rbacFieldSensitivity.info_table_name, rbacFieldSensitivity.info_field_name],
        set: {
          info_display_name: body.displayName?.trim() || null,
          info_description: body.description?.trim() || null,
          config_sensitivity: body.sensitivity,
          config_order: body.order ?? sql`${rbacFieldSensitivity.config_order}`,
          config_masking_type: body.maskingType || sql`${rbacFieldSensitivity.config_masking_type}`,
          meta_updated_at: sql`now()`,
          ref_updated_by: session.userId,
        },
      })
      .returning({
        id: rbacFieldSensitivity.meta_id,
        tableName: rbacFieldSensitivity.info_table_name,
        fieldName: rbacFieldSensitivity.info_field_name,
        displayName: rbacFieldSensitivity.info_display_name,
        description: rbacFieldSensitivity.info_description,
        sensitivity: rbacFieldSensitivity.config_sensitivity,
        order: rbacFieldSensitivity.config_order,
        maskingType: rbacFieldSensitivity.config_masking_type,
        isSystem: rbacFieldSensitivity.config_is_system,
        minSensitivity: rbacFieldSensitivity.config_min_sensitivity,
        createdAt: rbacFieldSensitivity.meta_created_at,
        updatedAt: rbacFieldSensitivity.meta_updated_at,
        updatedBy: rbacFieldSensitivity.ref_updated_by,
      })

    return {
      success: true,
      data: updatedRecord,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Error updating field sensitivity:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update field sensitivity',
    })
  }
})
