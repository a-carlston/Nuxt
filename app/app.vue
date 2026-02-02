<template>
  <div class="min-h-screen bg-[var(--neu-bg)] text-[var(--neu-text)]">
    <!-- Skeleton loader that matches page layout -->
    <div :class="['skeleton-overlay', { hidden: isReady }]">
      <!-- Skeleton Navbar -->
      <div class="skeleton-navbar">
        <div class="skeleton-logo"></div>
        <div class="skeleton-nav-items">
          <div class="skeleton-nav-item"></div>
          <div class="skeleton-nav-item"></div>
          <div class="skeleton-nav-item"></div>
        </div>
        <div class="skeleton-nav-actions">
          <div class="skeleton-btn-small"></div>
          <div class="skeleton-btn-primary"></div>
        </div>
      </div>

      <!-- Skeleton Hero -->
      <div class="skeleton-hero">
        <div class="skeleton-hero-content">
          <div class="skeleton-badge"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-title-short"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text-short"></div>
          <div class="skeleton-hero-buttons">
            <div class="skeleton-btn-large"></div>
            <div class="skeleton-btn-large"></div>
          </div>
        </div>
        <div class="skeleton-hero-card">
          <div class="skeleton-card-header"></div>
          <div class="skeleton-card-row"></div>
          <div class="skeleton-card-row"></div>
          <div class="skeleton-card-row"></div>
        </div>
      </div>
    </div>

    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const isReady = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isReady.value = true
  })
})
</script>
