import type { CategoryMeta } from '~/types'

export const CATEGORIES: CategoryMeta[] = [
  { key: 'alimentation', label: 'Alimentation', icon: 'i-lucide-shopping-cart', color: 'amber' },
  { key: 'transport', label: 'Transport', icon: 'i-lucide-car', color: 'sky' },
  { key: 'abonnements', label: 'Abonnements', icon: 'i-lucide-smartphone', color: 'violet' },
  { key: 'assurance', label: 'Assurance', icon: 'i-lucide-shield', color: 'blue' },
  { key: 'sorties', label: 'Sorties & Resto', icon: 'i-lucide-utensils', color: 'orange' },
  { key: 'shopping', label: 'Shopping', icon: 'i-lucide-shopping-bag', color: 'pink' },
  { key: 'sante', label: 'Santé', icon: 'i-lucide-heart-pulse', color: 'rose' },
  { key: 'crypto', label: 'Crypto', icon: 'i-lucide-trending-up', color: 'yellow' },
  { key: 'revenus', label: 'Revenus', icon: 'i-lucide-banknote', color: 'emerald' },
  { key: 'loyer-credit', label: 'Loyer & Crédit', icon: 'i-lucide-home', color: 'indigo' },
  { key: 'frais-bancaires', label: 'Frais bancaires', icon: 'i-lucide-building-2', color: 'slate' },
  { key: 'remboursements', label: 'Remboursements', icon: 'i-lucide-rotate-ccw', color: 'teal' },
  { key: 'non-categorise', label: 'Non catégorisé', icon: 'i-lucide-circle-help', color: 'gray' }
]

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c])
)

export const FALLBACK_META: CategoryMeta = { key: 'non-categorise', label: 'Non catégorisé', icon: 'i-lucide-circle-help', color: 'gray' }

export const TAILWIND_HEX: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  pink: '#ec4899',
  rose: '#f43f5e',
  slate: '#64748b',
  gray: '#6b7280',
  green: '#22c55e'
}
