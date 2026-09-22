# Bank Manager — Conventions du projet

Application de gestion de budget à deux (Thomas + Emma). PWA 100 % locale : les
relevés CSV sont importés, parsés, catégorisés et stockés dans IndexedDB. Aucun
serveur, aucune donnée ne sort du navigateur.

## Stack

| Outil | Version | Rôle |
|---|---|---|
| Nuxt | 4.x | Framework SPA (ssr: false) |
| Nuxt UI | 4.x | Composants UI + Tailwind v4 |
| Pinia | via @pinia/nuxt | State management |
| idb | 8.x | IndexedDB (persistance locale) |
| motion-v | 2.x | Animations de listes |
| vue-chartjs + chart.js | 5.x / 4.x | Graphiques |
| @vite-pwa/nuxt | 1.x | PWA (iPad) |
| Vitest | 4.x | Tests unitaires |
| TypeScript | strict + noUncheckedIndexedAccess | — |

## Structure

```
app/
├── types/index.ts          — Types partagés (Transaction, Category, Goal, CategoryBudget…)
├── utils/
│   ├── db.ts               — Couche IndexedDB (idb) — base `bank-manager` v4, 6 stores
│   ├── csv.ts              — Parser CSV générique + un parser par banque
│   ├── categorizer.ts      — Détection de catégorie par regex sur libellé
│   ├── categories.ts       — Métadonnées catégories (label, icon, color) + TAILWIND_HEX
│   └── formatters.ts       — Formatage devise, dates, mois
├── stores/transactions.ts  — Store Pinia : transactions, période, overrides, budgets, objectifs
├── composables/
│   ├── useBiometricAuth.ts — Verrouillage WebAuthn (Face ID / Touch ID)
│   └── useNavCollapsed.ts  — État replié de la sidebar (localStorage)
├── components/
│   ├── AppNav.vue              — Sidebar : navigation + modales globales
│   ├── AppLogo.vue
│   ├── LockScreen.vue          — Écran de verrouillage biométrique
│   ├── PeriodSelector.vue      — Sélecteur de mois
│   ├── StatCard.vue
│   ├── CategoryBadge.vue
│   ├── ImportModal.vue         — Import d'un CSV
│   ├── ImportsModal.vue        — Historique des imports + suppression
│   ├── CategoriesModal.vue     — CRUD catégories custom
│   ├── BudgetsModal.vue        — CRUD budgets mensuels par catégorie
│   ├── BudgetProgressBar.vue
│   ├── GoalsModal.vue          — CRUD objectifs d'épargne
│   ├── GoalProgressCard.vue
│   ├── TransactionList.vue
│   ├── AnimatedTransactionList.vue
│   └── charts/
│       ├── SpendingDonut.vue
│       └── MonthlyBar.vue
└── pages/
    ├── index.vue          — Dashboard commun (Thomas + Emma agrégés)
    ├── thomas.vue
    ├── emma.vue
    └── transactions.vue   — Liste complète, filtrable par personne

tests/
├── setup.ts                — fake-indexeddb + helpers globaux
├── utils/
│   ├── csv.test.ts
│   ├── categorizer.test.ts
│   └── formatters.test.ts
└── stores/
    └── transactions.test.ts
```

`AnimatedList.vue` et `TemplateMenu.vue` sont des restes du starter Nuxt, non
référencés — ne pas s'en inspirer, ils ne suivent pas les conventions du projet.

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

- `strict: true` et `noUncheckedIndexedAccess: true` — tout accès indexé et tout
  résultat de destructuration est potentiellement `undefined`, il faut le gérer
  explicitement (`if (!x) return null`), pas avec un `?? 0` qui masque le cas
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

## Modèle de données

| Store IndexedDB | Contenu | Clé |
|---|---|---|
| `transactions` | Transactions importées (brutes) | `id` (hash déterministe) |
| `imports` | Sessions d'import (fichier, période, compte) | `id` (uuid) |
| `category-overrides` | Recatégorisations manuelles | `transactionId` |
| `custom-categories` | Catégories créées par l'utilisateur | `key` |
| `category-budgets` | Budgets mensuels | `${person}:${categoryKey}` |
| `goals` | Objectifs d'épargne | `id` |

