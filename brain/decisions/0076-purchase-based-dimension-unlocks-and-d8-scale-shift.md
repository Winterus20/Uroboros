# 0076. Satın Alma Tabanlı Boyut Açılışı ve D8 Çağı Ölçek Sıçraması

- **Tarih:** 2026-10-20
- **Durum:** Kabul edildi ve uygulandı (kullanıcı kararı)
- **Tür:** Ekonomi, Pacing, Oyun Tasarımı, Kayıt Şeması
- **İlgili Belgeler:** ADR-0025 (legacy `dimensionCapFloor`), ADR-0033 (taban 3), ADR-0035 ("açılış bir OLAYdır"), ADR-0072 (kütle kapıları), ADR-0074 (ölçülmüş erken merdiven), ADR-0075 (tempo bandı)
- **Süperseed eder:** ADR-0072'nin **boyut açılış kaynağı = deterministik kütle kapıları** maddesi (kapı tablosu yalnız kayıt göçü için yaşar) ve ADR-0072/ADR-0033'ün **sıçrama hedef tier'ı artan rampa** maddesi (hedef artık sabit D8)

---

## 1. Bağlam ve Problem

Kullanıcı kararı (2026-10-20) iki maddeyi birlikte getirdi:

1. **Ölçek Sıçraması D8'de kullanılmaya başlansın, önceki boyutlarda değil.**
   Sıçrama bugün hedef tier'ı sıçrama sayısıyla yükseliyordu (D3 → D4 → … → D8) ve
   ilk sıçrama ~41 saniyede geliyordu. Bu, sıçramayı oyunun *en erken* hızlandırıcısı
   yapıyordu: oyuncu 40 saniyede ×1.66 kalıcı çarpan alıyor, sonraki her sıçrama
   1.66 kat daha fazla üretim demek.
2. **Her boyut alındığında bir sonraki boyut açılsın.** D4–D8 bugün kütle eşikleriyle
   (1e8 / 1e14 / 1e24 / 1e40 / 1e65) açılıyordu; oyuncunun boyut satın alımı ile
   açılış arasında hiçbir bağ yoktu.

İki istek birlikte okunduğunda hedef açık bir model ortaya çıkıyor: **klasik
Antimatter Dimensions düzeni** — boyut merdiveni oyuncunun satın alımıyla ilerler,
sıçrama ise merdivenin zirvesinde (D8) bir *döngü* mekaniğidir.

ADR-0072'nin kütle kapıları ise tam tersini yapıyordu: açılış oyuncudan alınan bir
karara değil, sıçrama sayacından gelen deterministik bir merdivene bağlıydı ve
(ADR-0074) oyuncunun satın alma eylemiyle hiçbir teması yoktu.

---

## 2. Karar

### 2.1 Boyut açılışı: SATIN ALMA (tek kaynak)

**Kural:** bir boyuttan **1 paket (10 adet)** satın alındığında bir sonraki boyut açılır.
D1–D3 taban olarak hep açıktır (`BASE_UNLOCKED_DIMENSIONS = 3`) — kural D3 → D4
zincirinden itibaren işler.

```ts
// src/game/balance.ts
export const DIMENSION_UNLOCK_PURCHASE_COUNT = 10

export function dimensionUnlockCountFromPurchases(lifetimeMaxDimensionTier: number): number {
  // 0 → 3 (taban) · 3 → 4 · 4 → 5 … 7 → 8
}

export function resolvedUnlockedDimensionCount(state: {
  dimensionCapFloor: number
  activeChallenge: string | null
  lifetimeMaxDimensionTier: number
}): number
```

**Kalıcılık:** açılış kaynağı `state.lifetimeMaxDimensionTier`dır — *hayat boyu
satın alınmış en yüksek tier*. Bu alan koşu sıfırlamalarından (sıçrama / küme /
şafak) **etkilenmez**; sıçrama boyut satın alımlarını siler ama açılışı geri almaz
(ADR-0035 ruhu: "açılış bir OLAYdır, kapı değil").

**Yazım yolu:** dört satın alma action'ı (`buyDimension`, `buyMaxDimension`,
`buyDimensionUnits`, `buyOneUnit`) ortak bir kancaya yazılır:

```ts
registerDimensionPurchase(tier: number, bought: number): void {
  if (bought < DIMENSION_UNLOCK_PURCHASE_COUNT) return
  if (tier > this.lifetimeMaxDimensionTier) this.lifetimeMaxDimensionTier = tier
}
```

