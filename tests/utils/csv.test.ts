import { describe, it, expect } from 'vitest'
import { detectFormat, parseCSV, readFileAsText } from '~/utils/csv'

// Extrait réaliste du format Crédit Agricole (ISO-8859-1 simulé en UTF-8 pour les tests)
const CA_CSV = `
Téléchargement du 07/05/2026;


M.       GRAND THOMAS
Compte de Dépôt carte n° 04106119371;
Solde au 07/05/2026 917,01 €

Liste des opérations du compte entre le 01/04/2026 et le 30/04/2026;

Date;Libellé;Débit euros;Crédit euros;
30/04/2026;"VIREMENT EMIS
WEB M. GRAND THOMAS


";150,00;;
30/04/2026;"PAIEMENT PAR CARTE
X4912 U EXPRESS 69 LYON    29/04


";22,07;;
30/04/2026;"VIREMENT EN VOTRE FAVEUR
STEAMULO LYON Virement STEAMULO LYON


STEAMULOL-338604-042026111548-6    ";;2389,64;
27/04/2026;"PRELEVEMENT
TotalEnergies Electricite et Gaz Prelevement TotalEnergies Electricite et Gaz


";108,13;;
13/04/2026;"AVOIR
CARTE X4912 Jow            12/04


";;23,53;
01/04/2026;"REMBOURSEMENT DE PRET
00006808334 ECHEANCE 01/04/26


";212,02;;
`

describe('detectFormat', () => {
  it('détecte le format Crédit Agricole', () => {
    expect(detectFormat('CA20260507.csv', CA_CSV)).toBe('credit-agricole')
  })

  it('retourne null pour un contenu inconnu', () => {
    expect(detectFormat('export.csv', 'date,amount,label\n2026-01-01,100,test')).toBeNull()
  })
})

describe('parseCSV — Crédit Agricole', () => {
  const result = parseCSV(CA_CSV, 'CA20260507.csv', 'thomas', 'credit-agricole')

  it('retourne des transactions et une session', () => {
    expect(result.transactions).toBeDefined()
    expect(result.session).toBeDefined()
  })

  it('parse le bon nombre de transactions', () => {
    expect(result.transactions).toHaveLength(6)
  })

  it('assigne la bonne personne', () => {
    expect(result.transactions.every(t => t.person === 'thomas')).toBe(true)
  })

  it('assigne le bon format de banque', () => {
    expect(result.transactions.every(t => t.bankFormat === 'credit-agricole')).toBe(true)
  })

  it('parse correctement une dépense (débit)', () => {
    const uExpress = result.transactions.find(t => t.label.includes('U EXPRESS'))
    expect(uExpress).toBeDefined()
    expect(uExpress!.direction).toBe('debit')
    expect(uExpress!.amount).toBeCloseTo(22.07)
    expect(uExpress!.date).toBe('2026-04-30')
  })

  it('parse correctement un revenu (crédit)', () => {
    const steamulo = result.transactions.find(t => t.label.includes('STEAMULO'))
    expect(steamulo).toBeDefined()
    expect(steamulo!.direction).toBe('credit')
    expect(steamulo!.amount).toBeCloseTo(2389.64)
  })

  it('nettoie les libellés multilignes', () => {
    result.transactions.forEach((t) => {
      expect(t.label).not.toMatch(/\n/)
      expect(t.label.trim()).toBe(t.label)
    })
  })

  it('génère des IDs déterministes', () => {
    const result2 = parseCSV(CA_CSV, 'CA20260507.csv', 'thomas', 'credit-agricole')
    const ids1 = result.transactions.map(t => t.id).sort()
    const ids2 = result2.transactions.map(t => t.id).sort()
    expect(ids1).toEqual(ids2)
  })

  it('génère des IDs différents pour thomas et emma', () => {
    const emmaResult = parseCSV(CA_CSV, 'CA20260507.csv', 'emma', 'credit-agricole')
    const thomasIds = new Set(result.transactions.map(t => t.id))
    const hasOverlap = emmaResult.transactions.some(t => thomasIds.has(t.id))
    expect(hasOverlap).toBe(false)
  })

  it('catégorise automatiquement les transactions', () => {
    const uExpress = result.transactions.find(t => t.label.includes('U EXPRESS'))
    expect(uExpress!.category).toBe('alimentation')

    const steamulo = result.transactions.find(t => t.label.includes('STEAMULO'))
    expect(steamulo!.category).toBe('revenus')

    const avoir = result.transactions.find(t => t.label.includes('AVOIR'))
    expect(avoir!.category).toBe('remboursements')

    const pret = result.transactions.find(t => t.label.includes('PRET'))
    expect(pret!.category).toBe('loyer-credit')
  })

  it('calcule la période correctement dans la session', () => {
    expect(result.session.periodFrom).toBe('2026-04-01')
    expect(result.session.periodTo).toBe('2026-04-30')
  })

  it('compte correctement les transactions dans la session', () => {
    expect(result.session.transactionCount).toBe(6)
  })

  it('assigne le bon fileName dans la session', () => {
    expect(result.session.fileName).toBe('CA20260507.csv')
  })
})

describe('parseCSV — gestion des erreurs', () => {
  it('lève une erreur si le format est inconnu', () => {
    expect(() =>
      parseCSV('contenu quelconque', 'test.csv', 'thomas', 'credit-agricole')
    ).toThrow(/non reconnu/)
  })

  it('parse un fichier vide (0 transactions) sans planter', () => {
    const emptyCA = `
Téléchargement du 07/05/2026;
Compte de Dépôt carte;

Date;Libellé;Débit euros;Crédit euros;
`
    const r = parseCSV(emptyCA, 'empty.csv', 'thomas', 'credit-agricole')
    expect(r.transactions).toHaveLength(0)
  })
})

describe('readFileAsText', () => {
  it('lit un fichier texte en UTF-8', async () => {
    const file = new File(['bonjour'], 'test.txt', { type: 'text/plain' })
    const content = await readFileAsText(file, 'UTF-8')
    expect(content).toBe('bonjour')
  })
})
