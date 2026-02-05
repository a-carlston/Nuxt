/**
 * Page/Module Registry for RBAC Matrix UI
 *
 * This registry defines all pages/modules in the application along with:
 * - Required permissions for access
 * - Available actions (view, edit, create, delete)
 * - Column definitions for data tables (when applicable)
 * - Scope support for hierarchical permissions
 */

import type { DataLevel, PermissionScope } from '~/types/permissions'
import type { TableColumn } from '~/types/table'

// ============================================================================
// Types
// ============================================================================

/**
 * Available permission scopes for matrix selection
 */
export const PERMISSION_SCOPES: Array<{ value: PermissionScope | 'none'; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'self', label: 'Self' },
  { value: 'direct_reports', label: 'Direct Reports' },
  { value: 'department', label: 'Department' },
  { value: 'division', label: 'Division' },
  { value: 'company', label: 'Company' },
]

/**
 * Actions that can be performed on a page/module
 */
export type PageAction = 'view' | 'edit' | 'create' | 'delete' | 'export'

/**
 * A column definition in the registry with additional metadata
 */
export interface RegistryColumn {
  id: string
  label: string
  field: string
  dataLevel: DataLevel
  editable?: boolean
}

/**
 * A page/module definition in the registry
 */
export interface PageDefinition {
  /** Unique identifier for the page */
  id: string
  /** Display name */
  name: string
  /** Description of the page/module */
  description: string
  /** Route path pattern (without slug) */
  path: string
  /** Icon name for display */
  icon?: string
  /** Category for grouping */
  category: 'dashboard' | 'directory' | 'settings' | 'admin' | 'reports'
  /** Whether this is an admin-only page */
  adminOnly?: boolean
  /** Actions available on this page */
  actions: PageAction[]
  /** Base permission resource (e.g., 'users', 'settings') */
  permissionResource: string
  /** Whether scope-based permissions apply */
  supportsScopes: boolean
  /** Whether data level permissions apply (basic/personal/sensitive) */
  supportsDataLevels: boolean
  /** Column definitions if this page has a data table */
  columns?: RegistryColumn[]
}

// ============================================================================
// Page Registry
// ============================================================================

/**
 * Registry of all pages/modules in the application
 */
