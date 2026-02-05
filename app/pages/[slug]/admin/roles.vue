<script setup lang="ts">
/**
 * Admin Settings - Role Management
 *
 * Two-panel layout:
 * - Left: Role list organized by groups (collapsible folders)
 * - Right: Permission editor for selected role
 *
 * Features:
 * - Role groups (folders) for organization
 * - Role tags for categorization
 * - Permission matrix editing
 */

import type { Role } from '~/types/permissions'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

// ============================================================================
// Types
// ============================================================================

interface PageConfig {
  id: string
  name: string
  resource: string
  actions: string[]
  supportsScopes: boolean
  supportsDataLevels: boolean
  parentId: string | null
  isSection?: boolean
}

interface RoleTag {
  id: string
  name: string
  color: string
}

interface RoleGroup {
  id: string
  name: string
  description?: string
  displayOrder: number
  isCollapsed: boolean
}

interface MatrixRole extends Role {
  permissionCount?: number
  groupId?: string | null
  displayOrder?: number
  tags?: RoleTag[]
}

interface MatrixData {
  roles: MatrixRole[]
  pages: PageConfig[]
  pageMatrix: Record<string, Record<string, Record<string, string | null>>>
  dataLevelMatrix: Record<string, Record<string, { scope: string | null; dataLevel: string | null }>>
  scopes: string[]
  dataLevels: string[]
}

// ============================================================================
// State
// ============================================================================

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

const { can, isSuperAdmin, hasRole, fetchPermissions } = usePermissions()
const canManage = computed(() => can('rbac.manage') || isSuperAdmin.value || hasRole('super_admin') || hasRole('admin'))

const matrixData = ref<MatrixData | null>(null)
const roles = computed(() => matrixData.value?.roles || [])
const pages = computed(() => matrixData.value?.pages || [])

// Groups and tags
const groups = ref<RoleGroup[]>([])
const tags = ref<RoleTag[]>([])
const collapsedGroups = ref<Set<string>>(new Set(['ungrouped'])) // Ungrouped collapsed by default

// Tag filter
const selectedTagFilter = ref<string | null>(null)

// Collapsed page sections in permissions table (collapsed by default)
const collapsedPageSections = ref<Set<string>>(new Set(['main', 'admin', 'reports']))

// Expanded pages in mobile view (for showing scope/data/actions)
const expandedMobilePages = ref<Set<string>>(new Set())

function toggleExpandedPage(pageId: string) {
  if (expandedMobilePages.value.has(pageId)) {
    expandedMobilePages.value.delete(pageId)
  } else {
    expandedMobilePages.value.add(pageId)
  }
}

// Filter roles by selected tag
const filteredRoles = computed(() => {
  if (!selectedTagFilter.value) return roles.value
  return roles.value.filter(role =>
    role.tags?.some(tag => tag.id === selectedTagFilter.value)
  )
})

// Organize roles by groups
const rolesByGroup = computed(() => {
  const grouped = new Map<string | null, MatrixRole[]>()

  // Initialize with null for ungrouped roles
  grouped.set(null, [])

  // Initialize groups
  for (const group of groups.value) {
    grouped.set(group.id, [])
  }

  // Assign filtered roles to groups
  for (const role of filteredRoles.value) {
    const groupId = role.groupId || null
    if (!grouped.has(groupId)) {
      grouped.set(groupId, [])
    }
    grouped.get(groupId)!.push(role)
  }

  // Sort roles within each group by displayOrder, then name
  for (const [, groupRoles] of grouped) {
    groupRoles.sort((a, b) => {
      const orderA = a.displayOrder ?? 0
      const orderB = b.displayOrder ?? 0
      if (orderA !== orderB) return orderA - orderB
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  return grouped
})

// Organize pages hierarchically
const organizedPages = computed(() => {
  const result: Array<PageConfig & { depth: number }> = []
  for (const page of pages.value) {
    if (!page.parentId) {
      result.push({ ...page, depth: 0 })
      for (const child of pages.value) {
        if (child.parentId === page.id) {
          result.push({ ...child, depth: 1 })
        }
      }
    }
  }
  return result
})

// Selected role
const selectedRoleId = ref<string | null>(null)
const selectedRole = computed(() => roles.value.find(r => r.id === selectedRoleId.value) || null)

// Check if selected role is super_admin (has all permissions, cannot be edited)
const isSuperAdminRole = computed(() => selectedRole.value?.code === 'super_admin')

// Local state for editing permissions
const localPermissions = ref<Record<string, { scope: string; dataLevel: string; actions: Record<string, boolean> }>>({})
const originalPermissions = ref<Record<string, { scope: string; dataLevel: string; actions: Record<string, boolean> }>>({})

const loading = ref(false)
const saving = ref(false)

// Mobile view state (show editor panel on mobile when role is selected)
const showMobileEditor = ref(false)

function goBackToList() {
  showMobileEditor.value = false
}

// Role modal
const showRoleModal = ref(false)
const editingRole = ref<MatrixRole | null>(null)
const roleForm = ref({
  code: '',
  name: '',
  description: '',
  isActive: true,
  groupId: '' as string,
  tagIds: [] as string[]
})
const savingRole = ref(false)

// Tag modal
const showTagModal = ref(false)
const editingTag = ref<RoleTag | null>(null)
const tagForm = ref({ name: '', color: '#6366f1' })
const savingTag = ref(false)

// Group modal
const showGroupModal = ref(false)
const editingGroup = ref<RoleGroup | null>(null)
const groupForm = ref({ name: '', description: '' })
const savingGroup = ref(false)

const notification = ref<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

// Options
const scopeOptions = [
  { label: 'Self', value: 'self' },
  { label: 'Direct Reports', value: 'direct_reports' },
  { label: 'Department', value: 'department' },
  { label: 'Division', value: 'division' },
  { label: 'Company', value: 'company' },
]

const dataLevelOptions = [
  { label: 'Basic', value: 'basic' },
  { label: 'Personal', value: 'personal' },
  { label: 'Company', value: 'company' },
  { label: 'Sensitive', value: 'sensitive' },
]

// Standard actions for all pages (View, Edit, Create, Delete)
const standardActions = ['view', 'edit', 'create', 'delete'] as const

// Master defaults (applies to all pages)
const masterScope = ref('self')
const masterDataLevel = ref('basic')

const tagColorOptions = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Gray', value: '#6b7280' },
]

// Check for unsaved changes (super_admin never has unsaved changes - it's read-only)
const hasUnsavedChanges = computed(() => {
  if (isSuperAdminRole.value) return false
  return JSON.stringify(localPermissions.value) !== JSON.stringify(originalPermissions.value)
})

// Permission summary for the selected role
const permissionSummary = computed(() => {
  if (!selectedRoleId.value || !localPermissions.value) {
    return { scopes: {}, dataLevels: {}, total: 0, enabled: 0 }
  }

  const scopes: Record<string, number> = {}
  const dataLevels: Record<string, number> = {}
  let total = 0
  let enabled = 0

  for (const [pageId, perm] of Object.entries(localPermissions.value)) {
    const page = pages.value.find(p => p.id === pageId)
    if (!page || page.isSection) continue

    total++

    // Count enabled permissions by scope
    const hasAnyAction = Object.values(perm.actions).some(v => v)
    if (hasAnyAction) {
      enabled++
      const scope = perm.scope === 'none' ? 'disabled' : perm.scope
      scopes[scope] = (scopes[scope] || 0) + 1

      // Count by data level if applicable
      if (page.supportsDataLevels && perm.dataLevel) {
        dataLevels[perm.dataLevel] = (dataLevels[perm.dataLevel] || 0) + 1
      }
    }
  }

  return { scopes, dataLevels, total, enabled }
})

// ============================================================================
// API
// ============================================================================

async function fetchMatrix() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: MatrixData }>(`/api/tenant/${tenantSlug.value}/rbac/matrix`)
    if (res.success) {
      matrixData.value = res.data
      if (!selectedRoleId.value && res.data.roles.length > 0) {
        selectRole(res.data.roles[0]!.id)
      } else if (selectedRoleId.value) {
        loadRolePermissions(selectedRoleId.value)
      }
    }
  } catch {
    notify('error', 'Error', 'Failed to load permissions')
  } finally {
    loading.value = false
  }
}

