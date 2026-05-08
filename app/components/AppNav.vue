<script setup lang="ts">
const store = useTransactionsStore()
const collapsed = useNavCollapsed()

const nav = [
  { label: 'Vue commune', to: '/', icon: 'i-lucide-layout-dashboard', initial: null },
  { label: 'Thomas', to: '/thomas', icon: 'i-lucide-user', initial: 'T' },
  { label: 'Emma', to: '/emma', icon: 'i-lucide-user', initial: 'E' }
]
</script>

<template>
  <aside
    class="flex flex-col h-full py-4 gap-1"
    :class="collapsed ? 'px-2' : 'px-3'"
  >
    <!-- Brand -->
    <div
      class="mb-4 flex items-center"
      :class="collapsed ? 'justify-center px-1 py-2' : 'px-3 py-2 gap-2'"
    >
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <UIcon
          name="i-lucide-wallet"
          class="text-white text-sm"
        />
      </div>
      <span
        v-if="!collapsed"
        class="font-semibold text-default"
      >Budget</span>
    </div>

    <!-- Period selector -->
    <PeriodSelector
      v-if="!collapsed"
      class="mb-3"
    />

    <USeparator class="my-2" />

    <!-- Navigation -->
    <nav class="flex flex-col gap-1">
      <UTooltip
        v-for="item in nav"
        :key="item.to"
        :text="item.label"
        :disabled="!collapsed"
        placement="right"
      >
        <NuxtLink
          :to="item.to"
          class="flex items-center rounded-lg text-sm font-medium transition-colors"
          :class="[
            collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
            $route.path === item.to
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-elevated hover:text-default'
          ]"
        >
          <span
            v-if="collapsed && item.initial"
            class="text-sm font-bold w-5 text-center shrink-0"
          >{{ item.initial }}</span>
          <UIcon
            v-else
            :name="item.icon"
            class="text-base shrink-0"
          />
          <span v-if="!collapsed">{{ item.label }}</span>
        </NuxtLink>
      </UTooltip>
    </nav>

    <div class="mt-auto flex flex-col gap-2">
      <USeparator class="mb-2" />

      <ImportModal />
      <ImportsModal v-if="store.imports.length" />
      <CategoriesModal />

      <!-- Theme + toggle -->
      <div
        class="flex items-center px-1 py-1"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <span
          v-if="!collapsed"
          class="text-xs text-muted"
        >Thème</span>
        <UColorModeButton size="sm" />
      </div>

      <!-- Collapse toggle -->
      <UTooltip
        :text="collapsed ? 'Agrandir' : 'Réduire'"
        placement="right"
      >
        <UButton
          block
          color="neutral"
          variant="ghost"
          :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          :label="collapsed ? undefined : 'Réduire'"
          size="sm"
          @click="collapsed = !collapsed"
        />
      </UTooltip>
    </div>
  </aside>
</template>
