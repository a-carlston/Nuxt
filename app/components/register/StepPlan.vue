<script setup lang="ts">
import { pricingPlans, companySizeOptions, complianceOptions } from '~/constants/registration'

const {
  selectedPlan,
  billingCycle,
  selectedCompliance,
  estimatedEmployees,
  basePrices,
  compliancePricing,
  currentPrice,
  estimatedMonthly,
  annualSavings,
  canProceed,
  nextStep,
  prevStep
} = useRegistration()

function toggleCompliance(id: string) {
  const index = selectedCompliance.value.indexOf(id)
  if (index === -1) {
    selectedCompliance.value.push(id)
  } else {
    selectedCompliance.value.splice(index, 1)
  }
}
</script>

<template>
  <NeuCardForm title="Choose your plan" subtitle="All plans include a 14-day free trial">
    <div class="space-y-6">
      <!-- Billing Cycle Toggle - Inset Style -->
      <div class="flex justify-center">
        <div class="neu-toggle-container inline-flex p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            :class="[
              'flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              billingCycle === 'monthly'
                ? 'neu-toggle-active'
                : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]'
            ]"
            @click="billingCycle = 'monthly'"
          >
            Monthly
          </button>
          <button
            type="button"
            :class="[
              'flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              billingCycle === 'annual'
                ? 'neu-toggle-active'
                : 'text-[var(--neu-text-muted)] hover:text-[var(--neu-text)]'
            ]"
            @click="billingCycle = 'annual'"
          >
            Annual
            <span class="ml-1 px-1.5 py-0.5 rounded text-xs bg-[var(--neu-success)] text-white">-25%</span>
          </button>
        </div>
      </div>

      <!-- Plan Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="plan in pricingPlans"
          :key="plan.id"
          type="button"
          :class="[
            'neu-plan-card relative text-left p-5 rounded-2xl transition-all duration-200',
            selectedPlan === plan.id
              ? 'is-selected ring-2 ring-[var(--neu-primary)]'
              : 'hover:scale-[1.02]'
          ]"
          @click="selectedPlan = plan.id"
        >
          <!-- Popular Badge -->
          <div
            v-if="plan.popular"
            class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--neu-primary)] text-white text-xs font-medium"
          >
            Most Popular
          </div>

          <!-- Plan Icon & Name -->
          <div class="text-center mb-4">
            <span class="text-3xl mb-2 block">{{ plan.icon }}</span>
            <h3 class="text-lg font-bold text-[var(--neu-text)]">{{ plan.name }}</h3>
            <p class="text-xs text-[var(--neu-text-muted)] mt-1">{{ plan.description }}</p>
          </div>

          <!-- Price -->
          <div class="text-center mb-4 pb-4 border-b border-[var(--neu-shadow-dark)]/10">
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-3xl font-bold text-[var(--neu-text)]">
                ${{ basePrices[plan.id as keyof typeof basePrices][billingCycle] }}
              </span>
              <span class="text-sm text-[var(--neu-text-muted)]">/user/mo</span>
            </div>
            <p v-if="billingCycle === 'annual'" class="text-xs text-[var(--neu-success)] mt-1">
              Billed annually
            </p>
          </div>

          <!-- Features -->
          <ul class="space-y-2">
            <li
              v-for="feature in plan.features.slice(0, 5)"
              :key="feature"
              class="flex items-start gap-2 text-sm"
            >
              <span class="text-[var(--neu-success)] mt-0.5">✓</span>
              <span class="text-[var(--neu-text-muted)]">{{ feature }}</span>
            </li>
            <li v-if="plan.features.length > 5" class="text-xs text-[var(--neu-primary)] text-center pt-2">
              +{{ plan.features.length - 5 }} more features
            </li>
          </ul>

          <!-- Selection Indicator -->
          <div
            :class="[
              'absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
              selectedPlan === plan.id
                ? 'border-[var(--neu-primary)] bg-[var(--neu-primary)]'
                : 'border-[var(--neu-text-muted)]'
            ]"
          >
            <svg
              v-if="selectedPlan === plan.id"
              class="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      </div>

      <!-- Compliance Add-ons -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-[var(--neu-text)]">Compliance Add-ons</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            v-for="option in complianceOptions"
            :key="option.id"
            type="button"
            :class="[
              'neu-compliance-card p-4 rounded-xl text-left transition-all',
              selectedCompliance.includes(option.id) ? 'is-selected ring-2 ring-[var(--neu-primary)]' : ''
            ]"
            @click="toggleCompliance(option.id)"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <span class="font-medium text-sm text-[var(--neu-text)]">{{ option.name }}</span>
                <span
                  :class="[
                    'ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium',
                    `bg-[var(--neu-${option.color})]/20 text-[var(--neu-${option.color})]`
                  ]"
                >
                  {{ option.badge }}
                </span>
              </div>
              <div
                :class="[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  selectedCompliance.includes(option.id)
                    ? 'border-[var(--neu-primary)] bg-[var(--neu-primary)]'
                    : 'border-[var(--neu-text-muted)]'
                ]"
              >
                <svg
                  v-if="selectedCompliance.includes(option.id)"
                  class="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p class="text-xs text-[var(--neu-text-muted)] mb-2">{{ option.region }}</p>
            <p class="text-sm font-semibold text-[var(--neu-text)]">
              +${{ compliancePricing[option.id as keyof typeof compliancePricing][billingCycle] }}/user/mo
            </p>
          </button>
        </div>
      </div>

      <!-- Cost Estimate -->
      <div class="neu-estimate-card rounded-xl p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label class="text-sm font-semibold text-[var(--neu-text)]">Expected active headcount</label>
          <span
            v-if="annualSavings > 0"
            class="px-2 py-1 rounded-lg bg-[var(--neu-success)] text-white text-xs font-semibold self-start sm:self-auto"
          >
            Save up to ${{ annualSavings.toLocaleString() }}/yr
          </span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <NeuSelect
              v-model="estimatedEmployees"
              :options="companySizeOptions"
              placeholder="Number of employees"
            />
          </div>
          <div class="sm:text-right">
            <p class="text-sm text-[var(--neu-text)] mb-1">Estimated monthly</p>
            <p class="text-2xl font-bold text-[var(--neu-primary)]">${{ estimatedMonthly.toLocaleString() }}</p>
            <p class="text-xs text-[var(--neu-text)]">${{ currentPrice }}/user/mo</p>
          </div>
        </div>
      </div>

      <!-- Seasonal Planning Feature -->
      <div class="neu-feature-card rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 class="text-sm sm:text-base font-semibold text-[var(--neu-text)]">
            Seasonal Headcount Planning
          </h4>
          <span class="px-2 py-1 rounded-lg bg-[var(--neu-success)]/20 text-[var(--neu-success)] text-xs font-medium self-start sm:self-auto">
            Save up to 25%
          </span>
        </div>
        <p class="text-xs sm:text-sm text-[var(--neu-text)]">
          Plan different headcounts for each month. Pay upfront at annual rates, only pay overages when you exceed that month's plan.
        </p>

        <!-- Visual Example -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- October -->
          <div class="neu-month-card rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-[var(--neu-text)]">October</span>
              <span class="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-[var(--neu-warning)] text-white font-semibold">+5 overage</span>
            </div>
            <div class="space-y-1.5 text-xs sm:text-sm">
              <div class="flex justify-between">
                <span class="text-[var(--neu-text)]">Planned</span>
                <span class="text-[var(--neu-text)] font-medium">80</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--neu-text)]">Actual</span>
                <span class="text-[var(--neu-text)] font-semibold">85</span>
              </div>
              <div class="flex justify-between pt-1.5 border-t border-[var(--neu-shadow-dark)]/20">
                <span class="text-[var(--neu-text)]">Overage</span>
                <span class="text-[var(--neu-warning)] font-semibold">5 × $8</span>
              </div>
            </div>
          </div>

          <!-- November -->
          <div class="neu-month-card rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-[var(--neu-text)]">November</span>
              <span class="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-[var(--neu-primary)] text-white font-semibold">Peak season</span>
            </div>
            <div class="space-y-1.5 text-xs sm:text-sm">
              <div class="flex justify-between">
                <span class="text-[var(--neu-text)]">Planned</span>
                <span class="text-[var(--neu-primary)] font-medium">95 ↑</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--neu-text)]">Actual</span>
                <span class="text-[var(--neu-text)] font-semibold">94</span>
              </div>
              <div class="flex justify-between pt-1.5 border-t border-[var(--neu-shadow-dark)]/20">
                <span class="text-[var(--neu-text)]">Overage</span>
                <span class="text-[var(--neu-success)] font-semibold">$0</span>
              </div>
            </div>
          </div>
        </div>

        <p class="text-[10px] sm:text-xs text-[var(--neu-text)] text-center">
          The 5 hired early in Oct? Already in your Nov plan — no double charge.
        </p>
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
.neu-toggle-container {
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-toggle-active {
  background: var(--neu-bg);
  color: var(--neu-text);
  box-shadow: 2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light);
}

.neu-plan-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-plan-card:hover:not(.is-selected) {
  box-shadow: 6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light);
}

.neu-plan-card.is-selected {
  background: linear-gradient(135deg, var(--neu-bg) 0%, var(--neu-bg-secondary) 100%);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-estimate-card {
  background: var(--neu-bg-secondary);
  box-shadow: var(--neu-shadow-pressed);
}

.neu-compliance-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
}

.neu-compliance-card:hover:not(.is-selected) {
  box-shadow: 4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light);
}

.neu-compliance-card.is-selected {
  background: linear-gradient(135deg, var(--neu-bg) 0%, var(--neu-bg-secondary) 100%);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}

.neu-feature-card {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-flat);
  border: 1px solid var(--neu-primary);
}

.neu-month-card {
  background: var(--neu-bg);
  box-shadow: inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light);
}
</style>