async function fetchGroupsAndTags() {
  try {
    const [groupsRes, tagsRes] = await Promise.all([
      $fetch<{ success: boolean; data: RoleGroup[] }>(`/api/tenant/${tenantSlug.value}/rbac/role-groups`),
      $fetch<{ success: boolean; data: RoleTag[] }>(`/api/tenant/${tenantSlug.value}/rbac/role-tags`)
    ])

    if (groupsRes.success) {
      groups.value = groupsRes.data
      // Initialize collapsed state from server
      for (const group of groupsRes.data) {
        if (group.isCollapsed) {
          collapsedGroups.value.add(group.id)
        }
      }
    }

    if (tagsRes.success) {
      tags.value = tagsRes.data
    }
  } catch (e) {
    console.error('Failed to fetch groups/tags:', e)
  }
}

function selectRole(roleId: string) {
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Discard them?')) return
  }
  selectedRoleId.value = roleId
  loadRolePermissions(roleId)
  showMobileEditor.value = true // Show editor on mobile when role selected
}

function loadRolePermissions(roleId: string) {
  if (!matrixData.value) return

  const perms: Record<string, { scope: string; dataLevel: string; actions: Record<string, boolean> }> = {}

  // Check if this is super_admin role - they get ALL permissions at maximum level
  const role = roles.value.find(r => r.id === roleId)
  const isSuperAdmin = role?.code === 'super_admin'

  for (const page of matrixData.value.pages) {
    if (page.isSection) continue

    // Super admin gets maximum permissions for everything
    if (isSuperAdmin) {
      const actions: Record<string, boolean> = {}
      // Always use standard actions for consistency
      for (const action of standardActions) {
        actions[action] = true
      }
      perms[page.id] = {
        scope: 'company',
        dataLevel: 'sensitive',
        actions
      }
      continue
    }

    const pageData = matrixData.value.pageMatrix[roleId]?.[page.id]
    const dataLevelData = matrixData.value.dataLevelMatrix[roleId]

    // Check if any actions are enabled (check both page.actions and standardActions)
    const hasAnyAction = standardActions.some(a => pageData?.[a])

    // Get scope from existing permissions or default to master
    let scope = masterScope.value
    if (hasAnyAction) {
      for (const action of standardActions) {
        if (pageData?.[action] && pageData[action] !== 'granted') {
          scope = pageData[action]
          break
        }
      }
    }

    // Get data level from existing permissions or default to master
    let dataLevel = masterDataLevel.value
    if (hasAnyAction && dataLevelData?.view?.dataLevel) {
      dataLevel = dataLevelData.view.dataLevel
    }

    // Always use standard actions for consistency (View, Edit, Create, Delete)
    const actions: Record<string, boolean> = {}
    for (const action of standardActions) {
      actions[action] = !!pageData?.[action]
    }

    perms[page.id] = { scope, dataLevel, actions }
  }

  localPermissions.value = JSON.parse(JSON.stringify(perms))
  originalPermissions.value = JSON.parse(JSON.stringify(perms))
}

async function saveChanges() {
  if (!selectedRoleId.value || !matrixData.value) return

  saving.value = true
  try {
    for (const page of matrixData.value.pages) {
      if (page.isSection) continue

      const perm = localPermissions.value[page.id]
      if (!perm) continue

      const original = originalPermissions.value[page.id]
      if (JSON.stringify(perm) === JSON.stringify(original)) continue

      // Always save using standard actions (View, Edit, Create, Delete)
      for (const action of standardActions) {
        const isEnabled = perm.actions[action]

        await $fetch(`/api/tenant/${tenantSlug.value}/rbac/matrix`, {
          method: 'PUT',
          body: {
            roleId: selectedRoleId.value,
            pageId: page.id,
            action,
            scope: isEnabled ? perm.scope : null,
            dataLevel: isEnabled ? perm.dataLevel : null
          }
        })
      }
    }

    notify('success', 'Saved', 'Permissions updated')
    await fetchMatrix()
  } catch {
    notify('error', 'Error', 'Failed to save permissions')
  } finally {
    saving.value = false
  }
}

function discardChanges() {
  if (selectedRoleId.value) {
    loadRolePermissions(selectedRoleId.value)
  }
}

// Apply master scope to all pages
function applyMasterScope(newScope: string | number | null | undefined) {
  if (typeof newScope !== 'string') return
  for (const pageId of Object.keys(localPermissions.value)) {
    localPermissions.value[pageId]!.scope = newScope
  }
}

// Apply master data level to all pages
function applyMasterDataLevel(newDataLevel: string | number | null | undefined) {
  if (typeof newDataLevel !== 'string') return
  for (const pageId of Object.keys(localPermissions.value)) {
    localPermissions.value[pageId]!.dataLevel = newDataLevel
  }
}

