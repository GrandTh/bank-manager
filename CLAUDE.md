# Bank Manager — Conventions du projet

## Stack

| Outil | Version | Rôle |
|---|---|---|
| Nuxt | 4.x | Framework SPA (ssr: false) |
| Nuxt UI | 4.x | Composants UI + Tailwind v4 |
| Pinia | via @pinia/nuxt | State management |
| idb | 8.x | IndexedDB (persistance locale) |
| vue-chartjs + chart.js | 5.x / 4.x | Graphiques |
| @vite-pwa/nuxt | 1.x | PWA (iPad) |
| Vitest | 4.x | Tests unitaires |
| TypeScript | strict: true | — |

## Structure

```
app/
├── types/index.ts          — Types partagés (Transaction, Category, Person…)
├── utils/
│   ├── db.ts               — Couche IndexedDB (idb)
│   ├── csv.ts              — Parsers CSV (un format par banque)
│   ├── categorizer.ts      — Détection de catégorie par regex sur libellé
│   ├── categories.ts       — Métadonnées catégories (label, icon, color)
│   └── formatters.ts       — Formatage devise, dates, mois
├── stores/transactions.ts  — Store Pinia : transactions, période, overrides
├── components/
│   ├── AppNav.vue
│   ├── PeriodSelector.vue
│   ├── StatCard.vue
│   ├── CategoryBadge.vue
│   ├── ImportModal.vue
│   ├── TransactionList.vue
│   └── charts/
│       ├── SpendingDonut.vue
│       └── MonthlyBar.vue
└── pages/
    ├── index.vue   — Dashboard commun
    ├── thomas.vue
    └── emma.vue

tests/
├── setup.ts                — fake-indexeddb + helpers globaux
├── utils/
│   ├── csv.test.ts
│   ├── categorizer.test.ts
│   └── formatters.test.ts
└── stores/
    └── transactions.test.ts
```

## Commandes

```bash
pnpm dev          # Serveur de développement
pnpm build        # Build de production
pnpm test         # Tests (watch)
pnpm test:run     # Tests (CI, une seule passe)
pnpm typecheck    # Vérification TypeScript
pnpm lint         # ESLint
```

## Règles TypeScript

- `strict: true` activé — pas de `any` implicite, pas de raccourci
- Toujours typer les paramètres de fonctions explicitement
- Types des entités dans `app/types/index.ts`
- Pas de `as any` — utiliser des assertions précises (`as number`, `as Category`) quand vraiment nécessaire

## Règles de code

- Pas de commentaires sauf si le "pourquoi" est non-évident
- Pas de `console.log` en production
- Pas d'abstraction prématurée — 3 lignes similaires valent mieux qu'une abstraction forcée
- Composants Vue : `<script setup lang="ts">` uniquement
- Auto-imports Nuxt actifs — pas besoin d'importer `ref`, `computed`, `useXxx`…
- Les charts (`vue-chartjs`) sont toujours wrappés dans `<ClientOnly>` (canvas ne fonctionne pas en SSR, même si ssr: false, par précaution)

## Règles de tests — OBLIGATOIRES

**Toute nouvelle feature ou modification de logique métier doit être accompagnée de tests.**

### Ce qui doit être testé

| Couche | Priorité | Outil |
|---|---|---|
| `utils/csv.ts` | Haute — parsing critique | Vitest |
| `utils/categorizer.ts` | Haute — règles métier | Vitest |
| `utils/formatters.ts` | Moyenne | Vitest |
| `stores/transactions.ts` | Haute — logique filtre/aggregate | Vitest + Pinia |
| Composants UI | Basse (logique dans store/utils) | Vue Test Utils si nécessaire |

### Conventions de tests

- Un fichier test par fichier source (`csv.ts` → `csv.test.ts`)
- `describe` par fonction/feature, `it` par cas
- Nommage : `it('retourne X quand Y')` — phrase en français ou anglais, consistant par fichier
- Pas de mocks sauf pour la couche `db.ts` (IndexedDB réel remplacé par `fake-indexeddb`)
- `fake-indexeddb/auto` importé dans `tests/setup.ts` → disponible partout

### Ajouter un format de banque (Emma ou autre)

1. Écrire le parser dans `app/utils/csv.ts` (nouvelle fonction `parseXxx`)
2. L'enregistrer dans `detectFormat` et le `switch` de `parseCSV`
3. Ajouter les tests correspondants dans `tests/utils/csv.test.ts`

## Persistance

- **IndexedDB** via `idb` : source de vérité
- **Pinia** : cache in-memory, chargé au montage de `app.vue`
- Les overrides de catégorie sont stockés séparément (`category-overrides`) pour ne pas altérer les données brutes d'import

## PWA / iPad

- `ssr: false` — SPA pure, pas de serveur
- Orientation landscape ciblée
- Sidebar fixe 256px, contenu scrollable
- Toujours tester sur la taille iPad 11" (1194×834 landscape)
