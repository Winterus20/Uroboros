# ADR-0062: Faz B — Bozulma Altyapısı (K0–K4 Türetme + `data-corruption` Mührü + CRT Şiddet Eğrisi)

- **Tarih:** 2026-10-16
- **Durum:** Uygulandı (Faz B kapsamı) — Faz C/D/E bekliyor
- **Kapsam:** `src/game/corruption.ts`, `src/game/corruption.test.ts`, store `corruptionLevel` getter, App kök mührü, CSS token tahsisi
- **Önceller:** ADR-0060 (pivot — bu ADR onun **Faz B** ayağıdır) · ADR-0061 (Faz A baseline K0) · ADR-0058 (motion kapısı) · ADR-0049 (okunaklı Balatro) · ADR-0044 (shake containment) · ADR-0035 (açılış bir olaydır — monotonik sinyaller)
- **Derin spesifikasyon:** `brain/research/phase-b-corruption-deep-spec-2026-10.md`
- **Bağlayıcı sözleşme:** `brain/context/visual-language.md` §4

---

## 1. Bağlam

Faz A, CRT makinesini K0 baseline'ında kurdu (`--crt-scanline-alpha: 0.10` vb.) ama
şiddeti ilerlemeye bağlayacak türetme modülü yoktu. Plan §2, üç monotonik sinyal
belirlemişti: `unlockedDimensionsCount` (lifetimePeakShifts tabanlı),
`singularities`, `nightWatchUnlocked`. Açık kararlar O1 (K3/K4 sırası) ve O3
(CRT şiddet eğrisi) Faz B başında kapatılacaktı.

Dış araştırma sentezi:
- **Balatro:** scanline dünyanın parçasıdır — hep hafif açık, şiddet kademeli artar,
  flaş/flicker yoktur (WCAG 2.3.1 + statik gradyan = sıfır CPU).
- **GIC:** her cadının tek teması vardır → burada her FAZ tek motif grubudur;
  substrat K2'de %25 ile başlar, K4'te %40 tavan yapar (okunabilirlik tavanı).
- **Antimatter Dimensions:** prestij katmanları sayısal sonsuz döngü verir; görsel
  karşılık burada faz-merdivenidir (boyuta değil faza bağlı — kullanıcı kararı).

## 2. Karar

### 2.1 Türetme (O1 kapandı)
`deriveCorruptionLevel`: K0 (`unlocked<5`) → K1 (`>=5`, D5) → K2 (`>=6`, D6–D8) →
K3 (`singularities>=1`) → K4 (`nightWatchUnlocked && singularities>=1`).
Naive `K4 = nightWatchUnlocked` reddedildi: `NIGHT_WATCH_THRESHOLD` (1e308) şafak
eşiğinden (1.79e308) ÖNCE tetiklenir → K4 K3'ten önce doğardı. K4, K3'ün üstüne
gate'lenir; ilk koşuda 1e308'de hiçbir şey değişmez, ilk Big Crunch'ta K3 → K4.
K5 gate'i yok → `Math.min(level, 4)` tavanı (Faz 3'te kaldırılacak).

### 2.2 Şiddet eğrisi (O3 kapandı)
`CORRUPTION_META` + `[data-corruption]` CSS'i birebir aynı değerleri taşır
(tek taraflı değişim yasak): K0 scanline %10 → K1 %35 → K2 %45; substrat K2 %25,
K4 %40; motif K4'te %85 (sürekli akışın habercisi); glitch K3'te bölgesel (0.30).

### 2.3 Mühür ve kapsam disiplini
App kök `:data-corruption="K0..K4"`; CSS yalnız ambient tokenları ezer
(`--crt-*`, `--substrate-opacity`, `--motif-band-opacity`, `--glitch-intensity`).
Sayı/etiket/ramp/tooltip seçicisi yoktur (okunabilirlik kanonu). Kayıt formatı
değişmedi (save version bump yok); `corruptionLevel` store getter'dır, state değildir.

## 3. Sonuçlar

- `npm test` 294/294 (11 yeni) · `npm run build` 0 hata · `harness:smoke`
  log10=90.72 / 8 shift (baseline sabit — denge dokunulmadı).
- Faz C (`motifs.ts`, `MotifBand.vue`) ve Faz D bu mührü/tokenları tüketir.
- K5 gate'i + `MAX_CORRUPTION_LEVEL` tavan kaldırma Faz 3 işidir.
