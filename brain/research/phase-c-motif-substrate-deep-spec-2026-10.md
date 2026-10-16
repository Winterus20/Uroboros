# FAZ C — Derinleştirme Spesifikasyonu: GIC Kimlik Kütüphanesi

**Tarih:** 2026-10-16 · **Durum:** Uygulandı · **Kapsam:** YALNIZ Faz C
**Üst belge:** `visual-language-hungry-parlor-implementation-plan-2026-10.md` §6
**Bağlayıcı sözleşme:** `brain/context/visual-language.md` §1/§5 · ADR-0060 §2.4 · ADR-0063

> **Tek cümlelik hedef:** Motif slot sistemi + boost bandı + kolaj substratı +
> Wrinkler kaplaması + kriz/Planck vinyetleri. Her faz kendi motif grubunu açar.

---

## 1. Donmuş API

```ts
// src/game/motifs.ts
export type MotifGroup = 'planck' | 'cosmic' | 'collapse' | 'nightwatch'
export type MotifTone = 'feast' | 'bone' | 'ember'
export interface MotifSlot { id: string; name: string; group: MotifGroup; tone: MotifTone; svg: string; weight: number }
export const MOTIFS: MotifSlot[]            // 16 slot
export function motifsForCorruption(level: CorruptionLevel): MotifSlot[]  // K0 → []
export function buildMotifStrip(level: CorruptionLevel, count: number): MotifSlot[]  // deterministik
```

## 2. Dosya bazlı iş listesi (uygulandı)

| Dosya | Değişiklik |
| :--- | :--- |
| `src/assets/motifs/*.svg` (16 YENİ) | İlk dalga motifler (grup başına 4, `currentColor` tint) |
| `src/game/motifs.ts` (YENİ) | Slot modülü + `?raw` importlar + seçim yardımcıları |
| `src/game/motifs.test.ts` (YENİ) | 7 test: ad=dosya kontratı, grup bütçesi, eşik hizası, K0 steril, SVG/tone disiplini, strip determinizmi |
| `src/components/MotifBand.vue` (YENİ) | L3 bant: boost'ta yan şeritler, komboda yoğunluk ×~2, motion 3-state kapısı |
| `src/App.vue` | `<MotifBand />` (`#game-main-content` kardeşi, ADR-0044) |
| `src/components/ScreenOverlay.vue` | L2 substrat: K1 yırtık → K2 dama → K3 bant → K4 zemin (TS v-if + `--substrate-opacity`) |
| `src/components/DimensionsTab.vue` | C4 `wrinkler-chip` + C5 Planck `planck-collage` (K1+) |
| `src/components/CrisisTab.vue` | C5 `crisis-collage-frame` (challenge/backfire/meltdown) + damalı alt/üst bar |
| `src/style.css` | `.layer-motif` (z=45) + Faz C kolaj bloğu (bant/substrat/kaplama + tüm motion kapıları) |

## 3. Kabul kriterleri (hepsi PASS)

- [x] Boost anında kenarlardan motif süzülüyor; rezonans kombosunda yoğunluk artıyor.
- [x] K2+ substrat görünür; K0/K1'de bant yok (steril korunur; K1 yalnız yırtık köşe).
- [x] `data-corruption` + motion kapısına bağlı; `off` modda gizli, `reduced`'da statik.
- [x] Motif ekleme kod değişikliği gerektirmez (SVG + kayıt satırı).

## 4. Doğrulama

`npm test` 301/301 · `npm run build` 0 hata · `harness:smoke` log10=90.7/8 shift
(baseline sabit). Kapsam dışı (Faz D/E'ye dokunulmadı).
