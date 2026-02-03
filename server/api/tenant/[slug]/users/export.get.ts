import { eq, and, like, or, isNull, sql } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../../db'

// Column ID to readable header name mapping
const COLUMN_HEADERS: Record<string, string> = {
  meta_id: 'ID',
  meta_status: 'Status',
  meta_created_at: 'Created At',
  meta_updated_at: 'Updated At',
  meta_deleted_at: 'Deleted At',
  personal_first_name: 'First Name',
  personal_preferred_name: 'Preferred Name',
  personal_last_name: 'Last Name',
  personal_maiden_name: 'Maiden Name',
  personal_email: 'Email',
  personal_phone: 'Phone',
  personal_phone_country_code: 'Phone Country Code',
  personal_avatar_url: 'Avatar URL',
  personal_date_of_birth: 'Date of Birth',
  personal_gender: 'Gender',
  personal_nationality: 'Nationality',
  personal_address_country_code: 'Country',
  personal_address_state_code: 'State',
  personal_address_city: 'City',
  personal_address_line1: 'Address Line 1',
  personal_address_line2: 'Address Line 2',
  personal_address_postal_code: 'Postal Code',
  emergency_contact_name: 'Emergency Contact Name',
  emergency_contact_relationship: 'Emergency Contact Relationship',
  emergency_contact_phone: 'Emergency Contact Phone',
  emergency_contact_email: 'Emergency Contact Email',
  emergency_contact_address: 'Emergency Contact Address',
  company_email: 'Company Email',
  company_phone: 'Company Phone',
  company_phone_ext: 'Company Phone Ext',
  company_employee_id: 'Employee ID',
  company_title: 'Job Title',
  company_department: 'Department',
  company_division: 'Division',
  company_location: 'Location',
  company_start_date: 'Start Date',
  company_employment_type: 'Employment Type',
  company_hire_date: 'Hire Date',
  company_termination_date: 'Termination Date',
  company_avatar_url: 'Company Avatar URL',
  auth_email_verified_at: 'Email Verified At',
  auth_last_login_at: 'Last Login At',
  auth_mfa_enabled: 'MFA Enabled',
  auth_onboarding_completed_at: 'Onboarding Completed At',
}

// Default columns to export
const DEFAULT_COLUMNS = [
  'meta_id',
  'personal_first_name',
  'personal_last_name',
  'personal_email',
  'company_title',
  'company_department',
  'meta_status',
  'company_hire_date',
]

// Allowed columns (for security - exclude sensitive fields like passwords, SSN, etc.)
const ALLOWED_COLUMNS = Object.keys(COLUMN_HEADERS)

// Escape a value for CSV (handle quotes, commas, newlines)
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If the value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

// Generate CSV content from data
function generateCSV(data: Record<string, unknown>[], columns: string[], includeHeaders: boolean): string {
  const lines: string[] = []

  // Add header row if requested
  if (includeHeaders) {
    const headerRow = columns.map(col => escapeCSVValue(COLUMN_HEADERS[col] || col))
    lines.push(headerRow.join(','))
  }

  // Add data rows
  for (const row of data) {
    const dataRow = columns.map(col => escapeCSVValue(row[col]))
    lines.push(dataRow.join(','))
  }

  return lines.join('\r\n')
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  // Parse query parameters
  const format = (query.format as string)?.toLowerCase() || 'csv'
  const scope = (query.scope as string)?.toLowerCase() || 'all'
  const includeHeaders = query.includeHeaders !== 'false' // Default to true

  // Parse columns - comma-separated list or default
  let columns: string[] = DEFAULT_COLUMNS
  if (query.columns) {
    const requestedColumns = (query.columns as string).split(',').map(c => c.trim())
    // Filter to only allowed columns
    columns = requestedColumns.filter(col => ALLOWED_COLUMNS.includes(col))
    if (columns.length === 0) {
      columns = DEFAULT_COLUMNS
    }
  }

  // Validate format
  if (format !== 'csv' && format !== 'xlsx') {
    throw createError({
      statusCode: 400,
      message: 'Invalid format. Supported formats: csv, xlsx'
    })
  }

  // XLSX not supported yet (library not installed)
  if (format === 'xlsx') {
    throw createError({
      statusCode: 501,
      message: 'XLSX format is not yet supported. Please use CSV.'
    })
  }

  // Parse filter parameters (used when scope is 'filtered')
  const filterSearch = query.search as string | undefined
  const filterStatus = query.status as string | undefined
  const filterDepartment = query.department as string | undefined
  const filterEmploymentType = query.employmentType as string | undefined
  const filterLocation = query.location as string | undefined

  const parentDb = useParentDb()

  try {
    // Get tenant connection string from parent DB
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

    // Connect to tenant database
    const tenantDb = useTenantDb(tenant.connectionString)

    // Build conditions array for filtering
    const conditions: ReturnType<typeof eq>[] = []

    // Only include non-deleted users by default
    conditions.push(isNull(coreUsers.meta_deleted_at))

    // Apply filters if scope is 'filtered'
    if (scope === 'filtered') {
      // Status filter
      if (filterStatus) {
        conditions.push(eq(coreUsers.meta_status, filterStatus))
      }

      // Department filter
      if (filterDepartment) {
        conditions.push(eq(coreUsers.company_department, filterDepartment))
      }

      // Employment type filter
      if (filterEmploymentType) {
        conditions.push(eq(coreUsers.company_employment_type, filterEmploymentType))
      }

      // Location filter
      if (filterLocation) {
        conditions.push(eq(coreUsers.company_location, filterLocation))
      }

      // Search filter (searches across name and email fields)
      if (filterSearch) {
        const searchPattern = `%${filterSearch.toLowerCase()}%`
        conditions.push(
          or(
            like(sql`LOWER(${coreUsers.personal_first_name})`, searchPattern),
            like(sql`LOWER(${coreUsers.personal_last_name})`, searchPattern),
            like(sql`LOWER(${coreUsers.personal_email})`, searchPattern),
            like(sql`LOWER(${coreUsers.company_email})`, searchPattern),
            like(sql`LOWER(${coreUsers.company_employee_id})`, searchPattern)
          )!
        )
      }
    }

    // Build select object dynamically based on requested columns
    const selectFields: Record<string, unknown> = {}
    for (const col of columns) {
      if (col in coreUsers) {
        selectFields[col] = (coreUsers as unknown as Record<string, unknown>)[col]
      }
    }

    // Fetch users from tenant database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await tenantDb
      .select(selectFields as any)
      .from(coreUsers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(coreUsers.personal_last_name, coreUsers.personal_first_name)

    // Generate CSV content
    const csvContent = generateCSV(users, columns, includeHeaders)

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `users-export-${timestamp}.csv`

    // Set response headers
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    // Return the CSV content
    return csvContent

  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error exporting users:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to export users'
    })
  }
})
