<script setup lang="ts">
/**
 * Admin - Field Manager
 *
 * Unified management for field configuration:
 * - Display labels (custom column names)
 * - Sensitivity levels (data access control)
 * - Default column order
 */

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

// Simplified 4-tier sensitivity levels
type SensitivityTier = 'basic' | 'personal' | 'company' | 'sensitive'

const SENSITIVITY_TIERS: { value: SensitivityTier; label: string; description: string; color: string; badgeVariant: 'success' | 'primary' | 'warning' | 'danger' }[] = [
  { value: 'basic', label: 'Basic', description: 'Visible to all users', color: 'bg-green-500', badgeVariant: 'success' },
  { value: 'personal', label: 'Personal', description: 'Personal employee data', color: 'bg-blue-500', badgeVariant: 'primary' },
  { value: 'company', label: 'Company', description: 'Company-sensitive data', color: 'bg-amber-500', badgeVariant: 'warning' },
  { value: 'sensitive', label: 'Sensitive', description: 'Highly restricted', color: 'bg-red-500', badgeVariant: 'danger' }
]

interface FieldConfig {
  id: string
  fieldName: string
  defaultLabel: string
  customLabel?: string
  sensitivity: SensitivityTier
  minSensitivity?: SensitivityTier // System-enforced minimum
  isSystem?: boolean
  order: number
}

interface TableConfig {
  id: string
  label: string
  tableName: string // DB table name for sensitivity lookup
  fields: FieldConfig[]
}

const route = useRoute()
const tenantSlug = computed(() => route.params.slug as string)

// State
const loading = ref(true)
const saving = ref(false)
const selectedTableId = ref('directory')
const notification = ref<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

// Local edits
const localLabels = ref<Record<string, string>>({})
const localSensitivity = ref<Record<string, SensitivityTier>>({})
const localOrder = ref<string[]>([]) // Field IDs in display order
const originalLabels = ref<Record<string, string>>({})
const originalSensitivity = ref<Record<string, SensitivityTier>>({})
const originalOrder = ref<string[]>([])

// Drag state
const draggedFieldId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<'before' | 'after' | null>(null)

// Table definitions with their fields
const tables = ref<TableConfig[]>([
  {
    id: 'directory',
    label: 'Directory',
    tableName: 'core_users',
    fields: [
      { id: 'uuid', fieldName: 'meta_id', defaultLabel: 'UUID', sensitivity: 'basic', order: 0 },
      { id: 'status', fieldName: 'meta_status', defaultLabel: 'Status', sensitivity: 'basic', order: 1 },
      { id: 'firstName', fieldName: 'personal_first_name', defaultLabel: 'First Name', sensitivity: 'basic', order: 2 },
      { id: 'lastName', fieldName: 'personal_last_name', defaultLabel: 'Last Name', sensitivity: 'basic', order: 3 },
      { id: 'companyEmail', fieldName: 'company_work_email', defaultLabel: 'Work Email', sensitivity: 'basic', order: 4 },
      { id: 'title', fieldName: 'company_title', defaultLabel: 'Title', sensitivity: 'basic', order: 5 },
      { id: 'department', fieldName: 'company_department', defaultLabel: 'Department', sensitivity: 'basic', order: 6 },
      { id: 'division', fieldName: 'company_division', defaultLabel: 'Division', sensitivity: 'basic', order: 7 },
      { id: 'location', fieldName: 'company_location', defaultLabel: 'Location', sensitivity: 'basic', order: 8 },
      { id: 'employeeId', fieldName: 'company_employee_id', defaultLabel: 'Employee ID', sensitivity: 'company', order: 9 },
      { id: 'startDate', fieldName: 'company_start_date', defaultLabel: 'Start Date', sensitivity: 'company', order: 10 },
      { id: 'email', fieldName: 'personal_email', defaultLabel: 'Personal Email', sensitivity: 'personal', order: 11 },
      { id: 'phone', fieldName: 'personal_phone', defaultLabel: 'Phone', sensitivity: 'personal', order: 12 },
      { id: 'dob', fieldName: 'personal_dob', defaultLabel: 'Date of Birth', sensitivity: 'personal', order: 13 },
      { id: 'address', fieldName: 'personal_address_line1', defaultLabel: 'Address', sensitivity: 'personal', order: 14 },
      { id: 'ssn', fieldName: 'personal_ssn', defaultLabel: 'SSN', sensitivity: 'sensitive', minSensitivity: 'sensitive', isSystem: true, order: 15 },
    ]
  },
  {
    id: 'compensation',
    label: 'Compensation',
    tableName: 'core_user_compensation',
    fields: [
      { id: 'payRate', fieldName: 'pay_rate', defaultLabel: 'Pay Rate', sensitivity: 'sensitive', minSensitivity: 'company', isSystem: true, order: 0 },
      { id: 'payType', fieldName: 'pay_type', defaultLabel: 'Pay Type', sensitivity: 'company', order: 1 },
      { id: 'payFrequency', fieldName: 'pay_frequency', defaultLabel: 'Pay Frequency', sensitivity: 'company', order: 2 },
    ]
  },
  {
    id: 'banking',
    label: 'Banking',
    tableName: 'core_user_banking',
    fields: [
      { id: 'bankName', fieldName: 'bank_name', defaultLabel: 'Bank Name', sensitivity: 'sensitive', minSensitivity: 'sensitive', isSystem: true, order: 0 },
      { id: 'accountNumber', fieldName: 'bank_account_number', defaultLabel: 'Account Number', sensitivity: 'sensitive', minSensitivity: 'sensitive', isSystem: true, order: 1 },
      { id: 'routingNumber', fieldName: 'bank_routing_number', defaultLabel: 'Routing Number', sensitivity: 'sensitive', minSensitivity: 'sensitive', isSystem: true, order: 2 },
    ]
  }
])