- **IndexedDB** est la source de vérité ; **Pinia** est un cache in-memory chargé au montage de `app.vue`
- Les overrides de catégorie sont stockés séparément pour ne pas altérer les données brutes d'import
- `Category` est un `string` libre (pas une union) depuis l'arrivée des catégories custom
- Un `Goal` crée aussi une catégorie custom miroir (`goalId` en backlink) — `addGoal`/`removeGoal` maintiennent les deux ensemble
- L'`id` d'une transaction est un hash FNV-1a de `person|date|direction|amount|label` : c'est ce qui rend les ré-imports idempotents (`addImport` filtre sur les ids déjà présents)
- Une banque peut exporter plusieurs opérations **strictement identiques** le même jour (deux places de cinéma, deux cafés). Le hash seul les confondrait et `addImport` en supprimerait une : `parseCSV` suffixe les occurrences suivantes (`<hash>#1`, `<hash>#2`…). La première garde son id nu, pour rester compatible avec les données déjà stockées

**Toute évolution du schéma exige de bumper la version dans `getDB()` et d'ajouter
un bloc `if (oldVersion < N)` — jamais modifier un bloc existant**, des bases
installées sont déjà en v4.

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
- Nommage : `it('retourne X quand Y')` — phrase en français, consistant par fichier
- Pas de mocks sauf pour la couche `db.ts` (mockée dans `tests/stores/transactions.test.ts`, `fake-indexeddb` ailleurs)
- `fake-indexeddb/auto` importé dans `tests/setup.ts` → disponible partout
- Les calculs de date sont piégeux (mois 1-based côté chaîne, 0-based côté `Date`) :
  toujours tester le passage d'année et les mois à un chiffre

### Formats de banque supportés

| Format | Compte | Encodage | Particularités |
|---|---|---|---|
| `credit-agricole` | Thomas | ISO-8859-1 | Dates `JJ/MM/AAAA`, deux colonnes Débit/Crédit, libellés multilignes entre guillemets |
| `boursorama` | Emma | UTF-8 **avec BOM** | Dates déjà ISO, montant signé en colonne 7 (la colonne 11, homonyme `Solde`, est le solde du compte), colonne « Libellé Suggéré » = nom du marchand nettoyé |

L'encodage n'est pas devinable après lecture : il est déclaré par format dans
`FORMAT_ENCODING`. **Tout code qui lit un fichier passe par `readAndDetect(file)`**,
qui sonde le contenu, détecte le format et relit avec le bon encodage. Ne pas
appeler `readFileAsText` + `detectFormat` à la main : c'est la façon d'obtenir un
aperçu correct et un import corrompu.

Le libellé affiché (`label`) peut être une version nettoyée fournie par la banque,
mais la catégorisation se fait sur `rawLabel`, qui porte plus de signal
(`AVOIR ... Jow`, `APPLE.COM/BILL`), avec repli sur `label` si aucune règle ne matche.

### Ajouter un format de banque

1. Écrire le parser dans `app/utils/csv.ts` — une fonction `parseXxx(content: string): RawTransaction[]`
2. L'ajouter à l'union `SupportedFormat`, à `FORMAT_ENCODING`, à `detectFormat` (signature du fichier) et au `switch` de `parseCSV`
3. Ajouter la valeur au type `BankFormat` dans `app/types/index.ts`
4. Vérifier l'encodage sur le fichier réel (`file export.csv`) et la présence d'un BOM
5. Ajouter les tests correspondants dans `tests/utils/csv.test.ts`, à partir d'un
   extrait réel du fichier de la banque (jamais d'un format supposé), et vérifier
   les totaux débits/crédits contre un décompte indépendant du parser

## PWA / iPad

- `ssr: false` — SPA pure, pas de serveur
- Orientation landscape ciblée
- Sidebar 256px (repliable à 56px), contenu scrollable
- Verrouillage biométrique WebAuthn au démarrage, désactivé sur `localhost` pour le dev
- Toujours tester sur la taille iPad 11" (1194×834 landscape)
