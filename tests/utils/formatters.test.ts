import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatYearMonth,
  toYearMonth
} from '~/utils/formatters'

describe('formatCurrency', () => {
  it('formate un entier en euros FR', () => {
    expect(formatCurrency(1000)).toBe('1 000,00 €')
  })

  it('formate un montant décimal', () => {
    expect(formatCurrency(22.07)).toBe('22,07 €')
  })

  it('formate zéro', () => {
    expect(formatCurrency(0)).toBe('0,00 €')
  })

  it('formate un montant négatif', () => {
    expect(formatCurrency(-50)).toContain('-')
    expect(formatCurrency(-50)).toContain('50')
  })
})

describe('formatDate', () => {
  it('convertit YYYY-MM-DD en DD/MM/YYYY', () => {
    expect(formatDate('2026-04-30')).toBe('30/04/2026')
  })

  it('gère les jours et mois avec zéro', () => {
    expect(formatDate('2026-01-07')).toBe('07/01/2026')
  })
})

describe('formatYearMonth', () => {
  it('formate en nom de mois + année en français', () => {
    const result = formatYearMonth('2026-04')
    expect(result.toLowerCase()).toContain('avril')
    expect(result).toContain('2026')
  })

  it('gère janvier', () => {
    const result = formatYearMonth('2026-01')
    expect(result.toLowerCase()).toContain('janvier')
  })

  it('gère décembre', () => {
    const result = formatYearMonth('2025-12')
    expect(result.toLowerCase()).toContain('décembre')
  })

  it('ne plante pas sur un format invalide', () => {
    expect(() => formatYearMonth('invalid')).not.toThrow()
  })
})

describe('toYearMonth', () => {
  it('extrait YYYY-MM depuis une date complète', () => {
    expect(toYearMonth('2026-04-30')).toBe('2026-04')
  })

  it('extrait YYYY-MM depuis une date en début de mois', () => {
    expect(toYearMonth('2026-01-01')).toBe('2026-01')
  })
})
