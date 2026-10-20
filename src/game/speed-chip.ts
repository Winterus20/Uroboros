// M1 — Üretim Çipi (production chip) saf çekirdek modülü.
// Spec: brain/research/m1-speed-chip-spec-2026-10.md (§2 mekanik, §3 sayılar, §4 uygulama).
// Revizyon (M1 v2): çipin etkisi "bot hızı" DEĞİL, "boyut üretim çarpanı".
//
// KURALLAR:
//  * Framework'süzdür: Pinia/store import ETMEZ, yalnızca saf sayı üretir.
//  * Sabitler TEK kaynaktır (aşağıda); store katmanı buradan okur, kopyalamaz.
//  * Tesadüf yoktur: aynı seviye her zaman aynı maliyeti/etkiyi verir (ADR-0032).
//
// MEKANİK (M1 v2):
//  Çip kütle (mass) cüzdanıyla alınan GLOBAL, tek merdivenli bir yatırımdır.
//  Etki: BOYUT ÜRETİM ÇARPANI = 1.1^seviye (her seviye +%10, ÇARPIMLA).
//
//  ÖLÇÜM GEREKÇESİ (tahmin değil, ölçüm):
//  M1 çekirdeği ölçüldü ve "bot hızı" etkisi SIFIR çıktı (12 sa koşu: çipsiz tepe
//  1e308.25 == çipli tepe 1e308.25; 40 seviye, 1641 alım). Sebep: darboğaz bot
//  hızı değil KÜTLE idi — botlar paraları olmadığı için bekler. Dahası kütleyi
//  çipe harcamak, aynı kütleyi boyut kovasına harcamaktan (her 10 alımda ×1.595)
//  HER ZAMAN daha zayıf → mekanizma ekonomik olarak BASKILANMIŞ (dominated) idi.
//  Bu yüzden çip artık üretimin kendisini çarpanlar: seviye 5 → ×1.61 ≈ bir boyut
//  kovasının değeri → "bu koşuda çipe mi, boyuta mı?" ikilemi GERÇEK olur.
//  Tempo etkisi ihmal edilebilir (sabit çarpan → eğri ~0.2–0.5 dekad kayar).
//
//  Maliyet: CHIP_BASE_COST × CHIP_COST_MULT^seviye (1e40 × 1e4^N), tavan 40.

import { Decimal } from "../core/math"

/**
 * İlk çipin maliyeti (dopamin cüzdanı). 1e12 tabanı 600 sn'lik pacing penceresini
 * ölçümle bozuyordu (erken seviyeler ×45'e birikiyor, colony/lab'ı 600 sn'ye çekiyor).
 * 1e40 tabanı ilk çipi ~353 sn (D7 bölgesi) sonrasına taşır → ilk 10 dakika korunur;
 * merdiven orta-oyunda (1e40 → 1e196) çalışmaya devam eder (ADR-0074).
 */
export const CHIP_BASE_COST = 1e40

/**
 * Seviye başına maliyet çarpanı: 1e4 → seviye başına 4 dekad.
 * Boyut kova ivmesiyle (COST_MULTS ≈ 3 dekad/kova) aynı bantta olmalı ki çip
 * almak boyut almaktan ne ucuz ne pahalı olsun (spec §2.3 "ikilem garantisi").
 */
export const CHIP_COST_MULT = 1e4

/**
 * Seviye başına BOYUT ÜRETİM ÇARPANI artışı: +%3.
 * Çarpımla birikir → toplam çarpan = (1 + 0.03)^seviye. Tavan (40) → ×3.26.
 * (Ölçüm: +%10 varyantı 12 saatlik koşuyu 9s33dk → 1s14dk'ya çekiyor ve Kriz→Koloni
 *  vadisini 607s → 166.5s'ye sıkıştırıyordu → pacing ölçütü ihlal. +%3 varyantı
 *  merdiveni korurken orta-oyuna gerçek bir yatırım sunar: seviye 5 → ×1.16.)
 */
export const CHIP_PRODUCTION_PER_LEVEL = 0.03

/**
 * Koşu içi üst sınır. Koşu içi olduğu için kayıtta tutulmaz (migrasyon yok).
 */
export const CHIP_MAX_LEVEL = 40

/** Seviyeyi güvenli aralığa indirger: tam sayı, negatif değil, NaN değil. */
function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.floor(level))
}

/**
 * Sıradaki çipin maliyeti: CHIP_BASE_COST × CHIP_COST_MULT^level.
 * Birebir Decimal aritmetiğiyle üretilir (ölçüm kilidi: level 0 → CHIP_BASE_COST).
 */
export function speedChipCost(level: number): Decimal {
  const safe = normalizeLevel(level)
  return new Decimal(CHIP_BASE_COST).times(Decimal.pow(CHIP_COST_MULT, safe))
}

/**
 * Boyut üretim çarpanı: (1 + CHIP_PRODUCTION_PER_LEVEL)^level = 1.1^level.
 * Seviye 0 → 1 (etkisiz). Tavan (40 seviye) → ×45.26.
 */
export function speedChipProductionMult(level: number): Decimal {
  const safe = normalizeLevel(level)
  if (safe === 0) return new Decimal(1)
  return Decimal.pow(1 + CHIP_PRODUCTION_PER_LEVEL, safe)
}

/** Tavan doldu mu? (CHIP_MAX_LEVEL aşılırsa satın alma no-op olur) */
export function isSpeedChipMaxed(level: number): boolean {
  return normalizeLevel(level) >= CHIP_MAX_LEVEL
}

/** Kısa insan-okur etiket: seviye 0 → "Etkisiz", aksi hâlde "Boyut üretimi ×1.61". */
export function speedChipEffectLabel(level: number): string {
  const safe = normalizeLevel(level)
  if (safe <= 0) return "Etkisiz"
  return `Boyut üretimi ×${speedChipProductionMult(safe).toNumber().toFixed(2)}`
}
