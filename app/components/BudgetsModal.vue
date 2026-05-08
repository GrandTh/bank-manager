<script setup lang="ts">
import type { Person } from '~/types'

const props = defineProps<{ person: Person }>()

const store = useTransactionsStore()
const toast = useToast()

const selectedCategoryKey = ref('')
const amount = ref<number | null>(null)
const isAdding = ref(false)
const deletingId = ref<string | null>(null)

const personBudgets = computed(() =>
  store.budgets.filter(b => b.person === props.person)
)

const availableCategories = computed(() =>
  store.allCategories.filter(c =>
    !personBudgets.value.some(b => b.categoryKey === c.key)
  )
)

const categoryOptions = computed(() =>
  availableCategories.value.map(c => ({ label: c.label, value: c.key }))
)

const canAdd = computed(() =>
  selectedCategoryKey.value && amount.value && amount.value > 0
)

async function addBudget() {
  if (!canAdd.value || !amount.value) return
  isAdding.value = true
  try {
    await store.setBudget(props.person, selectedCategoryKey.value, amount.value)
    toast.add({ title: 'Budget ajouté', color: 'success', duration: 2000 })
    selectedCategoryKey.value = ''
    amount.value = null
  } finally {
    isAdding.value = false
  }
}

async function updateBudget(categoryKey: string, newAmount: number) {
  if (newAmount <= 0) return
  await store.setBudget(props.person, categoryKey, newAmount)
}

async function removeBudget(categoryKey: string) {
  const id = `${props.person}:${categoryKey}`
  deletingId.value = id
  try {
    await store.removeBudget(props.person, categoryKey)
    toast.add({ title: 'Budget supprimé', color: 'success', duration: 2000 })
  } finally {
    deletingId.value = null
  }
}

const personLabel = computed(() => props.person === 'thomas' ? 'Thomas' : 'Emma')
</script>

<template>
  <UModal :title="`Budgets mensuels · ${personLabel}`">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-sliders-horizontal"
      label="Budgets"
    />

    <template #body>
      <div class="space-y-5">
        <!-- Existing budgets -->
        <div v-if="personBudgets.length">
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Budgets configurés
          </p>
          <div class="space-y-2">
            <div
              v-for="b in personBudgets"
              :key="b.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-default"
            >
              <!-- Category icon -->
              <div
                v-if="store.categoryMap[b.categoryKey]"
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                :class="`text-${store.categoryMap[b.categoryKey]!.color}-500 bg-${store.categoryMap[b.categoryKey]!.color}-500/10`"
              >
                <UIcon :name="store.categoryMap[b.categoryKey]!.icon" />
              </div>

              <!-- Label + editable amount -->
              <span class="flex-1 text-sm font-medium text-default truncate">
                {{ store.categoryMap[b.categoryKey]?.label ?? b.categoryKey }}
              </span>

              <div class="flex items-center gap-2 shrink-0">
                <UInput
                  :model-value="b.amount"
                  type="number"
                  min="1"
                  size="sm"
                  class="w-24"
                  @change="(e: Event) => updateBudget(b.categoryKey, Number((e.target as HTMLInputElement).value))"
                />
                <span class="text-xs text-muted">€</span>
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :loading="deletingId === b.id"
                  @click="removeBudget(b.categoryKey)"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!personBudgets.length"
          class="flex flex-col items-center py-6 gap-2"
        >
          <UIcon
            name="i-lucide-sliders-horizontal"
            class="text-3xl text-muted"
          />
          <p class="text-sm text-muted">
            Aucun budget configuré
          </p>
        </div>

        <!-- Add form -->
        <div v-if="categoryOptions.length">
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Ajouter un budget
          </p>
          <div class="flex gap-2">
            <USelect
              v-model="selectedCategoryKey"
              :items="categoryOptions"
              value-key="value"
              label-key="label"
              placeholder="Catégorie"
              size="sm"
              class="flex-1"
            />
            <UInput
              v-model="amount"
              type="number"
              min="1"
              placeholder="Montant €"
              size="sm"
              class="w-28"
              @keyup.enter="addBudget"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              :disabled="!canAdd"
              :loading="isAdding"
              @click="addBudget"
            />
          </div>
        </div>

        <p
          v-else-if="personBudgets.length"
          class="text-xs text-muted text-center"
        >
          Toutes les catégories ont un budget.
        </p>
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
