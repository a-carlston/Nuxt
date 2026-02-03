import { eq } from 'drizzle-orm'
import { useParentDb, useTenantDb, parentSchema, coreUsers } from '../../../../db'

// CSV parsing configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PREVIEW_ROWS = 10

// Known columns that can be imported (map to coreUsers table columns)
const VALID_COLUMNS: Record<string, { dbColumn: string; type: 'string' | 'date' | 'boolean' | 'uuid' }> = {
  // Meta columns
  meta_id: { dbColumn: 'meta_id', type: 'uuid' },
  meta_status: { dbColumn: 'meta_status', type: 'string' },

  // Personal columns
  personal_first_name: { dbColumn: 'personal_first_name', type: 'string' },
  personal_preferred_name: { dbColumn: 'personal_preferred_name', type: 'string' },
  personal_last_name: { dbColumn: 'personal_last_name', type: 'string' },
  personal_maiden_name: { dbColumn: 'personal_maiden_name', type: 'string' },
  personal_email: { dbColumn: 'personal_email', type: 'string' },
  personal_phone: { dbColumn: 'personal_phone', type: 'string' },
  personal_phone_country_code: { dbColumn: 'personal_phone_country_code', type: 'string' },
  personal_avatar_url: { dbColumn: 'personal_avatar_url', type: 'string' },
  personal_date_of_birth: { dbColumn: 'personal_date_of_birth', type: 'date' },
  personal_gender: { dbColumn: 'personal_gender', type: 'string' },
  personal_nationality: { dbColumn: 'personal_nationality', type: 'string' },

  // Personal address columns
  personal_address_country_code: { dbColumn: 'personal_address_country_code', type: 'string' },
  personal_address_state_code: { dbColumn: 'personal_address_state_code', type: 'string' },
  personal_address_city: { dbColumn: 'personal_address_city', type: 'string' },
  personal_address_line1: { dbColumn: 'personal_address_line1', type: 'string' },
  personal_address_line2: { dbColumn: 'personal_address_line2', type: 'string' },
  personal_address_postal_code: { dbColumn: 'personal_address_postal_code', type: 'string' },

  // Emergency contact columns
  emergency_contact_name: { dbColumn: 'emergency_contact_name', type: 'string' },
  emergency_contact_relationship: { dbColumn: 'emergency_contact_relationship', type: 'string' },
  emergency_contact_phone: { dbColumn: 'emergency_contact_phone', type: 'string' },
  emergency_contact_email: { dbColumn: 'emergency_contact_email', type: 'string' },
  emergency_contact_address: { dbColumn: 'emergency_contact_address', type: 'string' },

  // Company columns
  company_email: { dbColumn: 'company_email', type: 'string' },
  company_phone: { dbColumn: 'company_phone', type: 'string' },
  company_phone_ext: { dbColumn: 'company_phone_ext', type: 'string' },
  company_employee_id: { dbColumn: 'company_employee_id', type: 'string' },
  company_title: { dbColumn: 'company_title', type: 'string' },
  company_department: { dbColumn: 'company_department', type: 'string' },
  company_division: { dbColumn: 'company_division', type: 'string' },
  company_location: { dbColumn: 'company_location', type: 'string' },
  company_start_date: { dbColumn: 'company_start_date', type: 'date' },
  company_employment_type: { dbColumn: 'company_employment_type', type: 'string' },
  company_hire_date: { dbColumn: 'company_hire_date', type: 'date' },
  company_termination_date: { dbColumn: 'company_termination_date', type: 'date' },
  company_avatar_url: { dbColumn: 'company_avatar_url', type: 'string' },
}

// Special action column values
const ACTION_COLUMN = '_action'
const VALID_ACTIONS = ['edit', 'delete'] as const
type ActionType = typeof VALID_ACTIONS[number]

interface ParsedRow {
  rowNumber: number
  data: Record<string, string>
  action?: ActionType
  errors: string[]
}

interface ImportPreview {
  headers: string[]
  rows: ParsedRow[]
  totalRows: number
  editCount: number
  deleteCount: number
  errors: string[]
}