const currentTable = computed(() => tables.value.find(t => t.id === selectedTableId.value))

// Fields sorted by current local order
const currentFields = computed(() => {
  const fields = currentTable.value?.fields || []
  if (localOrder.value.length === 0) return fields
  return [...fields].sort((a, b) => {
    const aIndex = localOrder.value.indexOf(a.id)
    const bIndex = localOrder.value.indexOf(b.id)
    return aIndex - bIndex
  })
})

// Check for unsaved changes
const hasUnsavedChanges = computed(() => {
  const labelsChanged = JSON.stringify(localLabels.value) !== JSON.stringify(originalLabels.value)
  const sensitivityChanged = JSON.stringify(localSensitivity.value) !== JSON.stringify(originalSensitivity.value)
  const orderChanged = JSON.stringify(localOrder.value) !== JSON.stringify(originalOrder.value)
  return labelsChanged || sensitivityChanged || orderChanged
})

// Column labels composable
const { companyLabels, loading: labelsLoading, loadLabels, saveAllLabels } = useColumnLabels(selectedTableId.value)

// Load data
async function loadData() {
  loading.value = true
  try {
    // Load column labels
    await loadLabels(true)

    // Load sensitivity and order data
    try {
      const sensitivityRes = await $fetch<{ success: boolean; data: { tables: string[]; fields: Record<string, any[]> } }>(
        `/api/tenant/${tenantSlug.value}/rbac/field-sensitivity`
      )

      // Merge sensitivity data into fields
      if (sensitivityRes.success) {
        for (const table of tables.value) {
          const sensitivityFields = sensitivityRes.data.fields[table.tableName] || []
          for (const field of table.fields) {
            const sensitivityConfig = sensitivityFields.find((f: any) => f.fieldName === field.fieldName)
            if (sensitivityConfig) {
              field.sensitivity = sensitivityConfig.sensitivity || field.sensitivity
              field.minSensitivity = sensitivityConfig.minSensitivity
              field.isSystem = sensitivityConfig.isSystem
              field.order = sensitivityConfig.order ?? field.order
            }
          }
        }
      }
    } catch {
      // API may not exist yet, use defaults
    }

    // Initialize local state
    initializeLocalState()
  } catch (error) {
    notify('error', 'Error', 'Failed to load field configuration')
  } finally {
    loading.value = false
  }
}

function initializeLocalState() {
  const labels: Record<string, string> = {}
  const sensitivity: Record<string, SensitivityTier> = {}
  const fields = currentTable.value?.fields || []

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)
  const order = sortedFields.map(f => f.id)

  for (const field of fields) {
    labels[field.id] = companyLabels.value[field.id] || ''
    sensitivity[field.id] = field.sensitivity
  }

  localLabels.value = { ...labels }
  originalLabels.value = { ...labels }
  localSensitivity.value = { ...sensitivity }
  originalSensitivity.value = { ...sensitivity }
  localOrder.value = [...order]
  originalOrder.value = [...order]
}

