<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'fr' }
})

const store = useTransactionsStore()
onMounted(() => store.load())

const navCollapsed = useNavCollapsed()
const { isAuthenticated, isSupported } = useBiometricAuth()
const isDev = computed(() => typeof window !== 'undefined' && window.location.hostname === 'localhost')
const showLock = computed(() => !isDev.value && isSupported.value && !isAuthenticated.value)
</script>

<template>
  <UApp>
    <LockScreen v-if="showLock" />
    <div class="flex h-screen overflow-hidden bg-(--ui-bg)">
      <AppNav
        class="shrink-0 border-r border-default transition-[width] duration-200 overflow-hidden"
        :class="navCollapsed ? 'w-14' : 'w-64'"
      />
      <main class="flex-1 overflow-y-auto">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
