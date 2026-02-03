import { eq, inArray, sql } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { useParentDb, parentSchema, coreUsers, auditLogs } from '../../../../db'

// =============================================================================
// TYPES
// =============================================================================

interface BulkEdit {
  rowId: string
  changes: { field: string; newValue: unknown }[]
}

interface BulkDelete {
  rowId: string
}

interface BulkRequestBody {
  edits: BulkEdit[]
  deletes: BulkDelete[]
  meta?: {
    requestId?: string
    hardDelete?: boolean // If true, perform hard delete; otherwise soft delete
  }
}

interface BulkResponse {
  success: boolean
  applied: {
    edits: number
    deletes: number
  }
  requestId?: string
  errors?: Array<{
    type: 'edit' | 'delete'
    rowId: string
    field?: string
    message: string
  }>
}

// =============================================================================
// FIELD MAPPING
// =============================================================================
// Maps frontend field names to database column names

const fieldToColumnMap: Record<string, keyof typeof coreUsers.$inferSelect> = {
  // Personal fields
  firstName: 'personal_first_name',
  lastName: 'personal_last_name',
  preferredName: 'personal_preferred_name',
  maidenName: 'personal_maiden_name',
  email: 'personal_email',
  phone: 'personal_phone',
  phoneCountryCode: 'personal_phone_country_code',
  avatarUrl: 'personal_avatar_url',
  dateOfBirth: 'personal_date_of_birth',
  gender: 'personal_gender',
  nationality: 'personal_nationality',
  ssn: 'personal_ssn',

  // Personal address fields
  addressCountryCode: 'personal_address_country_code',
  addressStateCode: 'personal_address_state_code',
  addressCity: 'personal_address_city',
  addressLine1: 'personal_address_line1',
  addressLine2: 'personal_address_line2',
  addressPostalCode: 'personal_address_postal_code',

  // Emergency contact fields
  emergencyContactName: 'emergency_contact_name',
  emergencyContactRelationship: 'emergency_contact_relationship',
  emergencyContactPhone: 'emergency_contact_phone',
  emergencyContactEmail: 'emergency_contact_email',
  emergencyContactAddress: 'emergency_contact_address',

  // Company fields
  companyEmail: 'company_email',
  companyPhone: 'company_phone',
  companyPhoneExt: 'company_phone_ext',
  employeeId: 'company_employee_id',
  title: 'company_title',
  department: 'company_department',
  division: 'company_division',
  location: 'company_location',
  startDate: 'company_start_date',
  employmentType: 'company_employment_type',
  hireDate: 'company_hire_date',
  terminationDate: 'company_termination_date',
  companyAvatarUrl: 'company_avatar_url',

  // Meta fields
  status: 'meta_status',

  // Reference fields
  userTypeId: 'ref_user_type_id',
}

// Fields that should not be editable via bulk operations
const protectedFields = new Set([
  'meta_id',
  'meta_created_at',
  'meta_deleted_at',
  'auth_password_hash',
  'auth_mfa_secret',
])

// =============================================================================
// VALIDATION
// =============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

