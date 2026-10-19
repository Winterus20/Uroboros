// H2 KANIT SCRIPT'İ: bundle edilmiş simülatörün kullandığı sabitlerin gerçek
// src/game/* kaynağıyla aynı olduğunu DAVRANIŞ üzerinden doğrular.
// Çalıştırma: node brain/scratchpad/harness/build-sim.mjs && node brain/scratchpad/harness/out/verify-sim-constants.mjs
// Her kontrol simülasyonun kendi metotlarını çağırır; sim'de eski (kopya) bir tablo
// kalmış olsaydı sonuç gerçek tablodan sapar ve kontrol FAIL verirdi.
import Decimal from 'break_eternity.js'
import { BASE_COSTS, COST_MULTS, DIMENSION_CHAIN_RATE, RESOLUTION_MILESTONES } from '../../../src/game/balance'
import { AUTOBUYER_COSTS } from '../../../src/game/autobuyer-data'
import { PER_ACHIEVEMENT_MULT, ROW_COMPLETION_MULT } from '../../../src/game/achievements'
import { BASE_SHIFT_POWER } from '../../../src/game/challenges'
import { Simulation } from '../simulate-economy'

let failures = 0

function assertDecimal(label: string, actual: Decimal, expected: Decimal): void {
  const ok = actual.eq(expected)
  if (!ok) failures++
  const tag = ok ? '[OK]  ' : '[FAIL]'
  const tail = ok ? '' : '  (beklenen: ' + expected.toString() + ')'
  console.log('  ' + tag + ' ' + label + ' => ' + actual.toString() + tail)
}

function assertClose(label: string, actual: number, expected: number): void {
  const ok = Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected))
  if (!ok) failures++
  const tag = ok ? '[OK]  ' : '[FAIL]'
  const tail = ok ? '' : '  (beklenen: ' + expected + ')'
  console.log('  ' + tag + ' ' + label + ' => ' + actual + tail)
}

console.log('=== H2: SIM SABİTLERİ GERÇEK KAYNAKLA EŞİT Mİ? ===')
console.log('')
console.log('[gerçek src/game/balance.ts] RESOLUTION_MILESTONES: ' +
  RESOLUTION_MILESTONES.map((m) => m.count + 'x' + m.mult).join(', '))
console.log('[gerçek src/game/autobuyer-data.ts] AUTOBUYER_COSTS.dim1: ' + AUTOBUYER_COSTS.dim1.toString())
console.log('[gerçek src/game/balance.ts] DIMENSION_CHAIN_RATE: ' + DIMENSION_CHAIN_RATE)
console.log('[gerçek src/game/achievements.ts] PER_ACHIEVEMENT_MULT: ' + PER_ACHIEVEMENT_MULT +
  ', ROW_COMPLETION_MULT: ' + ROW_COMPLETION_MULT)
console.log('')

console.log('1) RESOLUTION_MILESTONES — sim.getDimensionMultiplier(1) her eşikte gerçek tabloyu vermeli')
for (const m of RESOLUTION_MILESTONES) {
  const sim = new Simulation()
  sim.dimensions[0].bought = m.count
  assertDecimal('D1 bought=' + m.count, sim.getDimensionMultiplier(1), new Decimal(m.mult))
}
console.log('')

console.log('2) AUTOBUYER_COSTS — 1e9 kütleyle checkAutobuyersUnlock tam olarak gerçek fiyatı düşmeli')
{
  const sim = new Simulation()
  sim.matter = new Decimal(1e9)
  sim.checkAutobuyersUnlock()
  assertDecimal('kalan kütle (1e9 - dim1 fiyatı)', sim.matter, new Decimal(1e9).minus(AUTOBUYER_COSTS.dim1))
  const ok = sim.autobuyers.dim1.unlocked === true
  if (!ok) failures++
  console.log('  ' + (ok ? '[OK]  ' : '[FAIL]') + ' dim1 botu açıldı mı => ' + sim.autobuyers.dim1.unlocked)
  const keys = Object.keys(sim.autobuyers).sort().join(',')
  const realKeys = Object.keys(AUTOBUYER_COSTS).sort().join(',')
  const keysOk = keys === realKeys
  if (!keysOk) failures++
  console.log('  ' + (keysOk ? '[OK]  ' : '[FAIL]') + ' bot anahtar kümesi gerçek tabloyla aynı mı => ' + keysOk)
}
console.log('')

console.log('3) DIMENSION_CHAIN_RATE — sim.tick zincir beslemesi gerçek oranı kullanmalı')
{
  const sim = new Simulation()
  sim.dimensions[1].amount = new Decimal(1e6)
  const before = sim.dimensions[0].amount
  const unit = sim.dimensions[1].amount
    .times(sim.getDimensionMultiplier(2))
    .times(sim.tickspeedMultiplier)
    .times(sim.achievementMultiplier)
    .times(0.01)
  sim.tick(0.01)
  const produced = sim.dimensions[0].amount.minus(before)
  const rate = produced.div(unit).toNumber()
  assertClose('ölçülen zincir oranı', rate, DIMENSION_CHAIN_RATE)
  const oldDrift = Math.abs(rate - 0.1) < 1e-12
  if (oldDrift) failures++
  console.log('  ' + (oldDrift ? '[FAIL]' : '[OK]  ') + ' eski kopya oran (0.1) kullanılmıyor')
}
console.log('')

console.log('4) PER_ACHIEVEMENT_MULT / ROW_COMPLETION_MULT — achievementMultiplier formülü')
{
  const sim = new Simulation()
  sim.manualClicks = 1000
  const got = sim.achievementMultiplier
  const count = sim.achievementsCount
  const expected = Decimal.pow(PER_ACHIEVEMENT_MULT, count)
    .times(Decimal.pow(ROW_COMPLETION_MULT, Math.floor(count / 7)))
  assertDecimal('achievementsCount=' + count, got, expected)
}
console.log('')

console.log('5) BASE_COSTS / COST_MULTS — kova maliyeti gerçek tablodan')
{
  const fresh = new Simulation()
  for (let tier = 1; tier <= 8; tier++) {
    assertDecimal('D' + tier + ' bought=0 maliyeti', fresh.getDimensionCost(tier), BASE_COSTS[tier - 1])
  }
  const bucketed = new Simulation()
  bucketed.dimensions[2].bought = 10
  assertDecimal('D3 bought=10 maliyeti', bucketed.getDimensionCost(3), BASE_COSTS[2].times(COST_MULTS[2]))
}
console.log('')

console.log('6) BASE_SHIFT_POWER — sıçrama gücü varsayılanı gerçek tabanla')
{
  const sim = new Simulation()
  sim.dimensionShifts = 1
  sim.dimensions[0].bought = 0
  assertDecimal('1 sıçrama sonrası D1 çarpanı', sim.getDimensionMultiplier(1), new Decimal(BASE_SHIFT_POWER))
}
console.log('')

if (failures > 0) {
  console.log('SONUÇ: ' + failures + ' kontrol BAŞARISIZ')
  process.exitCode = 1
} else {
  console.log('SONUÇ: tüm kontroller geçti — sim sabitleri gerçek src/game/* kaynağıyla eşit')
}