**Cache etkisi:** `dimMultCacheKey` (boyut çarpanı memo'su) eskiden açılışı izlemek
için `lifetimePeakMatter`'ı taşıyordu. Artık taşıması gereken `maxDimensionTier`dır;
`peakMatter` bileşeni **kaldırıldı** (gereksiz cache invalidation üretiyordu ve
açılışla ilgisi kalmamıştı).

### 2.2 Ölçek Sıçraması: D8 çağı

`shiftRequirement` artık sabit bir hedefe bakar:

- Hedef tier: **her zaman D8** (`SCALE_SHIFT_TARGET_TIER = 8`).
- C7 (Hesap Kısıtlaması) boyutları 6'da kırpar → hedef D6'ya iner.
- Miktar rampası korunur: 1. sıçrama → 10 · 2. → 15 · 3–5. → 25 · 6+. → 26 + 16×(n−6)
  (C7'de geç dal telafisi: 30 + 15×(n−3)).
- `canShift` hedef tier **açık değilse** false döner: D8 açılmadan sıçrama yapılamaz.

UI: sıçrama kartı, D8 açılmadan "D8 açılınca aktifleşir" durumunu gösterir (Kozmik
Kümeler kartıyla aynı desen).

### 2.3 Otobot kademeleri yeniden hizalandı

Bot kademeleri sıçramaya değil **boyut zincirine** bağlandı: `dimN` botu, bir
altındaki boyuttan (`D{N-1}`) satın alınmış olmayı ister. Böylece bot zinciri
kendini besler, D8'e kadar deadlock'sız ilerler. Sıçrama botu artık **D8 sahibi
olmayı** ister (sıçrama bir D8 çağı mekaniğidir).

Eski kademeler (`dim3: shifts 1` … `dim8: shifts 4`) D8-gated sıçramayla
döngüsel hale gelirdi (D8 → sıçrama → D8), bu yüzden değiştirildi.

### 2.4 Kayıt şeması v19

Yeni kalıcı alan: `lifetimeMaxDimensionTier?: number`.

- `SAVE_VERSION` 18 → 19 (`MIN_SUPPORTED_SAVE_VERSION` 17'de kalır → v17/v18 kayıtları açılır).
- **Göç:** v19+ kayıtlarda alan kayıttan okunur ve satın alınmış boyutlarla doğrulanır.
  v18 ve öncesi kayıtlarda açılış kütle kapılarından gelirdi; oyuncunun açık boyutunu
  **düşürmemek** için legacy kapı sayısı yeni tabana çevrilir
  (`legacyLifetimeMaxDimensionTier`).
- Legacy kapı tablosu `LEGACY_DIMENSION_UNLOCK_GATES` adıyla **yalnız göç için** yaşar.

---

## 3. Ölçülen Etki

Ölçüm: `harness:smoke` (active profil, seed 1, dt 0.5, 30 dk) — eski model
(ADR-0074/0075) ile karşılaştırmalı.

| Milestone | Yeni model (ADR-0076) | Önceki model (kütle kapıları) |
| :--- | ---: | ---: |
| `d4` açıldı | 40.5 s (log10 2.6) | 186 s (log10 2.8) |
| `d5` açıldı | 102.5 s (log10 5.0) | 195 s (log10 5.4) |
| `d6` açıldı | 210.5 s (log10 8.4) | 231.5 s (log10 8.9) |
| `d7` açıldı | 350.5 s (log10 12.2) | 353 s (log10 14.7) |
| `d8` açıldı | 544.5 s (log10 16.5) | 1377 s (log10 40.9) |
| `first_shift` | 760.5 s (12.7 dk) | 41 s |
| 30 dk'da sıçrama | 3 | 9 |
| 30 dk zirve log10 | 48.8 | 97.6 |

**Okuma:**

1. **Boyut merdiveni belirgin şekilde hızlandı.** D8 23. dakikadan 9. dakikaya düştü:
   açılış artık oyuncunun kendi eylemine (paket satın alma) bağlı ve doğal olarak
   zincirin maliyet eğrisiyle ilerliyor. Bu, ADR-0074'ün "kapıları zamana yay"
   hedefini **oyuncunun kararına** devreder.
2. **Sıçrama artık bir olay değil, bir dönüm noktası.** İlk sıçrama 41 s → 12.7 dk.
   Bunun doğrudan sonucu: ilk 30 dakikada biriken sıçrama çarpanı 1.66^9 = 60x
   yerine 1.66^3 = 4.6x. Ekonomi 30 dakikada ~2 kat yavaş ilerliyor (log10 97.6 → 48.8).
3. Bu, ADR-0075'in "ölçülen 8–11 saat" tempo bandını **yukarı** iter; sıçrama
   hızlandırıcısı artık D8'e bağlı olduğu için koşu başına toplam sıçrama sayısı
   azalır.

**Uzun vadeli ölçüm (12 saat, active/seed 1/dt 0.5):** ilk tekillik **10:12:00**
(17 sıçrama, 8 küme) — eski modelde 9:33:17. Yani **koşu süresi yalnızca ~%7 uzadı**:
30 dakikalık pencerede görünen 2 kat yavaşlama, sıçrama rampası ilerledikçe telafi
ediliyor (sıçrama → sıçrama döngüsü çarpanı biriktikçe ekonomi yeniden hızlanıyor).
6 saatlik kesit: log10 189.5 · 13 sıçrama · 4 küme.

**Kasıtlı sonuç:** sıçrama, "40 saniyede gelen bir hile" olmaktan çıkıp "D8'e
geldiğinizde elde ettiğiniz kalıcı bir güç" haline gelir. Bu, kullanıcı kararının
amacıdır; tempo değişimi bunun bedelidir ve ayrı bir denge turuna konudur.

---

## 4. Etkilenen Dosyalar

| Dosya | Değişiklik |
| :--- | :--- |
| `src/game/balance.ts` | `DIMENSION_UNLOCK_GATES` → `LEGACY_DIMENSION_UNLOCK_GATES` (yalnız göç) · `dimensionGateUnlockCount` → `legacyDimensionGateUnlockCount` · yeni: `MAX_DIMENSIONS`, `DIMENSION_UNLOCK_PURCHASE_COUNT`, `SCALE_SHIFT_TARGET_TIER`, `dimensionUnlockCountFromPurchases`, `lifetimeMaxDimensionTierFromBought`, `legacyLifetimeMaxDimensionTier` |
| `src/stores/game/state.ts` | yeni `lifetimeMaxDimensionTier` alanı |
| `src/stores/game/actions-dimensions.ts` | `registerDimensionPurchase` action'ı + dört satın alma yoluna bağlandı |
| `src/stores/game/getters-dimensions.ts` | `shiftRequirement` sabit D8 hedefi · `canShift` hedef tier açık değilse false |
| `src/stores/game/cache.ts` | `dimMultCacheKey`: `peakMatter` → `maxDimensionTier` |
| `src/stores/game/actions-save.ts` | serialize + v19 göç kancası |
| `src/models/save.ts` | `lifetimeMaxDimensionTier?: number` |
| `src/core/save-version.ts` | `SAVE_VERSION` 18 → 19 |
| `src/game/autobuyer-data.ts` | bot kademeleri boyut zincirine hizalandı · sıçrama botu D8 sahibi olmayı ister |
| `src/components/DimensionsTab.vue` | teaser satın alma koşuluna geçti · sıçrama kartına kilit durumu |
| `src/game/balance.test.ts`, `src/stores/balance.test.ts`, `src/stores/dimension-unlock-celebration.test.ts`, `src/stores/scale-jumps.test.ts`, `src/stores/speed-chip.test.ts`, `src/stores/__tests__/save-roundtrip.test.ts` | yeni sözleşmeye göre yeniden yazıldı/güncellendi |

---

## 5. Doğrulama

- `npm run typecheck` → 0 hata
- `npm run test` → **514/514** yeşil
- `npm run build` → 0 hata
- `npm run harness:smoke` → 6/6 kontrol (eşikler yeni modele göre güncellendi, aşağıya bak)
- 6 saatlik ölçüm: `brain/scratchpad/harness/out/adr0076-6h.json` · 12 saatlik ölçüm:
  `brain/scratchpad/harness/out/adr0076-12h.json` (ilk tekillik **10:12:00**, eski 9:33:17)

### Smoke eşikleri

Eski smoke eşikleri (`log10 >= 60`, `shifts >= 5`) **eski modelin** sıçrama
ritmini kodluyordu (41 s'de ilk sıçrama). ADR-0076 ile sıçrama D8'e bağlandığı için
ölçülen değerler düşer (48.8 / 3). Smoke kapısının amacı "hassas denge" değil,
*"oyun açılıyor ve ekonomi nefes alıyor mu"* olduğundan (bkz.
`brain/scratchpad/harness/assert-results.mjs` başlığı) eşikler yeni ölçüme göre
**yeniden kalibre** edildi: `log10 >= 45`, `shifts >= 3`. Bu eşikler bir denge
standardı DEĞİLDİR; sıçrama modeli değiştiğinde yeniden ölçülür.