function validateFieldValue(field: string, value: unknown): { valid: boolean; message?: string } {
  const columnName = fieldToColumnMap[field]

  if (!columnName) {
    return { valid: false, message: `Unknown field: ${field}` }
  }

  if (protectedFields.has(columnName)) {
    return { valid: false, message: `Field '${field}' cannot be modified` }
  }

  // Type-specific validation
  if (columnName === 'personal_email' || columnName === 'company_email' || columnName === 'emergency_contact_email') {
    if (value !== null && typeof value === 'string' && value.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return { valid: false, message: `Invalid email format for field '${field}'` }
      }
    }
  }

  if (columnName === 'meta_status') {
    const validStatuses = ['invited', 'active', 'inactive', 'suspended', 'deleted']
    if (!validStatuses.includes(value as string)) {
      return { valid: false, message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` }
    }
  }

  return { valid: true }
}

// =============================================================================
// HANDLER
// =============================================================================

export default defineEventHandler(async (event): Promise<BulkResponse> => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<BulkRequestBody>(event)

  // Validate slug
  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  // Validate body structure
  if (!body || (!Array.isArray(body.edits) && !Array.isArray(body.deletes))) {
    throw createError({
      statusCode: 400,
      message: 'Request body must contain edits and/or deletes arrays'
    })
  }

  const edits = body.edits || []
  const deletes = body.deletes || []
  const requestId = body.meta?.requestId
  const hardDelete = body.meta?.hardDelete ?? false

  // Early return if nothing to do
  if (edits.length === 0 && deletes.length === 0) {
    return {
      success: true,
      applied: { edits: 0, deletes: 0 },
      requestId
    }
  }

  const errors: BulkResponse['errors'] = []

  // =============================================================================
  // PRE-VALIDATION
  // =============================================================================

  // Validate all edit row IDs and fields before connecting to tenant DB
  for (const edit of edits) {
    if (!edit.rowId || !validateUUID(edit.rowId)) {
      errors.push({
        type: 'edit',
        rowId: edit.rowId || 'unknown',
        message: 'Invalid or missing row ID'
      })
      continue
    }

    if (!Array.isArray(edit.changes) || edit.changes.length === 0) {
      errors.push({
        type: 'edit',
        rowId: edit.rowId,
        message: 'Changes array is required and must not be empty'
      })
      continue
    }

    for (const change of edit.changes) {
      const validation = validateFieldValue(change.field, change.newValue)
      if (!validation.valid) {
        errors.push({
          type: 'edit',
          rowId: edit.rowId,
          field: change.field,
          message: validation.message!
        })
      }
    }
  }

  // Validate all delete row IDs
  for (const del of deletes) {
    if (!del.rowId || !validateUUID(del.rowId)) {
      errors.push({
        type: 'delete',
        rowId: del.rowId || 'unknown',
        message: 'Invalid or missing row ID'
      })
    }
  }

  // If pre-validation failed, return errors without attempting database operations
  if (errors.length > 0) {
    return {
      success: false,
      applied: { edits: 0, deletes: 0 },
      requestId,
      errors
    }
  }

  // =============================================================================
  // GET TENANT CONNECTION
  // =============================================================================

  const parentDb = useParentDb()

  try {
    // Get tenant's connection string from parent DB
    const [tenant] = await parentDb
      .select({
        connectionString: parentSchema.parentTenants.connection_string,
        status: parentSchema.parentTenants.meta_status
      })
      .from(parentSchema.parentTenants)
      .where(eq(parentSchema.parentTenants.info_company_slug, slug.toLowerCase()))
      .limit(1)

    if (!tenant) {
      throw createError({
        statusCode: 404,
        message: 'Workspace not found'
      })
    }

    if (tenant.status !== 'active') {
      throw createError({
        statusCode: 403,
        message: 'This workspace is currently inactive'
      })
    }

    if (!tenant.connectionString) {
      throw createError({
        statusCode: 500,
        message: 'Workspace database not configured'
      })
    }

    // =============================================================================
    // EXECUTE TRANSACTION
    // =============================================================================
    // Using raw SQL transaction since neon-http doesn't support Drizzle transactions

    const sqlClient = neon(tenant.connectionString)

    // Collect all row IDs to verify they exist
    const allRowIds = [
      ...edits.map(e => e.rowId),
      ...deletes.map(d => d.rowId)
    ]
    const uniqueRowIds = [...new Set(allRowIds)]

    // Verify all rows exist before starting transaction
    const existingRows = await sqlClient`
      SELECT meta_id FROM core_users
      WHERE meta_id = ANY(${uniqueRowIds}::uuid[])
      AND (meta_deleted_at IS NULL OR meta_status != 'deleted')
    `

    const existingIds = new Set(existingRows.map(r => r.meta_id))

    for (const id of uniqueRowIds) {
      if (!existingIds.has(id)) {
        errors.push({
          type: edits.some(e => e.rowId === id) ? 'edit' : 'delete',
          rowId: id,
          message: 'User not found or already deleted'
        })
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        applied: { edits: 0, deletes: 0 },
        requestId,
        errors
      }
    }

    // Get current values for audit log
    const currentValues = await sqlClient`
      SELECT * FROM core_users
      WHERE meta_id = ANY(${uniqueRowIds}::uuid[])
    `
    const currentValuesMap = new Map(currentValues.map(r => [r.meta_id, r]))

    // Build and execute transaction
    let appliedEdits = 0
    let appliedDeletes = 0

    // Start transaction
    await sqlClient`BEGIN`

    try {
      // Process edits
      for (const edit of edits) {
        const currentRow = currentValuesMap.get(edit.rowId)
        const updates: Record<string, unknown> = {}
        const auditChanges: Record<string, { old: unknown; new: unknown }> = {}

        for (const change of edit.changes) {
          const columnName = fieldToColumnMap[change.field]
          if (columnName) {
            updates[columnName] = change.newValue
            auditChanges[columnName] = {
              old: currentRow?.[columnName],
              new: change.newValue
            }
          }
        }

        // Add meta_updated_at
        updates['meta_updated_at'] = new Date().toISOString()

        // Build dynamic UPDATE query
        const setClauses = Object.entries(updates)
          .map(([col, _], idx) => `${col} = $${idx + 2}`)
          .join(', ')

        const values = [edit.rowId, ...Object.values(updates)]

        await sqlClient.query(
          `UPDATE core_users SET ${setClauses} WHERE meta_id = $1`,
          values
        )

        // Insert audit log entry
        await sqlClient`
          INSERT INTO audit_logs (
            audit_action,
            audit_resource_type,
            audit_resource_id,
            audit_changes
          ) VALUES (
            'bulk_update',
            'core_users',
            ${edit.rowId}::uuid,
            ${JSON.stringify(auditChanges)}::jsonb
          )
        `

        appliedEdits++
      }

      // Process deletes
      for (const del of deletes) {
        const currentRow = currentValuesMap.get(del.rowId)

        if (hardDelete) {
          // Hard delete - remove the row entirely
          await sqlClient`
            DELETE FROM core_users WHERE meta_id = ${del.rowId}::uuid
          `
        } else {
          // Soft delete - set meta_status to 'deleted' and meta_deleted_at
          await sqlClient`
            UPDATE core_users
            SET meta_status = 'deleted',
                meta_deleted_at = NOW(),
                meta_updated_at = NOW()
            WHERE meta_id = ${del.rowId}::uuid
          `
        }

        // Insert audit log entry
        await sqlClient`
          INSERT INTO audit_logs (
            audit_action,
            audit_resource_type,
            audit_resource_id,
            audit_changes
          ) VALUES (
            ${hardDelete ? 'bulk_hard_delete' : 'bulk_soft_delete'},
            'core_users',
            ${del.rowId}::uuid,
            ${JSON.stringify({
              deleted_row: currentRow,
              hard_delete: hardDelete
            })}::jsonb
          )
        `

        appliedDeletes++
      }

      // Commit transaction
      await sqlClient`COMMIT`

      return {
        success: true,
        applied: {
          edits: appliedEdits,
          deletes: appliedDeletes
        },
        requestId
      }

    } catch (txError) {
      // Rollback transaction on any error
      await sqlClient`ROLLBACK`
      throw txError
    }

  } catch (error: unknown) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('Bulk operation error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to apply bulk operations'
    })
  }
})
