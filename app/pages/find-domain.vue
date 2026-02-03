<script setup lang="ts">
definePageMeta({
  layout: false
})

const slug = ref('')
const isChecking = ref(false)
const error = ref<string | null>(null)
const slugInput = ref<HTMLInputElement | null>(null)

// Focus input on mount
onMounted(() => {
  slugInput.value?.focus()
})

async function findWorkspace() {
  if (!slug.value.trim()) {
    error.value = 'Please enter your company URL'
    return
  }

  isChecking.value = true
  error.value = null

  try {
    // Check if tenant exists
    const response = await $fetch(`/api/tenant/${slug.value.toLowerCase()}`)

    if (response.exists) {
      // Redirect to tenant sign-in page
      await navigateTo(`/signin/${slug.value.toLowerCase()}`)
    } else {
      error.value = 'Workspace not found. Please check the URL and try again.'
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Workspace not found. Please check the URL and try again.'
  } finally {
    isChecking.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    findWorkspace()
  }
}
</script>

<template>
  <div class="min-h-screen neu-bg flex flex-col">
    <!-- Header -->
    <header class="p-4 sm:p-6">
      <NuxtLink to="/" class="flex items-center gap-2 w-fit">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--neu-primary)] to-[var(--neu-primary-dark)] flex items-center justify-center">
          <span class="text-white font-bold text-sm">O</span>
        </div>
        <span class="text-lg font-semibold text-[var(--neu-text)]">Optivo</span>
      </NuxtLink>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="neu-card rounded-2xl p-6 sm:p-8">
          <!-- Icon -->
          <div class="flex justify-center mb-6">
            <div class="w-16 h-16 rounded-2xl neu-flat flex items-center justify-center">
              <svg class="w-8 h-8 text-[var(--neu-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-xl sm:text-2xl font-bold text-center text-[var(--neu-text)] mb-2">
            Find your workspace
          </h1>
          <p class="text-sm text-center text-[var(--neu-text-muted)] mb-6">
            Enter your company URL to sign in
          </p>

          <!-- Input -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Company URL</label>
              <div class="neu-inset flex items-center rounded-xl overflow-hidden">
                <span class="pl-4 pr-1 py-3 text-sm text-[var(--neu-text-muted)] select-none">
                  optivo.app/
                </span>
                <input
                  ref="slugInput"
                  v-model="slug"
                  type="text"
                  placeholder="your-company"
                  class="flex-1 pl-0 pr-4 py-3 bg-transparent text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
                  @keydown="handleKeydown"
                />
              </div>
            </div>

            <!-- Error Message -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="error" class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {{ error }}
              </div>
            </Transition>

            <!-- Button -->
            <NeuButton
              variant="primary"
              class="w-full"
              :loading="isChecking"
              :disabled="isChecking"
              @click="findWorkspace"
            >
              {{ isChecking ? 'Finding workspace...' : 'Continue' }}
            </NeuButton>
          </div>

          <!-- Divider -->
          <div class="flex items-center gap-4 my-6">
            <div class="flex-1 h-px bg-[var(--neu-shadow-dark)]/20" />
            <span class="text-xs text-[var(--neu-text-muted)]">or</span>
            <div class="flex-1 h-px bg-[var(--neu-shadow-dark)]/20" />
          </div>

          <!-- Register Link -->
          <p class="text-sm text-center text-[var(--neu-text-muted)]">
            Don't have a workspace?
            <NuxtLink to="/register" class="text-[var(--neu-primary)] font-medium hover:underline">
              Create one
            </NuxtLink>
          </p>
        </div>

        <!-- Help Link -->
        <p class="text-xs text-center text-[var(--neu-text-muted)] mt-6">
          Need help finding your workspace?
          <a href="#" class="text-[var(--neu-primary)] hover:underline">Contact support</a>
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.neu-bg {
  background: var(--neu-bg);
}

.neu-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-raised);
}

.neu-flat {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-inset {
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}
</style>
