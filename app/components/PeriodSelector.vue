<script setup lang="ts">
import { formatYearMonth } from '~/utils/formatters'

const store = useTransactionsStore()

const options = computed(() =>
  store.availableYearMonths.map((ym: string) => ({
    label: formatYearMonth(ym),
    value: ym
  }))
)

const selected = computed({
  get: () => store.currentYearMonth ?? undefined,
  set: (v) => { store.selectedYearMonth = v ?? null }
})
</script>

<template>
  <div class="px-1">
    <p class="text-xs font-medium text-(--ui-text-muted) mb-1.5 px-2">
      Période
    </p>

    <div
      v-if="!options.length"
      class="px-2 text-xs text-(--ui-text-muted) italic"
    >
      Aucune donnée
    </div>

    <USelect
      v-else
      v-model="selected"
      :items="options"
      value-key="value"
      label-key="label"
      size="sm"
      class="w-full"
    />
  </div>
</template>
