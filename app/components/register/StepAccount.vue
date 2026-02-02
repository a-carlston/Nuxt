<script setup lang="ts">
const {
  email,
  password,
  confirmPassword,
  firstName,
  preferredName,
  lastName,
  maidenName,
  phone,
  avatarPreview,
  handleAvatarUpload,
  removeAvatar,
  // Personal Address
  personalCountry,
  personalState,
  personalCity,
  personalAddress,
  personalAddress2,
  personalZip,
  personalStates,
  personalCities,
  personalPhoneCode,
  countries,
  // Validation
  isEmailValid,
  passwordChecks,
  doPasswordsMatch,
  canProceed,
  nextStep
} = useRegistration()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileUpload() {
  fileInputRef.value?.click()
}
</script>

<template>
  <NeuCardForm title="Create your account" subtitle="Set up your admin account for your company">
    <div class="space-y-5">
      <!-- Avatar and Name Row -->
      <div class="flex flex-col sm:flex-row items-center gap-6">
        <!-- Avatar Upload - Clickable -->
        <div class="flex flex-col items-center flex-shrink-0">
          <span class="text-xs text-[var(--neu-text-muted)] mb-2">Upload avatar</span>
          <div class="relative group">
            <div class="cursor-pointer" @click="triggerFileUpload">
              <NeuAvatar
                :src="avatarPreview || undefined"
                :initials="firstName && lastName ? `${firstName[0]}${lastName[0]}` : '?'"
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
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarUpload"
            />
            <!-- Remove button -->
            <button
              v-if="avatarPreview"
              type="button"
              class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--neu-danger)] text-white flex items-center justify-center text-xs shadow-md z-10"
              @click.stop="removeAvatar"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Name fields -->
        <div class="flex-1 w-full space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeuInput v-model="firstName" label="First name" placeholder="John" />
            <NeuInput v-model="preferredName" label="Preferred name (optional)" placeholder="Johnny" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeuInput v-model="lastName" label="Last name" placeholder="Smith" />
            <NeuInput v-model="maidenName" label="Maiden name (optional)" placeholder="Jones" />
          </div>
        </div>
      </div>

      <!-- Email with validation -->
      <div>
        <NeuInput
          v-model="email"
          type="email"
          label="Work email"
          placeholder="you@company.com"
          :error="email && !isEmailValid ? 'Please enter a valid email address' : undefined"
        />
      </div>

      <!-- Personal Address -->
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Personal Address</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="personalCountry"
            label="Country"
            placeholder="Select country"
            :options="countries"
            searchable
          />
          <NeuSelect
            v-model="personalState"
            label="State / Province"
            placeholder="Select state"
            :options="personalStates"
            :disabled="!personalCountry"
            searchable
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NeuSelect
            v-model="personalCity"
            label="City"
            placeholder="Select city"
            :options="personalCities"
            :disabled="!personalState"
            searchable
          />
          <NeuInput v-model="personalZip" label="ZIP / Postal code" placeholder="12345" />
        </div>
        <NeuInput v-model="personalAddress" label="Street address" placeholder="123 Main Street" />
        <NeuInput v-model="personalAddress2" label="Apt, suite, etc. (optional)" placeholder="Apt 4B" />
      </div>

      <!-- Phone with country code hint -->
      <NeuInput
        v-model="phone"
        type="tel"
        label="Phone number"
        :placeholder="personalPhoneCode ? `${personalPhoneCode} (555) 000-0000` : '+1 (555) 000-0000'"
      />

      <!-- Password Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NeuInput
          v-model="password"
          type="password"
          label="Password"
          placeholder="Create a strong password"
        />
        <NeuInput
          v-model="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Re-enter password"
          :error="confirmPassword && !doPasswordsMatch ? 'Passwords do not match' : undefined"
        />
      </div>

      <!-- Password requirements checklist -->
      <div v-if="password" class="grid grid-cols-2 gap-2 text-xs">
        <div :class="['flex items-center gap-2', passwordChecks.minLength ? 'text-[var(--neu-success)]' : 'text-[var(--neu-text-muted)]']">
          <span>{{ passwordChecks.minLength ? '✓' : '○' }}</span>
          <span>At least 8 characters</span>
        </div>
        <div :class="['flex items-center gap-2', passwordChecks.hasUppercase ? 'text-[var(--neu-success)]' : 'text-[var(--neu-text-muted)]']">
          <span>{{ passwordChecks.hasUppercase ? '✓' : '○' }}</span>
          <span>One uppercase letter</span>
        </div>
        <div :class="['flex items-center gap-2', passwordChecks.hasLowercase ? 'text-[var(--neu-success)]' : 'text-[var(--neu-text-muted)]']">
          <span>{{ passwordChecks.hasLowercase ? '✓' : '○' }}</span>
          <span>One lowercase letter</span>
        </div>
        <div :class="['flex items-center gap-2', passwordChecks.hasNumber ? 'text-[var(--neu-success)]' : 'text-[var(--neu-text-muted)]']">
          <span>{{ passwordChecks.hasNumber ? '✓' : '○' }}</span>
          <span>One number</span>
        </div>
        <div :class="['flex items-center gap-2', passwordChecks.hasSpecial ? 'text-[var(--neu-success)]' : 'text-[var(--neu-text-muted)]']">
          <span>{{ passwordChecks.hasSpecial ? '✓' : '○' }}</span>
          <span>One special character (optional)</span>
        </div>
        <div v-if="confirmPassword && doPasswordsMatch" class="flex items-center gap-2 text-[var(--neu-success)]">
          <span>✓</span>
          <span>Passwords match</span>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between">
        <span class="text-sm text-[var(--neu-text-muted)]">
          Already have an account? <NuxtLink to="/" class="text-[var(--neu-primary)] font-medium">Sign in</NuxtLink>
        </span>
        <NeuButton variant="primary" :disabled="!canProceed" @click="nextStep">Continue</NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>
