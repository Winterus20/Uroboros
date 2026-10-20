# P3.3 — P3 Merdiven Deneyleri Ölçüm Raporu (Beyin Tarafı)

> **Tarih:** 2026-10-19 · **Kapsam:** saf ölçüm + analiz — **oyun kodunda (`src/`) değişiklik YOK**, harness yeniden koşturulmadı, commit atılmadı.
> **Tek yazılan dosya:** `brain/research/p3-ladder-experiment-2026-10.md`.
> **Ölçüm kaynağı:** `brain/scratchpad/harness/out/` altındaki hazır JSON çıktıları (aşağıdaki §1'de birebir listelendi).
> **Bağlam belgeleri:** `brain/research/pacing-p0-baseline-2026-10.md` (§7, §8, §9.3, §9.5), `brain/scratchpad/p3-early-ladder-candidates.md` (P3.0), `brain/decisions/0023-first-prestige-3-4h-harness-validated.md`, `brain/decisions/0073-achievement-gated-branch-spine-hybrid.md`.

---

## 0. Tek sayfalık özet (11 madde)

1. **Fiyat eğrisi (E1) kalabalığı çözmüyor.** Tepe log10 **98.393495 → 98.444624** (kaynak: `p3-ladder-baseline.json` → `e1-pricecurve.json`), yani **+0.05 dekad**. D4→D8 açılış penceresi 16 s'den 16 s'ye kayıyor (189–205 s → 193–209 s), yani 18 dekad hâlâ 16 saniyede. Plan §3'ün "fiyatları kızıştır" kolu, §1'in "ilk 10 dk kontratı" hedefini **taşımıyor**.
2. **Kalabalığın kaynağı fiyat değil, iki mekanizma:** (a) **P3.1 dal kapıları** (ADR-0073) ve (b) **boyut eşiklerinin yoğunluğu** (A tablosunda D4 1e8 → D8 1e26 = 18 dekad, 16 saniyede).
3. **P3.1'in dal kapısı tek başına 600 s'lik kalabalığı 10 → 6 `feat:*` düşürüyor** (9 sistem → 5 sistem): kayıp 4 özellik `crisis`, `spell_espresso`, `spell_noise`, `spell_sleep`. Sebep: `crisis` dalı 2 kriz-ailesi başarımı istiyor, `cri_10` = **10 anomali**; anomali aralığı 65–95 s (taban 40 s) → 10. anomali ~810 s'te.
4. **Boyut eşiği yayılımı kalabalığı bir daha 1–2 azaltıyor** (600 s: E2 **4**, E3 **5**, E4 **5**, E5 **5**), ama **fiyat 0** etkiye sahip.
5. **DAGILIMIN BEDELİ AĞIR:** 30 dk tepe log10 **98.39 → 40.47 (E2) / 53.98 (E4) / 68.24 (E3) / 81.83 (E5)**. 308 dekadın 30 dakikada kat edilen payı %31.9'den %13.1'e (E2) düşüyor.
6. **Küme ve max-bot modu 30 dk'da kayboluyor:** A'da ilk küme 488.5 s, 2 küme, max_mode 662 s; E2/E3/E4'te **galaxies = 0, first_galaxy = null, max_mode = null**; E5'te küme 1422.5 s (1 küme), max_mode 1566 s.
7. **12 saatlik tek uzun ufuk ölçümü (e1-long.json) 1e308'e ULAŞMIYOR:** tepe **224.147564** log10, 43200 s'de. Yani en gevşek adayda bile ADR-0023 bandı (180–240 dk) ~2.4–2.8 kat aşılmış durumda.
8. **E6, E5 ile birebir aynıdır** (tüm sayılar ve milestone'lar aynı) → E6 bir **kontrol/tekrar koşusudur**, ayrı bir aday değildir; determinizm teyidi.
9. **Karşılaştırmanın gizli karışıklığı:** A (19:45:00Z) **P3.1 öncesi**, E1–E6 (20:25Z–20:36Z) **P3.1 sonrası** çalıştırıldı (git: `092f399` 23:10:56, `c0128fb` 23:24:53 yerel). Bu yüzden "A vs E" farkının bir kısmı kod değişikliğinden gelir; ayrıştırma §5'te milestone bazında yapıldı.
10. **Öneri (karar §8):** boyut eşiği tablosu olarak **E5 (1e8/1e14/1e24/1e40/1e65)**; yatay eşikler **olduğu gibi bırakılır** (kalabalık dal kapısı + boyut yayılımıyla zaten çözülüyor); tempo için **ADR-0023 bandının ölçüme göre revizyonu + üretim tarafında onarım (M1)**, fiyat tarafından onarım **değil**.

11. **Uygulama sonrası not (OLÇÜLMEDİ):** Çalışma ağacında P3.3 yatay yeniden zamanlaması uygulanmış durumda (`src/game/unlocks.ts`: `autobuyers` 1e9→1e12, `stance_spam` 1e14→1e26, `stance_private` 1e18→1e40, `colony` 1e22→1e30; `src/game/balance.ts`: E5 boyut tablosu). Bu konfigürasyonun **hiçbir harness çıktısı yok** → 600 s yüzey sayısı, tepe ve koşu uzunluğu **ölçülmemiştir**; ölçümle şunu söyleyebiliyoruz: bu kaydırma **600 s sayısını düşürmez** (dört eşik de 600 s'nin çok altında kalıyor) ve D7 1e40 / D8 1e65 kapılarıyla **çakışma** üretir → §11'deki doğrulama koşusu zorunludur.

---

## 1. Veri seti — kaynak dosyalar birebir

| # | Dosya | `generatedAt` | `capHours` | Ölçtüğü konfigürasyon | Kod durumu |
| --: | :--- | :--- | --: | :--- | :--- |
| A | `brain/scratchpad/harness/out/p3-ladder-baseline.json` | 2026-10-19T19:45:00.762Z | 0.5 (1800 s) | Mevcut merdiven: boyut eşikleri **1e8/1e11/1e15/1e20/1e26**, yatay eşikler A, **P3.1 dal kapısı YOK** | ADR-0072 sonrası, P3.1 öncesi |
| E1 | `brain/scratchpad/harness/out/e1-pricecurve.json` | 2026-10-19T20:25:58.918Z | 0.5 | **Fiyat eğrisi kolları** (patch: `brain/scratchpad/p1-price-curve-e1.patch`) + **ESKİ** boyut eşikleri (1e8/1e11/1e15/1e20/1e26) | **P3.1 sonrası** |
| E2 | `brain/scratchpad/harness/out/e2-dimgates.json` | 2026-10-19T20:29:36.555Z | 0.5 | Boyut eşikleri **1e8/1e25/1e50/1e75/1e100** (P0 §8 "C" tablosu) | P3.1 sonrası |
| E3 | `brain/scratchpad/harness/out/E3.json` | 2026-10-19T20:33:09.172Z | 0.5 | Boyut eşikleri **1e8/1e18/1e32/1e50/?** (aşağıya bakınız) | P3.1 sonrası |
| E4 | `brain/scratchpad/harness/out/E4.json` | 2026-10-19T20:34:16.244Z | 0.5 | Boyut eşikleri **1e8/1e20/1e35/?/?** (aşağıya bakınız) | P3.1 sonrası |
| E5 | `brain/scratchpad/harness/out/E5.json` | 2026-10-19T20:35:20.939Z | 0.5 | Boyut eşikleri **1e8/1e14/1e24/1e40/1e65** | P3.1 sonrası |
| E6 | `brain/scratchpad/harness/out/E6.json` | 2026-10-19T20:36:23.441Z | 0.5 | **E5 ile birebir aynı** ölçüm (kontrol/tekrar koşusu) | P3.1 sonrası |
| — | `brain/scratchpad/harness/out/e1-long.json` | 2026-10-19T20:36:24.210Z | **12** (43200 s) | E1 konfigürasyonunun 12 saatlik uzatması | P3.1 sonrası |

**Ortak koşullar (hepsi için):** profil `active`, seed 1, `dt = 0.5` s, `runs[0].reached = false`, `timeSeconds = null` — yani **hiçbir koşu tekilliğe ulaşmadı**; 30 dk tavanı içinde ölçüm alınmıştır (kaynak: ilgili JSON'ların `runs[0]` kökü).

### 1.1 E3/E4'ün aşılmamış eşikleri hakkında dürüstlük notu

E3 ve E4'te D7/D8 **hiç açılmadı** (`dimUnlocks.d7.t = null`, `d8 = null`), dolayısıyla o iki eşik **sayısal olarak kurtarılamaz**. Tabloda yalnızca **açılmış** eşikler, `dimUnlocks.dN.log10` değerinden geri çözülmüştür (A'da kapı ile açılış log10'su arasındaki fark 0.15–0.51 dekad; E3/E4'te 0.04 dekad — aynı 0.5 s'lik adım içinde kalan fark). Kalan eşikler **tahmin** olarak "?" ile gösterilmiştir ve karar için kullanılmamıştır.

---

## 2. Aday özet tablosu — omurga ölçümleri

Kaynak: her satırdaki dosyanın `runs[0].peaks`, `runs[0].milestones`, `runs[0].dimUnlocks` alanları.

| Aday | 30 dk tepe log10 | shifts | tickspeed (alınan) | galaxies | D4 | D5 | D6 | D7 | D8 | 600 s içinde açılan `feat:*` | 30 dk içinde açılan `feat:*` (toplam) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --: | --: |
| **A** `p3-ladder-baseline.json` | **98.393495** | 9 | 80 | 2 | 189 s | 192 s | 194.5 s | 199 s | 205 s | **10** | 12 |
| **E1** `e1-pricecurve.json` | **98.444624** | 9 | 80 | 2 | 193 s | 196 s | 199 s | 203 s | 209 s | **6** | 10 |
| **E2** `e2-dimgates.json` | **40.467501** | 9 | 32 | **0** | 186 s | 582 s | — | — | — | **4** | 7 |
| **E3** `E3.json` | **68.244633** | 9 | 55 | **0** | 186 s | 222 s | 431.5 s | 1162 s | — | **5** | 8 |
| **E4** `E4.json` | **53.983100** | 9 | 43 | **0** | 186 s | 281.5 s | 665 s | — | — | **5** | 7 |
| **E5** `E5.json` | **81.828263** | 8 | 66 | 1 | 186 s | 195 s | 231.5 s | 353 s | 1377 s | **5** | 9 |
| **E6** `E6.json` | 81.828263 | 8 | 66 | 1 | 186 s | 195 s | 231.5 s | 353 s | 1377 s | 5 | 9 (E5 = kontrol) |
| **E1-12h** `e1-long.json` | **224.147564** | 14 | 184 | 6 | 193 s | 196 s | 199 s | 203 s | 209 s | 6 | 15 (43200 s) |

**Yardımcı omurga zamanları (kaynak: aynı JSON'lar, `milestones`):**

| Aday | ilk sıçrama | 4. sıçrama | ilk küme | bulk_mode | max_mode | anomali tıklaması (30 dk) | başarım (30 dk) |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | --: |
| A | 40.5 s | 132.5 s | 488.5 s | 206 s | 662 s | 28 | 35 |
| E1 | 44.5 s | 134.5 s | 482.5 s | 210 s | 668 s | 25 | 35 |
| E2 | 40.5 s | 130.5 s | **null** | 664 s | **null** | 22 | 22 |
| E3 | 40.5 s | 130.5 s | **null** | 336 s | **null** | 22 | 28 |
| E4 | 40.5 s | 130.5 s | **null** | 372 s | **null** | 22 | 23 |
| E5/E6 | 40.5 s | 130.5 s | 1422.5 s | 240 s | 1566 s | 24 | 34 |
| E1-12h | 44.5 s | 134.5 s | 482.5 s | 210 s | 668 s | **703** (12 saat) | 47 |

---

## 3. Aday özet tablosu — yatay `feat:*` açılışları (birebir, saniye)

Kaynak: her dosyanın `runs[0].milestones` → `feat:*` anahtarları. "—" = o koşuda hiç açılmadı (`null`).

| Özellik | dekad kapısı | **A** | **E1** | **E2** | **E3** | **E4** | **E5/E6** | E1-12h |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `crisis_spawn` (anomali) | 1e3 | 26 | 24 | 26 | 26 | 26 | 26 | 24 |
| `autobuyers` | 1e9 | 190 | 194.5 | 186.5 | 186.5 | 186.5 | 186.5 | 194.5 |
| `stance_spam` | 1e14 | 194 | 198.5 | 195 | 195 | 195 | 195 | 198.5 |
| `stance_private` | 1e18 | 197.5 | 201.5 | 222 | 222 | 222 | 202 | 201.5 |
| `colony` | 1e22 | 201 | 211 | **665** | 337 | 373 | 241 | 211 |
| `crisis` | 1e28 | **207** | **814.5** | 810.5 | 810.5 | 810.5 | 810.5 | 814.5 |
| `spell_espresso` | 1e34 | 209.5 | 814.5 | 895.5 | 810.5 | 810.5 | 810.5 | 814.5 |
| `spell_noise` | 1e42 | 215 | **—** | — | — | — | — | 3441 |
| `spell_sleep` | 1e52 | 236 | **—** | — | — | — | — | 3441 |
| `lab` | 1e65 | 353.5 | 350 | **—** | 1707.5 | **—** | 1377 | 350 |
| `seed_nucleon` | 1e80 | 893.5 | 890 | — | — | — | 1782 | 890 |
| `seed_gluon` | 1e100 | 1703.5 | 1700 | — | — | — | — | 1700 |
| `seed_graviton` | 1e125 | — | — | — | — | — | — | 3410 |
| `guilt_slackers` | 1e160 | — | — | — | — | — | — | 12185 |
| `event_horizon_lens` | 1e200 | — | — | — | — | — | — | 28250 |
| `hawking_resonator` / `cosmic_filament` / `time_clock` / `night_watch` / `challenges` | 1e240 / 1e280 / 1e120 / 1e308 / 1 küme | — | — | — | — | — | — | — |
| **600 s içinde toplam** | | **10** | **6** | **4** | **5** | **5** | **5** | 6 |
| **600 s içinde (anomali hariç)** | | **9** | **5** | **3** | **4** | **4** | **4** | 5 |
| **30 dk içinde toplam** | | **12** | **10** | **7** | **8** | **7** | **9** | 15 |

---

## 4. A ile karşılaştırmalı yorum — fiyat eğrisi (E1) erken eğriyi değiştirmiyor

**Sayılar (kaynak: `p3-ladder-baseline.json` ↔ `e1-pricecurve.json`):**

| Ölçüm | A | E1 | Fark | Yorum |
| :--- | ---: | ---: | ---: | :--- |
| 30 dk tepe log10 | 98.393495 | 98.444624 | **+0.051129** | Fiyat eğrisi tepeyi **hareket ettirmiyor** |
| 30 dk shifts / tickspeed / galaxies | 9 / 80 / 2 | 9 / 80 / 2 | 0 / 0 / 0 | Omurga çıktısı **aynen aynı** |
| D4→D8 pencere | 189→205 s (16 s) | 193→209 s (16 s) | +4 s (kayma) | 18 dekad hâlâ **16 saniyede** |
| D4 log10 @ açılış | 8.512468 | 8.213374 | −0.30 | Fiyat eğrisi rampayı **çok hafif** yavaşlatıyor |
| `feat:stance_spam` / `stance_private` / `colony` | 194 / 197.5 / 201 | 198.5 / 201.5 / 211 | +4.5 / +4 / +10 s | Kayma **küçük**; 600 s sınırını **kimse geçmiyor** |
| `feat:lab` | 353.5 | 350 | −3.5 s | Değişmedi |
| 600 s içinde `feat:*` | 10 | **6** | −4 | Fark **tamamen** P3.1 dal kapısından (§5) |
| 12 saatlik uzatma | — | tepe 224.147564 @43200 s | 1e308 **ulaşılmadı** | Fiyat + eski eşikler bile ADR-0023 bandını tutturmuyor |

**Yorum (ölçümden, varsayımdan değil):**

1. **Plan §3'ün "fiyatları kızıştır" kolu §1'in hedefini taşımıyor.** Fiyat eğrisi kolları (EARLY_D1..D6 oranları 75/55/40/34/28/24, `B0_BUCKET_THRESHOLD` 20, `COST_ACCEL_DECADES_PER_STEP` 0.025 — kaynak: `brain/scratchpad/p1-price-curve-e1.patch`) uygulandığında 30 dakikalık tepe **+0.05 dekad** değişiyor, D4→D8 penceresi **16 saniyede kalıyor**, yatay özellikler 4–10 saniye kayıyor. Hiçbir sayı 600 s sınırını geçmiyor.
2. **Kalabalığın kaynağı fiyat değil, iki yapısal mekanizma:** (i) **dal kapıları** (P3.1/ADR-0073) — A'da dört kriz-ailesi özellik 29 saniyede (207→236 s) üst üste açılıyordu; (ii) **boyut eşiği yoğunluğu** — D4 1e8 → D8 1e26 = 18 dekad, 16 saniyede; yatay özellikler bu 16 saniyenin içine sıkışıyordu (190→236 s).
3. **Fiyat kızıştırma, kalabalığı çözmediği gibi koşuyu da kısaltmıyor:** 12 saatlik koşuda tepe **224.15 log10**'da durdu, 1e308'e ulaşılmadı (kaynak: `e1-long.json`). Yani P0 §9.5'in çıkarısı teyit edildi: **tempo onarımı fiyat tarafından gelemez, üretim tarafından (M1 + ADR-0073 aile kademe çarpanı) gelmelidir.**
4. **Uyarı (karışıklık):** E1 = **P3.1 sonrası** + fiyat eğrisi. A = **P3.1 öncesi**. Dolayısıyla A→E1 farkının 4 özellikliklik kısmı fiyatla değil dal kapısıyla açıklanır (§5). **Fiyat etkisinin tek başına ölçülmüş izolasyonu yoktur** (P3.1'siz + fiyat eğrisili koşu üretilmemiş); yine de fiyatın etkisinin **sınırı** ölçülmüştür: tepe +0.05 dekad, pencere +4 s, özellik kayması ≤ 10 s. Yani fiyat kolu bu ölçekte etkisizdir.

---

## 5. P3.1 başarım kapı etkisinin ayrılması — "10 → 5-6" olayının mekanizması

**Ölçüm (kaynak: `p3-ladder-baseline.json` ↔ `e1-pricecurve.json`):**

| Özellik | A (P3.1 öncesi) | E1 (P3.1 sonrası, eski eşikler) | Fark |
| :--- | ---: | ---: | ---: |
| `feat:crisis` | **207 s** | **814.5 s** | **+607.5 s** |
| `feat:spell_espresso` | 209.5 s | 814.5 s | +605 s |
| `feat:spell_noise` | 215 s | **null** (hiç açılmadı) | — |
| `feat:spell_sleep` | 236 s | **null** (hiç açılmadı) | — |
| `feat:colony` | 201 s | 211 s | +10 s (fiyat etkisi) |
| `feat:lab` | 353.5 s | 350 s | −3.5 s (fiyat etkisi) |
| `feat:autobuyers` / `stance_spam` / `stance_private` | 190 / 194 / 197.5 | 194.5 / 198.5 / 201.5 | +4.5 / +4.5 / +4 s (fiyat etkisi) |
| **600 s içinde `feat:*`** | **10** | **6** | **−4** |

**Mekanizma (kod kanıtı):**

- `src/game/branches.ts` → `BRANCH_GATES`: `crisis` dalı **kriz ailesinden 2 başarım** ister, güvenli liste `['cri_first', 'cri_10']`.
- `src/game/achievements.ts:130-131`: `cri_first` = **1** anomali, `cri_10` = **10** anomali yakalandı.
- `src/stores/game/state.ts:58`: `nextAnomalyInterval: 65` (saniye) — başlangıç aralığı.
- `src/stores/game/actions-neural.ts:205`: `baseInterval = 65 + Math.random() * 30` → **65–95 s**.
- `src/stores/game/actions-neural.ts:216`: `nextAnomalyInterval = Math.max(40, (baseInterval * alertDiscount * achievementAnomalyFactor) / rateMult)` → **taban 40 s**, `rateMult` (başarım + duruş/lab/boyut kademesi) en fazla 2.5×.
- Ölçülen anomali aralığı (tıklamalar / 1800 s): A **64.3 s**, E1 **72.0 s**, E2/E3/E4 **81.8 s**, E5 **75.0 s**, e1-long (12 saat) **61.5 s**. 10. anomali için ölçülen ortalama: E1'de 814.5 − 24 = **790.5 s / 10 = 79.1 s**, E2–E5'te 810.5 − 26 = **784.5 s / 10 = 78.5 s** → kod aralığıyla (65–95 s) birebir örtüşüyor.
- `spell_espresso` dalı 3 kriz-ailesi başarımı ister (`cri_first`, `cri_10`, `cri_combo`) → E1/E3/E4/E5'te aynı tikte (810.5 / 814.5 s) açılır; `spell_noise` 4 (`cri_50` = **50 anomali**) → 30 dk'da **null**; 12 saatlik koşuda **3441 s**'de açılır (kaynak: `e1-long.json`).

**Açık ifade (raporun kalbi):**

> **P3.1'in dal kapı mekanizması, kalabalığı fiyat veya eşik değişikliği olmadan, tek başına 600 s içindeki yatay yüzey sayısını 10'dan 6'ya (anomali hariç 9'dan 5'e) indirdi.** Sebep sayısal olarak: dal kapısı `crisis` için **10 anomali** istiyor; anomali aralığı 65–95 s (taban 40 s) olduğu için 10. anomali `crisis_spawn`dan (24–26 s) sonra ancak **~785–790 s** sonra geliyor; dekad kapısı (1e28) 207 s'de aşılmış olsa bile dal açılışı **810.5–814.5 s**'ye kayıyor. Bu, P3.0 raporundaki "10 sistem" sayısının bugün **kodla değil, P3.1'in tasarımıyla** çözüldüğünü gösterir.

**Ek gözlem (e1-long, 12 saat):** dal kapıları yatay yüzeyi **saatlara yayıyor** — `spell_noise`/`spell_sleep` 3441 s (~57 dk), `seed_graviton` 3410 s (~57 dk), `guilt_slackers` 12185 s (~3.4 saat), `event_horizon_lens` 28250 s (~7.8 saat). Yani **sayısal eşiği değiştirmeden** yatay merdiven saatlere yayıldı. Bu, §8(b) kararının en güçlü kanıtıdır.

---

## 6. Birebir karşılaştırma tablosu — hangi değişiklik hangi ölçümü etkiledi

| Değişiklik | Etkilenen ölçüm | Etkilenmeyen ölçüm | Sayısal kanıt (kaynak) |
| :--- | :--- | :--- | :--- |
| **Fiyat eğrisi kolları** (E1 vs A; aynı boyut eşikleri, 1e8/1e11/1e15/1e20/1e26) | Yatay özellik açılış zamanları **+4…+10 s**; D4 açılış log10'u −0.30 | 30 dk tepe, shifts, tickspeed, galaxies, 600 s'deki özellik **sayısı**, D4→D8 pencere uzunluğu | Tepe 98.393495 → 98.444624 (`p3-ladder-baseline.json` → `e1-pricecurve.json`); 9/80/2 → 9/80/2 |
| **P3.1 dal kapıları** (E1 vs A; boyut eşikleri aynı) | Kriz ailesi yüzeyler: `crisis` 207 → 814.5 s; `spell_espresso` 209.5 → 814.5 s; `spell_noise`/`spell_sleep` → null; **600 s sayısı 10 → 6** | Omurga: D4–D8, botlar, shifts, galaxies, tickspeed, tepe log10 | 810.5–814.5 s ölçülen dal açılışı (`e1-pricecurve.json`, `e2-dimgates.json`, `E3.json`, `E4.json`, `E5.json`) |
| **Boyut eşiği yayılımı** (E2/E3/E4/E5 vs E1; hepsi P3.1 sonrası) | D4→D8 penceresi, 30 dk tepe, küme/max_mode varlığı, 600 s'deki özellik sayısı, açılış sırası | `crisis_spawn`, `autobuyers`, `stance_spam` zamanları (186.5/195 s — sabit), dal kapısı açılış zamanı (810.5 s — sabit) | Tepe 98.44 → 40.47/68.24/53.98/81.83; gal 2 → 0/0/0/1; 600 s sayısı 6 → 4/5/5/5 |
| **Boyut eşiği yayılımı — E2 (C tablosu) 1e8/1e25/1e50/1e75/1e100** | D5 582 s, D6+ **hiç açılmıyor**; lab **null**; koloni 665 s | — | `e2-dimgates.json` |
| **Boyut eşiği yayılımı — E3 1e8/1e18/1e32/1e50/?** | D5 222 s, D6 431.5 s, D7 1162 s, D8 null; lab 1707.5 s; koloni 337 s | — | `E3.json` |
| **Boyut eşiği yayılımı — E4 1e8/1e20/1e35/?/?** | D5 281.5 s, D6 665 s, D7+ null; lab null; koloni 373 s | — | `E4.json` |
| **Boyut eşiği yayılımı — E5 1e8/1e14/1e24/1e40/1e65** | D5 195 s, D6 231.5 s, D7 353 s, D8 1377 s; lab 1377 s; koloni 241 s; ilk küme 1422.5 s; max_mode 1566 s | — | `E5.json` |
| **E5'in 12 saat uzatması** (E6 = E5 kontrol) | Yok — E6 tüm sayılarda E5 ile birebir aynı (`generatedAt` ve `wallMs` dışında) | Her şey | `E5.json` ↔ `E6.json` |

**Net ayrıştırma (600 s içindeki yatay yüzey sayısı, kaynak: ilgili JSON'ların `milestones`):**

| Adım | 600 s içi `feat:*` | Anomali hariç | Kaynak |
| :--- | --: | --: | :--- |
| A (P3.1 öncesi, eski eşikler) | 10 | 9 | `p3-ladder-baseline.json` |
| + P3.1 dal kapıları (fiyat etkisi ihmal) | **6** | **5** | `e1-pricecurve.json` |
| + boyut yayılımı E2 | **4** | **3** | `e2-dimgates.json` |
| + boyut yayılımı E3 | **5** | **4** | `E3.json` |
| + boyut yayılımı E4 | **5** | **4** | `E4.json` |
| + boyut yayılımı E5 | **5** | **4** | `E5.json` |

**Fiyat kolunun katkısı: 0** (hiçbir özellik 600 s sınırını geçmiyor; yalnızca 4–10 s kayma). **Dal kapısının katkısı: −4.** **Boyut yayılımının katkısı: −1…−2.**

---

## 7. Tempo notu — dağıtımın bedeli ve ADR-0023 gerilimi

### 7.1 30 dakikalık pencerede ölçülen düşüş

| Aday | 30 dk tepe log10 | A'ya göre fark | 308 dekadın 30 dk'da kat edilen payı | galaxies | max_mode | İlk küme |
| :--- | ---: | ---: | --: | --: | ---: | ---: |
| A | 98.393495 | — | %31.9 | 2 | 662 s | 488.5 s |
| E1 | 98.444624 | +0.05 | %32.0 | 2 | 668 s | 482.5 s |
| **E5** | **81.828263** | **−16.57** | **%26.6** | 1 | 1566 s | 1422.5 s |
| E3 | 68.244633 | −30.15 | %22.2 | 0 | **null** | **null** |
| E4 | 53.983100 | −44.41 | %17.5 | 0 | **null** | **null** |
| E2 | 40.467501 | −57.93 | %13.1 | 0 | **null** | **null** |

(Kaynak: `p3-ladder-baseline.json`, `e1-pricecurve.json`, `E5.json`, `E3.json`, `E4.json`, `e2-dimgates.json` — `peaks.logMatter`, `peaks.galaxies`, `milestones.max_mode`, `milestones.first_galaxy`.)

### 7.2 Sayılarla tempo argümanı

1. **E2'de oyuncu 30 dakikada 308 dekadın yalnızca %13.1'ini kat ediyor** (A'da %31.9). E5'te bu oran %26.6. Yani **yayılım, dekad hızını düşürüyor** — çünkü üretimin kaynağı boyutlardır (ADR-0072: boyut açılımı sıçramadan koptu; boyut geç gelirse üretim geç gelir).
2. **Küme (galaxy) 30 dakika penceresinin dışına düşüyor.** A'da ilk küme 488.5 s (8.1 dk) ve 30 dk'da 2 küme; E5'te 1422.5 s (23.7 dk) ve 1 küme; E2/E3/E4'te **hiç küme yok** (`first_galaxy: null`, `peaks.galaxies: 0`). Küme, sıçrama zincirini ve SP ekonomisini açan adımdır (ADR-0034) — 30 dk'da hiç açılmaması, ilk saatin yapısını tamamen değiştirir.
3. **max_mode de düşüyor:** A/E1'de 662–668 s; E5'te 1566 s; E2/E3/E4'te 30 dk'da **hiç** (`max_mode: null`). Aynı şekilde `bulk_mode`: A 206 s → E2 664 s, E3 336 s, E4 372 s, E5 240 s.
4. **Uzun ufuk kanıtı (tek ölçüm):** `e1-long.json` (12 saat, **en gevşek** konfigürasyon: eski boyut eşikleri + fiyat eğrisi) tepe **224.147564** log10'da duruyor; **1e308'e ulaşılmadı** (`reached: false`, `final.logMatter = 222.803054`, `timeSeconds: null`). Yani **en gevşek aday bile** ADR-0023'ün 180–240 dk bandını 12 saatlik tavan içinde tutturmuyor. P0 §7'nin 3 seed'lik ölçümü (637.6 / 706.7 / 707.6 dk) ile aynı yönde.
5. **ADR-0023 gerilimi büyüyor (sayısal):** band 180–240 dk; ölçülen ilk koşu **637–708 dk** (P0 §7) = bandın **2.7–3.9 katı**. Eşik yayılımı tepeyi 30 dk'da 16.6–57.9 dekad düşürüyor; aynı dekad/s hızıyla varsayılan bile (bu bir **tahmindir, ölçüm değildir**) 30 dk'daki 98.4 dekadın 40.5–81.8 dekada inmesi, o dekadların **1.2–2.4 kat daha uzun sürede** kat edileceği anlamına gelir → ilk koşu 11 saatin üzerine çıkar. **Kesin ölçüm yalnızca 12 saatlik koşuda vardır: 1e308'e ulaşılmadı.**
6. **Sonuç:** P0 §7'nin üçlü seçeneği (onarım fazı / ADR-0023 revizyonu / 11 saat kabulü) **ölçümle zorunlu hale geldi**; fakat onarımın kolu **fiyat/ekonomi** değil **üretim** (M1 bot hız çipleri + ADR-0073 aile kademe çarpanı) olmalıdır — çünkü fiyat kolunun etkisi ölçümde **sıfır** (E1: tepe +0.05 dekad) ve yayılım kolu tempo **bozulması** üretiyor.

---

## 8. Açık karar listesi

### (a) Hangi boyut eşiği tablosu?

**Öneri: E5 — `1e8 / 1e14 / 1e24 / 1e40 / 1e65` (`E5.json`).**

1. E5, yayılımın **bedelini sınırlayan tek adaydır: tepe 81.828263 log10** (A'ya göre −16.57 dekad), 30 dk'da **1 küme** (1422.5 s) ve **max_mode 1566 s** ile oyunun "ikinci saat maliyeti" hâlâ 30 dk içinde görünür; E2/E3/E4'te küme ve max_mode **hiç** açılmıyor (`first_galaxy: null`, `max_mode: null`).
2. E5, 600 s kontratını **tek başına** tutturuyor: 5 `feat:*` (anomali hariç **4 sistem**) — E2'de 4 (3 sistem), E3/E4'te 5 (4 sistem) ile aynı seviyede, ama **tempo bedeli çok daha düşük** (E5 −16.6 dekad, E2 −57.9 dekad).
3. E5, 30 dakikada 308 dekadın **%26.6'sını** kat ettiriyor (A: %31.9, E2: %13.1) — yani "ilk koşu" 11 saatin üzerine çıksa bile mevcut oyunun ilk yarım saati hâlâ 308 dekadın dörtte birini kapsıyor; E2'de bu oran **%13**'te kalıyor ve oyuncu ilk saatte yatay yüzey görmeksizin iki boyutla oynuyor.
4. **Dikkat:** E5 tablosu, E3/E4'te açılmamış D7/D8 eşiklerinin **tahminini** içermiyor; E5'te D7 **1e40 → 353 s**, D8 **1e65 → 1377 s** (ölçülmüş, `E5.json`). E5'in **tek** eksisi: `lab` de 1e65'te olduğu için D8 ile aynı anda (1377 s) açılıyor (`lab@1377`, `d8@1377`) — yani D8 ve laboratuvar **aynı tikte** geliyor; ayrıştırma istenirse `lab` 1e65 → 1e70 bandına çekilebilir (ölçülmemiş, öneri).

### (b) Yatay eşikler hangi değerlerde?

**Öneri: Mevcut dekad eşikleri (A) **olduğu gibi bırakılmalı**; kalabalık kontrolü sayısal eşiklerden değil, P3.1 dal kapılarından ve boyut yayılımından gelmeli.**

> **Uygulama notu (§11):** Çalışma ağacında bu öneriden **farklı** bir yatay yeniden zamanlama uygulanmış durumda (`autobuyers` 1e12 · `stance_spam` 1e26 · `stance_private` 1e40 · `colony` 1e30). §11.2 bu uygulamanın ölçümle ne söylediğini veriyor: kaydırma **600 s sayısını düşürmüyor**, yalnızca **+2.5…+16 s** yeniden aralıklandırıyor ve D7 (1e40) / D8 (1e65) kapılarıyla **çakışma** riski taşıyor. §11.3'teki doğrulama koşusu zorunludur.

1. **Fiyat/yatay eşik oynama işe yaramıyor (ölçüm):** E1'de tüm yatay eşikler sabitken 30 dk tepe 98.39 → 98.44 (`p3-ladder-baseline.json` → `e1-pricecurve.json`); yatay özellikler yalnızca 4–10 s kaydı. Eşikleri 1e9 → 1e12 gibi kaydırmak (P3.0'un "B" adayı) **sayıyı** değiştirmedi, yalnızca saniyeleri kaydırdı (P3.0 raporu §3-B).
2. **Dal kapıları zaten yatay yüzeyi saatlere yayıyor (ölçüm):** `e1-long.json`'da sayısal eşikler hiç değişmeden `spell_noise`/`spell_sleep` 3441 s (~57 dk), `seed_graviton` 3410 s, `guilt_slackers` 12185 s (~3.4 sa), `event_horizon_lens` 28250 s (~7.8 sa) açıldı. Yani "yatay merdiveni yavaşlatmak" için **eşik değiştirmek gerekmiyor** — başarım kapısı zaten yapıyor.
3. **Somut önerilen çerçeve (ölçülmüş çapalar):** `autobuyers` 1e9 → E5'te 186.5 s, `stance_spam` 1e14 → 195 s, `stance_private` 1e18 → 202 s, `colony` 1e22 → 241 s, `lab` 1e65 → 1377 s (kaynak: `E5.json`). E5 ile 600 s'de 4 sistem (hedef ≤4) **tutturuluyor**. Eğer kontrat "600 s'de yalnız anomali + omurga" mutlak haliyle uygulanacaksa tek hamle: `lab`'ı 1e65 → 1e70 bandına çekmek (ölçülmemiş; P0 §2.1'e göre 600 s'deki ömür boyu tepe 1e67.24 olduğu için 1e70 bu koşuda 841 s'de açılır).
4. **P3.2 silüet teaser'ı (ADR-0073 + `c0128fb`) sayısal eşikleri gevşetmeye izin veriyor:** geç kapılar "görünür ama kilitli" olarak gösterildiği için, yatay eşiği sentetik biçimde 1e68'e itmenin UX maliyeti artık düşük; ölçüm bunu doğrulamıyor, P3.2'den gelen yeni bir ölçüm gerekir.

### (c) Tempo kararı: 11 saat kabul / ADR-0023 revize / onarım fazı?

**Öneri: (b) + (c) birlikte — ADR-0023 bandı **ölçüme göre revize** edilsin (geçici taban 600–720 dk) **ve** tempo onarımı **üretim tarafında** (M1 bot hız çipleri + ADR-0073 aile kademe çarpanı) yapılsın; fiyat/eşik tarafında onarım **yapılmasın**.**

1. **Fiyat kolu tempo onarımı sağlamıyor (ölçüm):** E1'de fiyat eğrisi uygulanmış hâlde 12 saatlik koşuda tepe **224.147564**'te kaldı, 1e308'e ulaşılmadı (`e1-long.json`); 30 dk tepe A'dan 0.05 dekad farklı (`e1-pricecurve.json`). P0 §9.5'in çıkarısı teyit edildi.
2. **Eşik yayılımı tempoyu daha da bozuyor (ölçüm):** tepe 30 dk'da 98.39 → 40.47…81.83 aralığına iniyor; küme ve max_mode E2/E3/E4'te 30 dk'yı geçiyor (`e2-dimgates.json`, `E3.json`, `E4.json`, `E5.json`). Yani "yayılım = tempo onarımı" argümanı ölçümle **çürütülmüştür**.
3. **Bu yüzden üç seçenekten sadece biri tutarlıdır:** "11 saati geçici taban olarak kabul et" **ve** "ADR-0023 bandını 600–720 dk'ya revize et" seçenekleri birlikte uygulanabilir; "onarım fazı" ancak **üretim** (M1) kapsamlıysa anlamlıdır, fiyat/eşik odaklı bir onarım fazı ölçümle karşı çıkıyor.
4. **Sıra önerisi (ölçüm sırasına sadık kalarak):** (1) tempo kararı (§8c) → (2) boyut eşiği tablosu (§8a, E5) → (3) yatay eşikler yerinde kalsın (§8b) → (4) P3 uygulaması sonrası `harness:smoke` + 12 saatlik koşu ile yeniden ölçüm (kabul: ADR-0023 revize bandı ±%5). P0 §9.3'teki "önce yayılım, sonra yatay merdiven" sırası ölçümle **doğrulanmıştır**.

---

## 9. Ölçümün sınırları (raporun parçası)

1. **Karışıklık (en önemli sınır):** A (19:45:00Z) P3.1 **öncesi**, E1–E6 (20:25:58Z–20:36:24Z) P3.1 **sonrası** çalıştırıldı (git `092f399` 23:10:56 +03:00, `c0128fb` 23:24:53 +03:00). "P3.1 sonrası + fiyat eğrisi" olan E1'de **fiyatın tek başına** izolasyonu ölçülmedi; fiyat etkisi **üst sınır** olarak (tepe +0.05 dekad, pencere +4 s, özellik kayması ≤ 10 s) raporlandı.
2. **Ufuk:** 30 dk tavanı (capHours 0.5) çoğu adayda yetersiz: E2'de D5'in ötesinde hiçbir boyut açılmıyor, E3'te D8 ve E4'te D7/D8 hiç açılmıyor, `lab` E2/E4'te hiç ve E3'te 1707.5 s'de açılıyor; tek uzun ufuk ölçümü `e1-long.json`'dır (12 saat, en gevşek konfigürasyon).
3. **`peaks.logMatter`** bot sıçraması öncesi anlık tepeyi kaçırabilir (P3.0 raporu §5.2) → **açılış zamanları için `milestones` esas alınmıştır**; tepe değerleri yalnızca aday karşılaştırmasında kullanılmıştır.
4. **E3/E4'ün D7/D8 eşikleri ölçülemedi** (null); yalnızca açılmış eşikler `dimUnlocks.dN.log10`'dan geri çözüldü (§1.1).
5. **E6, E5'in kontrol tekrarıdır** — bağımsız aday değildir; determinizm teyidi işlevi görür (tüm sayılar birebir aynı).
6. **Kapsam dışı:** hiçbir harness profili `unlockBots: false` değildir (P0 §9.2) → "botlar açılmazsa eğri nasıl yavaşlar" ölçülemedi; bütün konfigürasyonlarda botlar 186–214 s'de açılıyor (`bot:dim1…bot:dim8`, `bot:tickspeed`, `bot:shift`).
7. **Bu rapor kod değişikliği içermez:** `src/` dosyalarına dokunulmadı, harness çalıştırılmadı, commit atılmadı. Yazılan tek dosya: `brain/research/p3-ladder-experiment-2026-10.md`.

---

## 10. Kaynak dosya listesi (her sayının kaynağı)

| Dosya | Bu raporda kullanılan alanlar |
| :--- | :--- |
| `brain/scratchpad/harness/out/p3-ladder-baseline.json` | A: tepe, shifts, tickspeed, galaxies, D4–D8, tüm `feat:*` milestone'ları, anomali tıklaması, başarım sayısı |
| `brain/scratchpad/harness/out/e1-pricecurve.json` | E1: tepe 98.444624, 600 s sayısı 6, `crisis` 814.5 s, boyut eşikleri ESKİ |
| `brain/scratchpad/harness/out/e2-dimgates.json` | E2: tepe 40.467501, galaxies 0, `first_galaxy: null`, `max_mode: null`, lab null |
| `brain/scratchpad/harness/out/E3.json` | E3: tepe 68.244633, D5 222 s / D6 431.5 s / D7 1162 s, lab 1707.5 s |
| `brain/scratchpad/harness/out/E4.json` | E4: tepe 53.983100, D5 281.5 s / D6 665 s, lab null |
| `brain/scratchpad/harness/out/E5.json` | E5: tepe 81.828263, D4–D8 186/195/231.5/353/1377 s, lab 1377 s, ilk küme 1422.5 s, max_mode 1566 s |
| `brain/scratchpad/harness/out/E6.json` | E6: E5 ile birebir aynı (kontrol tekrarı) |
| `brain/scratchpad/harness/out/e1-long.json` | 12 saatlik uzatma: tepe 224.147564, `spell_noise`/`spell_sleep` 3441 s, `seed_graviton` 3410 s, `guilt_slackers` 12185 s, `event_horizon_lens` 28250 s, 1e308 ulaşılmadı |
| `brain/scratchpad/p1-price-curve-e1.patch` | E1'in uyguladığı fiyat eğrisi kolları (EARLY_D1..D6 oranları, B0_BUCKET_THRESHOLD, COST_ACCEL_DECADES_PER_STEP) |
| `src/game/branches.ts` | `BRANCH_GATES`: `crisis` → 2 kriz-ailesi başarımı (`cri_first`, `cri_10`), `spell_espresso` → 3, `spell_noise` → 4 (`cri_50`) |
| `src/game/achievements.ts:130-131,133,137,139` | `cri_first` (1 anomali), `cri_10` (10), `cri_50` (50), `cri_combo`, `cri_combo5` |
| `src/stores/game/state.ts:58` | `nextAnomalyInterval: 65` |
| `src/stores/game/actions-neural.ts:205,216` | `baseInterval = 65 + Math.random() * 30`; `Math.max(40, … / rateMult)` |
| `src/game/unlocks.ts` | Yatay özellik dekad eşikleri (1e3…1e280) |
| `src/game/balance.ts` (çalışma ağacı) | `DIMENSION_UNLOCK_GATES` — E5 tablosu (1e8/1e14/1e24/1e40/1e65) commit **edilmemiş** çalışma ağacında |
| `brain/research/pacing-p0-baseline-2026-10.md` | §7 (11 saat ihlali, 3 seed), §8 (aday tablolar A/B/C), §9.3 (Aday D), §9.5 (E1 özeti) |
| `brain/scratchpad/p3-early-ladder-candidates.md` | P3.0: A/B/C/C′ karşılaştırması, 600 s kontratı, ölçüm sınırları |
| `brain/decisions/0023-first-prestige-3-4h-harness-validated.md` | ADR-0023 bandı 180–240 dk, mevcut ölçüm 187–205 dk (o tarihte) |
| `brain/decisions/0073-achievement-gated-branch-spine-hybrid.md` | P3.1 melez model (omurga + dal), dal kapısı mantığı |
| git: `092f399` (P3.1, 23:10:56 +03:00), `c0128fb` (P3.2 silüet teaser, 23:24:53 +03:00) | Ölçüm sırası ve A/E karışıklığının kaynağı |


---

## 11. Uygulama sonrası not ve doğrulama gereksinimi (rapor yazıldığı andaki çalışma ağacı)

### 11.1 Çalışma ağacında ne değişmiş (commit EDİLMEMİŞ — gözlem, müdahale değil)

| Dosya | Değişiklik (git diff, rapor yazıldığı an) |
| :--- | :--- |
| `src/game/unlocks.ts` | Yatay kapılar yeniden zamanlandı: `autobuyers` **1e9 → 1e12**, `stance_spam` **1e14 → 1e26**, `stance_private` **1e18 → 1e40**, `colony` **1e22 → 1e30**. Korunanlar: `crisis_spawn` 1e3 · `crisis` 1e28 · `spell_espresso` 1e34 · `spell_noise` 1e42 · `spell_sleep` 1e52 · `lab` 1e65 · `seed_nucleon` 1e80 · `seed_gluon` 1e100 · `time_clock` 1e120 · `seed_graviton` 1e125 · `guilt_slackers` 1e160 · `event_horizon_lens` 1e200 · `hawking_resonator` 1e240 · `cosmic_filament` 1e280 · `night_watch` 1e308 · `challenges` 1 tekillik. Merdiven sırası da değişti: `colony` artık `crisis`'ten sonra, `stance_private` artık `spell_espresso`'dan sonra geliyor. |
| `src/game/balance.ts` | `DIMENSION_UNLOCK_GATES` = **E5 tablosu**: 1e8 / 1e14 / 1e24 / 1e40 / 1e65 (`E5.json`'de ölçülen konfigürasyon). |

### 11.2 Bu uygulamanın ölçümle ne söylediği

1. **Yatay eşik kaydırması 600 s yüzey sayısını düşürmez.** A eğrisinde ölçülmüş eşik geçiş zamanları (kaynak: P3.0 raporu §2 tablosu, `brain/scratchpad/p3-early-ladder-candidates.md`; A için doğrulama: `p3-ladder-baseline.json`): 1e9 → **190 s** (A) · 1e12 → **192.5 s** · 1e26 → **204.7 s** · 1e30 → **207.8 s** · 1e40 → **213.6 s**. Uygulanan kaydırma dört özelliği de **600 s'nin çok altında** bırakıyor (en geç 213.6 s) → yatay yüzey sayısı **E5'in ölçülmüş 5'iyle aynı** kalır; kaydırmanın etkisi yalnızca **+2.5…+16 s yeniden aralıklandırma**dır. Bu, §8(b)'nin "eşik kaydırmak sayıyı değiştirmez" tespitinin bu uygulamaya da birebir geçerli olduğunu gösterir (P0 §3-B adayının ölçülmüş sonucuyla aynı).
2. **Çakışma riski (ölçülmüş çapalar üzerinden):** E5 boyut tablosunda D7 kapısı **1e40**'tır ve D7 ölçülmüş olarak **353 s**'de açılmıştır (`E5.json` → `d7@353`, `dimUnlocks.d7.log10 = 40.015`). Uygulanan `stance_private` de **1e40** olduğuna göre D7 ile **aynı dekadda, aynı tikte** açılacaktır (**tahmin**, ölçülmedi). Aynı desen zaten **ölçülmüş** bir yığılma örneğini veriyor: `lab` 1e65'tir ve E5'te D8 ile birlikte **1377 s**'de açılmıştır (`E5.json` → `d8@1377`, `lab@1377`). `stance_spam` 1e26 ise D6'nın 1e24 kapısının hemen üstünde (D6 ölçülü: 231.5 s) → ~235–250 s bandında açılacaktır (**tahmin**).
3. **Beklenen 600 s tablosu (ölçülmüş + tahmin karışımı — açıkça etiketli):** `crisis_spawn` 26 s (ölçülü) · `autobuyers` ~192.5 s (ölçülü geçiş) · `stance_spam` ~235–250 s (tahmin) · `colony` ~260–280 s (tahmin; ayrıca otomasyon dalı: `auto_first`+`auto_bulk`, E1'de 211 s'de sağlanmıştı) · `stance_private` ~353 s (D7 ile birlikte, tahmin) · `crisis` ~810.5 s (ölçülü, dal kapısı) · `spell_espresso` ~810.5 s (ölçülü, dal kapısı) · `lab` ~1377 s (ölçülü, D8 ile birlikte) → **600 s içinde 5 `feat:*` (anomali hariç 4 sistem)** — E5'in ölçülmüş değerinin aynısı.
4. **Belirleyici hâlâ dal kapısı:** 600 s içindeki yüzeylerden 2'si (`crisis`, `spell_espresso`) 810.5 s'de açılan dal kapısına bağlı; yatay eşik kaydırmaları bunu **etkilemez**. Yani uygulanan merdiven, 10 dakika kontratını **yalnızca P3.1 dal kapıları + E5 boyut tablosu** sayesinde tutuyor, eşik kaydırması sayesinde değil.

### 11.3 Doğrulama gereksinimi (AÇIK İŞ — bu konfigürasyon ölçülmedi)

`brain/scratchpad/harness/out/` içinde bu uygulamaya ait **hiçbir koşu çıktısı yok** (yalnızca §1'de listelenen 8 dosya var). Bu yüzden uygulanan merdivenin (a) 600 s yüzey sayısı, (b) 30 dk tepesi, (c) küme / max_mode zamanları, (d) 12 saatlik koşu uzunluğu **ölçülmemiştir**; §11.2'deki "tahmin" satırları ölçüm değildir. Zorunlu koşu:

```powershell
npm run harness:build
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 0.5 --lite --out brain/scratchpad/harness/out/p3-final-ladder.json
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 12 --lite --out brain/scratchpad/harness/out/p3-final-ladder-12h.json
```

**Kabul ölçütleri (bu raporun ölçümlerine bağlı):**

| Ölçüt | Değer | Dayanak |
| :--- | :--- | :--- |
| 600 s içinde `feat:*` | ≤ **5** (anomali hariç ≤ 4) | E5 ölçümü: 5 (`E5.json`) |
| D4→D8 penceresi | ≥ 60 s | E5: 186→1377 s (`E5.json`) |
| İlk küme | ≤ 1500 s | E5: 1422.5 s (`E5.json`) |
| `max_mode` | ≤ 1800 s | E5: 1566 s (`E5.json`) |
| 12 saatlik tepe | ≥ 1e250 (aksi halde ADR-0023 gerilimi E5'inkinden kötü) | E1-12h: 224.15 (`e1-long.json`) |
| Aynı saniyede **iki** açılış (özellik/boyut) | **0 olmalı** — `stance_private`/D7 ve `lab`/D8 çakışmaları ayrışmalı | E5: `d8@1377` + `lab@1377` (ölçülmüş çakışma) |

**Not:** Uygulamanın yorumunda atıf yapılan `brain/scratchpad/p3-final-ladder.md` bu rapor yazıldığı anda `brain/scratchpad/` altında **bulunmuyor**; ölçüm ve kabul ölçütlerinin kaynağı olarak bu rapor (`brain/research/p3-ladder-experiment-2026-10.md`) kullanılabilir.
