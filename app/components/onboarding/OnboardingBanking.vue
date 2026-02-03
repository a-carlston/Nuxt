<script setup lang="ts">
const {
  userData,
  isStep5Valid,
  isLoading,
  saveStepData,
  nextStep,
  prevStep
} = useOnboarding()

const accountTypeOptions = [
  { label: 'Checking', value: 'checking' },
  { label: 'Savings', value: 'savings' }
]

const showRoutingNumber = ref(false)
const showAccountNumber = ref(false)

// Check if account numbers match
const accountsMatch = computed(() => {
  if (!userData.value.bankAccountNumber || !userData.value.bankAccountNumberConfirm) return true
  return userData.value.bankAccountNumber === userData.value.bankAccountNumberConfirm
})

// Check if user has started filling banking info
const hasStartedBanking = computed(() => {
  return !!(userData.value.bankName || userData.value.bankRoutingNumber || userData.value.bankAccountNumber)
})

async function handleContinue() {
  const sessionData = localStorage.getItem('session')
  if (sessionData) {
    const session = JSON.parse(sessionData)
    try {
      await saveStepData(session.tenantSlug)
    } catch (e) {
      // Continue anyway
    }
  }
  nextStep()
}
</script>

<template>
  <NeuCardForm
    title="Banking Information"
    subtitle="Set up direct deposit for payroll (optional)"
  >
    <div class="space-y-6">
      <!-- Check Diagram - Prominent at top -->
      <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
        <h3 class="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Where to find your routing and account numbers
        </h3>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 shadow-inner">
          <!-- Check visual -->
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs text-gray-400">YOUR NAME</span>
            <span class="text-xs text-gray-400">CHECK #1234</span>
          </div>
          <div class="mb-4 text-right">
            <span class="text-xs text-gray-400">Date: ___________</span>
          </div>
          <div class="border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">
            <span class="text-xs text-gray-400">Pay to the order of: _________________________________</span>
          </div>
          <!-- Numbers at bottom -->
          <div class="flex items-end justify-center gap-6 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600 font-mono text-sm">
            <div class="text-center">
              <div class="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg border-2 border-blue-400 dark:border-blue-500 mb-2">
                <span class="text-blue-700 dark:text-blue-300 font-bold tracking-wider">123456789</span>
              </div>
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">Routing Number</span>
              <p class="text-[10px] text-gray-500">9 digits</p>
            </div>
            <div class="text-center">
              <div class="px-3 py-2 bg-green-100 dark:bg-green-900/50 rounded-lg border-2 border-green-400 dark:border-green-500 mb-2">
                <span class="text-green-700 dark:text-green-300 font-bold tracking-wider">0001234567890</span>
              </div>
              <span class="text-xs font-semibold text-green-600 dark:text-green-400">Account Number</span>
              <p class="text-[10px] text-gray-500">10-12 digits</p>
            </div>
            <div class="text-center opacity-50">
              <div class="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600 mb-2">
                <span class="text-gray-500 font-bold">1234</span>
              </div>
              <span class="text-xs text-gray-400">Check #</span>
              <p class="text-[10px] text-gray-400">Ignore this</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Skip Notice -->
      <div class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
        <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-700 dark:text-amber-300">This step is optional</p>
          <p class="text-sm text-amber-600 dark:text-amber-400">
            You can skip this and add banking information later in your profile settings.
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div class="flex items-start gap-3 p-4 rounded-xl bg-[var(--neu-bg-secondary)]">
        <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-[var(--neu-text)]">Your information is secure</p>
          <p class="text-sm text-[var(--neu-text-muted)]">
            Banking details are encrypted and only used for direct deposit. We never store full account numbers in plain text.
          </p>
        </div>
      </div>

      <!-- Bank Details -->
      <div class="space-y-4">
        <NeuInput
          v-model="userData.bankName"
          label="Bank name"
          placeholder="e.g., Chase, Bank of America"
        />

        <NeuSelect
          v-model="userData.bankAccountType"
          label="Account type"
          :options="accountTypeOptions"
          placeholder="Select..."
        />

        <!-- Routing Number -->
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Routing number</label>
          <div class="relative">
            <input
              v-model="userData.bankRoutingNumber"
              :type="showRoutingNumber ? 'text' : 'password'"
              placeholder="•••••••••"
              maxlength="9"
              class="neu-input w-full px-4 py-3 pr-12 rounded-xl text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]"
              @click="showRoutingNumber = !showRoutingNumber"
            >
              <svg v-if="showRoutingNumber" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-[var(--neu-text-muted)] mt-1">9 digits, found at the bottom of your check</p>
        </div>

        <!-- Account Number -->
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Account number</label>
          <div class="relative">
            <input
              v-model="userData.bankAccountNumber"
              :type="showAccountNumber ? 'text' : 'password'"
              placeholder="•••••••••••••"
              class="neu-input w-full px-4 py-3 pr-12 rounded-xl text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]"
              @click="showAccountNumber = !showAccountNumber"
            >
              <svg v-if="showAccountNumber" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Confirm Account Number -->
        <div>
          <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Confirm account number</label>
          <input
            v-model="userData.bankAccountNumberConfirm"
            :type="showAccountNumber ? 'text' : 'password'"
            placeholder="•••••••••••••"
            :class="[
              'neu-input w-full px-4 py-3 rounded-xl text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none',
              !accountsMatch && 'ring-2 ring-red-500'
            ]"
          />
          <p v-if="!accountsMatch" class="text-xs text-red-500 mt-1">Account numbers don't match</p>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <div class="flex gap-3">
          <NeuButton v-if="!hasStartedBanking" variant="ghost" @click="nextStep">
            Skip for now
          </NeuButton>
          <NeuButton variant="primary" :disabled="!isStep5Valid" :loading="isLoading" @click="handleContinue">
            {{ hasStartedBanking ? 'Continue' : 'Save & Continue' }}
          </NeuButton>
        </div>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
.neu-input {
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}
</style>
