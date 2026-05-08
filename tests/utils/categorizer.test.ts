import { describe, it, expect } from 'vitest'
import { autoCategory } from '~/utils/categorizer'

describe('autoCategory — débits', () => {
  it('détecte Alimentation sur JOW', () => {
    expect(autoCategory('Jow Rue Pleyel', 'debit')).toBe('alimentation')
  })

  it('détecte Alimentation sur U EXPRESS', () => {
    expect(autoCategory('U EXPRESS 69 LYON', 'debit')).toBe('alimentation')
  })

  it('détecte Alimentation sur BOULANGERIE', () => {
    expect(autoCategory('LA BOULANGERIE LYON', 'debit')).toBe('alimentation')
  })

  it('détecte Alimentation sur PIZZA', () => {
    expect(autoCategory('DELISS PIZZA LYON 3E', 'debit')).toBe('alimentation')
  })

  it('détecte Transport sur TCL', () => {
    expect(autoCategory('TCL Relation Usagers', 'debit')).toBe('transport')
  })

  it('détecte Transport sur FULLI', () => {
    expect(autoCategory('FULLI - mobilis PEAGE', 'debit')).toBe('transport')
  })

  it('détecte Abonnements sur FREE MOBILE', () => {
    expect(autoCategory('FREE MOBILE', 'debit')).toBe('abonnements')
  })

  it('détecte Abonnements sur FREE TELECOM', () => {
    expect(autoCategory('Free Telecom Free HautDebit', 'debit')).toBe('abonnements')
  })

  it('détecte Abonnements sur CANAL+', () => {
    expect(autoCategory('CANAL+ France PRLV', 'debit')).toBe('abonnements')
  })

  it('détecte Abonnements sur APPLE.COM/BILL', () => {
    expect(autoCategory('APPLE.COM/BILL CORK', 'debit')).toBe('abonnements')
  })

  it('détecte Abonnements sur CLAUDE.AI', () => {
    expect(autoCategory('CLAUDE.AI SUBSCRIPTI', 'debit')).toBe('abonnements')
  })

  it('détecte Assurance sur MACIF', () => {
    expect(autoCategory('MACIF Production PRELEV', 'debit')).toBe('assurance')
  })

  it('détecte Assurance sur PREDICA', () => {
    expect(autoCategory('PREDICA PREVOYANCE DIALOGUE', 'debit')).toBe('assurance')
  })

  it('détecte Crypto sur KRAKEN', () => {
    expect(autoCategory('KRAKEN DUBLIN', 'debit')).toBe('crypto')
  })

  it('détecte Santé sur PHCIE', () => {
    expect(autoCategory('PHCIE PHAM DIEP LYON', 'debit')).toBe('sante')
  })

  it('détecte Loyer/Crédit sur remboursement de prêt', () => {
    expect(autoCategory('REMBOURSEMENT DE PRET 00006808334', 'debit')).toBe('loyer-credit')
  })

  it('détecte Loyer/Crédit sur "appartement"', () => {
    expect(autoCategory('WEB Emma DESPREZ appartement', 'debit')).toBe('loyer-credit')
  })

  it('détecte Frais bancaires sur COTISATION', () => {
    expect(autoCategory('Offre Globe Trotter', 'debit')).toBe('frais-bancaires')
  })

  it('détecte Frais bancaires sur Offre Essentiel', () => {
    expect(autoCategory('Offre Essentiel', 'debit')).toBe('frais-bancaires')
  })

  it('détecte Shopping sur UNIQLO', () => {
    expect(autoCategory('Uniqlo Lyon', 'debit')).toBe('shopping')
  })

  it('détecte Sorties sur le traquenard', () => {
    expect(autoCategory('le traquenard LYON', 'debit')).toBe('sorties')
  })

  it('retourne non-categorise si aucune règle ne correspond', () => {
    expect(autoCategory('VIREMENT DIVERS INCONNU', 'debit')).toBe('non-categorise')
  })
})

describe('autoCategory — crédits', () => {
  it('retourne revenus par défaut pour un crédit', () => {
    expect(autoCategory('VIREMENT EN VOTRE FAVEUR STEAMULO', 'credit')).toBe('revenus')
  })

  it('retourne remboursements pour un AVOIR', () => {
    expect(autoCategory('AVOIR CARTE X4912 Jow', 'credit')).toBe('remboursements')
  })

  it('retourne remboursements pour CPAM', () => {
    expect(autoCategory('CPAM RHONE 261000000104', 'credit')).toBe('remboursements')
  })

  it('retourne revenus pour un virement entrant générique', () => {
    expect(autoCategory('VIR INST WERO de KEVEN', 'credit')).toBe('revenus')
  })
})
