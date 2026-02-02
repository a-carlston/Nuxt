<script setup lang="ts">
import { industryOptions } from '~/constants/registration'

const {
  companyName,
  companyTagline,
  companySlug,
  slugStatus,
  industry,
  website,
  taxId,
  logoPreview,
  handleLogoUpload,
  removeLogo,
  useCustomHeader,
  headerImagePreview,
  handleHeaderImageUpload,
  removeHeaderImage,
  // Address
  companyCountry,
  companyState,
  companyCity,
  companyAddress,
  companyAddress2,
  companyZip,
  countries,
  companyStates,
  companyCities,
  canProceed,
  nextStep,
  prevStep
} = useRegistration()

const logoInputRef = ref<HTMLInputElement | null>(null)
const headerInputRef = ref<HTMLInputElement | null>(null)
const showAdvanced = ref(false)

function triggerLogoUpload() {
  logoInputRef.value?.click()
}

function triggerHeaderUpload() {
  headerInputRef.value?.click()
}
</script>

<template>
  <NeuCardForm title="Company information" subtitle="Basic details about your organization">
    <div class="space-y-5">
      <!-- Logo and Company Name Row -->
      <div class="flex flex-col sm:flex-row items-center gap-6">
        <!-- Logo Upload - Clickable -->
        <div class="flex flex-col items-center flex-shrink-0">
          <span class="text-xs text-[var(--neu-text-muted)] mb-2">Company logo</span>
          <div class="relative group">
            <div class="cursor-pointer" @click="triggerLogoUpload">
              <NeuAvatar
                :src="logoPreview || undefined"
                :initials="companyName ? companyName.substring(0, 2).toUpperCase() : 'CO'"
                size="xl"
                class="pointer-events-none"
              />
              <!-- Hover overlay -->
              <div class="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              ref="logoInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleLogoUpload"
            />
            <!-- Remove button -->
            <button
              v-if="logoPreview"
              type="button"
              class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--neu-danger)] text-white flex items-center justify-center text-xs shadow-md z-10"
              @click.stop="removeLogo"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Company name and tagline -->
        <div class="flex-1 w-full space-y-3">
          <NeuInput v-model="companyName" label="Company name" placeholder="Acme Corporation" />
          <NeuInput v-model="companyTagline" label="Tagline (optional)" placeholder="Making the world a better place" />
        </div>
      </div>

      <!-- Company URL - Inset style -->
      <div>
        <label class="block text-sm font-medium text-[var(--neu-text)] mb-2">Company URL</label>
        <div class="neu-inset-field flex items-center rounded-xl overflow-hidden">
          <span class="px-4 py-2.5 text-sm text-[var(--neu-text-muted)] whitespace-nowrap">
            shiftflow.app/
          </span>
          <div class="flex-1 relative">
            <input
              :value="companySlug"
              type="text"
              placeholder="your-company"
              readonly
              class="w-full px-2 py-2.5 bg-transparent text-[var(--neu-text)] placeholder-[var(--neu-text-muted)] focus:outline-none"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2">
              <span v-if="slugStatus === 'checking'" class="text-[var(--neu-text-muted)]">
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
              <span v-else-if="slugStatus === 'available'" class="text-[var(--neu-success)]">✓</span>
              <span v-else-if="slugStatus === 'taken'" class="text-[var(--neu-danger)]">✕</span>
            </span>
          </div>
        </div>
        <p v-if="slugStatus === 'taken'" class="mt-1 text-sm text-[var(--neu-danger)]">This URL is already taken</p>
        <p v-else-if="slugStatus === 'available'" class="mt-1 text-sm text-[var(--neu-success)]">URL is available</p>
      </div>

      <NeuSelect v-model="industry" :options="industryOptions" label="Industry" placeholder="Select..." searchable />

      <NeuInput v-model="website" label="Website (optional)" placeholder="www.company.com" />
      <NeuInput v-model="taxId" label="Tax ID / EIN (optional)" placeholder="XX-XXXXXXX" />

      <!-- Company Address -->
      <div class="space-y-4 pt-4 border-t border-[var(--neu-shadow-dark)]/10">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Company Address</h3>
        <NeuSelect
          v-model="companyCountry"
          label="Country"
          placeholder="Select country"
          :options="countries"
          searchable
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="companyCity"
            label="City"
            placeholder="Select city"
            :options="companyCities"
            :disabled="!companyState"
            searchable
          />
          <NeuSelect
            v-model="companyState"
            label="State / Province"
            placeholder="Select state"
            :options="companyStates"
            :disabled="!companyCountry"
            searchable
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuInput v-model="companyAddress" label="Street address" placeholder="123 Main Street" />
          <NeuInput v-model="companyZip" label="ZIP / Postal code" placeholder="12345" />
        </div>
        <NeuInput v-model="companyAddress2" label="Suite, floor, etc. (optional)" placeholder="Suite 100" />
      </div>

      <!-- Advanced Options -->
      <div class="border-t border-[var(--neu-shadow-dark)]/10 pt-4">
        <button
          type="button"
          class="flex items-center gap-2 text-sm font-medium text-[var(--neu-text-muted)] hover:text-[var(--neu-text)] transition-colors"
          @click="showAdvanced = !showAdvanced"
        >
          <svg
            :class="['w-4 h-4 transition-transform', { 'rotate-90': showAdvanced }]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Advanced options
        </button>

        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[500px]"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 max-h-[500px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showAdvanced" class="mt-4 space-y-4 overflow-hidden">
            <!-- Custom Header Toggle -->
            <NeuCheckbox v-model="useCustomHeader">
              <template #label>
                <span class="text-sm text-[var(--neu-text)]">Use custom header image for company name</span>
              </template>
            </NeuCheckbox>

            <p class="text-xs text-[var(--neu-text-muted)]">
              Upload a transparent PNG with your company name in your custom font/style. This will be displayed in the app header instead of plain text.
            </p>

            <!-- Header Preview -->
            <div class="neu-preview-card rounded-xl p-4">
              <p class="text-xs text-[var(--neu-text-muted)] mb-3">Header preview</p>
              <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--neu-bg-secondary)]">
                <!-- Logo -->
                <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    v-if="logoPreview"
                    :src="logoPreview"
                    alt="Logo"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-[var(--neu-primary)] flex items-center justify-center text-white font-bold text-sm"
                  >
                    {{ companyName ? companyName.substring(0, 2).toUpperCase() : 'CO' }}
                  </div>
                </div>
                <!-- Company Name -->
                <div v-if="useCustomHeader && headerImagePreview" class="flex-1">
                  <img
                    :src="headerImagePreview"
                    alt="Company header"
                    class="h-8 object-contain"
                  />
                </div>
                <div v-else class="flex-1">
                  <p class="font-semibold text-[var(--neu-text)]">{{ companyName || 'Company Name' }}</p>
                  <p v-if="companyTagline" class="text-xs text-[var(--neu-text-muted)]">{{ companyTagline }}</p>
                </div>
              </div>
            </div>

            <!-- Custom Header Image Upload -->
            <div v-if="useCustomHeader" class="space-y-3">
              <label class="block text-sm font-medium text-[var(--neu-text)]">Custom header image</label>
              <div class="flex items-center gap-4">
                <div
                  v-if="headerImagePreview"
                  class="relative neu-inset-field rounded-xl p-3 pr-10"
                >
                  <img :src="headerImagePreview" alt="Header preview" class="h-8 object-contain" />
                  <button
                    type="button"
                    class="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--neu-danger)] text-white flex items-center justify-center text-xs shadow-md"
                    @click="removeHeaderImage"
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  class="neu-btn neu-btn-ghost px-4 py-2 rounded-xl text-sm font-medium"
                  @click="triggerHeaderUpload"
                >
                  {{ headerImagePreview ? 'Change image' : 'Upload image' }}
                </button>
                <input
                  ref="headerInputRef"
                  type="file"
                  accept="image/png"
                  class="hidden"
                  @change="handleHeaderImageUpload"
                />
              </div>
              <p class="text-xs text-[var(--neu-text-muted)]">
                Recommended: Transparent PNG, max height 40px
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <NeuButton variant="primary" :disabled="!canProceed" @click="nextStep">Continue</NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
.neu-inset-field {
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-preview-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-btn-ghost {
  background: var(--neu-bg);
  color: var(--neu-text);
  box-shadow: var(--neu-shadow-flat);
}

.neu-btn-ghost:hover {
  box-shadow: var(--neu-shadow-pressed);
}
</style>
