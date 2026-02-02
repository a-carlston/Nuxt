<script setup lang="ts">
import { pricingPlans, complianceOptions } from '~/constants/registration'

const {
  sameAsCompany,
  billingCountry,
  billingState,
  billingCity,
  billingAddress,
  billingAddress2,
  billingZip,
  cardName,
  cardNumber,
  cardExpiry,
  cardCvc,
  cardSignature,
  companyAddress,
  companyAddress2,
  companyCity,
  companyState,
  companyZip,
  companyCountry,
  countries,
  billingStates,
  billingCities,
  cardType,
  selectedPlan,
  billingCycle,
  selectedCompliance,
  basePrices,
  compliancePricing,
  currentPrice,
  estimatedMonthly,
  trialEndDate,
  formatCardNumber,
  formatExpiry,
  formatCvc,
  agreeTerms,
  canProceed,
  prevStep,
  submitRegistration
} = useRegistration()

const isCardFlipped = ref(false)

function focusCvc() {
  isCardFlipped.value = true
}

function blurCvc() {
  isCardFlipped.value = false
}
</script>

<template>
  <NeuCardForm title="Billing information" subtitle="You won't be charged until your trial ends">
    <div class="space-y-6">
      <!-- Interactive Credit Card -->
      <div class="overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <label class="text-sm font-semibold text-[var(--neu-text)]">Payment method</label>
          <span class="text-[10px] sm:text-xs text-[var(--neu-primary)] flex items-center gap-1">
            <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click on card to enter details
          </span>
        </div>

        <!-- Card Container with Flip -->
        <div class="card-container mx-auto w-full max-w-sm mb-4" style="perspective: 1000px;">
          <div
            :class="['card-flipper relative w-full transition-transform duration-500', { 'is-flipped': isCardFlipped }]"
            style="transform-style: preserve-3d;"
          >
            <!-- Front of Card -->
            <div
              :class="[
                'card-front relative aspect-[1.586/1] w-full rounded-xl sm:rounded-2xl p-3 sm:p-5 overflow-hidden',
                cardType === 'visa' ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                cardType === 'mastercard' ? 'bg-gradient-to-br from-red-500 to-orange-600' :
                cardType === 'amex' ? 'bg-gradient-to-br from-slate-600 to-slate-800' :
                cardType === 'discover' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                'bg-gradient-to-br from-gray-600 to-gray-800'
              ]"
              style="backface-visibility: hidden;"
            >
              <!-- Card Background Pattern -->
              <div class="absolute inset-0 opacity-10 pointer-events-none">
                <div class="absolute top-4 right-4 w-20 sm:w-32 h-20 sm:h-32 rounded-full bg-white" />
                <div class="absolute -bottom-8 -left-8 w-28 sm:w-40 h-28 sm:h-40 rounded-full bg-white" />
              </div>

              <!-- Card Content -->
              <div class="relative h-full flex flex-col justify-between text-white">
                <!-- Top Row: Chip & Logo -->
                <div class="flex justify-between items-start">
                  <div class="w-9 sm:w-12 h-7 sm:h-9 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-inner" />
                  <div class="text-right">
                    <span v-if="cardType === 'visa'" class="text-xl sm:text-2xl font-bold italic">VISA</span>
                    <span v-else-if="cardType === 'mastercard'" class="text-lg sm:text-xl font-bold flex items-center">
                      <span class="inline-block w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-red-500 -mr-2" />
                      <span class="inline-block w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-yellow-500 opacity-80" />
                    </span>
                    <span v-else-if="cardType === 'amex'" class="text-lg sm:text-xl font-bold">AMEX</span>
                    <span v-else-if="cardType === 'discover'" class="text-lg sm:text-xl font-bold">DISCOVER</span>
                    <span v-else class="text-xs sm:text-sm opacity-60">CARD</span>
                  </div>
                </div>

                <!-- Card Number Input -->
                <div class="my-1 sm:my-2">
                  <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Card Number</p>
                  <input
                    :value="cardNumber"
                    @input="formatCardNumber"
                    type="text"
                    inputmode="numeric"
                    placeholder="•••• •••• •••• ••••"
                    :class="[
                      'card-input w-full bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white font-mono text-sm sm:text-lg tracking-wider placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all',
                      !cardNumber && 'animate-pulse-subtle'
                    ]"
                  />
                </div>

                <!-- Bottom Row: Name & Expiry -->
                <div class="flex justify-between items-end gap-2 sm:gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Card Holder</p>
                    <input
                      v-model="cardName"
                      type="text"
                      placeholder="YOUR NAME"
                      class="card-input w-full bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-white font-medium text-xs sm:text-sm uppercase tracking-wide placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all"
                    />
                  </div>
                  <div class="flex-shrink-0">
                    <p class="text-[8px] sm:text-[10px] uppercase opacity-60 mb-0.5 sm:mb-1">Expires</p>
                    <input
                      :value="cardExpiry"
                      @input="formatExpiry"
                      type="text"
                      inputmode="numeric"
                      placeholder="MM/YY"
                      class="card-input w-16 sm:w-20 bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-white font-mono text-xs sm:text-sm text-center placeholder-white/40 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Back of Card -->
            <div
              :class="[
                'card-back absolute inset-0 aspect-[1.586/1] w-full rounded-xl sm:rounded-2xl overflow-hidden',
                cardType === 'visa' ? 'bg-gradient-to-br from-blue-700 to-blue-900' :
                cardType === 'mastercard' ? 'bg-gradient-to-br from-red-600 to-orange-700' :
                cardType === 'amex' ? 'bg-gradient-to-br from-slate-700 to-slate-900' :
                cardType === 'discover' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                'bg-gradient-to-br from-gray-700 to-gray-900'
              ]"
              style="backface-visibility: hidden; transform: rotateY(180deg);"
            >
              <!-- Magnetic Strip -->
              <div class="w-full h-6 sm:h-10 bg-gray-900 mt-3 sm:mt-5" />

              <!-- CVV & Signature Section -->
              <div class="px-3 sm:px-5 mt-2 sm:mt-3">
                <div class="flex items-start gap-2 sm:gap-3">
                  <!-- Signature Area -->
                  <div class="flex-1">
                    <p class="text-[7px] sm:text-[9px] text-white/60 mb-1 leading-tight">
                      I authorize billing based on active headcount after trial. Auto-renews until cancelled.
                    </p>
                    <div class="relative">
                      <input
                        v-model="cardSignature"
                        type="text"
                        :placeholder="cardName || 'Sign here'"
                        class="w-full h-7 sm:h-9 bg-white/90 rounded px-2 text-gray-800 text-xs sm:text-sm italic placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        style="font-family: 'Brush Script MT', cursive, serif;"
                      />
                      <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] text-gray-400">
                        {{ trialEndDate }}
                      </span>
                    </div>
                  </div>
                  <!-- CVC -->
                  <div class="text-right flex-shrink-0">
                    <p class="text-[8px] sm:text-[10px] text-white/60 uppercase mb-0.5 sm:mb-1">CVC</p>
                    <input
                      :value="cardCvc"
                      @input="formatCvc"
                      @focus="focusCvc"
                      @blur="blurCvc"
                      type="text"
                      inputmode="numeric"
                      placeholder="•••"
                      class="w-12 sm:w-14 h-7 sm:h-9 bg-white rounded text-gray-800 font-mono text-center text-base sm:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              <!-- Agreement Text -->
              <div class="px-3 sm:px-5 mt-1 sm:mt-2">
                <p class="text-[6px] sm:text-[8px] text-white/40 leading-tight">
                  By signing, you agree to be charged monthly based on your active employee headcount starting {{ trialEndDate }}.
                  Subscription auto-renews until cancelled. Cancel anytime from your account settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- CVC Input Helper (for mobile/accessibility) -->
        <div class="flex items-center justify-center gap-2 text-sm text-[var(--neu-text-muted)]">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="isCardFlipped ? 'bg-[var(--neu-bg-secondary)] text-[var(--neu-text)]' : 'text-[var(--neu-primary)]'"
            @click="isCardFlipped = !isCardFlipped"
          >
            {{ isCardFlipped ? 'Show front' : 'Enter CVC on back' }}
          </button>
        </div>
      </div>

      <!-- Billing Address -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium text-[var(--neu-text)]">Billing address</label>
          <NeuCheckbox v-model="sameAsCompany" label="Same as company" size="sm" />
        </div>
        <div v-if="!sameAsCompany" class="space-y-4">
          <NeuSearch v-model="billingCountry" :options="countries" label="Country" placeholder="Search country..." />
          <NeuInput v-model="billingAddress" label="Street address" placeholder="123 Main Street" />
          <NeuInput v-model="billingAddress2" label="Apt, suite, etc. (optional)" placeholder="Suite 100" />
          <div class="grid grid-cols-3 gap-4">
            <NeuSearch
              v-if="billingCities.length > 0"
              v-model="billingCity"
              :options="billingCities"
              label="City"
              placeholder="Search..."
            />
            <NeuInput v-else v-model="billingCity" label="City" placeholder="City" />
            <NeuSearch
              v-if="billingStates.length > 0"
              v-model="billingState"
              :options="billingStates"
              label="State"
              placeholder="Search..."
            />
            <NeuInput v-else v-model="billingState" label="State" placeholder="State" />
            <NeuInput v-model="billingZip" label="ZIP code" placeholder="12345" />
          </div>
        </div>
        <NeuCard v-else variant="pressed" padding="sm">
          <p class="text-sm text-[var(--neu-text-muted)]">
            {{ companyAddress }}<span v-if="companyAddress2">, {{ companyAddress2 }}</span><br>
            {{ companyCity }}<span v-if="companyState">, {{ companyState }}</span> {{ companyZip }}<br>
            {{ countries.find(c => c.value === companyCountry)?.label?.slice(2) }}
          </p>
        </NeuCard>
      </div>

      <!-- Order Summary -->
      <div class="neu-summary-card p-4 rounded-xl">
        <h4 class="font-semibold text-[var(--neu-text)] mb-3">Order summary</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-[var(--neu-text)]">{{ pricingPlans.find(p => p.id === selectedPlan)?.name }} plan</span>
            <span class="text-[var(--neu-text)] font-medium">${{ basePrices[selectedPlan as keyof typeof basePrices][billingCycle] }}/user/mo</span>
          </div>
          <div v-for="compId in selectedCompliance" :key="compId" class="flex justify-between">
            <span class="text-[var(--neu-text)]">{{ complianceOptions.find(c => c.id === compId)?.name }}</span>
            <span class="text-[var(--neu-text)] font-medium">+${{ compliancePricing[compId as keyof typeof compliancePricing][billingCycle] }}/user/mo</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--neu-text)]">Billing cycle</span>
            <span class="text-[var(--neu-text)] font-medium">{{ billingCycle === 'annual' ? 'Annual' : 'Monthly' }}</span>
          </div>
          <div class="flex justify-between pt-2 mt-2 border-t border-[var(--neu-shadow-dark)]/20">
            <span class="text-[var(--neu-text)] font-semibold">Total per user</span>
            <span class="text-[var(--neu-primary)] font-bold">${{ currentPrice }}/mo</span>
          </div>
          <div class="flex justify-between pt-2 mt-2 border-t border-[var(--neu-shadow-dark)]/20">
            <span class="text-[var(--neu-text)] font-semibold">Due today</span>
            <span class="text-[var(--neu-success)] font-bold text-lg">$0.00</span>
          </div>
          <p class="text-xs text-[var(--neu-text)] mt-3 p-2 rounded-lg bg-[var(--neu-bg-secondary)]">
            Your 14-day free trial starts today. You'll be charged based on active headcount starting {{ new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() }}.
          </p>
        </div>
      </div>

      <!-- Terms -->
      <NeuCheckbox v-model="agreeTerms">
        <template #label>
          <span class="text-sm text-[var(--neu-text-muted)]">
            I agree to the <a href="#" class="text-[var(--neu-primary)]">Terms of Service</a> and <a href="#" class="text-[var(--neu-primary)]">Privacy Policy</a>
          </span>
        </template>
      </NeuCheckbox>
    </div>
    <template #footer>
      <div class="flex justify-between">
        <NeuButton variant="ghost" @click="prevStep">Back</NeuButton>
        <NeuButton variant="primary" :disabled="!canProceed" @click="submitRegistration">
          Start Free Trial
        </NeuButton>
      </div>
    </template>
  </NeuCardForm>
</template>

<style scoped>
.card-flipper {
  transform-style: preserve-3d;
}

.card-flipper.is-flipped {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}

.neu-summary-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  border: 2px solid var(--neu-primary);
}

.card-input {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

@keyframes pulse-subtle {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
</style>
