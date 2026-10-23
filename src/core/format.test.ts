import { describe, expect, it } from 'vitest'

import { format, formatParts, heroParts } from './format'

/**
 * Gösterim merdiveni sözleşmesi (ADR-0080).
 *
 * Oyuncu geri bildirimi: 1000'de "1e3" yazıyordu ve kimse okumuyordu; 1, 10,
 * 100 gibi küçük sayılarda ise ondalık kısım yuvarlamada kayboluyordu.
 * Bu dosya üç eşiği de pinler: düz sayı → K/M/B/T kısaltması → e-notasyonu.
 */
describe('sayı gösterimi', () => {
  it('1000 altında ondalık kısım görünür kalır', () => {
    expect(format(0)).toBe('0')
    expect(format(1)).toBe('1')
    expect(format(1.5)).toBe('1.5')
    expect(format(12.34)).toBe('12.34')
    expect(format(100)).toBe('100')
    // Yuvarlama kesri yutmasın: 1.001 ekranda "1" olmamalı.
    expect(format(1.001)).toBe('1.001')
  })

  it('1000 ve üstünde çoğu insanın okuduğu kısaltmaları kullanır', () => {
    expect(format(1000)).toBe('1 K')
    expect(format(1234)).toBe('1.23 K')
    expect(format(1.5e6)).toBe('1.5 M')
    expect(format(2e9)).toBe('2 B')
    expect(format(7.25e12)).toBe('7.25 T')
  })

  it('kısaltma tükendiğinde e-notasyonuna geçer', () => {
    expect(format(1e15)).toBe('1e15')
    expect(format(1.79e308)).toBe('1.79e308')
  })

  it('yuvarlama taşarsa kısaltma büyür, ekranda "1000 K" görünmez', () => {
    expect(format(999_999)).toBe('1 M')
  })

  it('negatif sayı işareti korur', () => {
    expect(format(-1234)).toBe('-1.23 K')
    expect(format(-1.5)).toBe('-1.5')
  })

  it('0 ondalık seçilirse 1000 altı tam sayıya yuvarlanır', () => {
    expect(format(1.5, 0)).toBe('2')
  })

  it('scientific / engineering seçenekleri hâlâ çalışır', () => {
    expect(format(1000, 2, 'scientific')).toBe('1e3')
    expect(format(1.5e6, 2, 'engineering')).toBe('1.5e6')
  })

  it('heroParts kısaltmayı kuyruk parçasına koyar (yapısal dizgi)', () => {
    expect(heroParts(42.5)).toEqual({ base: '42.5', tail: '' })
    expect(heroParts(1234)).toEqual({ base: '1.23', tail: 'K' })
    expect(heroParts(1e16)).toEqual({ base: '1', tail: 'e16' })
  })

  it('formatParts kısaltma ve üs ayrımını korur', () => {
    expect(formatParts(1234)).toEqual({ main: '1.23', suffix: 'K', kind: 'suffix' })
    expect(formatParts(1e18)).toEqual({ main: '1', suffix: 'e18', kind: 'exponent' })
    expect(formatParts(12.5)).toEqual({ main: '12.5', suffix: '', kind: 'plain' })
  })
})
