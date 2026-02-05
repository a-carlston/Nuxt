/**
 * RBAC Permission System Type Definitions
 *
 * Defines the permission model for role-based access control with:
 * - Cascade scopes (self → direct_reports → department → lob → division → company)
 * - Data visibility levels (basic, personal, sensitive)
 * - Tag-based permission rules
 */

// ============================================================================
// Permission Scopes
// ============================================================================

/**
 * Permission scopes in cascade order (higher includes lower)
 * company > division > lob > department > direct_reports > self
 */
export type PermissionScope =
  | 'self'
  | 'direct_reports'
  | 'department'
  | 'lob'
  | 'division'
  | 'company'

/**
 * Numeric hierarchy for scope comparison (higher = broader access)
 */
export const SCOPE_HIERARCHY: Record<PermissionScope, number> = {
  self: 1,
  direct_reports: 2,
  department: 3,
  lob: 4,
  division: 5,
  company: 6,
}

// ============================================================================
// Data Levels
// ============================================================================

/**
 * Data visibility levels for field-level access control
 */
export type DataLevel = 'basic' | 'personal' | 'sensitive'

/**
 * Numeric hierarchy for data level comparison (higher = more sensitive)
 */
export const DATA_LEVEL_HIERARCHY: Record<DataLevel, number> = {
  basic: 1,
  personal: 2,
  sensitive: 3,
}

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Resource categories in the system
 */
export type ResourceCategory =
  | 'users'
  | 'compensation'
  | 'banking'
  | 'schedules'
  | 'time'
  | 'reports'
  | 'settings'
  | 'rbac'
  | 'audit'

/**
 * Actions that can be performed on resources
 */
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage'

/**
 * Full permission code format: {resource}.{action}.{dataLevel?}.{scope?}
 * Examples:
 * - users.view.basic.self
 * - users.edit.personal.direct_reports
 * - compensation.view.company
 * - settings.manage
 */
export type PermissionCode = string

/**
 * Parsed permission structure
 */
export interface ParsedPermission {
  resource: string
  action: PermissionAction
  dataLevel?: DataLevel
  scope?: PermissionScope
}

// ============================================================================
// Role Definitions
// ============================================================================

/**
 * Role definition from the database
 */
export interface Role {
  id: string
  code: string
  name: string
  description?: string
  hierarchyLevel: number
  isSystem: boolean
  isActive: boolean
  maxSensitivityLevel?: number
}

/**
 * Permission definition from the database
 */
export interface Permission {
  id: string
  code: PermissionCode
  name: string
  category: string
  description?: string
  isSystem: boolean
}

/**
 * User role assignment with scoping
 */
export interface UserRole {
  id: string
  roleId: string
  role: Role
  scopeType: 'global' | 'location' | 'department' | 'lob' | 'division'
  scopeId?: string
  assignedAt: string
  expiresAt?: string
}

// ============================================================================
// Tag-Based Permissions
// ============================================================================

/**
 * Categories for user tags
 */
export type TagCategory = 'employment' | 'access' | 'compliance' | 'org'

/**
 * User tag definition
 */
export interface UserTag {
  id: string
  tag: string
  category: TagCategory
}

/**
 * Tag-based permission rule
 */
export interface TagPermissionRule {
  id: string
  tag: string
  targetTags?: string[]
  permissionId: string
  permissionCode: PermissionCode
  effect: 'grant' | 'deny'
  priority: number
}

// ============================================================================
// Permission Cache
// ============================================================================

/**
 * Cached user permissions for efficient checking
 */
export interface PermissionCache {
  userId: string
  loadedAt: number
  expiresAt: number

  /** User's assigned roles */
  roles: UserRole[]

  /** User's tags */
  tags: UserTag[]

  /** All granted permissions (from roles) */
  grantedPermissions: Set<PermissionCode>

  /** Tag-based grants */
  tagGrants: TagPermissionRule[]

  /** Tag-based denies (take precedence) */
  tagDenies: TagPermissionRule[]

  /** User's organizational context for scope checking */
  orgContext: OrgContext
}

/**
 * User's organizational context for scope resolution
 */
export interface OrgContext {
  userId: string
  departmentIds: string[]
  lobIds: string[]
  divisionIds: string[]
  locationIds: string[]
  directReportIds: string[]
  supervisorIds: string[]
}

// ============================================================================
// Permission Check Context
// ============================================================================

/**
 * Context for permission checking (the target user/resource)
 */
export interface PermissionCheckContext {
  /** Target user ID (when checking access to a specific user's data) */
  targetUserId?: string

  /** Target department ID */
  targetDepartmentId?: string

  /** Target LOB ID */
  targetLobId?: string

  /** Target division ID */
  targetDivisionId?: string

  /** Target location ID */
  targetLocationId?: string

  /** Target user's tags (for tag-based rules) */
  targetTags?: string[]
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  matchedPermission?: PermissionCode
  effectiveScope?: PermissionScope
  effectiveDataLevel?: DataLevel
}

// ============================================================================
// Frontend Permission State
// ============================================================================

/**
 * Frontend permission state (serializable)
 */
export interface FrontendPermissionState {
  loaded: boolean
  loading: boolean
  error?: string

  /** Simplified permission codes for client-side checking */
  permissions: PermissionCode[]

  /** Role codes for quick role checking */
  roles: string[]

  /** User tags */
  tags: string[]

  /** Organizational context */
  orgContext: OrgContext

  /** Cache metadata */
  loadedAt?: number
  expiresAt?: number
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Response from the permissions endpoint
 */
export interface PermissionsResponse {
  permissions: PermissionCode[]
  roles: Array<{ code: string; name: string; hierarchyLevel: number }>
  tags: string[]
  orgContext: OrgContext
  expiresAt: number
}

/**
 * Request to assign a role to a user
 */
export interface AssignRoleRequest {
  roleId: string
  scopeType?: 'global' | 'location' | 'department' | 'lob' | 'division'
  scopeId?: string
  expiresAt?: string
}

/**
 * Request to add a tag to a user
 */
export interface AddTagRequest {
  tag: string
  category: TagCategory
}
