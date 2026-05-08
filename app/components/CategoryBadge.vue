<script setup lang="ts">
import { FALLBACK_META } from '~/utils/categories'
import type { Category } from '~/types'

const props = defineProps<{
  category: Category
  size?: 'sm' | 'md'
}>()

const store = useTransactionsStore()
const meta = computed(() => store.categoryMap[props.category] ?? FALLBACK_META)
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium"
    :class="[
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
      `text-${meta.color}-600 bg-${meta.color}-500/10 dark:text-${meta.color}-400`
    ]"
  >
    <UIcon
      :name="meta.icon"
      class="text-xs shrink-0"
    />
    {{ meta.label }}
  </span>
</template>
