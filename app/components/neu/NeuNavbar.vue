<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface NavItem {
  id: string
  label: string
  href?: string
  disabled?: boolean
}

interface Props {
  items?: NavItem[]
  activeItem?: string
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  expanded: false
})

const emit = defineEmits<{
  'select': [id: string]
}>()

const isHidden = ref(false)
const isForceOpen = ref(false)
const lastScrollY = ref(0)
const justOpened = ref(false)

function handleScroll() {
  const currentScrollY = window.scrollY

  if (currentScrollY <= 50) {
    // At top of page - always show
    isHidden.value = false
    isForceOpen.value = false
  } else if (currentScrollY > 100) {
    // Past threshold - hide (even if manually opened)
    isHidden.value = true
    isForceOpen.value = false
  }

  lastScrollY.value = currentScrollY
}

function toggleNav() {
  isForceOpen.value = true
  isHidden.value = false
  justOpened.value = true
  setTimeout(() => {
    justOpened.value = false
  }, 100)
}

function closeNav() {
  if (justOpened.value) {
    return
  }
  if (isForceOpen.value && window.scrollY > 50) {
    isForceOpen.value = false
    isHidden.value = true
  }
}

function selectItem(item: NavItem) {
  if (!item.disabled) {
    emit('select', item.id)
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div>
    <!-- Main Navbar -->
    <nav
      v-click-outside="closeNav"
      class="neu-navbar fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
      :class="{ 'nav-hidden': isHidden && !isForceOpen }"
    >
      <div :class="[expanded ? 'w-full px-8' : 'max-w-7xl mx-auto px-6', 'py-4']">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center gap-4">
            <slot name="logo" />
          </div>

          <!-- Nav Items - Inset Tab Look -->
          <div
            v-if="items.length > 0"
            class="neu-nav-container hidden md:flex gap-2 p-2 rounded-xl"
          >
            <button
              v-for="item in items"
              :key="item.id"
              type="button"
              :disabled="item.disabled"
              :class="[
                'neu-nav-item px-4 py-2 rounded-lg font-medium transition-all duration-200',
                {
                  'is-active': activeItem === item.id,
                  'opacity-50 cursor-not-allowed': item.disabled
                }
              ]"
              @click="selectItem(item)"
            >
              {{ item.label }}
            </button>
          </div>

          <!-- Right Side -->
          <div class="flex items-center gap-4">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </nav>

    <!-- Show Arrow When Hidden -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <button
        v-if="isHidden && !isForceOpen"
        type="button"
        class="neu-nav-toggle fixed top-1 left-1/2 -translate-x-1/2 z-50 p-2 rounded-full"
        @click="toggleNav"
      >
        <svg
          class="w-5 h-5 text-[var(--neu-text)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </Transition>

    <!-- Spacer -->
    <div class="h-20" />
  </div>
</template>

<style scoped>
.neu-navbar {
  background: var(--neu-bg);
  box-shadow: 0 4px 8px var(--neu-shadow-dark);
  border-radius: 0 0 3rem 3rem;
}

.neu-navbar.nav-hidden {
  transform: translateY(-100%);
}

.neu-nav-container {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-nav-item {
  color: var(--neu-text-muted);
}

.neu-nav-item:hover:not(:disabled):not(.is-active) {
  color: var(--neu-text);
}

.neu-nav-item.is-active {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  color: var(--neu-primary);
}

.neu-nav-toggle {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-nav-toggle:hover {
  box-shadow: var(--neu-shadow-pressed);
}
</style>
