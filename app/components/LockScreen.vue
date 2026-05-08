<script setup lang="ts">
const { isRegistered, isSupported, register, authenticate, reset } = useBiometricAuth()

type Status = 'idle' | 'loading' | 'error'
const status = ref<Status>('idle')
const showReset = ref(false)

async function unlock() {
  if (status.value === 'loading') return
  status.value = 'loading'
  const ok = isRegistered.value ? await authenticate() : await register()
  status.value = ok ? 'idle' : 'error'
}

onMounted(() => {
  if (!isSupported.value) return
  unlock()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Blurred backdrop -->
      <div class="absolute inset-0 backdrop-blur-xl bg-default/60" />

      <!-- Card -->
      <div class="relative flex flex-col items-center gap-6 px-10 py-10 rounded-3xl bg-default/80 border border-default shadow-2xl w-80">
        <!-- App icon -->
        <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <UIcon
            name="i-lucide-wallet"
            class="text-white text-3xl"
          />
        </div>

        <div class="text-center">
          <h1 class="text-xl font-bold text-default">
            Budget
          </h1>
          <p class="text-sm text-muted mt-1">
            {{ isRegistered ? 'Déverrouillez pour continuer' : 'Configurez Touch ID pour sécuriser l\'app' }}
          </p>
        </div>

        <!-- Fingerprint button -->
        <button
          class="flex flex-col items-center gap-3 group"
          :disabled="status === 'loading'"
          @click="unlock"
        >
          <div
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200"
            :class="[
              status === 'error' ? 'bg-rose-500/15 text-rose-500' : 'bg-primary/10 text-primary',
              status === 'loading' ? 'opacity-50' : 'group-hover:bg-primary/20 group-active:scale-95'
            ]"
          >
            <UIcon
              :name="status === 'loading' ? 'i-lucide-loader-circle' : 'i-lucide-fingerprint'"
              class="text-5xl"
              :class="status === 'loading' ? 'animate-spin' : ''"
            />
          </div>
          <span
            class="text-sm font-medium"
            :class="status === 'error' ? 'text-rose-500' : 'text-muted'"
          >
            <span v-if="status === 'loading'">Vérification…</span>
            <span v-else-if="status === 'error'">Échec — Réessayer</span>
            <span v-else-if="isRegistered">Touch ID / Face ID</span>
            <span v-else>Configurer Touch ID</span>
          </span>
        </button>

        <!-- Reset link -->
        <button
          v-if="isRegistered"
          class="text-xs text-muted hover:text-default transition-colors"
          @click="showReset = !showReset"
        >
          Problème d'accès ?
        </button>

        <div
          v-if="showReset"
          class="w-full rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center"
        >
          <p class="text-xs text-rose-600 mb-2">
            Cela supprimera la clé biométrique enregistrée.
          </p>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            label="Réinitialiser Touch ID"
            icon="i-lucide-trash-2"
            @click="reset"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