async function handleTableChange(tableId: string) {
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Discard them?')) return
  }
  selectedTableId.value = tableId
  await loadData()
}

function getDisplayLabel(field: FieldConfig): string {
  const customLabel = localLabels.value[field.id]
  return customLabel || field.defaultLabel
}

function getSensitivity(field: FieldConfig): SensitivityTier {
  return localSensitivity.value[field.id] ?? field.sensitivity
}

function updateLabel(fieldId: string, value: string) {
  localLabels.value = { ...localLabels.value, [fieldId]: value.trim() }
}

function updateSensitivity(fieldId: string, tier: SensitivityTier) {
  const field = currentTable.value?.fields.find(f => f.id === fieldId)
  // Validate against minimum sensitivity
  if (field?.minSensitivity) {
    const tierOrder: SensitivityTier[] = ['basic', 'personal', 'company', 'sensitive']
    const minIndex = tierOrder.indexOf(field.minSensitivity)
    const newIndex = tierOrder.indexOf(tier)
    if (newIndex < minIndex) {
      tier = field.minSensitivity
    }
  }
  localSensitivity.value = { ...localSensitivity.value, [fieldId]: tier }
}

// Get available sensitivity options for a field (respecting min)
function getSensitivityOptions(field: FieldConfig) {
  if (!field.minSensitivity) return SENSITIVITY_TIERS

  const tierOrder: SensitivityTier[] = ['basic', 'personal', 'company', 'sensitive']
  const minIndex = tierOrder.indexOf(field.minSensitivity)
  return SENSITIVITY_TIERS.filter((_, i) => i >= minIndex)
}

// Drag and drop handlers
function onDragStart(e: DragEvent, fieldId: string) {
  draggedFieldId.value = fieldId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fieldId)
  }
  // Add dragging class after a frame
  requestAnimationFrame(() => {
    const el = (e.target as HTMLElement).closest('tr')
    el?.classList.add('is-dragging')
  })
}

function onDragOver(e: DragEvent, targetFieldId: string) {
  e.preventDefault()
  if (!e.dataTransfer || !draggedFieldId.value || draggedFieldId.value === targetFieldId) {
    dropTargetId.value = null
    dropPosition.value = null
    return
  }

  e.dataTransfer.dropEffect = 'move'

  // Determine if dropping before or after based on mouse position
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2

  dropTargetId.value = targetFieldId
  dropPosition.value = e.clientY < midpoint ? 'before' : 'after'
}

function onDragLeave(e: DragEvent) {
  // Only clear if we're leaving the item entirely
  const relatedTarget = e.relatedTarget as HTMLElement | null
  const currentTarget = e.currentTarget as HTMLElement

  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    dropTargetId.value = null
    dropPosition.value = null
  }
}

function onDrop(e: DragEvent, targetFieldId: string) {
  e.preventDefault()

  if (!draggedFieldId.value || draggedFieldId.value === targetFieldId) {
    clearDragState()
    return
  }

  const order = [...localOrder.value]
  const fromIndex = order.indexOf(draggedFieldId.value)

  // Remove dragged item
  order.splice(fromIndex, 1)

  // Calculate new position
  let insertIndex = order.indexOf(targetFieldId)
  if (dropPosition.value === 'after') {
    insertIndex += 1
  }

  // Insert at new position
  order.splice(insertIndex, 0, draggedFieldId.value)
  localOrder.value = order

  clearDragState()
}

function onDragEnd() {
  // Remove dragging class from all items
  document.querySelectorAll('tr.is-dragging').forEach(el => {
    el.classList.remove('is-dragging')
  })
  clearDragState()
}

function clearDragState() {
  draggedFieldId.value = null
  dropTargetId.value = null
  dropPosition.value = null
}

function getDropIndicatorPosition(fieldId: string): 'before' | 'after' | null {
  if (dropTargetId.value === fieldId) {
    return dropPosition.value
  }
  return null
}

function moveField(fieldId: string, direction: 'up' | 'down') {
  const order = [...localOrder.value]
  const index = order.indexOf(fieldId)
  if (index === -1) return

  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= order.length) return

  order.splice(index, 1)
  order.splice(newIndex, 0, fieldId)
  localOrder.value = order
}