/**
 * Parse CSV content handling quoted values and escaped quotes
 */
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  // Split by lines, handling quoted newlines
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        currentLine += char
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // End of line
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
      if (char === '\r') i++ // Skip \n in \r\n
    } else if (char === '\r' && !inQuotes) {
      // Handle standalone \r
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
    } else {
      currentLine += char
    }
  }

  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Parse each line into fields
  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let currentField = ''
    let inFieldQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (!inFieldQuotes && currentField === '') {
          // Start of quoted field
          inFieldQuotes = true
        } else if (inFieldQuotes && nextChar === '"') {
          // Escaped quote within quoted field
          currentField += '"'
          i++
        } else if (inFieldQuotes) {
          // End of quoted field
          inFieldQuotes = false
        } else {
          // Quote in unquoted field (shouldn't happen in valid CSV)
          currentField += char
        }
      } else if (char === ',' && !inFieldQuotes) {
        // Field separator
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }

    // Add the last field
    fields.push(currentField.trim())

    return fields
  }

  const headerLine = lines[0]
  if (!headerLine) {
    return { headers: [], rows: [] }
  }
  const headers = parseRow(headerLine)
  const rows = lines.slice(1).map(line => parseRow(line))

  return { headers, rows }
}

/**
 * Validate a value against its expected type
 */
function validateValue(value: string, type: 'string' | 'date' | 'boolean' | 'uuid', columnName: string): string | null {
  if (!value || value.trim() === '') {
    return null // Empty values are allowed
  }

  const trimmedValue = value.trim()

  switch (type) {
    case 'string':
      return null // Strings are always valid

    case 'date':
      // Accept YYYY-MM-DD, MM/DD/YYYY, or YYYY/MM/DD formats
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
        /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
      ]

      const isValidDateFormat = datePatterns.some(pattern => pattern.test(trimmedValue))
      if (!isValidDateFormat) {
        return `Invalid date format for "${columnName}": "${trimmedValue}". Expected YYYY-MM-DD, MM/DD/YYYY, or YYYY/MM/DD`
      }

      // Try to parse the date
      const parsedDate = new Date(trimmedValue)
      if (isNaN(parsedDate.getTime())) {
        return `Invalid date value for "${columnName}": "${trimmedValue}"`
      }
      return null

    case 'boolean':
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n']
      if (!validBooleans.includes(trimmedValue.toLowerCase())) {
        return `Invalid boolean value for "${columnName}": "${trimmedValue}". Expected: true/false, 1/0, yes/no`
      }
      return null

    case 'uuid':
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidPattern.test(trimmedValue)) {
        return `Invalid UUID format for "${columnName}": "${trimmedValue}"`
      }
      return null

    default:
      return null
  }
}

/**
 * Validate email format
 */
