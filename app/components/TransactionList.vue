<script setup lang="ts">
import { FALLBACK_META } from '~/utils/categories'
import { formatDate, formatCurrency } from '~/utils/formatters'
import type { Transaction, Category, Person } from '~/types'

const props = defineProps<{
  person?: Person
  limit?: number
}>()

const store = useTransactionsStore()
const toast = useToast()

const search = ref('')
const directionFilter = ref<'all' | 'debit' | 'credit'>('all')
const categoryFilter = ref<Category | 'all'>('all')
const editingCategory = ref<string | null>(null)

function catMeta(tx: Transaction) {
  return store.categoryMap[store.effectiveCategory(tx)] ?? FALLBACK_META
}

const transactions = computed(() => {
  let txs = store.filteredFor(props.person)

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    txs = txs.filter((t: Transaction) => t.label.toLowerCase().includes(q))
  }
  if (directionFilter.value !== 'all') {
    txs = txs.filter((t: Transaction) => t.direction === directionFilter.value)
  }
  if (categoryFilter.value !== 'all') {
    txs = txs.filter((t: Transaction) => store.effectiveCategory(t) === categoryFilter.value)
  }
  if (props.limit) {
    txs = txs.slice(0, props.limit)
  }
  return txs
})

const categoryOptions = computed(() => [
  { label: 'Toutes catégories', value: 'all' },
  ...store.allCategories.map(c => ({ label: c.label, value: c.key }))
])

const directionOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Dépenses', value: 'debit' },
  { label: 'Revenus', value: 'credit' }
]

async function setCategory(tx: Transaction, category: Category) {
  await store.setCategoryOverride(tx.id, category)
  editingCategory.value = null
  toast.add({
    title: 'Catégorie mise à jour',
    color: 'success',
    duration: 2000
  })
}
</script>

<template>
  <div class="space-y-3">
    <!-- Filters -->
    <div
      v-if="!limit"
      class="flex gap-2 flex-wrap"
    >
      <UInput
        v-model="search"
        placeholder="Rechercher..."
        icon="i-lucide-search"
        size="sm"
        class="flex-1 min-w-40"
      />
      <USelect
        v-model="directionFilter"
        :items="directionOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-36"
      />
      <USelect
        v-model="categoryFilter"
        :items="categoryOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-48"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="!transactions.length"
      class="py-12 text-center"
    >
      <UIcon
        name="i-lucide-inbox"
        class="text-4xl text-(--ui-text-muted) mb-2"
      />
      <p class="text-sm text-(--ui-text-muted)">
        Aucune transaction pour cette période
      </p>
    </div>

    <!-- List -->
    <div
      v-else
      class="space-y-1"
    >
      <div
        v-for="tx in transactions"
        :key="tx.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-(--ui-bg) border border-(--ui-border) hover:border-primary/30 transition-colors group"
      >
        <!-- Category icon -->
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm"
          :class="`text-${catMeta(tx).color}-500 bg-${catMeta(tx).color}-500/10`"
        >
          <UIcon :name="catMeta(tx).icon" />
        </div>

        <!-- Label + date -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-(--ui-text) truncate">
            {{ tx.label }}
          </p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-(--ui-text-muted)">{{ formatDate(tx.date) }}</span>

            <!-- Category badge (clickable) -->
            <UPopover>
              <CategoryBadge
                :category="store.effectiveCategory(tx)"
                size="sm"
                class="cursor-pointer hover:opacity-80"
              />

              <template #content>
                <div class="p-2 w-56">
                  <p class="text-xs font-semibold text-(--ui-text-muted) mb-2 px-1">
                    Changer la catégorie
                  </p>
                  <button
                    v-for="cat in store.allCategories"
                    :key="cat.key"
                    class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-(--ui-bg-elevated) transition-colors"
                    :class="store.effectiveCategory(tx) === cat.key ? 'text-primary font-medium' : 'text-(--ui-text)'"
                    @click="setCategory(tx, cat.key)"
                  >
                    <UIcon
                      :name="cat.icon"
                      class="text-xs"
                    />
                    {{ cat.label }}
                  </button>
                </div>
              </template>
            </UPopover>
          </div>
        </div>

        <!-- Amount -->
        <span
          class="text-sm font-semibold tabular-nums shrink-0"
          :class="tx.direction === 'credit' ? 'text-emerald-500' : 'text-(--ui-text)'"
        >
          {{ tx.direction === 'credit' ? '+' : '' }}{{ formatCurrency(tx.amount) }}
        </span>
      </div>
    </div>

    <!-- "Voir tout" link if limited -->
    <div
      v-if="limit && transactions.length === limit"
      class="text-center"
    >
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        label="Voir toutes les transactions"
        trailing-icon="i-lucide-arrow-right"
        :to="person ? `/${person}#transactions` : '/transactions'"
      />
    </div>
  </div>
</template>