async function saveChanges() {
  saving.value = true
  try {
    // Save labels
    const labelsToSave: Record<string, string> = {}
    for (const [id, label] of Object.entries(localLabels.value)) {
      if (label) labelsToSave[id] = label
    }
    await saveAllLabels(labelsToSave)

    // Save sensitivity and order
    const updates: Array<{ tableName: string; fieldName: string; sensitivity: SensitivityTier; order: number }> = []
    const fields = currentTable.value?.fields || []

    for (let i = 0; i < localOrder.value.length; i++) {
      const fieldId = localOrder.value[i]
      if (!fieldId) continue
      const field = fields.find(f => f.id === fieldId)
      if (!field) continue

      const newSensitivity = localSensitivity.value[fieldId] ?? field.sensitivity
      const prevSensitivity = originalSensitivity.value[fieldId] ?? field.sensitivity
      const originalIndex = originalOrder.value.indexOf(fieldId)

      // Include if sensitivity or order changed
      if (newSensitivity !== prevSensitivity || i !== originalIndex) {
        updates.push({
          tableName: currentTable.value!.tableName,
          fieldName: field.fieldName,
          sensitivity: newSensitivity,
          order: i
        })
      }
    }

    if (updates.length > 0) {
      await $fetch(`/api/tenant/${tenantSlug.value}/rbac/field-sensitivity/bulk`, {
        method: 'POST',
        body: { updates }
      })
    }

    // Update original state
    originalLabels.value = { ...localLabels.value }
    originalSensitivity.value = { ...localSensitivity.value }
    originalOrder.value = [...localOrder.value]

    notify('success', 'Saved', 'Field configuration updated')
  } catch {
    notify('error', 'Error', 'Failed to save changes')
  } finally {
    saving.value = false
  }
}

function discardChanges() {
  localLabels.value = { ...originalLabels.value }
  localSensitivity.value = { ...originalSensitivity.value }
  localOrder.value = [...originalOrder.value]
}

function getTierConfig(tier: SensitivityTier) {
  return SENSITIVITY_TIERS.find(t => t.value === tier) ?? SENSITIVITY_TIERS[0]!
}

function notify(type: 'success' | 'error', title: string, message: string) {
  notification.value = { type, title, message }
  setTimeout(() => notification.value = null, 3000)
}

onMounted(() => {
  loadData()
})

watch(selectedTableId, () => {
  initializeLocalState()
})
</script>

