<script setup lang="ts">
import { formatDate } from '~/utils/formatters'

const store = useTransactionsStore()
const toast = useToast()
const collapsed = useNavCollapsed()

const deletingId = ref<string | null>(null)

async function removeImport(importId: string) {
  deletingId.value = importId
  try {
    await store.removeImport(importId)
    toast.add({
      title: 'Import supprimé',
      color: 'success',
      duration: 2000
    })
  } finally {
    deletingId.value = null
  }
}

const personLabel: Record<string, string> = { thomas: 'Thomas', emma: 'Emma' }
</script>

<template>
  <UModal title="Historique des imports">
    <UButton
      :block="!collapsed"
      color="neutral"
      variant="ghost"
      icon="i-lucide-history"
      :label="collapsed ? undefined : `${store.imports.length} import${store.imports.length > 1 ? 's' : ''}`"
    />

    <template #body>
      <div
        v-if="!store.imports.length"
        class="py-6 text-center"
      >
        <p class="text-sm text-(--ui-text-muted)">
          Aucun import
        </p>
      </div>

      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="imp in store.imports"
          :key="imp.id"
          class="flex items-start gap-3 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs font-semibold text-primary">{{ personLabel[imp.person] }}</span>
              <span class="text-xs text-(--ui-text-muted)">·</span>
              <span class="text-xs text-(--ui-text-muted) truncate">{{ imp.fileName }}</span>
            </div>
            <p class="text-xs text-(--ui-text-muted)">
              {{ formatDate(imp.periodFrom) }} → {{ formatDate(imp.periodTo) }}
              · {{ imp.transactionCount }} transaction{{ imp.transactionCount > 1 ? 's' : '' }}
            </p>
            <p class="text-xs text-(--ui-text-muted) mt-0.5 opacity-60">
              Importé le {{ formatDate(imp.importedAt) }}
            </p>
          </div>

          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :loading="deletingId === imp.id"
            @click="removeImport(imp.id)"
          />
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          label="Fermer"
          @click="close"
        />
      </div>
    </template>
  </UModal>
</template>
