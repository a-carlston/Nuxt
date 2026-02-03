<script setup lang="ts">
const {
  userData,
  isStep3Valid,
  isLoading,
  saveStepData,
  nextStep,
  prevStep
} = useOnboarding()

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

const relationshipOptions = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Partner', value: 'partner' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
  { label: 'Friend', value: 'friend' },
  { label: 'Other', value: 'other' }
]
</script>

<template>
  <NeuCardForm
    title="Emergency Contact"
    subtitle="Who should we contact in case of emergency?"
  >
    <div class="space-y-6">
      <!-- Info Banner -->
      <div class="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
        <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-blue-700 dark:text-blue-300">
          This information is kept confidential and only used in case of emergency.
          Please provide someone who can be reached during your work hours.
        </p>
      </div>

      <!-- Contact Details -->
      <div class="space-y-4">
        <NeuInput
          v-model="userData.emergencyContactName"
          label="Contact name *"
          placeholder="Jane Smith"
        />

        <NeuSelect
          v-model="userData.emergencyContactRelationship"
          label="Relationship *"
          :options="relationshipOptions"
          placeholder="Select relationship..."
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.emergencyContactPhone"
            label="Phone number *"
            type="tel"
            placeholder="(555) 123-4567"
          />
          <NeuInput
            v-model="userData.emergencyContactEmail"
            label="Email (optional)"
            type="email"
            placeholder="jane@email.com"
          />
        </div>

        <NeuInput
          v-model="userData.emergencyContactAddress"
          label="Address (optional)"
          placeholder="123 Main St, City, State 12345"
        />
      </div>

      <!-- Add Another Contact (future feature placeholder) -->
      <div class="pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <button
          type="button"
          disabled
          class="flex items-center gap-2 text-sm text-[var(--neu-text-muted)] opacity-50 cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add another emergency contact (coming soon)
        </button>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <NeuButton variant="primary" :disabled="!isStep3Valid" :loading="isLoading" @click="handleContinue">
          Continue
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>
