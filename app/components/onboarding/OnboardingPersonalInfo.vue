<script setup lang="ts">
const {
  userData,
  countries,
  nationalitiesList,
  personalStates,
  personalCities,
  taxIdConfig,
  formatTaxId,
  isStep2Valid,
  isLoading,
  saveStepData,
  nextStep,
  prevStep
} = useOnboarding()

// Tax ID visibility toggle
const showTaxId = ref(false)

// Handle tax ID input with auto-formatting
function handleTaxIdInput(event: Event) {
  const input = event.target as HTMLInputElement
  const formatted = formatTaxId(input.value)
  userData.value.ssn = formatted
  // Keep cursor in right position
  nextTick(() => {
    input.value = formatted
  })
}

async function handleContinue() {
  const sessionData = localStorage.getItem('session')
  if (sessionData) {
    const session = JSON.parse(sessionData)
    try {
      await saveStepData(session.tenantSlug)
    } catch (e) {
      // Continue anyway, data will be saved at completion
    }
  }
  nextStep()
}

const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'not-specified' }
]

const pronounOptions = [
  { label: 'He/Him', value: 'he/him' },
  { label: 'She/Her', value: 'she/her' },
  { label: 'They/Them', value: 'they/them' },
  { label: 'Other', value: 'other' }
]

const maritalStatusOptions = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Domestic Partnership', value: 'domestic-partnership' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
  { label: 'Prefer not to say', value: 'not-specified' }
]
</script>

<template>
  <NeuCardForm
    title="Personal Information"
    subtitle="Review and complete your personal details"
  >
    <div class="space-y-6">
      <!-- Avatar and Name Section -->
      <div class="flex flex-col sm:flex-row items-start gap-6">
        <!-- Avatar -->
        <div class="flex flex-col items-center flex-shrink-0">
          <span class="text-xs text-[var(--neu-text-muted)] mb-2">Photo</span>
          <div class="relative">
            <NeuAvatar
              :src="userData.avatarUrl || undefined"
              :initials="userData.firstName && userData.lastName ? `${userData.firstName[0]}${userData.lastName[0]}` : 'ME'"
              size="xl"
            />
            <button
              type="button"
              class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--neu-primary)] text-white flex items-center justify-center shadow-lg"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Name Fields -->
        <div class="flex-1 w-full space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeuInput
              v-model="userData.firstName"
              label="First name *"
              placeholder="John"
            />
            <NeuInput
              v-model="userData.lastName"
              label="Last name *"
              placeholder="Smith"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeuInput
              v-model="userData.preferredName"
              label="Preferred name"
              placeholder="Johnny"
            />
            <NeuInput
              v-model="userData.maidenName"
              label="Maiden name"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Contact Information</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.email"
            label="Personal email *"
            type="email"
            placeholder="you@email.com"
          />
          <NeuInput
            v-model="userData.phone"
            label="Phone number *"
            type="tel"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <!-- Additional Personal Details -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Additional Details</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.dateOfBirth"
            label="Date of birth"
            type="date"
          />
          <NeuSelect
            v-model="userData.gender"
            label="Gender"
            :options="genderOptions"
            placeholder="Select..."
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="userData.pronouns"
            label="Pronouns"
            :options="pronounOptions"
            placeholder="Select..."
          />
          <NeuSelect
            v-model="userData.maritalStatus"
            label="Marital status"
            :options="maritalStatusOptions"
            placeholder="Select..."
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="userData.nationality"
            label="Nationality"
            :options="nationalitiesList"
            placeholder="Select nationality..."
            searchable
          />
          <div>
            <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">{{ taxIdConfig.label }}</label>
            <div class="relative">
              <input
                :value="userData.ssn"
                :type="showTaxId ? 'text' : 'password'"
                :placeholder="taxIdConfig.placeholder"
                :maxlength="taxIdConfig.maxLength"
                class="neu-input w-full px-4 py-3 pr-12 rounded-xl text-[var(--neu-text)] placeholder-[var(--neu-text-muted)]/50 focus:outline-none"
                @input="handleTaxIdInput"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]"
                @click="showTaxId = !showTaxId"
              >
                <svg v-if="showTaxId" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p v-if="userData.personalCountry === 'US'" class="text-xs text-[var(--neu-text-muted)] mt-1">Format: 000-00-0000</p>
            <p v-else-if="!taxIdConfig.mask" class="text-xs text-[var(--neu-text-muted)] mt-1">Optional - varies by country</p>
          </div>
        </div>
      </div>

      <!-- Home Address -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Home Address</h3>
        <NeuSelect
          v-model="userData.personalCountry"
          label="Country *"
          :options="countries"
          placeholder="Select country"
          searchable
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="userData.personalState"
            label="State / Province *"
            :options="personalStates"
            :disabled="!userData.personalCountry"
            placeholder="Select state"
            searchable
          />
          <NeuSelect
            v-model="userData.personalCity"
            label="City"
            :options="personalCities"
            :disabled="!userData.personalState"
            placeholder="Select city"
            searchable
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput
            v-model="userData.personalAddress"
            label="Street address *"
            placeholder="123 Main Street"
          />
          <NeuInput
            v-model="userData.personalZip"
            label="ZIP / Postal code *"
            placeholder="12345"
          />
        </div>
        <NeuInput
          v-model="userData.personalAddress2"
          label="Apt, suite, etc."
          placeholder="Apt 4B"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <NeuButton variant="primary" :disabled="!isStep2Valid" :loading="isLoading" @click="handleContinue">
          Continue
        </NeuButton>
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
