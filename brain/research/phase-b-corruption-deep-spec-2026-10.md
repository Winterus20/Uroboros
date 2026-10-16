# FAZ B — Derinleştirme Spesifikasyonu: Bozulma Altyapısı

**Tarih:** 2026-10-16 · **Durum:** Uygulandı · **Kapsam:** YALNIZ Faz B
**Üst belge:** `visual-language-hungry-parlor-implementation-plan-2026-10.md` §5
**Bağlayıcı sözleşme:** `brain/context/visual-language.md` §4 · ADR-0060 §2.2 · ADR-0062

> **Tek cümlelik hedef:** Bozulma seviyesini (K0–K5) mevcut monotonik durumdan
> türeten saf, testli modül + App kök `data-corruption` mührü + CSS şiddet eğrisi.
> Görsel tüketici (substrat/motif) Faz C'de gelir; **CRT şiddeti hemen bağlanır.**

---

## 1. API (donmuş)

```ts
// src/game/corruption.ts
export type CorruptionLevel = 0 | 1 | 2 | 3 | 4 | 5
export interface CorruptionInput { unlockedDimensionsCount: number; singularities: number; nightWatchUnlocked: boolean }
export const MAX_CORRUPTION_LEVEL: CorruptionLevel = 4
export function deriveCorruptionLevel(i: CorruptionInput): CorruptionLevel
export function corruptionStamp(level: CorruptionLevel): 'K0'|'K1'|'K2'|'K3'|'K4'|'K5'
export function parseCorruptionStamp(stamp: unknown): CorruptionLevel
export const CORRUPTION_META: Record<CorruptionLevel, { label; crtIntensity; scanlineAlpha; vignetteAlpha; glowAlpha; substrateOpacity; motifBandOpacity; glitchIntensity }>
```

Merdiven: `unlocked>=5`→K1, `unlocked>=6`→K2, `singularities>=1`→K3,
`nightWatch && singularities>=1`→K4; dönüş `min(level,4)`. Girdi sanitizasyonu:
NaN→0, negatif→0, unlocked 0..8'e kıskaçlanır.

## 2. Dosya bazlı iş listesi (uygulandı)

| Dosya | Değişiklik |
| :--- | :--- |
| `src/game/corruption.ts` (YENİ) | Yukarıdaki API + O1 merdiveni + meta eğrisi |
| `src/game/corruption.test.ts` (YENİ) | 11 test: sınır geçişleri, O1 sıra kilidi, K5 tavanı, monotonluk, bozuk girdi, stamp round-trip, meta monotonluğu, kanon |
| `src/stores/game/getters-misc.ts` | `corruptionLevel` getter (`resolvedUnlockedDimensionCount(state)` + kalıcı sayaçlar; yeni state YOK) |
| `src/stores/game/store-api.ts` | `corruptionLevel: CorruptionLevel` |
| `src/App.vue` | `corruptionStamp` import + kök `:data-corruption` |
| `src/style.css` | `:root` 4 yeni knob + `[data-corruption="K0".."K5"]` 6 blok (değerler meta ile birebir) |

## 3. Kabul kriterleri (hepsi PASS)

- [x] Deterministik + monotonik; tüm sınır geçişleri testli.
- [x] Kayıt formatı değişmedi (save bump yok); eski kayıtlar sorunsuz yüklenir.
- [x] Kök mühür doğru; CRT şiddeti seviyeyle değişiyor.
- [x] Okunabilirlik kanonu: metin/ramp/tooltip seçicisi yok.

## 4. Doğrulama

`npm test` 294/294 · `npm run build` 0 hata · `harness:smoke` log10=90.72/8 shift
(baseline sabit). Kapsam dışı (Faz C/D/E'ye dokunulmadı).
