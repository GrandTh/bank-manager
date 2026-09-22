import { describe, it, expect } from 'vitest'
import { detectFormat, parseCSV, readFileAsText, readAndDetect } from '~/utils/csv'

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

// Extrait réel d'un export Boursorama (UTF-8 avec BOM, dates ISO, montant signé
// en colonne 7 — la colonne 11, homonyme, est le solde du compte).
const BOURSORAMA_CSV = '﻿' + `"Date Opération";"Date Valeur";Libellé;"Libellé Suggéré";Catégorie;"Catégorie Parente";Solde;Commentaire;"Numéro Compte";"Libellé Compte";Solde;Pointage
2026-08-31;2026-08-31;"VIR SEPA FILLUPMEDIA";"Vir Sepa Fillupmedia";"Virements reçus";"Virements reçus";"1 659,04";;00040853266;BoursoBank;1758.27;Non
2026-08-31;2026-08-31;"CARTE 29/08/26 ZARA FRANCE 4 CB*8591";ZARA;"Vêtements et accessoires";"Vie quotidienne";-25,95;;00040853266;BoursoBank;1758.27;Non
2026-08-19;2026-08-19;"AVOIR 17/08/26 Jow CB*8591";Jow;Alimentation;"Vie quotidienne";10,77;;00040853266;BoursoBank;350.15;Non
2026-08-04;2026-08-04;"CARTE 03/08/26 APPLE.COM/BILL CB*8591";Apple;"Vie quotidienne";"Vie quotidienne";-2,99;;00040853266;BoursoBank;924.2;Non
2026-08-03;2026-08-03;"CARTE 02/08/26 AIRBNB * HMSXBCQM CB*8591";Airbnb;"Hébergement (hôtels, camping…)";"Voyages & Transports";"-1 509,49";;00040853266;BoursoBank;1095.19;Non
2026-08-03;2026-08-03;"CARTE 01/08/26 UGC RESERVATION 2 CB*8591";UGC;"Divertissement - culture";"Loisirs et sorties";-20,40;;00040853266;BoursoBank;1095.19;Non
2026-08-03;2026-08-03;"CARTE 01/08/26 UGC RESERVATION 2 CB*8591";UGC;"Divertissement - culture";"Loisirs et sorties";-20,40;;00040853266;BoursoBank;1095.19;Non
`

