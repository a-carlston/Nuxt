<script setup lang="ts">
interface NavItem {
  id: string
  label: string
  icon?: string
  href?: string
  disabled?: boolean
}

interface Props {
  items?: NavItem[]
  activeItem?: string
  collapsed?: boolean
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  collapsed: false,
  width: '250px'
})

const emit = defineEmits<{
  'update:activeItem': [value: string]
  'update:collapsed': [value: boolean]
  itemClick: [item: NavItem]
}>()

function handleItemClick(item: NavItem) {
  if (!item.disabled) {
    emit('update:activeItem', item.id)
    emit('itemClick', item)
  }
}
</script>

<template>
  <aside
    :class="[
      'h-screen bg-[var(--neu-bg)] shadow-[var(--neu-shadow-flat)]',
      'flex flex-col transition-all duration-300'
    ]"
    :style="{ width: collapsed ? '72px' : width }"
  >
    <div class="p-4 border-b border-[var(--neu-shadow-dark)]/10">
      <slot name="header">
        <div
          v-if="!collapsed"
          class="text-lg font-semibold text-[var(--neu-text)]"
        >
          Menu
        </div>
      </slot>
    </div>

    <nav class="flex-1 overflow-y-auto p-3">
      <ul class="space-y-2">
        <li
          v-for="item in items"
          :key="item.id"
        >
          <button
            type="button"
            :disabled="item.disabled"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
              activeItem === item.id
                ? 'bg-[var(--neu-bg-secondary)] shadow-[var(--neu-shadow-pressed)] text-[var(--neu-primary)]'
                : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] hover:bg-[var(--neu-bg-secondary)]',
              { 'opacity-50 cursor-not-allowed': item.disabled }
            ]"
            @click="handleItemClick(item)"
          >
            <span
              v-if="item.icon"
              class="text-xl"
            >
              {{ item.icon }}
            </span>
            <span
              v-if="!collapsed"
              class="font-medium"
            >
              {{ item.label }}
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="p-3 border-t border-[var(--neu-shadow-dark)]/10">
      <button
        type="button"
        class="w-full flex items-center justify-center p-2 rounded-lg text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors"
        @click="emit('update:collapsed', !collapsed)"
      >
        <svg
          :class="[
            'w-5 h-5 transition-transform duration-300',
            { 'rotate-180': collapsed }
          ]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>
    </div>
  </aside>
</template>
