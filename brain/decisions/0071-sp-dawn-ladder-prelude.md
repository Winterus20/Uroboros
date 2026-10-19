# 0071. Şafak Merdiveni — Kırılma Öncesi SP Kazanımı `1` → `1 + singularities`

- **Tarih:** 2026-10-19
- **Durum:** Kabul edildi (2026-10-19)
- **Tür:** Ekonomi, Oyun Tasarımı, Pacing
- **İlgili Belgeler:** ADR-0034 (SP yalnızca şafakta — bu kararla DEĞİŞMEZ), ADR-0056 (Break Singularity sert tavanı ve ilerlemesi), ADR-0013 (Şafak Nöbeti Botu), ADR-0012 (Nöral Ağaç), Plan §8A / §8.2-1 (`brain/research/pacing-economy-shift-redesign-plan-2026-10.md`)

---

## 1. Bağlam ve Problem

ADR-0034, **SP'nin tek kaynağını şafak (Kozmik Çöküş)** olarak sabitledi ve bu değişmez bir karardır. Aynı ADR'nin bilinçli maliyeti şuydu: Planck Duvarı kırılana kadar kütle $1.79 \times 10^{308}\text{ g}$'de (`D_INFINITY`) kilitli kalır ve her şafak **düz 1 SP** verir.

ADR-0056 bu sert tavanı doğruladı: kırılma öncesi `singularityGain` dalı `floor(1 × totalMult)` (min 1) idi.

Kırılma fiyatı sabittir: `break_singularity` **4 SP** (`NEURAL_TREE`, `src/game/neural-data.ts`).

**Sorun (Plan §8.2-1, "oyunun en büyük sıkışma riski"):**

| Şafak | O günkü kazanç | Kümülatif kasa |
| :--- | :--- | :--- |
| 1. şafak | 1 SP | 1 |
| 2. şafak | 1 SP | 2 |
| 3. şafak | 1 SP | 3 |
| 4. şafak | 1 SP | 4 |

Kümülatif kasa 4 SP'ye ancak **4. şafakta** ulaşır; kök düğüm `insomnia_heart` (1 SP) ilk şafakta alınırsa `break_singularity` **5. şafağa** kayar. Plan bu bandı "~4 tam koşu ≈ 10-14 saat" olarak ölçer.

Yani oyuncu `break_singularity`'yi alabilmek için **4 tam koşu ≈ 10-14 saat** (ADR-0023 altın standardı ~3 sa 30 dk/koşu) beklemek zorundaydı. Bu sürede $0 \to 308$ tırmanışı anlamlı kalıcı alım olmadan tekrar ediyordu; `todo.md`deki "ağacın ilk 15-20 düğümü boşta kalıyor" notunun kaynağı budur.

---

## 2. Karar

`src/stores/game/getters-misc.ts` içindeki `singularityGain` getter'ının **yalnızca kırılma öncesi dalı** değişir:

```ts
// ÖNCE
const baseGain = Decimal.floor(new Decimal(1).times(totalMult))

// SONRA
const baseDawn = 1 + state.singularities
const baseGain = Decimal.floor(new Decimal(baseDawn).times(totalMult))
```

Min 1 koruması (`baseGain.gte(1) ? baseGain : D_1`) aynen kalır.

Beklenen merdiven (`totalMult = 1`):

| Şafak | `1 + singularities` | Kazanç | Kasa |
| :--- | :--- | :--- | :--- |
| 1. şafak | `1 + 0` | 1 SP | 1 |
| 2. şafak | `1 + 1` | 2 SP | 3 |
| 3. şafak | `1 + 2` | 3 SP | 6 → `break_singularity` (4 SP) **3. şafakta alınabilir** |

Kök düğüm ilk şafakta alınsa bile kasa 3. şafakta `1 + 2 + 3 − 1 = 5` SP olur; kırılma yine 3. şafakta mümkündür.

Ölü bölge 4 koşudan 3'e iner; aradaki koşulara `eye_drops` (1 SP) gibi anlamlı alımlar serpiştirilir. Formül **deterministiktir** — RNG yoktur (omurga deterministik kalır kararıyla uyumlu).

**Değişmeyenler:**

- ADR-0034: SP hâlâ yalnızca şafakta kazanılır.
- `break_singularity` fiyatı (4 SP) ve `src/game/neural-data.ts`.
- Kırılma **sonrası** dal (`hasBreak`, $\log_{10}$ tabanlı üstel eğri, min 3 SP).
- `nextSingularityPointAt` kırılma öncesi `D_INFINITY` döner; kırılma sonrası eğri aynıdır.
- `totalMult` kaynakları: `dawnSpeedMult` × `spMult` × `relicSpMult`.