// Check if all actions are enabled for a page
function areAllActionsEnabled(pageId: string, actions: string[]): boolean {
  const perm = localPermissions.value[pageId]
  if (!perm) return false
  return actions.every(action => perm.actions[action])
}

// Check if some (but not all) actions are enabled for a page
function areSomeActionsEnabled(pageId: string, actions: string[]): boolean {
  const perm = localPermissions.value[pageId]
  if (!perm) return false
  const enabledCount = actions.filter(action => perm.actions[action]).length
  return enabledCount > 0 && enabledCount < actions.length
}

// Toggle all actions for a page
function toggleAllActions(pageId: string, actions: string[], event: Event) {
  const perm = localPermissions.value[pageId]
  if (!perm) return
  const target = event.target as HTMLInputElement
  const newValue = target.checked
  for (const action of actions) {
    perm.actions[action] = newValue
  }
}

async function saveRole() {
  savingRole.value = true
  try {
    const groupId = roleForm.value.groupId || null // Convert empty string to null
    if (editingRole.value) {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/roles/${editingRole.value.id}`, {
        method: 'PUT',
        body: {
          name: roleForm.value.name.trim(),
          description: roleForm.value.description.trim() || undefined,
          isActive: roleForm.value.isActive,
          groupId
        }
      })
      // Update tags separately
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/roles/${editingRole.value.id}/tags`, {
        method: 'PUT',
        body: { tagIds: roleForm.value.tagIds }
      })
    } else {
      const res = await $fetch<{ success: boolean; data: { id: string } }>(`/api/tenant/${tenantSlug.value}/rbac/roles`, {
        method: 'POST',
        body: {
          code: roleForm.value.code.trim().toLowerCase(),
          name: roleForm.value.name.trim(),
          description: roleForm.value.description.trim() || undefined,
          isActive: roleForm.value.isActive
        }
      })
      // Assign to group and tags if specified
      if (res.success && res.data.id) {
        if (groupId || roleForm.value.tagIds.length > 0) {
          await $fetch(`/api/tenant/${tenantSlug.value}/rbac/roles/${res.data.id}`, {
            method: 'PUT',
            body: { groupId }
          })
          if (roleForm.value.tagIds.length > 0) {
            await $fetch(`/api/tenant/${tenantSlug.value}/rbac/roles/${res.data.id}/tags`, {
              method: 'PUT',
              body: { tagIds: roleForm.value.tagIds }
            })
          }
        }
      }
    }
    notify('success', 'Saved', `Role "${roleForm.value.name}" saved`)
    showRoleModal.value = false
    await fetchMatrix()
  } catch (e: unknown) {
    notify('error', 'Error', e instanceof Error ? e.message : 'Failed to save')
  } finally {
    savingRole.value = false
  }
}

async function deleteRole(role: MatrixRole) {
  if (role.isSystem || !confirm(`Delete "${role.name}"?`)) return
  try {
    await $fetch(`/api/tenant/${tenantSlug.value}/rbac/roles/${role.id}`, { method: 'DELETE' })
    notify('success', 'Deleted', `Role "${role.name}" deleted`)
    if (selectedRoleId.value === role.id) {
      selectedRoleId.value = null
    }
    await fetchMatrix()
  } catch {
    notify('error', 'Error', 'Failed to delete')
  }
}

// Tag Management
async function saveTag() {
  savingTag.value = true
  try {
    if (editingTag.value) {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-tags/${editingTag.value.id}`, {
        method: 'PUT',
        body: {
          name: tagForm.value.name.trim(),
          color: tagForm.value.color
        }
      })
    } else {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-tags`, {
        method: 'POST',
        body: {
          name: tagForm.value.name.trim(),
          color: tagForm.value.color
        }
      })
    }
    notify('success', 'Saved', `Tag "${tagForm.value.name}" saved`)
    showTagModal.value = false
    await fetchGroupsAndTags()
    await fetchMatrix()
  } catch (e: unknown) {
    notify('error', 'Error', e instanceof Error ? e.message : 'Failed to save tag')
  } finally {
    savingTag.value = false
  }
}

async function deleteTag(tag: RoleTag) {
  if (!confirm(`Delete tag "${tag.name}"? This will remove it from all roles.`)) return
  try {
    await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-tags/${tag.id}`, { method: 'DELETE' })
    notify('success', 'Deleted', `Tag "${tag.name}" deleted`)
    await fetchGroupsAndTags()
    await fetchMatrix()
  } catch {
    notify('error', 'Error', 'Failed to delete tag')
  }
}

// Group Management
async function saveGroup() {
  savingGroup.value = true
  try {
    if (editingGroup.value) {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-groups/${editingGroup.value.id}`, {
        method: 'PUT',
        body: {
          name: groupForm.value.name.trim(),
          description: groupForm.value.description.trim() || undefined
        }
      })
    } else {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-groups`, {
        method: 'POST',
        body: {
          name: groupForm.value.name.trim(),
          description: groupForm.value.description.trim() || undefined
        }
      })
    }
    notify('success', 'Saved', `Group "${groupForm.value.name}" saved`)
    showGroupModal.value = false
    await fetchGroupsAndTags()
  } catch (e: unknown) {
    notify('error', 'Error', e instanceof Error ? e.message : 'Failed to save group')
  } finally {
    savingGroup.value = false
  }
}

async function deleteGroup(group: RoleGroup) {
  if (!confirm(`Delete group "${group.name}"? Roles in this group will become ungrouped.`)) return
  try {
    await $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-groups/${group.id}`, { method: 'DELETE' })
    notify('success', 'Deleted', `Group "${group.name}" deleted`)
    await fetchGroupsAndTags()
    await fetchMatrix()
  } catch {
    notify('error', 'Error', 'Failed to delete group')
  }
}

function toggleGroup(groupId: string) {
  if (collapsedGroups.value.has(groupId)) {
    collapsedGroups.value.delete(groupId)
  } else {
    collapsedGroups.value.add(groupId)
  }
  // Persist collapse state to server
  $fetch(`/api/tenant/${tenantSlug.value}/rbac/role-groups/${groupId}`, {
    method: 'PUT',
    body: { isCollapsed: collapsedGroups.value.has(groupId) }
  }).catch(() => {})
}

// ============================================================================
// Helpers
// ============================================================================

function openCreateModal() {
  editingRole.value = null
  roleForm.value = { code: '', name: '', description: '', isActive: true, groupId: '', tagIds: [] }
  showRoleModal.value = true
}