export const PAGE_REGISTRY: PageDefinition[] = [
  // Dashboard
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with overview and quick actions',
    path: '/dashboard',
    icon: 'home',
    category: 'dashboard',
    actions: ['view'],
    permissionResource: 'dashboard',
    supportsScopes: false,
    supportsDataLevels: false,
  },

  // Directory
  {
    id: 'directory',
    name: 'Employee Directory',
    description: 'View and manage employee records',
    path: '/directory',
    icon: 'users',
    category: 'directory',
    actions: ['view', 'edit', 'create', 'delete', 'export'],
    permissionResource: 'users',
    supportsScopes: true,
    supportsDataLevels: true,
    columns: [
      { id: 'status', label: 'Status', field: 'status', dataLevel: 'basic' },
      { id: 'firstName', label: 'First Name', field: 'firstName', dataLevel: 'basic', editable: true },
      { id: 'lastName', label: 'Last Name', field: 'lastName', dataLevel: 'basic', editable: true },
      { id: 'email', label: 'Personal Email', field: 'email', dataLevel: 'personal' },
      { id: 'phone', label: 'Phone', field: 'phone', dataLevel: 'personal' },
      { id: 'companyEmail', label: 'Work Email', field: 'companyEmail', dataLevel: 'basic' },
      { id: 'title', label: 'Title', field: 'title', dataLevel: 'basic', editable: true },
      { id: 'department', label: 'Department', field: 'department', dataLevel: 'basic', editable: true },
      { id: 'division', label: 'Division', field: 'division', dataLevel: 'basic', editable: true },
      { id: 'location', label: 'Location', field: 'location', dataLevel: 'basic', editable: true },
      { id: 'employeeId', label: 'Employee ID', field: 'employeeId', dataLevel: 'basic' },
      { id: 'startDate', label: 'Start Date', field: 'startDate', dataLevel: 'personal' },
      // Sensitive fields (from compensation/banking)
      { id: 'ssn', label: 'SSN', field: 'ssn', dataLevel: 'sensitive' },
      { id: 'payRate', label: 'Pay Rate', field: 'payRate', dataLevel: 'sensitive' },
      { id: 'bankAccount', label: 'Bank Account', field: 'bankAccount', dataLevel: 'sensitive' },
    ],
  },

  // Settings - Profile
  {
    id: 'settings-profile',
    name: 'Profile Settings',
    description: 'User profile and personal settings',
    path: '/settings/profile',
    icon: 'user',
    category: 'settings',
    actions: ['view', 'edit'],
    permissionResource: 'users',
    supportsScopes: true,
    supportsDataLevels: true,
  },

  // Admin - Column Settings
  {
    id: 'admin-columns',
    name: 'Column Labels',
    description: 'Customize table column display names',
    path: '/admin/settings/columns',
    icon: 'table',
    category: 'admin',
    adminOnly: true,
    actions: ['view', 'edit'],
    permissionResource: 'settings',
    supportsScopes: false,
    supportsDataLevels: false,
  },

  // Admin - Role Management
  {
    id: 'admin-roles',
    name: 'Role Management',
    description: 'Manage roles and permissions',
    path: '/admin/settings/roles',
    icon: 'shield',
    category: 'admin',
    adminOnly: true,
    actions: ['view', 'edit', 'create', 'delete'],
    permissionResource: 'rbac',
    supportsScopes: false,
    supportsDataLevels: false,
  },

  // Reports (future)
  {
    id: 'reports',
    name: 'Reports',
    description: 'Generate and view reports',
    path: '/reports',
    icon: 'chart',
    category: 'reports',
    actions: ['view', 'create', 'export'],
    permissionResource: 'reports',
    supportsScopes: false,
    supportsDataLevels: false,
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a page definition by ID
 */
export function getPageById(id: string): PageDefinition | undefined {
  return PAGE_REGISTRY.find((p) => p.id === id)
}

/**
 * Get all pages in a category
 */
export function getPagesByCategory(category: PageDefinition['category']): PageDefinition[] {
  return PAGE_REGISTRY.filter((p) => p.category === category)
}

/**
 * Get all pages that support scope-based permissions
 */
export function getScopedPages(): PageDefinition[] {
  return PAGE_REGISTRY.filter((p) => p.supportsScopes)
}

/**
 * Get all pages that have column definitions
 */
export function getPagesWithColumns(): PageDefinition[] {
  return PAGE_REGISTRY.filter((p) => p.columns && p.columns.length > 0)
}

/**
 * Get all admin pages
 */
export function getAdminPages(): PageDefinition[] {
  return PAGE_REGISTRY.filter((p) => p.adminOnly)
}

/**
 * Build the permission code for a page action
 */
export function buildPagePermission(
  page: PageDefinition,
  action: PageAction,
  dataLevel?: DataLevel,
  scope?: PermissionScope
): string {
  let code = `${page.permissionResource}.${action}`

  if (page.supportsDataLevels && dataLevel) {
    code += `.${dataLevel}`
  }

  if (page.supportsScopes && scope) {
    code += `.${scope}`
  }

  return code
}

/**
 * Get all possible permission codes for a page
 */
export function getAllPagePermissions(page: PageDefinition): string[] {
  const permissions: string[] = []
  const dataLevels: DataLevel[] = page.supportsDataLevels
    ? ['basic', 'personal', 'sensitive']
    : [undefined as unknown as DataLevel]
  const scopes: PermissionScope[] = page.supportsScopes
    ? ['self', 'direct_reports', 'department', 'division', 'company']
    : [undefined as unknown as PermissionScope]

  for (const action of page.actions) {
    for (const dataLevel of dataLevels) {
      for (const scope of scopes) {
        permissions.push(buildPagePermission(page, action, dataLevel, scope))
      }
    }
  }

  return permissions
}

/**
 * Categories for display in UI
 */
export const PAGE_CATEGORIES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'directory', label: 'Directory', icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'admin', label: 'Admin', icon: 'shield' },
  { id: 'reports', label: 'Reports', icon: 'chart' },
] as const

/**
 * Data levels with display labels
 */
export const DATA_LEVELS: Array<{ value: DataLevel; label: string; description: string }> = [
  { value: 'basic', label: 'Basic', description: 'Directory info (name, title, department)' },
  { value: 'personal', label: 'Personal', description: 'Personal contact info, emergency contacts' },
  { value: 'sensitive', label: 'Sensitive', description: 'SSN, banking, compensation' },
]

/**
 * Actions with display labels
 */
export const PAGE_ACTIONS: Array<{ value: PageAction; label: string; icon: string }> = [
  { value: 'view', label: 'View', icon: 'eye' },
  { value: 'edit', label: 'Edit', icon: 'pencil' },
  { value: 'create', label: 'Create', icon: 'plus' },
  { value: 'delete', label: 'Delete', icon: 'trash' },
  { value: 'export', label: 'Export', icon: 'download' },
]