---

## 3. Alternatifler ve Neden Seçilmedi

**(b) `break_singularity`'yi deterministik eşiğe taşımak (Plan kol B).**
"3. Tekillik" gibi bir eşikle açmak fiyatı (4 SP) devre dışı bırakır; SP dükkânı/omurga ayrımını ve Nöral Ağaç'ın öncül zincirini (`eye_drops` → `break_singularity`) bulanıklaştırır. Ayrıca A kolu **ölü bölgeyi zaten 4 → 3 koşuya** indirdiği için B'nin aciliyeti kalmadı. Karar: **B kolu P0 ölçümü sonrasına ertelendi** (A+B birlikte mi, yalnız A mı sorusu ölçümle kilitlenecek).

**(c) Ağaç erken kademe maliyetlerini düşürmek.**
Bu, sorunu *semptom* düzeyinde çözer: darboğaz maliyet değil, **kazanç hızıdır**. Maliyetleri düşürmek tüm ağacın (~3.000-3.400 SP) denge eğrisini ve kırılma sonrası ilerlemeyi de kaydırır; tek bir kolu (kırılma öncesi) hedeflemek yerine tüm ekonomiyi yeniden dengeler. A kolu ise kırılma öncesi dalı izole eder ve kırılma sonrası eğriye dokunmaz.

**(d) Mevcut haliyle kabul.**
Plan §8.2-1 bunu doğrudan "oyunun en büyük sıkışma riski" olarak işaretler; 10-14 saatlik anlamlı ilerleme olmayan bir bant, idle oyunun ilk seans bırakma riskini en çok artıran bölgedir. Reddedildi.

---

## 4. Sonuçlar (Trade-off'lar)

- **ADR-0034 değişmez.** Yalnızca şafak kazancının **BÜYÜKLÜĞÜ** değişir; kazanç hâlâ yalnızca şafakta gerçekleşir.
- **Kırılma sonrası eğri etkilenmez.** `hasBreak` dalı ve `nextSingularityPointAt` aynen korunur; ikinci rejimin dengesi ve `spPerMinute` telemetrisi değişmez.
- **Kırılma öncesi ilerleme hızlanır, güç sıçraması olmaz.** Toplam SP kazanımı 3 şafakta 1+2+3 = 6 SP; oyuncu `break_singularity` (4 SP) sonrası 2 SP ile `eye_drops`/erken düğümlere başlar. `insomnia_heart` sonrası kasa 3'e, dolayısıyla kırılma 3. koşuya çekilir.
- **Çarpan davranışı korunur.** `dawn_harbinger` (×2) gibi `totalMult` kaynakları taban merdiveniyle çarpılır ve `floor` uygulanır: `singularities = 1` iken kazanç `floor(2 × 2) = 4` SP olur.
- **Negatif/bozuk kayıt savunması.** `1 + singularities` negatife düşse bile min 1 koruması kazancı 1 SP'de tutar.
- **B kolu ertelendi.** P0 SP/saat telemetrisi (§8E) ölçüldükten sonra B/C/D kolları ayrı ADR'lerle değerlendirilecek.

---

## 5. Doğrulama

- `npm run typecheck` (`vue-tsc --noEmit`) → **0 hata** (boş çıktı, exit 0).
- `npm test` (`vitest run`) → **27 dosya / 397 test geçti** (exit 0). `src/stores/balance.test.ts` içinde dört yeni Şafak Merdiveni testi eklendi/güncellendi: 1→2→3 SP merdiveni, `totalMult` çarpanı ve `floor`, min 1 koruması, kırılma sonrası dalın `singularities`'ten etkilenmemesi (`1.8e308` eşiğinde taban 3 SP).
- **Not:** `D_INFINITY` tam değeri `1.7976931348623157e308` olduğu için testler eşik olarak `1.8e308` kullanır; `1.79e308` bu tavanın altındadır ve kazanç 0 döner.

---

## 6. Uygulama Özeti

| Dosya | Değişiklik |
| :--- | :--- |
| `src/stores/game/getters-misc.ts` | `singularityGain` kırılma öncesi taban `1` → `1 + state.singularities`; Türkçe gerekçe yorumu eklendi. |
| `src/stores/balance.test.ts` | İki mevcut pre-break testi başlık/sözleşme olarak netleştirildi; dört yeni Şafak Merdiveni testi eklendi. |