function openEditModal(role: MatrixRole) {
  editingRole.value = role
  roleForm.value = {
    code: role.code,
    name: role.name,
    description: role.description || '',
    isActive: role.isActive,
    groupId: role.groupId ?? '',
    tagIds: role.tags?.map(t => t.id) ?? []
  }
  showRoleModal.value = true
}

function openCreateTagModal() {
  editingTag.value = null
  tagForm.value = { name: '', color: '#6366f1' }
  showTagModal.value = true
}

function openEditTagModal(tag: RoleTag) {
  editingTag.value = tag
  tagForm.value = { name: tag.name, color: tag.color }
  showTagModal.value = true
}

function openCreateGroupModal() {
  editingGroup.value = null
  groupForm.value = { name: '', description: '' }
  showGroupModal.value = true
}

function openEditGroupModal(group: RoleGroup) {
  editingGroup.value = group
  groupForm.value = { name: group.name, description: group.description || '' }
  showGroupModal.value = true
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    view: 'View',
    edit: 'Edit',
    create: 'Create',
    delete: 'Delete',
    manage: 'Manage',
    export: 'Export'
  }
  return map[action] || action.charAt(0).toUpperCase() + action.slice(1)
}

function togglePageSection(sectionId: string) {
  if (collapsedPageSections.value.has(sectionId)) {
    collapsedPageSections.value.delete(sectionId)
  } else {
    collapsedPageSections.value.add(sectionId)
  }
}

function isPageVisible(page: { parentId: string | null; isSection?: boolean }): boolean {
  if (page.isSection) return true
  if (!page.parentId) return true
  return !collapsedPageSections.value.has(page.parentId)
}

function notify(type: 'success' | 'error', title: string, message: string) {
  notification.value = { type, title, message }
  setTimeout(() => notification.value = null, 3000)
}

onMounted(async () => {
  await fetchPermissions()
  await Promise.all([fetchMatrix(), fetchGroupsAndTags()])
})
</script>