function validateEmail(value: string, columnName: string): string | null {
  if (!value || value.trim() === '') {
    return null
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(value.trim())) {
    return `Invalid email format for "${columnName}": "${value}"`
  }
  return null
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required'
    })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  // Get the file from form data
  const fileField = formData.find(f => f.name === 'file')

  if (!fileField || !fileField.data) {
    throw createError({
      statusCode: 400,
      message: 'No file provided. Please upload a CSV file.'
    })
  }

  // Validate file type
  const mimeType = fileField.type || 'application/octet-stream'
  const validMimeTypes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
  const filename = fileField.filename || ''
  const isCSVExtension = filename.toLowerCase().endsWith('.csv')

  if (!validMimeTypes.includes(mimeType) && !isCSVExtension) {
    throw createError({
      statusCode: 400,
      message: `Invalid file type: ${mimeType}. Please upload a CSV file.`
    })
  }

  // Validate file size
  if (fileField.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    })
  }

  // Get tenant connection
  const parentDb = useParentDb()

  try {
    // Get tenant from parent DB
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

    // Parse CSV content
    const content = fileField.data.toString('utf-8')
    const { headers, rows: csvRows } = parseCSV(content)

    if (headers.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'CSV file is empty or has no headers'
      })
    }

    if (csvRows.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'CSV file has no data rows'
      })
    }

    // Normalize headers (lowercase, trim)
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

    // Check for required meta_id column
    const metaIdIndex = normalizedHeaders.indexOf('meta_id')
    if (metaIdIndex === -1) {
      throw createError({
        statusCode: 400,
        message: 'CSV must contain a "meta_id" column to identify existing records for updates'
      })
    }

    // Check for _action column
    const actionIndex = normalizedHeaders.indexOf(ACTION_COLUMN)
    const hasActionColumn = actionIndex !== -1

    // Validate all columns can be mapped
    const globalErrors: string[] = []
    const unmappedColumns: string[] = []

    for (const header of normalizedHeaders) {
      if (header === ACTION_COLUMN) continue // Skip action column
      if (!VALID_COLUMNS[header]) {
        unmappedColumns.push(header)
      }
    }

    if (unmappedColumns.length > 0) {
      globalErrors.push(`Unknown columns that will be ignored: ${unmappedColumns.join(', ')}`)
    }

    // Get mappable columns (valid columns that exist in headers)
    const mappableColumns = normalizedHeaders.filter(h => VALID_COLUMNS[h] || h === ACTION_COLUMN)

    if (mappableColumns.length === 0 || (mappableColumns.length === 1 && mappableColumns[0] === ACTION_COLUMN)) {
      throw createError({
        statusCode: 400,
        message: 'No valid columns found to import. Please check column names match the expected format.'
      })
    }

    // Parse and validate rows
    const parsedRows: ParsedRow[] = []
    let editCount = 0
    let deleteCount = 0

    // Connect to tenant DB to validate meta_ids exist
    const tenantDb = useTenantDb(tenant.connectionString)

    // Collect all meta_ids from the CSV
    const csvMetaIds: string[] = []
    for (const row of csvRows) {
      const metaId = row[metaIdIndex]?.trim()
      if (metaId) {
        csvMetaIds.push(metaId)
      }
    }

    // Fetch existing users by meta_id to check which ones exist
    const existingUserIds = new Set<string>()
    if (csvMetaIds.length > 0) {
      // Query in batches to avoid query size limits
      const batchSize = 100
      for (let i = 0; i < csvMetaIds.length; i += batchSize) {
        const batch = csvMetaIds.slice(i, i + batchSize)
        // Filter to valid UUIDs only
        const validUuids = batch.filter(id =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        )

        if (validUuids.length > 0) {
          const existingUsers = await tenantDb
            .select({ id: coreUsers.meta_id })
            .from(coreUsers)

          for (const user of existingUsers) {
            existingUserIds.add(user.id)
          }
        }
      }
    }

    // Process each row
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      if (!row) continue
      const rowNumber = i + 2 // Account for 0-index and header row
      const rowErrors: string[] = []
      const rowData: Record<string, string> = {}

      // Map row values to headers
      for (let j = 0; j < normalizedHeaders.length; j++) {
        const header = normalizedHeaders[j]
        if (!header) continue
        const value = row[j] || ''
        rowData[header] = value
      }

      // Get action if present
      let action: ActionType | undefined
      if (hasActionColumn) {
        const actionValue = rowData[ACTION_COLUMN]?.toLowerCase().trim()
        if (actionValue && actionValue !== '') {
          if (!VALID_ACTIONS.includes(actionValue as ActionType)) {
            rowErrors.push(`Invalid _action value: "${actionValue}". Must be "edit" or "delete"`)
          } else {
            action = actionValue as ActionType
          }
        } else {
          // Default to edit if no action specified
          action = 'edit'
        }
      } else {
        // Default to edit if no action column
        action = 'edit'
      }

      // Validate meta_id
      const metaIdValue = rowData.meta_id?.trim()
      if (!metaIdValue) {
        rowErrors.push('meta_id is required')
      } else {
        const uuidError = validateValue(metaIdValue, 'uuid', 'meta_id')
        if (uuidError) {
          rowErrors.push(uuidError)
        } else if (!existingUserIds.has(metaIdValue)) {
          rowErrors.push(`User with meta_id "${metaIdValue}" not found in database`)
        }
      }

      // Validate data types for each column
      for (const header of normalizedHeaders) {
        if (!header || header === ACTION_COLUMN || header === 'meta_id') continue

        const columnConfig = VALID_COLUMNS[header as keyof typeof VALID_COLUMNS]
        if (!columnConfig) continue // Skip unmapped columns

        const value = rowData[header] ?? ''
        const typeError = validateValue(value, columnConfig.type, header)
        if (typeError) {
          rowErrors.push(typeError)
        }

        // Additional validation for email fields
        if (header.includes('email') && value) {
          const emailError = validateEmail(value, header)
          if (emailError) {
            rowErrors.push(emailError)
          }
        }
      }

      // Count actions
      if (rowErrors.length === 0) {
        if (action === 'delete') {
          deleteCount++
        } else {
          editCount++
        }
      }

      parsedRows.push({
        rowNumber,
        data: rowData,
        action,
        errors: rowErrors
      })
    }

    // Collect all row errors for global errors
    const rowsWithErrors = parsedRows.filter(r => r.errors.length > 0)
    if (rowsWithErrors.length > 0) {
      globalErrors.push(`${rowsWithErrors.length} row(s) have validation errors`)
    }

    // Build preview response
    const preview: ImportPreview = {
      headers: normalizedHeaders,
      rows: parsedRows.slice(0, PREVIEW_ROWS),
      totalRows: parsedRows.length,
      editCount,
      deleteCount,
      errors: globalErrors
    }

    return {
      success: rowsWithErrors.length === 0,
      preview
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Error processing import file:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to process import file'
    })
  }
})
