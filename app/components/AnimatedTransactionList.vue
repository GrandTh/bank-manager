<template>
  <div class="relative flex-1 overflow-hidden">
    <!-- Filters -->
    <div class="flex gap-2 flex-wrap px-4 pt-3 pb-3 border-b border-default">
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
      v-if="!filteredTransactions.length"
      class="flex flex-col items-center justify-center py-20 gap-3"
    >
      <UIcon
        name="i-lucide-inbox"
        class="text-4xl text-muted"
      />
      <p class="text-sm text-muted">
        Aucune transaction pour cette période.
      </p>
    </div>

    <!-- Scrollable animated list -->
    <div
      v-else
      ref="listRef"
      class="overflow-y-auto h-full px-4 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
      :style="{ scrollbarWidth: 'thin', scrollbarColor: 'var(--ui-border) transparent' }"
      @scroll="handleScroll"
    >
      <Motion
        v-for="(tx, index) in filteredTransactions"
        :key="tx.id"
        tag="div"
        :data-index="index"
        class="mb-1"
        :initial="{ scale: 0.95, opacity: 0 }"
        :animate="getItemInView(index) ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }"
        :transition="{ duration: 0.18, delay: 0.05 }"
      >
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-default border border-default hover:border-primary/30 transition-colors group">
          <!-- Category icon -->
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm"
            :class="`text-${catMeta(tx).color}-500 bg-${catMeta(tx).color}-500/10`"
          >
            <UIcon :name="catMeta(tx).icon" />
          </div>

          <!-- Label + date -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-default truncate">
              {{ tx.label }}
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-muted">{{ formatDate(tx.date) }}</span>
              <UPopover>
                <CategoryBadge
                  :category="store.effectiveCategory(tx)"
                  size="sm"
                  class="cursor-pointer hover:opacity-80"
                />
                <template #content>
                  <div class="p-2 w-56">
                    <p class="text-xs font-semibold text-muted mb-2 px-1 shrink-0">
                      Changer la catégorie
                    </p>
                    <div class="overflow-y-auto max-h-56">
                      <button
                        v-for="cat in availableCategories"
                        :key="cat.key"
                        class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-elevated transition-colors"
                        :class="store.effectiveCategory(tx) === cat.key ? 'text-primary font-medium' : 'text-default'"
                        @click="setCategory(tx, cat.key)"
                      >
                        <UIcon
                          :name="cat.icon"
                          class="text-xs"
                        />
                        {{ cat.label }}
                      </button>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>

          <!-- Amount -->
          <span
            class="text-sm font-semibold tabular-nums shrink-0"
            :class="tx.direction === 'credit' ? 'text-emerald-500' : 'text-default'"
          >
            {{ tx.direction === 'credit' ? '+' : '' }}{{ formatCurrency(tx.amount) }}
          </span>
        </div>
      </Motion>
      <!-- bottom padding so last item isn't under gradient -->
      <div class="h-16" />
    </div>

    <!-- Top gradient -->
    <div
      class="absolute top-14.25 left-0 right-0 h-10 bg-linear-to-b from-default to-transparent pointer-events-none transition-opacity duration-300"
      :style="{ opacity: topGradientOpacity }"
    />
    <!-- Bottom gradient -->
    <div
      class="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-default to-transparent pointer-events-none transition-opacity duration-300"
      :style="{ opacity: bottomGradientOpacity }"
    />
  </div>
</template>

<script setup lang="ts">
import { Motion } from 'motion-v'
import { FALLBACK_META } from '~/utils/categories'
import { formatDate, formatCurrency } from '~/utils/formatters'
import type { Transaction, Category, Person } from '~/types'

const props = defineProps<{
  person?: Person
}>()

const store = useTransactionsStore()
const toast = useToast()

const search = ref('')
const directionFilter = ref<'all' | 'debit' | 'credit'>('all')
const categoryFilter = ref<Category | 'all'>('all')

const listRef = ref<HTMLDivElement | null>(null)
const topGradientOpacity = ref(0)
const bottomGradientOpacity = ref(1)
const itemsInView = ref<boolean[]>([])

function catMeta(tx: Transaction) {
  return store.categoryMap[store.effectiveCategory(tx)] ?? FALLBACK_META
}

const filteredTransactions = computed(() => {
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
  return txs
})

const availableCategories = computed(() =>
  props.person ? store.categoriesFor(props.person) : store.allCategories
)

const categoryOptions = computed(() => [
  { label: 'Toutes catégories', value: 'all' },
  ...availableCategories.value.map(c => ({ label: c.label, value: c.key }))
])

const directionOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Dépenses', value: 'debit' },
  { label: 'Revenus', value: 'credit' }
]

function getItemInView(index: number) {
  return itemsInView.value[index] ?? false
}

function handleScroll(e: Event) {
  const target = e.target as HTMLDivElement
  const { scrollTop, scrollHeight, clientHeight } = target
  topGradientOpacity.value = Math.min(scrollTop / 50, 1)
  const bottomDistance = scrollHeight - (scrollTop + clientHeight)
  bottomGradientOpacity.value = scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
  updateItemsInView()
}

function updateItemsInView() {
  if (!listRef.value) return
  const container = listRef.value
  const containerRect = container.getBoundingClientRect()
  itemsInView.value = filteredTransactions.value.map((_, index) => {
    const item = container.querySelector(`[data-index="${index}"]`) as HTMLElement
    if (!item) return false
    const itemRect = item.getBoundingClientRect()
    const itemTop = itemRect.top - containerRect.top
    const itemBottom = itemTop + itemRect.height
    return itemTop < containerRect.height && itemBottom > 0
  })
}

watch(filteredTransactions, () => {
  nextTick(() => {
    itemsInView.value = new Array(filteredTransactions.value.length).fill(true)
    setTimeout(updateItemsInView, 100)
  })
})

async function setCategory(tx: Transaction, category: Category) {
  await store.setCategoryOverride(tx.id, category)
  toast.add({ title: 'Catégorie mise à jour', color: 'success', duration: 2000 })
}

onMounted(() => {
  itemsInView.value = new Array(filteredTransactions.value.length).fill(true)
  setTimeout(updateItemsInView, 100)
})
</script>