<template>
  <div class="h-full">
    <!-- Loading -->
    <template v-if="loading">
      <NeuCard variant="flat" padding="lg">
        <div class="flex items-center justify-center py-12">
          <div class="w-8 h-8 border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] rounded-full animate-spin" />
        </div>
      </NeuCard>
    </template>

    <!-- Two Panel Layout (responsive) -->
    <template v-else>
      <div class="flex flex-col lg:flex-row gap-2 sm:gap-4 h-full">
        <!-- Left Panel: Role List with Groups -->
        <div
          class="w-full lg:w-72 flex-shrink-0 flex-1 lg:flex-none lg:h-full min-h-0"
          :class="{ 'hidden lg:block': showMobileEditor }"
        >
          <NeuCard variant="flat" padding="none" class="h-full overflow-hidden flex flex-col">
            <!-- Header with actions -->
            <div class="p-2 sm:p-3 border-b border-[var(--neu-shadow-dark)]/10">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-xs sm:text-sm font-semibold text-[var(--neu-text-muted)] uppercase tracking-wide">Roles</h2>
                <PermissionGate permission="rbac.manage">
                  <div class="flex items-center gap-0.5 sm:gap-1">
                    <button
                      class="p-1.5 sm:p-1 text-[var(--neu-text-muted)] hover:text-[var(--neu-primary)] transition-colors"
                      title="Add Group"
                      @click="openCreateGroupModal"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </button>
                    <button
                      class="p-1.5 sm:p-1 text-[var(--neu-text-muted)] hover:text-[var(--neu-primary)] transition-colors"
                      title="Add Tag"
                      @click="openCreateTagModal"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </button>
                    <button
                      class="p-1.5 sm:p-1 text-[var(--neu-primary)] hover:text-[var(--neu-primary)]/80 transition-colors"
                      title="Add Role"
                      @click="openCreateModal"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </PermissionGate>
              </div>

              <!-- Tag filter -->
              <div class="flex flex-wrap items-center gap-1">
                <span class="text-xs text-[var(--neu-text-muted)] mr-1 hidden sm:inline">Filter:</span>
                <button
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
                  :class="selectedTagFilter === null
                    ? 'bg-[var(--neu-primary)] text-white'
                    : 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text-muted)] hover:bg-[var(--neu-bg-secondary)]/80'"
                  @click="selectedTagFilter = null"
                >
                  All
                </button>
                <template v-if="tags.length > 0">
                  <button
                    v-for="tag in tags"
                    :key="tag.id"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-all"
                    :class="selectedTagFilter === tag.id ? '' : 'hover:opacity-80'"
                    :style="{
                      backgroundColor: tag.color + (selectedTagFilter === tag.id ? '40' : '20'),
                      color: tag.color,
                      boxShadow: selectedTagFilter === tag.id ? `0 0 0 2px var(--neu-bg), 0 0 0 4px ${tag.color}` : undefined
                    }"
                    @click="selectedTagFilter = selectedTagFilter === tag.id ? null : tag.id"
                    :title="`Filter by: ${tag.name}`"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
                    <span class="hidden sm:inline">{{ tag.name }}</span>
                  </button>
                </template>
                <span v-else class="text-xs text-[var(--neu-text-muted)] italic hidden sm:inline">No tags yet</span>
              </div>
            </div>

            <!-- Role list organized by groups -->
            <div class="flex-1 overflow-y-auto py-2 pl-2">
              <!-- Groups -->
              <template v-for="group in groups" :key="group.id">
                <!-- Group header -->
                <div class="flex items-center justify-between pr-2 mb-1">
                  <button
                    class="flex items-center gap-1.5 text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wide hover:text-[var(--neu-text)] transition-colors py-1"
                    @click="toggleGroup(group.id)"
                  >
                    <svg
                      class="w-3.5 h-3.5 transition-transform"
                      :class="{ '-rotate-90': collapsedGroups.has(group.id) }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span class="truncate max-w-[120px] sm:max-w-none">{{ group.name }}</span>
                    <span class="text-[var(--neu-text-muted)]/60">({{ rolesByGroup.get(group.id)?.length || 0 }})</span>
                  </button>
                  <PermissionGate permission="rbac.manage">
                    <NeuDropdown :close-on-click="true" placement="bottom-end">
                      <template #trigger>
                        <button class="p-0.5 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                          </svg>
                        </button>
                      </template>
                      <template #default="{ close }">
                        <div class="py-1">
                          <button class="w-full px-3 py-1.5 text-left text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]" @click="openEditGroupModal(group); close()">
                            Edit Group
                          </button>
                          <button class="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-[var(--neu-bg-secondary)]" @click="deleteGroup(group); close()">
                            Delete Group
                          </button>
                        </div>
                      </template>
                    </NeuDropdown>
                  </PermissionGate>
                </div>

                <!-- Group roles -->
                <div v-if="!collapsedGroups.has(group.id)" class="mb-3">
                  <button
                    v-for="role in rolesByGroup.get(group.id)"
                    :key="role.id"
                    class="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-left transition-all mb-1 ml-2 sm:ml-4"
                    :class="[
                      selectedRoleId === role.id
                        ? 'bg-[var(--neu-bg-secondary)] text-[var(--neu-primary)] rounded-l-lg shadow-[inset_3px_3px_6px_var(--neu-shadow-dark),inset_-1px_-1px_4px_var(--neu-shadow-light)]'
                        : 'text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]/30 rounded-lg mr-2'
                    ]"
                    @click="selectRole(role.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium text-sm truncate">{{ role.name }}</span>
                      <NeuBadge v-if="role.isSystem" variant="default" size="sm">System</NeuBadge>
                    </div>
                    <div v-if="role.tags && role.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="tag in role.tags"
                        :key="tag.id"
                        class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                        :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                      >
                        <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: tag.color }" />
                        {{ tag.name }}
                      </span>
                    </div>
                  </button>

                  <div v-if="!rolesByGroup.get(group.id)?.length" class="text-xs text-[var(--neu-text-muted)] italic ml-2 sm:ml-4 px-2 sm:px-3 py-2">
                    No roles in this group
                  </div>
                </div>
              </template>

              <!-- Ungrouped roles -->
              <div v-if="rolesByGroup.get(null)?.length">
                <!-- Ungrouped header (collapsible) -->
                <div class="flex items-center justify-between pr-2 mb-1">
                  <button
                    class="flex items-center gap-1.5 text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wide hover:text-[var(--neu-text)] transition-colors py-1"
                    @click="toggleGroup('ungrouped')"
                  >
                    <svg
                      class="w-3.5 h-3.5 transition-transform"
                      :class="{ '-rotate-90': collapsedGroups.has('ungrouped') }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span class="hidden sm:inline">Ungrouped</span>
                    <span class="sm:hidden">Other</span>
                    <span class="text-[var(--neu-text-muted)]/60">({{ rolesByGroup.get(null)?.length || 0 }})</span>
                  </button>
                </div>

                <!-- Ungrouped roles list (collapsible) -->
                <div v-if="!collapsedGroups.has('ungrouped')">
                  <button
                    v-for="role in rolesByGroup.get(null)"
                    :key="role.id"
                    class="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-left transition-all mb-1"
                    :class="[
                      selectedRoleId === role.id
                        ? 'bg-[var(--neu-bg-secondary)] text-[var(--neu-primary)] rounded-l-lg shadow-[inset_3px_3px_6px_var(--neu-shadow-dark),inset_-1px_-1px_4px_var(--neu-shadow-light)]'
                        : 'text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]/30 rounded-lg mr-2'
                    ]"
                    @click="selectRole(role.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium text-sm truncate">{{ role.name }}</span>
                      <NeuBadge v-if="role.isSystem" variant="default" size="sm">System</NeuBadge>
                    </div>
                    <div v-if="role.tags && role.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="tag in role.tags"
                        :key="tag.id"
                        class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                        :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                      >
                        <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: tag.color }" />
                        {{ tag.name }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Empty state when no groups and no ungrouped roles -->
              <div v-if="groups.length === 0 && !rolesByGroup.get(null)?.length" class="text-center py-8 text-[var(--neu-text-muted)]">
                <p class="text-sm">No roles yet</p>
                <PermissionGate permission="rbac.manage">
                  <button class="mt-2 text-[var(--neu-primary)] text-sm hover:underline" @click="openCreateModal">
                    Create your first role
                  </button>
                </PermissionGate>
              </div>
            </div>
          </NeuCard>
        </div>

        <!-- Right Panel: Permission Editor -->
        <div
          class="flex-1 min-w-0 min-h-0 lg:h-full flex flex-col"
          :class="{ 'hidden lg:flex': !showMobileEditor }"
        >
          <NeuCard variant="flat" padding="none" class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <template v-if="selectedRole">
              <!-- Role Header -->
              <div class="p-3 sm:p-4 border-b border-[var(--neu-shadow-dark)]/10 flex items-start sm:items-center justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 sm:gap-3">
                    <!-- Mobile back button -->
                    <button
                      class="lg:hidden p-1 -ml-1 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] flex-shrink-0"
                      @click="goBackToList"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 class="text-base sm:text-lg font-semibold text-[var(--neu-text)] truncate">{{ selectedRole.name }}</h2>
                    <NeuBadge v-if="selectedRole.isSystem" variant="default" size="sm" class="flex-shrink-0">System</NeuBadge>
                  </div>
                  <p v-if="selectedRole.description" class="text-xs sm:text-sm text-[var(--neu-text-muted)] mt-1 line-clamp-2 lg:line-clamp-none">
                    {{ selectedRole.description }}
                  </p>
                  <div v-if="selectedRole.tags && selectedRole.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                    <span
                      v-for="tag in selectedRole.tags"
                      :key="tag.id"
                      class="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-xs"
                      :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
                      {{ tag.name }}
                    </span>
                  </div>
                  <!-- Super Admin notice -->
                  <div v-if="isSuperAdminRole" class="mt-2 flex items-start sm:items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <svg class="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="leading-tight">Super Admin has full access. Permissions cannot be modified.</span>
                  </div>
                </div>
                <PermissionGate permission="rbac.manage">
                  <NeuDropdown :close-on-click="true">
                    <template #trigger>
                      <NeuButton variant="ghost" size="sm">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </NeuButton>
                    </template>
                    <template #default="{ close }">
                      <div class="py-1">
                        <button class="w-full px-4 py-2 text-left text-sm text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]" @click="openEditModal(selectedRole); close()">
                          Edit Role
                        </button>
                        <button v-if="!selectedRole.isSystem" class="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-[var(--neu-bg-secondary)]" @click="deleteRole(selectedRole); close()">
                          Delete Role
                        </button>
                      </div>
                    </template>
                  </NeuDropdown>
                </PermissionGate>
              </div>

              <!-- Permission Summary -->
              <div class="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 border-b border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/20">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6">
                  <!-- Scope Summary -->
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span class="text-xs font-semibold text-[var(--neu-text-muted)] uppercase">Scope:</span>
                    <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs">
                      <span v-if="permissionSummary.scopes.company" class="px-1.5 sm:px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">
                        Company {{ permissionSummary.scopes.company }}
                      </span>
                      <span v-if="permissionSummary.scopes.division" class="px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400">
                        Division {{ permissionSummary.scopes.division }}
                      </span>
                      <span v-if="permissionSummary.scopes.department" class="px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                        Dept {{ permissionSummary.scopes.department }}
                      </span>
                      <span v-if="permissionSummary.scopes.direct_reports" class="px-1.5 sm:px-2 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-400">
                        Direct {{ permissionSummary.scopes.direct_reports }}
                      </span>
                      <span v-if="permissionSummary.scopes.self" class="px-1.5 sm:px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400">
                        Self {{ permissionSummary.scopes.self }}
                      </span>
                      <span v-if="permissionSummary.scopes.granted" class="px-1.5 sm:px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-400">
                        Granted {{ permissionSummary.scopes.granted }}
                      </span>
                      <span v-if="permissionSummary.enabled === 0" class="text-[var(--neu-text-muted)]">None</span>
                    </div>
                  </div>
                  <!-- Data Level Summary -->
                  <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span class="text-xs font-semibold text-[var(--neu-text-muted)] uppercase">Data:</span>
                    <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs">
                      <span v-if="permissionSummary.dataLevels.sensitive" class="px-1.5 sm:px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400">
                        Sensitive {{ permissionSummary.dataLevels.sensitive }}
                      </span>
                      <span v-if="permissionSummary.dataLevels.company" class="px-1.5 sm:px-2 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-400">
                        Company {{ permissionSummary.dataLevels.company }}
                      </span>
                      <span v-if="permissionSummary.dataLevels.personal" class="px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400">
                        Personal {{ permissionSummary.dataLevels.personal }}
                      </span>
                      <span v-if="permissionSummary.dataLevels.basic" class="px-1.5 sm:px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">
                        Basic {{ permissionSummary.dataLevels.basic }}
                      </span>
                      <span v-if="Object.keys(permissionSummary.dataLevels).length === 0" class="text-[var(--neu-text-muted)]">-</span>
                    </div>
                  </div>
                  <!-- Total -->
                  <div class="text-xs text-[var(--neu-text-muted)]">
                    {{ permissionSummary.enabled }}/{{ permissionSummary.total }} enabled
                  </div>
                </div>
              </div>

              <!-- Master Defaults -->
              <div v-if="!isSuperAdminRole" class="px-3 sm:px-4 py-2 sm:py-3 border-b border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/30">
                <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <span class="text-sm font-medium text-[var(--neu-text)]">Default Settings:</span>
                  <div class="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-[var(--neu-text-muted)]">Scope</span>
                      <NeuSelect
                        v-model="masterScope"
                        :options="scopeOptions"
                        :disabled="!canManage"
                        size="sm"
                        @update:modelValue="applyMasterScope"
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-[var(--neu-text-muted)]">Data</span>
                      <NeuSelect
                        v-model="masterDataLevel"
                        :options="dataLevelOptions"
                        :disabled="!canManage"
                        size="sm"
                        @update:modelValue="applyMasterDataLevel"
                      />
                    </div>
                  </div>
                  <span class="text-xs text-[var(--neu-text-muted)] hidden sm:inline">(Changes apply to all pages below)</span>
                </div>
              </div>

              <!-- Permissions Section -->
              <div class="flex-1 overflow-auto p-2 sm:p-4">
                <!-- Mobile/Tablet Compact List View (below lg breakpoint) -->
                <div class="lg:hidden">
                  <template v-for="page in organizedPages" :key="`mobile-${page.id}`">
                    <!-- Section Header -->
                    <button
                      v-if="page.isSection"
                      class="w-full flex items-center gap-2 px-2 py-2 mt-2 first:mt-0 text-left"
                      @click="togglePageSection(page.id)"
                    >
                      <svg
                        class="w-4 h-4 text-[var(--neu-text-muted)] transition-transform"
                        :class="{ '-rotate-90': collapsedPageSections.has(page.id) }"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span class="text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wide">{{ page.name }}</span>
                      <div class="flex-1 h-px bg-[var(--neu-shadow-dark)]/10 ml-2" />
                    </button>

                    <!-- Page Row (expandable) -->
                    <div
                      v-else-if="localPermissions[page.id] && isPageVisible(page)"
                      class="border-b border-[var(--neu-shadow-dark)]/5 last:border-b-0"
                    >
                      <!-- Collapsed Row -->
                      <button
                        class="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[var(--neu-bg-secondary)]/30 transition-colors"
                        @click="toggleExpandedPage(page.id)"
                      >
                        <span class="flex-1 text-sm text-[var(--neu-text)]">{{ page.name }}</span>
                        <!-- Action indicators (V E C D) -->
                        <div class="flex items-center gap-1">
                          <span
                            v-for="action in standardActions"
                            :key="action"
                            class="w-5 h-5 rounded text-[10px] font-medium flex items-center justify-center"
                            :class="localPermissions[page.id]!.actions[action]
                              ? 'bg-[var(--neu-primary)]/20 text-[var(--neu-primary)]'
                              : 'bg-[var(--neu-shadow-dark)]/10 text-[var(--neu-text-muted)]/50'"
                          >
                            {{ action.charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <svg
                          class="w-4 h-4 text-[var(--neu-text-muted)] transition-transform"
                          :class="{ 'rotate-180': expandedMobilePages.has(page.id) }"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <!-- Expanded Content -->
                      <div
                        v-if="expandedMobilePages.has(page.id)"
                        class="pl-3 pr-5 py-4 bg-[var(--neu-bg-secondary)]/20 border-t border-[var(--neu-shadow-dark)]/10"
                      >
                        <!-- Mobile: stacked, Wide: single row -->
                        <div class="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-4 sm:gap-6 sm:items-end">
                          <!-- Scope -->
                          <div class="sm:w-28">
                            <label class="text-[10px] text-[var(--neu-text-muted)] uppercase tracking-wide mb-1.5 block">Scope</label>
                            <NeuSelect
                              v-model="localPermissions[page.id]!.scope"
                              :options="scopeOptions"
                              :disabled="!canManage || isSuperAdminRole"
                              size="sm"
                            />
                          </div>

                          <!-- Data Level -->
                          <div class="sm:w-28">
                            <label class="text-[10px] text-[var(--neu-text-muted)] uppercase tracking-wide mb-1.5 block">Data</label>
                            <NeuSelect
                              v-model="localPermissions[page.id]!.dataLevel"
                              :options="dataLevelOptions"
                              :disabled="!canManage || isSuperAdminRole"
                              size="sm"
                            />
                          </div>

                          <!-- Actions (2 per row) -->
                          <div>
                            <label class="text-[10px] text-[var(--neu-text-muted)] uppercase tracking-wide mb-1.5 block">Actions</label>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                              <NeuCheckbox
                                v-for="action in standardActions"
                                :key="action"
                                v-model="localPermissions[page.id]!.actions[action]"
                                :label="getActionLabel(action)"
                                :disabled="!canManage || isSuperAdminRole"
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Desktop Table View (lg and above) -->
                <div class="hidden lg:block">
                  <table class="w-full">
                    <thead>
                      <tr class="text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase tracking-wide">
                        <th class="py-3 pr-4 pl-6 sticky left-0 bg-[var(--neu-bg)] z-10 border-r border-[var(--neu-shadow-dark)]/10">Page</th>
                        <th class="py-3 px-4 w-40">Scope</th>
                        <th class="py-3 px-4 w-40">Data Level</th>
                        <th class="py-3 pl-4 pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--neu-shadow-dark)]/5">
                      <template v-for="page in organizedPages" :key="`desktop-${page.id}`">
                        <!-- Section Header (collapsible) -->
                        <tr v-if="page.isSection" class="bg-[var(--neu-bg-secondary)]/50">
                          <td class="py-3 pl-2 pr-4 sticky left-0 bg-[var(--neu-bg-secondary)]/50 z-10 border-r border-[var(--neu-shadow-dark)]/10">
                            <button
                              class="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                              :aria-expanded="!collapsedPageSections.has(page.id)"
                              :aria-controls="`desktop-section-${page.id}`"
                              @click="togglePageSection(page.id)"
                            >
                              <svg
                                class="w-4 h-4 text-[var(--neu-text-muted)] transition-transform flex-shrink-0"
                                :class="{ '-rotate-90': collapsedPageSections.has(page.id) }"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                              <span class="font-semibold text-[var(--neu-text)] whitespace-nowrap">{{ page.name }}</span>
                              <span class="text-xs text-[var(--neu-text-muted)]">
                                ({{ organizedPages.filter(p => p.parentId === page.id).length }})
                              </span>
                            </button>
                          </td>
                          <td :colspan="3" class="py-3"></td>
                        </tr>

                        <!-- Sub-page Row (only visible when section expanded) -->
                        <tr
                          v-else-if="localPermissions[page.id] && isPageVisible(page)"
                          :id="`desktop-section-${page.parentId}`"
                        >
                          <td class="py-2 pr-4 pl-6 sticky left-0 bg-[var(--neu-bg)] z-10 border-r border-[var(--neu-shadow-dark)]/10">
                            <span class="text-sm text-[var(--neu-text-muted)] whitespace-nowrap">
                              {{ page.name }}
                            </span>
                          </td>
                          <td class="py-3 px-4">
                            <NeuSelect
                              v-if="localPermissions[page.id]"
                              v-model="localPermissions[page.id]!.scope"
                              :options="scopeOptions"
                              :disabled="!canManage || isSuperAdminRole || !Object.values(localPermissions[page.id]!.actions).some(v => v)"
                              size="sm"
                            />
                          </td>
                          <td class="py-3 px-4">
                            <NeuSelect
                              v-if="localPermissions[page.id]"
                              v-model="localPermissions[page.id]!.dataLevel"
                              :options="dataLevelOptions"
                              :disabled="!canManage || isSuperAdminRole || !Object.values(localPermissions[page.id]!.actions).some(v => v)"
                              size="sm"
                            />
                          </td>
                          <td class="py-3 pl-4 pr-6">
                            <div v-if="localPermissions[page.id]" class="flex items-center gap-4">
                              <!-- Select All checkbox -->
                              <label
                                class="flex items-center gap-1.5 pr-2 border-r border-[var(--neu-shadow-dark)]/20"
                                :class="[isSuperAdminRole ? 'cursor-not-allowed opacity-70' : 'cursor-pointer', { 'opacity-50': !canManage }]"
                              >
                                <input
                                  type="checkbox"
                                  :checked="areAllActionsEnabled(page.id, [...standardActions])"
                                  :indeterminate="areSomeActionsEnabled(page.id, [...standardActions])"
                                  :disabled="!canManage || isSuperAdminRole"
                                  :aria-label="`Select all actions for ${page.name}`"
                                  class="w-4 h-4 rounded border-[var(--neu-shadow-dark)]/30 text-[var(--neu-primary)] focus:ring-[var(--neu-primary)] focus:ring-offset-0"
                                  :class="{ 'cursor-not-allowed': isSuperAdminRole }"
                                  @change="toggleAllActions(page.id, [...standardActions], $event)"
                                />
                                <span class="text-xs font-medium text-[var(--neu-text-muted)]">All</span>
                              </label>
                              <!-- Individual action checkboxes (View, Edit, Create, Delete) -->
                              <label
                                v-for="action in standardActions"
                                :key="action"
                                class="flex items-center gap-1.5"
                                :class="[isSuperAdminRole ? 'cursor-not-allowed opacity-70' : 'cursor-pointer', { 'opacity-50': !canManage }]"
                              >
                                <input
                                  type="checkbox"
                                  v-model="localPermissions[page.id]!.actions[action]"
                                  :disabled="!canManage || isSuperAdminRole"
                                  :aria-label="`${getActionLabel(action)} permission for ${page.name}`"
                                  class="w-4 h-4 rounded border-[var(--neu-shadow-dark)]/30 text-[var(--neu-primary)] focus:ring-[var(--neu-primary)] focus:ring-offset-0"
                                  :class="{ 'cursor-not-allowed': isSuperAdminRole }"
                                />
                                <span class="text-xs text-[var(--neu-text-muted)] whitespace-nowrap">{{ getActionLabel(action) }}</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>

                  <!-- Desktop Legend -->
                  <div class="mt-6 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
                    <p class="text-xs text-[var(--neu-text-muted)]">
                      <strong>Scope:</strong> Self → Direct Reports → Department → Division → Company
                    </p>
                    <p class="text-xs text-[var(--neu-text-muted)] mt-1">
                      <strong>Data Level:</strong> Basic → Personal → Company → Sensitive
                    </p>
                  </div>
                </div>
              </div>

              <!-- Footer (sticky on mobile for unsaved changes) -->
              <div v-if="hasUnsavedChanges" class="p-3 sm:p-4 border-t border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/30 sticky bottom-0 z-20">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span class="text-sm text-[var(--neu-text-muted)]">Unsaved changes</span>
                  </div>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <NeuButton variant="ghost" size="sm" class="flex-1 sm:flex-none" @click="discardChanges">Discard</NeuButton>
                    <NeuButton variant="primary" size="sm" class="flex-1 sm:flex-none" :loading="saving" @click="saveChanges">Save</NeuButton>
                  </div>
                </div>
              </div>
            </template>

            <!-- No Role Selected -->
            <template v-else>
              <div class="flex-1 flex items-center justify-center">
                <div class="text-center">
                  <svg class="w-16 h-16 mx-auto text-[var(--neu-text-muted)]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p class="mt-4 text-[var(--neu-text-muted)]">Select a role to edit permissions</p>
                </div>
              </div>
            </template>
          </NeuCard>
        </div>
      </div>
    </template>

    <!-- Role Modal -->
    <NeuModal v-model="showRoleModal" :title="editingRole ? 'Edit Role' : 'Create Role'" size="md">
      <div class="space-y-4">
        <NeuInput v-if="!editingRole" v-model="roleForm.code" label="Code" placeholder="e.g., custom_role" />
        <NeuInput v-model="roleForm.name" label="Name" placeholder="e.g., Custom Role" />
        <NeuInput v-model="roleForm.description" label="Description" placeholder="Optional description" />

        <!-- Group selection -->
        <NeuSelect
          v-model="roleForm.groupId"
          label="Group"
          :options="[{ label: 'No Group', value: '' }, ...groups.map(g => ({ label: g.name, value: g.id }))]"
          hint="Organize this role into a folder group."
        />

        <!-- Tag selection -->
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Tags</label>
          <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
            <button
              v-for="tag in tags"
              :key="tag.id"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition-all border-2"
              :class="roleForm.tagIds.includes(tag.id) ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'"
              :style="{ backgroundColor: tag.color + '20', color: tag.color }"
              @click="roleForm.tagIds.includes(tag.id) ? roleForm.tagIds = roleForm.tagIds.filter(id => id !== tag.id) : roleForm.tagIds.push(tag.id)"
            >
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color }" />
              {{ tag.name }}
              <svg v-if="roleForm.tagIds.includes(tag.id)" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
          <div v-else class="text-sm text-[var(--neu-text-muted)]">
            No tags created yet.
            <button type="button" class="text-[var(--neu-primary)] hover:underline" @click="showRoleModal = false; openCreateTagModal()">
              Create a tag
            </button>
          </div>
          <p v-if="tags.length > 0" class="text-xs text-[var(--neu-text-muted)] mt-1">Click to select/deselect tags</p>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-[var(--neu-text)]">Active</span>
          <NeuToggle v-model="roleForm.isActive" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <NeuButton variant="ghost" @click="showRoleModal = false">Cancel</NeuButton>
          <NeuButton variant="primary" :loading="savingRole" @click="saveRole">
            {{ editingRole ? 'Save' : 'Create' }}
          </NeuButton>
        </div>
      </template>
    </NeuModal>

    <!-- Tag Modal -->
    <NeuModal v-model="showTagModal" :title="editingTag ? 'Edit Tag' : 'Create Tag'" size="sm">
      <div class="space-y-4">
        <NeuInput v-model="tagForm.name" label="Name" placeholder="e.g., HR, Finance, Technical" />

        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Color</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in tagColorOptions"
              :key="color.value"
              type="button"
              class="w-8 h-8 rounded-lg transition-all border-2"
              :class="tagForm.color === color.value ? 'border-[var(--neu-text)] scale-110' : 'border-transparent hover:scale-105'"
              :style="{ backgroundColor: color.value }"
              :title="color.label"
              @click="tagForm.color = color.value"
            />
          </div>
        </div>

        <!-- Preview -->
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Preview</label>
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm"
            :style="{ backgroundColor: tagForm.color + '20', color: tagForm.color }"
          >
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: tagForm.color }" />
            {{ tagForm.name || 'Tag Name' }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between">
          <NeuButton v-if="editingTag" variant="ghost" class="text-red-500" @click="deleteTag(editingTag); showTagModal = false">
            Delete
          </NeuButton>
          <div class="flex gap-3 ml-auto">
            <NeuButton variant="ghost" @click="showTagModal = false">Cancel</NeuButton>
            <NeuButton variant="primary" :loading="savingTag" :disabled="!tagForm.name.trim()" @click="saveTag">
              {{ editingTag ? 'Save' : 'Create' }}
            </NeuButton>
          </div>
        </div>
      </template>
    </NeuModal>

    <!-- Group Modal -->
    <NeuModal v-model="showGroupModal" :title="editingGroup ? 'Edit Group' : 'Create Group'" size="sm">
      <div class="space-y-4">
        <NeuInput v-model="groupForm.name" label="Name" placeholder="e.g., Administrative, Operations" />
        <NeuInput v-model="groupForm.description" label="Description" placeholder="Optional description" />
      </div>
      <template #footer>
        <div class="flex justify-between">
          <NeuButton v-if="editingGroup" variant="ghost" class="text-red-500" @click="deleteGroup(editingGroup); showGroupModal = false">
            Delete
          </NeuButton>
          <div class="flex gap-3 ml-auto">
            <NeuButton variant="ghost" @click="showGroupModal = false">Cancel</NeuButton>
            <NeuButton variant="primary" :loading="savingGroup" :disabled="!groupForm.name.trim()" @click="saveGroup">
              {{ editingGroup ? 'Save' : 'Create' }}
            </NeuButton>
          </div>
        </div>
      </template>
    </NeuModal>

    <!-- Toast -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="notification" class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50">
        <NeuCard
          variant="flat"
          padding="sm"
          :class="['shadow-lg border-l-4', notification.type === 'success' ? 'border-l-green-500' : 'border-l-red-500']"
        >
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-[var(--neu-text)] text-sm sm:text-base">{{ notification.title }}</p>
              <p class="text-xs sm:text-sm text-[var(--neu-text-muted)] truncate">{{ notification.message }}</p>
            </div>
            <button @click="notification = null" class="text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] flex-shrink-0 p-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </NeuCard>
      </div>
    </Transition>
  </div>
</template>
