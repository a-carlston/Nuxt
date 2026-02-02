<script setup lang="ts">
import { ref, computed } from 'vue'

interface MenuItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  divider?: boolean
}

interface Props {
  src?: string
  alt?: string
  initials?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away' | null
  clickable?: boolean
  menuItems?: MenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Avatar',
  size: 'md',
  status: null,
  clickable: false,
  menuItems: () => []
})

const emit = defineEmits<{
  'click': []
  'menu-select': [id: string]
}>()

const isMenuOpen = ref(false)

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-xl'
}

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4'
}

const statusColors = {
  online: 'bg-[var(--neu-success)]',
  offline: 'bg-gray-400',
  busy: 'bg-[var(--neu-danger)]',
  away: 'bg-[var(--neu-warning)]'
}

const displayInitials = computed(() => {
  if (props.initials) return props.initials.slice(0, 2).toUpperCase()
  if (props.alt) {
    const parts = props.alt.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return props.alt.slice(0, 2).toUpperCase()
  }
  return '?'
})

const hasMenu = computed(() => props.menuItems.length > 0)

function handleClick() {
  if (hasMenu.value) {
    isMenuOpen.value = !isMenuOpen.value
  }
  emit('click')
}

function selectMenuItem(item: MenuItem) {
  if (!item.disabled && !item.divider) {
    emit('menu-select', item.id)
    isMenuOpen.value = false
  }
}

function closeMenu() {
  isMenuOpen.value = false
}
</script>

<template>
  <div
    v-click-outside="closeMenu"
    class="relative inline-block"
  >
    <button
      type="button"
      :class="[
        'neu-avatar relative rounded-full flex items-center justify-center overflow-hidden transition-all duration-200',
        sizeClasses[size],
        { 'cursor-pointer': clickable || hasMenu }
      ]"
      :disabled="!clickable && !hasMenu"
      @click="handleClick"
    >
      <img
        v-if="src"
        :src="src"
        :alt="alt"
        class="w-full h-full object-cover"
      />
      <span
        v-else
        class="font-semibold text-[var(--neu-primary)]"
      >
        {{ displayInitials }}
      </span>
    </button>

    <!-- Status Indicator -->
    <span
      v-if="status"
      :class="[
        'neu-status absolute bottom-0 right-0 rounded-full',
        statusSizes[size],
        statusColors[status]
      ]"
    />

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isMenuOpen && hasMenu"
        class="neu-avatar-menu absolute right-0 mt-2 w-48 rounded-xl p-2 z-50"
      >
        <template v-for="item in menuItems" :key="item.id">
          <div
            v-if="item.divider"
            class="my-1 border-t border-[var(--neu-shadow-dark)]/20"
          />
          <button
            v-else
            type="button"
            :disabled="item.disabled"
            :class="[
              'neu-menu-item w-full px-3 py-2 text-left rounded-lg text-sm transition-all duration-150',
              { 'opacity-50 cursor-not-allowed': item.disabled }
            ]"
            @click="selectMenuItem(item)"
          >
            {{ item.label }}
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.neu-avatar {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-avatar:hover:not(:disabled) {
  box-shadow: var(--neu-shadow-pressed);
}

.neu-status {
  box-shadow: 0 0 0 2px var(--neu-bg);
}

.neu-avatar-menu {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-menu-item {
  color: var(--neu-text);
}

.neu-menu-item:hover:not(:disabled) {
  background: var(--neu-bg-secondary);
}
</style>
