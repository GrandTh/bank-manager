<script setup lang="ts">
import { formatYearMonth } from '~/utils/formatters'
import type { Person } from '~/types'

useSeoMeta({ title: 'Transactions · Budget' })

const store = useTransactionsStore()
const route = useRoute()

const personFilter = ref<Person | 'all'>((route.query.person as Person) ?? 'all')

const period = computed(() =>
  store.currentYearMonth ? formatYearMonth(store.currentYearMonth) : 'Toutes périodes'
)

const personOptions: { label: string, value: Person | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Thomas', value: 'thomas' },
  { label: 'Emma', value: 'emma' }
]
</script>

<template>
  <div class="flex flex-col h-full p-6 gap-4 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          size="sm"
          to="/"
        />
        <div>
          <h1 class="text-xl font-bold text-default">
            Transactions
          </h1>
          <p class="text-sm text-muted">
            {{ period }}
          </p>
        </div>
      </div>

      <!-- Person tabs -->
      <div class="flex gap-1 p-1 rounded-lg bg-elevated">
        <button
          v-for="opt in personOptions"
          :key="opt.value"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          :class="personFilter === opt.value
            ? 'bg-default text-default shadow-sm'
            : 'text-muted hover:text-default'"
          @click="personFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Card with internal scroll -->
    <div class="flex-1 overflow-hidden rounded-xl border border-default bg-default flex flex-col">
      <AnimatedTransactionList :person="personFilter === 'all' ? undefined : personFilter" />
    </div>
  </div>
</template>
