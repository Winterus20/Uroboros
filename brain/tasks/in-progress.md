# Aktif Görev (In-Progress)

## 🎯 AKTİF — A+ ekonomisi kodda; sıradaki iş 2. basamak tasarımı (2026-10-23)

**Durum:** 1. basamak dikey dilimi **kodda tamam** (`K1`–`K5`, ADR-0079) ve ekonomi
**A+ revizyonu** ile yeniden dengelendi: parmak saniyede 1 sayı üretir, üst halkalar
alttakini 0,11/sn besler, fiyat merdiveni ×8 ve birim büyümesi 1,20 → **10'lu blok tam
bir halka**. Ölçüm `balance.test.ts` ile regresyon altında. Kalan iş **2. basamak tasarımı**.

**Kayıtlar:**
[ADR-0079](../decisions/0079-number-economy-vertical-slice.md) (uygulama + A+ eki) ·
[ADR-0077](../decisions/0077-theme-pivot-number-hunter-and-comedic-voice.md) (pivot) ·
[ADR-0078](../decisions/0078-pure-number-visual-language.md) (görsel dil) ·
[AD fiyatlandırma + zincir matematiği](../research/ad-pricing-and-chain-math-2026-10-23.md) (A+ ölçümü) ·
[halka fiyatlandırması](../research/ring-pricing-2026-10-23.md) ·
[denge raporu](../scratchpad/balance-2026-10-23/report.md) ·
[GAME_DESIGN.md](../../GAME_DESIGN.md)

### Kapanan işler (`K1`–`K4`)

| # | İş | Nerede |
| :-- | :--- | :--- |
| `K1` | 8 halkalı zincir, tek havuz, ×8 fiyat merdiveni, 10 birim kilidi | `src/game/number/` |
| `K2` | Kapı `1,79e308`, `Tanım = log10(1+A)`, verim `0,9^log10 A`, 4 yükseltme | `economy.ts` + `upgrades.ts` |
| `K3` | Mini boost (8. halka, tam sıfırlama, `(zirve/başlangıç)^0,2`) | `economy.ts` |
| `K4` | `+1` gerçek, İngilizce ticker çekirdeği, `humor` kapısı | `TapButton.vue`, `src/game/voice/`, `TickerBar.vue` |

### Kapanan iş — `K5` denge (A+ revizyonu)

| Konu | Sonuç |
| :--- | :--- |
| Üretim | Fingers **1 sayı/sn** · üst halkalar **0,11 birim/sn** (`NUMBER_RATE`, `CHAIN_RATE`) |
| Fiyat | 25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 · 52 428 800 (×8, `ladderRatio`) |
| Büyüme | `g = 1,20` → halka başına **11,4 birim** → 10'lu blok = bir halka |
| Blok | `ringBlockCost` geometrik toplam; arayüzde ×1 / ×10 / Max; otomasyon blok alır |
| Gerçek motor (20 TPS) | kapı **119,0 dk** · **21** boost · **371** birim · ilk 10 dk **42** karar |
| Halka açılışları | 0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · **17,1** dk |
| Regresyon | `balance.test.ts` (6 test) + `economy.test.ts` blok testleri (6 test) |
| Yapısal düzeltmeler | `D1` boost yalnız sayıya · `D3` boost sonrası halkalar 1 birim · `D6` kilitler mandallı |

### Kapanan iş — halka → sayı doğrudan katkısı (ADR-0081, 2026-10-23)

| Konu | Sonuç |
| :--- | :--- |
| Kural | Halka 2–8 bir altındakine verdiği `0,11/sn`yi sayıya da yazar (`RING_DIRECT_SHARE = 1`) |
| Sınır | Halka 1 katkı almaz — "1 parmak = 1 sayı/sn" (`S9`) korunur |
| Çarpan | Katkı sayı üretimidir: `boostMult × chainMult × verim` alır (`D1` aynen geçerli) |
| Ölçüm | kapı **118,85 dk** (taban 119,0) · 21 boost · 371 alım · açılışlar 0 · 1,6 · 4,1 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk |
| Arayüz | Satır: `miktar · x/s · +x/s`; `/s` telemetrisi toplamı gösterir |
| Kayıt | [ADR-0081](../decisions/0081-ring-direct-number-contribution.md) |

### Neden 1/sn her yerde değil

Zincir 7 katlı bir integraldir: `N(t) ≈ M·(∏p)·t⁸/8!`. Sekiz halka da 1/sn olsaydı `∏p = 1`
olur, zincir `(1/0,11)⁷ ≈ 5,1e6` kat güçlenirdi — ölçümde kapı 43 dakikaya iniyor ve 10.
dakikada 1,3e10 parmak oluyor. `CHAIN_RATE = 0,11` iki saatlik koşuyu koruyan sayıdır.
Tam çalışma: [ad-pricing-and-chain-math-2026-10-23.md](../research/ad-pricing-and-chain-math-2026-10-23.md).

### Sıradaki adım

1. **2. basamak tasarım turu** (`E5`): jeneratör listesi, kural değişikliği, süre; `OmegaNum`
   adaptörü + kadran (`T1`, `T2`) burada devreye girer.
2. `RungScene` (`G8`) bağlantısı: basamak ilerlemesi + sahne havuzunun gösterimi + `humor` kapısı.
3. `G11` boost nefesi (400 ms) — sahne diliyle karışmadan.
4. Metin dalgası: 2. basamak ses havuzu + başarım metinleri (`A6`).

### Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `P1` | Açılış fiyatı `c₁ = 25` → 15 tık; alternatif 20 → 10 tık ölçüldü, uygulanmadı | 🟡 karar proje sahibinde |
| `A4` | Mizah yoğunluğu — ticker kapısı var; `RungScene` ve başarım kapıları yok | 🟡 |
| `A5` | `LNGN` final sahnesi (ton kırılması, `G8` motoru) | 🟡 en son |
| `A6` | Başarımlar + meydan okumalar (eski 86 + 13 silindi) | 🟡 sıfırdan yazılacak |
| `A7` | Müzik motoru (`src/core/music/*`) | 🟡 uyarlama mı yeniden yazım mı |
| `A8` | İngilizce metin hacmi (~400 satır hedefi) | 🟡 kural yazıldı; hacim 1. basamakta (~120) |
| `G13` | Mobil dizgi (390 px'te uzun notasyon) | 🟡 UI yazılırken |
| `G8` | Sahne motoru hazır (`RungScene.vue`) — tetiklenmiyor + `humor` kapısı bağlı değil | 🟡 |
| `G14` | Ticker'ın yeri ve boyu | 🟡 UI yazılırken |

### Kod durumu (doğrulama)

- A+ dalgası: `npx vue-tsc --noEmit` → 0 hata · `npx vitest run` → **92 test** / 5 dosya ·
  `npx vite build` → başarılı.
- Önceki dalgalar: `e564d0a` (UI), `a5c09c1` (halka fiyatlandırması), `e9a4528` + `2f9b10e`
  (AD araştırması + A+ ölçümü).