describe('detectFormat', () => {
  it('détecte le format Crédit Agricole', () => {
    expect(detectFormat('CA20260507.csv', CA_CSV)).toBe('credit-agricole')
  })

  it('détecte le format Boursorama', () => {
    expect(detectFormat('export-operations.csv', BOURSORAMA_CSV)).toBe('boursorama')
  })

  it('ne confond pas un export Crédit Agricole avec un Boursorama', () => {
    expect(detectFormat('CA20260507.csv', CA_CSV)).toBe('credit-agricole')
    expect(detectFormat('export-operations.csv', BOURSORAMA_CSV)).toBe('boursorama')
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
describe('parseCSV — Boursorama', () => {
  const result = parseCSV(BOURSORAMA_CSV, 'export-operations.csv', 'emma', 'boursorama')

  it('parse toutes les opérations du fichier', () => {
    expect(result.transactions).toHaveLength(7)
  })

  it('ignore le BOM UTF-8 en tête de fichier', () => {
    expect(result.transactions[0]?.date).toBe('2026-08-31')
  })

  it('conserve les dates déjà au format ISO', () => {
    expect(result.transactions.map(t => t.date)).toEqual([
      '2026-08-31', '2026-08-31', '2026-08-19', '2026-08-04', '2026-08-03', '2026-08-03', '2026-08-03'
    ])
  })

  it('déduit un débit d\'un montant négatif', () => {
    const zara = result.transactions.find(t => t.label === 'ZARA')
    expect(zara?.direction).toBe('debit')
    expect(zara?.amount).toBe(25.95)
  })

  it('déduit un crédit d\'un montant positif', () => {
    const vir = result.transactions[0]
    expect(vir?.direction).toBe('credit')
    expect(vir?.amount).toBe(1659.04)
  })

  it('stocke toujours un montant positif', () => {
    expect(result.transactions.every(t => t.amount > 0)).toBe(true)
  })

  it('gère le séparateur de milliers dans les montants', () => {
    const airbnb = result.transactions.find(t => t.label === 'Airbnb')
    expect(airbnb?.amount).toBe(1509.49)
    expect(airbnb?.direction).toBe('debit')
  })

  it('utilise le libellé suggéré comme libellé affiché', () => {
    expect(result.transactions.find(t => t.rawLabel.includes('ZARA FRANCE'))?.label).toBe('ZARA')
  })

  it('conserve le libellé brut de la banque', () => {
    expect(result.transactions[1]?.rawLabel).toBe('CARTE 29/08/26 ZARA FRANCE 4 CB*8591')
  })

  it('catégorise sur le libellé brut, plus riche que le libellé suggéré', () => {
    const avoir = result.transactions.find(t => t.rawLabel.startsWith('AVOIR'))
    expect(avoir?.category).toBe('remboursements')
    expect(result.transactions.find(t => t.label === 'Apple')?.category).toBe('abonnements')
  })

  it('renseigne le format et la personne', () => {
    expect(result.transactions.every(t => t.bankFormat === 'boursorama')).toBe(true)
    expect(result.transactions.every(t => t.person === 'emma')).toBe(true)
  })

  it('calcule la période de la session sur les dates réelles', () => {
    expect(result.session.periodFrom).toBe('2026-08-03')
    expect(result.session.periodTo).toBe('2026-08-31')
    expect(result.session.transactionCount).toBe(7)
  })

  it('totalise les débits et les crédits comme la banque', () => {
    const sum = (dir: string) => result.transactions
      .filter(t => t.direction === dir)
      .reduce((s, t) => s + t.amount, 0)
    expect(sum('debit')).toBeCloseTo(1579.23, 2)
    expect(sum('credit')).toBeCloseTo(1669.81, 2)
  })

  it('lève une erreur si l\'en-tête Boursorama est absent', () => {
    expect(() =>
      parseCSV('a;b;c\n1;2;3', 'test.csv', 'emma', 'boursorama')
    ).toThrow(/non reconnu/)
  })
})

describe('parseCSV — opérations identiques en doublon', () => {
  const result = parseCSV(BOURSORAMA_CSV, 'export-operations.csv', 'emma', 'boursorama')

  it('donne un id distinct à deux opérations strictement identiques', () => {
    const ugc = result.transactions.filter(t => t.label === 'UGC')
    expect(ugc).toHaveLength(2)
    expect(ugc[0]?.id).not.toBe(ugc[1]?.id)
  })

  it('ne produit aucune collision d\'id sur tout le fichier', () => {
    const ids = result.transactions.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('laisse la première occurrence sur son id d\'origine', () => {
    const ugc = result.transactions.filter(t => t.label === 'UGC')
    expect(ugc[0]?.id).not.toContain('#')
    expect(ugc[1]?.id).toBe(`${ugc[0]?.id}#1`)
  })

  it('reste idempotent : deux parses du même fichier donnent les mêmes ids', () => {
    const again = parseCSV(BOURSORAMA_CSV, 'export-operations.csv', 'emma', 'boursorama')
    expect(again.transactions.map(t => t.id)).toEqual(result.transactions.map(t => t.id))
  })
})

describe('readAndDetect', () => {
  it('lit un export Boursorama en UTF-8 et détecte son format', async () => {
    const file = new File([BOURSORAMA_CSV], 'export-operations.csv', { type: 'text/csv' })
    const { content, format } = await readAndDetect(file)
    expect(format).toBe('boursorama')
    expect(content).toContain('Vêtements et accessoires')
  })

  it('lève une erreur explicite sur un format inconnu', async () => {
    const file = new File(['date,amount\n2026-01-01,100'], 'autre.csv', { type: 'text/csv' })
    await expect(readAndDetect(file)).rejects.toThrow(/non reconnu/)
  })
})