<template>
  <div>
    <NeuCard variant="flat" padding="none">
      <!-- Header -->
      <div class="p-4 border-b border-[var(--neu-shadow-dark)]/10 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-[var(--neu-text)]">Field Manager</h1>
          <p class="text-[var(--neu-text-muted)] text-xs mt-0.5">Configure field labels, sensitivity, and display order</p>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span
            v-for="tier in SENSITIVITY_TIERS"
            :key="tier.value"
            class="inline-flex items-center gap-1.5"
          >
            <span :class="['w-2 h-2 rounded-full', tier.color]" />
            {{ tier.label }}
          </span>
        </div>
      </div>

      <!-- Loading -->
      <template v-if="loading">
        <div class="flex items-center justify-center py-12">
          <div class="w-8 h-8 border-4 border-[var(--neu-primary)]/20 border-t-[var(--neu-primary)] rounded-full animate-spin" />
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Table Selector -->
        <div class="p-4 border-b border-[var(--neu-shadow-dark)]/10 flex items-center gap-4">
          <span class="text-sm font-medium text-[var(--neu-text)]">Table:</span>
          <div class="flex gap-1 p-1 rounded-lg bg-[var(--neu-bg-secondary)]/50">
            <button
              v-for="table in tables"
              :key="table.id"
              class="px-4 py-2 text-sm rounded-md transition-all"
              :class="selectedTableId === table.id
                ? 'bg-[var(--neu-bg)] shadow-[var(--neu-shadow-flat)] text-[var(--neu-text)] font-medium'
                : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]'"
              @click="handleTableChange(table.id)"
            >
              {{ table.label }}
            </button>
          </div>
        </div>

        <!-- Fields Table -->
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/30">
                <th class="px-2 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase w-16">Order</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase w-36">Field</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase w-36">Default</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase">Custom Label</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--neu-text-muted)] uppercase w-44">Sensitivity</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--neu-shadow-dark)]/5">
              <tr
                v-for="(field, index) in currentFields"
                :key="field.id"
                class="field-row transition-all"
                :class="[
                  draggedFieldId === field.id
                    ? 'is-dragging'
                    : dropTargetId === field.id
                      ? 'is-drop-target'
                      : 'hover:bg-[var(--neu-bg-secondary)]/30',
                  getDropIndicatorPosition(field.id) === 'before' && 'show-indicator-before',
                  getDropIndicatorPosition(field.id) === 'after' && 'show-indicator-after'
                ]"
                draggable="true"
                @dragstart="onDragStart($event, field.id)"
                @dragover="onDragOver($event, field.id)"
                @dragleave="onDragLeave($event)"
                @drop="onDrop($event, field.id)"
                @dragend="onDragEnd"
              >
                <!-- Order controls -->
                <td class="px-2 py-3">
                  <div class="flex items-center gap-1">
                    <!-- Drag handle -->
                    <div class="cursor-grab active:cursor-grabbing p-1 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <!-- Up/Down buttons -->
                    <div class="flex flex-col">
                      <button
                        :disabled="index === 0"
                        class="p-0.5 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                        @click="moveField(field.id, 'up')"
                      >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        :disabled="index === currentFields.length - 1"
                        class="p-0.5 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                        @click="moveField(field.id, 'down')"
                      >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <code class="text-xs font-mono text-[var(--neu-text-muted)] bg-[var(--neu-bg-secondary)] px-2 py-1 rounded">
                    {{ field.id }}
                  </code>
                </td>
                <td class="px-4 py-3 text-sm text-[var(--neu-text)]">
                  {{ field.defaultLabel }}
                </td>
                <td class="px-4 py-3">
                  <NeuInput
                    :model-value="localLabels[field.id] || ''"
                    :placeholder="field.defaultLabel"
                    size="sm"
                    @update:model-value="(val) => updateLabel(field.id, String(val))"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div :class="['w-2 h-2 rounded-full', getTierConfig(getSensitivity(field)).color]" />
                    <NeuSelect
                      :model-value="getSensitivity(field)"
                      :options="getSensitivityOptions(field).map(t => ({ label: t.label, value: t.value }))"
                      size="sm"
                      class="w-28"
                      @update:model-value="(val) => updateSensitivity(field.id, val as SensitivityTier)"
                    />
                    <span v-if="field.minSensitivity" class="text-xs text-amber-500" :title="`Minimum: ${field.minSensitivity}`">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div v-if="hasUnsavedChanges" class="p-4 border-t border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-bg-secondary)]/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span class="text-sm text-[var(--neu-text-muted)]">Unsaved changes</span>
            </div>
            <div class="flex items-center gap-3">
              <NeuButton variant="ghost" size="sm" @click="discardChanges">Discard</NeuButton>
              <NeuButton variant="primary" size="sm" :loading="saving" @click="saveChanges">Save Changes</NeuButton>
            </div>
          </div>
        </div>
      </template>
    </NeuCard>

    <!-- Toast -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="notification" class="fixed bottom-6 right-6 z-50">
        <NeuCard
          variant="flat"
          padding="sm"
          :class="['shadow-lg border-l-4', notification.type === 'success' ? 'border-l-green-500' : 'border-l-red-500']"
        >
          <div class="flex items-center gap-3">
            <div>
              <p class="font-medium text-[var(--neu-text)]">{{ notification.title }}</p>
              <p class="text-sm text-[var(--neu-text-muted)]">{{ notification.message }}</p>
            </div>
            <button @click="notification = null" class="text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]">
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

<style scoped>
/* Dragging state - the source row becomes a placeholder */
.field-row.is-dragging {
  opacity: 0.4;
  background: var(--neu-bg-secondary);
}

.field-row.is-dragging td {
  border-top: 2px dashed var(--neu-primary);
  border-bottom: 2px dashed var(--neu-primary);
}

.field-row.is-dragging td:first-child {
  border-left: 2px dashed var(--neu-primary);
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.field-row.is-dragging td:last-child {
  border-right: 2px dashed var(--neu-primary);
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

/* Drop target state */
.field-row.is-drop-target {
  background: color-mix(in srgb, var(--neu-primary) 5%, transparent);
}

/* Drop indicator - using box-shadow on td elements */
.field-row.show-indicator-before td {
  box-shadow: inset 0 3px 0 0 var(--neu-primary);
}

.field-row.show-indicator-after td {
  box-shadow: inset 0 -3px 0 0 var(--neu-primary);
}
</style>
