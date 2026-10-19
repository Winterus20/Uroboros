# P3.0 — Erken Merdiven Yeniden Zamanlaması: Aday Ölçümü

> **Görev:** P3.0 — OLCUM. **Kod değişikliği YOK** (tek yazılan dosya bu rapor).
> **Tarih:** 2026-10-19 · **Profil:** `active`, seed 1, dt 0.5, capHours 0.5 (1800 s), `--lite`
> **Kaynak bağlam:** `brain/research/pacing-economy-shift-redesign-plan-2026-10.md` §1 (İlk 10 Dakika Kontratı), ADR-0023, ADR-0032, ADR-0035.
> **Dikkat:** çalışma ağacı o an başka subagent'ların P3.1 (başarım kapılı dal, `src/game/branches.ts`) çalışmasıyla değiştirilmiş durumda; harness bu çalışma ağacından derlendi — ölçüm bu ağacın davranışıdır.

---

## 0. Özet (tek satırlık bulgular)

1. **Mevut merdiven (A) ilk 600 saniyede 10 özellik açıyor** (crisis_spawn + 9 sistem); "7'ye yakın" ifadesi bile düşük kaldı.
2. **Plan metni adayı (B) işe yaramıyor:** tüm kapılar 190–264 s aralığına sıkışıyor; lab (1e65) hiç dokunulmadığı için 353.5 s'de hâlâ içeri giriyor → **600 s içinde 10 sistem (A ile aynı).**
3. **Görevdeki C tarifi ölçümle düzeltme istiyor:** `1e65 → 353.5 s` (600 s İÇİNDE). 600 s kontratını sağlayan **en küçük eşik `1e68 → 816.40 s`**; `1e67.238101` ve altındaki her şey 600 s'den önce açılıyor.
4. **Düzeltmiş C (C′): 600 s içinde yalnız `crisis_spawn` (26 s, izinli anomali) kalır → 1 sistem.** Hedef ≤4'ü tutturan tek aday C′.
5. **ADR-0023 gerilimi gerçek:** C′ büyüler (espresso 209.5 s → 1e110) ve lab (353.5 s → 841 s) etkilerini geç kaydırır; bu ikisi üretim eğrisine bağlıdır → koşu süresi uzayabilir; **P3 uygulamasında yeniden ölçülür.**

---

## 1. Adım 1 — Temel eğri (ölçüm, tahmin yok)

### 1.1 Çalıştırılan komutlar (Windows, çift tırnak)

```powershell
npm run harness:build
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 0.5 --lite --out brain/scratchpad/harness/out/p3-ladder-baseline.json
node brain/scratchpad/harness/unlock-timeline.mjs brain/scratchpad/harness/out/p3-ladder-baseline.json
```

Zaman serisi gereği (aşağıda 1.3) `--lite` OLMADAN ikinci bir koşu (aynı parametreler, ayrı çıktı):

```powershell
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 0.5 --out brain/scratchpad/harness/out/p3-ladder-samples.json
```

Karşılaştırmalı alt profiller (C'nin bedeli için):

```powershell
node brain/scratchpad/harness/out/run.mjs --profile casual --seed 1 --dt 0.5 --capHours 0.5 --out brain/scratchpad/harness/out/p3-ladder-casual.json
node brain/scratchpad/harness/out/run.mjs --profile idle   --seed 1 --dt 0.5 --capHours 0.5 --out brain/scratchpad/harness/out/p3-ladder-idle.json
```

### 1.2 Çıktı JSON anahtarları (inspeksiyon)

`runs[0]` anahtarları: `profile, seed, dt, capHours, reached, timeSeconds, timeHms, wallMs, milestones, dimUnlocks, logMarks, samples, stalls, spells, anomalyClicks, trace, peaks, final, error`.

| Anahtar | İçerik | Çözünürlük |
| :--- | :--- | :--- |
| `milestones` | `feat:*`, `bot:*`, `first_shift`, `shift_4`, `d4..d8`, `first_galaxy`, `bulk_mode`, `max_mode` → saniye (null = aşılmadı) | **dt = 0.5 s (kesin)** |
| `dimUnlocks` | `d4..d8` → `{ t, log10 }` (sıçramayı tetikleyen, reset ÖNCESİ log10) | **dt = 0.5 s (kesin)** |
| `samples` | **Zaman serisi budur:** `{ t, logMatter, logDps, logTickspeedMult, shifts, galaxies, tickspeedBought, bought[8], feats[], bots, flatSec }` | **60 s** (yalnız `--lite` DIŞI; lite'da `samples: []`) |
| `logMarks` | `15m..240m`, `capped`, `final` → log10(matter) | dakika bazlı |
| `peaks` | koşu tepe değerleri (`logMatter, shifts, galaxies, tickspeedBought`) | bkz. ölçüm notu 5.2 |
| `final` | t=1800 anlık görüntü (post-reset; `bought`, `unlockedFeatures`, `unlockedBots`, …) | anlık |

`brain/scratchpad/harness/smoke.json` da aynı şemadır (`samples: []` çünkü lite).

### 1.3 `unlock-timeline.mjs` çıktısı (baseline, 33 açılış / 9 null)

```text
26s feat:crisis_spawn      40.5s first_shift     132.5s shift_4
189s d4                    190s feat:autobuyers  192s d5 / bot:dim1,2,tickspeed,shift
194s feat:stance_spam      194.5s d6             197.5s feat:stance_private
198s bot:dim4              199s d7               200s bot:dim5
201s feat:colony           205s d8               206s bulk_mode / bot:dim6
207s feat:crisis           208s bot:dim7         209.5s feat:spell_espresso
210s bot:dim8              215s feat:spell_noise  236s feat:spell_sleep
353.5s feat:lab            488.5s first_galaxy    660s bot:galaxy
662s max_mode              893.5s feat:seed_nucleon   1703.5s feat:seed_gluon
null: time_clock, seed_graviton, guilt_slackers, event_horizon_lens,
      hawking_resonator, cosmic_filament, night_watch, challenges, bot:singularity
kosu: ULASILMADI (tavan 0.5 sa) - log10=18.52 (anlik) - shifts=5 - galaxy=2 - tickspeed=13 - bot=11
```

---

## 2. Adım 2 — Eşik → ilk aşılma zamanı tablosu (DURUM: ölçüm)

**Yöntem:**
- **KESİN** = `milestones.feat:*` / `dimUnlocks` (dt = 0.5 s çözünürlük). Dopamin kapıları koşu içi `matter` yerine `lifetimePeakMatter` üzerinden okunduğu için (ADR-0035, `meetsDopamineGate`) bu zamanlar "ilk asılma" anıdır.
- **interpolasyon** = 60 s `samples` + kesin çapa noktaları arasında doğrusal log10 interpolasyonu. Her satırda **gerçek parantez** `(alt, üst]` ve çapa değerler yazılıdır; parantez interpolasyonun belirsizlik sınırıdır (gizli sıçrama varsayımı: bkz. 5.1).
- Hiçbir değer "yaklaşık" diye yuvarlanmadı; ondalık basamaklar hesap çıktısıdır.

| Eşik | İlk aşılma (s) | Tür | Parantez / çapalar |
| :--- | ---: | :--- | :--- |
| 1e3 | 26 | KESİN | `feat:crisis_spawn` |
| 1e9 | 190 | KESİN | `feat:autobuyers` |
| 1e12 | 192.52 | interpolasyon | (192, 194] · 11.297360 (`dimUnlock d5`) → 14.000000 (`feat:stance_spam`) |
| 1e14 | 194 | KESİN | `feat:stance_spam` |
| 1e17 | 196.36 | interpolasyon | (194.5, 197.5] · 15.367103 (`dimUnlock d6`) → 18.000000 |
| 1e18 | 197.5 | KESİN | `feat:stance_private` |
| 1e20 | 198.89 | interpolasyon | (197.5, 199] · 18.000000 → 20.154858 (`dimUnlock d7`) |
| 1e21 | 199.92 | interpolasyon | (199, 201] · 20.154858 (`dimUnlock d7`) → 22.000000 |
| 1e22 | 201 | KESİN | `feat:colony` |
| 1e26 | 204.74 | interpolasyon | (201, 205] · 22.000000 → 26.272500 (`dimUnlock d8`) |
| 1e28 | 207 | KESİN | `feat:crisis` |
| 1e30 | 207.83 | interpolasyon | (207, 209.5] · 28.000000 → 34.000000 |
| 1e32 | 208.67 | interpolasyon | (207, 209.5] · 28.000000 → 34.000000 |
| 1e34 | 209.5 | KESİN | `feat:spell_espresso` |
| 1e38 | 212.25 | interpolasyon | (209.5, 215] · 34.000000 → 42.000000 |
| 1e40 | 213.63 | interpolasyon | (209.5, 215] · 34.000000 → 42.000000 |
| 1e42 | 215 | KESİN | `feat:spell_noise` |
| 1e46 | 223.40 | interpolasyon | (215, 236] · 42.000000 → 52.000000 |
| 1e52 | 236 | KESİN | `feat:spell_sleep` |
| 1e56 | 263.39 | interpolasyon | (240, 300] · 52.959077 (`sample t=240`) → 60.761212 (`sample t=300`) |
| 1e60 | 294.15 | interpolasyon | (240, 300] · 52.959077 → 60.761212 |
| 1e65 | 353.5 | KESİN | `feat:lab` |
| **1e67.238** | **480.00** | interpolasyon | (420, 480] · 54.894518 → 67.238101 — **600 s'deki ÖMÜR BOYU TEPE = 67.238101** |
| **1e68** | **816.40** | interpolasyon | (780, 840] · 65.252353 (`t=780`) → 69.781101 (`t=840`) — **600 s kontratını sağlayan en küçük tam dekad** |
| 1e70 | 841.15 | interpolasyon | (840, 893.5] · 69.781101 → 80.000000 (`feat:seed_nucleon`) |
| 1e75 | 867.32 | interpolasyon | (840, 893.5] · 69.781101 → 80.000000 |
| 1e80 | 893.5 | KESİN | `feat:seed_nucleon` |
| 1e85 | 1021.89 | interpolasyon | (1020, 1080] · 84.825741 → 90.370980 |
| 1e95 | 1226.19 | interpolasyon | (1200, 1260] · 93.622653 → 96.778316 |
| 1e100 | 1703.5 | KESİN | `feat:seed_gluon` |
| 1e110 | **> 1800** | ölçüm tavanı | 1800 s'de ölçülen tepe **100.000000** (1703.5 s) — aşılmadı |

### 2.1 Görevdeki "600 s'de log10 ~65" ipucu — ölçümle DÜZELTİLDİ (açıkça)

- `t = 600 s` örneğinde **güncel** `logMatter = 11.965225` (Küme sıfırlaması sonrası; `first_galaxy = 488.5 s`).
- Aynı anda **ömür boyu tepe = 67.238101**; bu değer `t = 480 s` örneğinde aşılmıştır.
- `1e65`'in **ilk aşılma zamanı 353.5 s**'dir (`feat:lab`) → **"600 s ≈ 65" İPUCU BU KOŞUDA DOĞRU DEĞİLDİR.**
- Küme sonrası yeniden toparlanma (ölçüm): 540 s → 8.328700, 600 s → 11.965225, 660 s → 28.928865, 720 s → 48.967579, 780 s → 65.252353, 840 s → 69.781101.
- **Sonuç:** 600 s sonrasına taşınacak herhangi bir eşik `> 1e67.238101` olmak ZORUNDADIR; en küçük tam dekad `1e68 → 816.40 s`.

### 2.2 Alt profiller (aynı 1800 s tavanı) — "bedel" analizi için

| Profil | Tepe log10 @1800 s | Anlık log10 @1800 s | `feat:autobuyers` | `feat:lab` | son özellik |
| :--- | ---: | ---: | ---: | ---: | :--- |
| active (5 tık/sn, 2 s maxAll, shift/galaxy/anomali/spell/lab) | 98.393495 | 18.515227 | 190 s | 353.5 s | seed_gluon (12 özellik) |
| casual (2 tık/sn, 10 s maxAll, spell/lab YOK) | 69.391568 | 59.742952 | 354 s | 647 s | lab (10) |
| idle (0 tık, 5 s maxAll, shift/galaxy YOK) | 67.002930 | 66.687459 | 439 s | 1680 s | lab (10) |

`casual` 1800 s'de tepe 69.39, `idle` 67.00 → **`1e70` eşiğini 30 dakikada HİÇBİRİ aşamıyor.**

---

## 3. Adım 3 — Üç aday merdiven

Sayım kuralı: **"sistem" = `FEATURE_UNLOCKS` içindeki yatay yüzey** (omurga hariç: D1–D8, Çekim Hızı/tickspeed, Sıçrama, Küme, Şafak). `crisis_spawn` (1e3) plan gereği geri çekilemez; ayrıca **"en fazla bir anomali"** izni de sayımın içinde hem "anomali" hem "sistem" olarak verilmiştir.

### A) Sabit (mevcut kod — ölçüm doğrudan bu)

| Sistem | Eşik | Açılış (sn) | 600 s içinde mi? |
| :--- | :--- | ---: | :--- |
| Kozmik Dalgalanmalar (anomali) | 1e3 | 26 | **İÇİNDE** (izinli anomali) |
| Otonom Çekim Botları | 1e9 | 190 | **İÇİNDE** |
| Obur Çekim Duruşu | 1e14 | 194 | **İÇİNDE** |
| Vakum Kalkanı Duruşu | 1e18 | 197.5 | **İÇİNDE** |
| Kuantum Rezonans Kolonisi | 1e22 | 201 | **İÇİNDE** |
| Olay Ufku Kriz Yönetimi | 1e28 | 207 | **İÇİNDE** |
| Zaman Genleşmesi (espresso) | 1e34 | 209.5 | **İÇİNDE** |
| Manyetik Tahliye | 1e42 | 215 | **İÇİNDE** |
| Planck Patlaması | 1e52 | 236 | **İÇİNDE** |
| Kuantum Parçacık Reaktörü (lab) | 1e65 | 353.5 | **İÇİNDE** |
| Ağır Nükleon (seed_nucleon) | 1e80 | 893.5 | dışarıda |
| Gluon (seed_gluon) | 1e100 | 1703.5 | dışarıda |
| (diğerleri 1e120+) | — | > 1800 | dışarıda |

**A: 600 s içinde 10 sistem** (anomali hariç **9**). Hedef ≤4: **TUTTURMAZ.**

### B) Plan metni (autobuyers 1e9→1e12 + geri kalan biraz ileri)

| Sistem | Eşik | Açılış (sn) | 600 s içinde mi? |
| :--- | :--- | ---: | :--- |
| Kozmik Dalgalanmalar (anomali) | 1e3 | 26 | **İÇİNDE** |
| Otonom Çekim Botları | 1e12 | 192.52 | **İÇİNDE** |
| Obur Çekim Duruşu | 1e17 | 196.36 | **İÇİNDE** |
| Vakum Kalkanı Duruşu | 1e21 | 199.92 | **İÇİNDE** |
| Koloni | 1e26 | 204.74 | **İÇİNDE** |
| Kriz | 1e32 | 208.67 | **İÇİNDE** |
| Büyü: espresso | 1e38 | 212.25 | **İÇİNDE** |
| Büyü: tahliye | 1e46 | 223.40 | **İÇİNDE** |
| Büyü: Planck | 1e56 | 263.39 | **İÇİNDE** |
| **lab (B'de dokunulmadı)** | 1e65 | **353.5** | **İÇİNDE** |
| seed_nucleon | 1e80 | 893.5 | dışarıda |

**B: 600 s içinde 10 sistem** (anomali hariç **9**). Hedef ≤4: **TUTTURMAZ.**
Neden: eğri o kadar dik ki 1e9→1e56 aralığı **74 saniyeye** (190 → 263.39 s) sıkışıyor; `lab` hiç taşınmadığı için 353.5 s'de onuncu sistem geliyor. B, A'dan yalnızca **saniyeleri** kaydırır, **sayıyı** değiştirmez.

### C) "İlk 10 dk kontratı" (görevdeki tarif — ham hali)

| Sistem | Eşik | Açılış (sn) | 600 s içinde mi? |
| :--- | :--- | ---: | :--- |
| Kozmik Dalgalanmalar (anomali) | 1e3 | 26 | **İÇİNDE** (izinli anomali) |
| **Otonom Çekim Botları** | **1e65** | **353.5** | **İÇİNDE — kontratı İHLAL EDER** |
| **lab (tarifte kapsam DIŞI, değişmedi)** | 1e65 | **353.5** | **İÇİNDE — kontratı İHLAL EDER** |
| Obur Çekim Duruşu | 1e75 | 867.32 | dışarıda |
| Vakum Kalkanı Duruşu | 1e80 | 893.5 | dışarıda |
| Koloni | 1e85 | 1021.89 | dışarıda |
| Kriz | 1e95 | 1226.19 | dışarıda |
| Büyüler (espresso/tahliye/Planck) | 1e110+ | > 1800 (ölçüm tavanı) | dışarıda |

**C (ham): 600 s içinde 3 sistem** (anomali hariç **2**) → sayısal ≤4 hedefini **TUTTURUR**; ama mutlak kontrat cümlesi ("yalnız YUT + D1–D2 + Çekim Hızı + en fazla bir anomali") `1e65` iki kapısı yüzünden yine **ihlal edilir** (353.5 s < 600 s).

### C′) Ölçümle düzeltilmiş C (önerilen)

600 s sonrasında açılması için her yatay eşik `> 1e67.238101` (bkz. §2.1):

| Sistem | Önerilen eşik | Ölçülen açılış (sn) | 600 s içinde mi? |
| :--- | :--- | ---: | :--- |
| Kozmik Dalgalanmalar (anomali) | 1e3 | 26 | İÇİNDE (izinli anomali) |
| Otonom Çekim Botları | **1e68** (min) / 1e70 | **816.40** / 841.15 | dışarıda |
| lab (tarife eklenmeli!) | **1e70** | 841.15 | dışarıda |
| Obur Çekim Duruşu | 1e75 | 867.32 | dışarıda |
| Vakum Kalkanı Duruşu | 1e80 | 893.5 | dışarıda |
| Koloni | 1e85 | 1021.89 | dışarıda |
| Kriz | 1e95 | 1226.19 | dışarıda |
| Büyüler | 1e110+ | > 1800 (ölçüm tavanı) | dışarıda |

**C′: 600 s içinde 1 sistem = yalnız izinli anomali** (anomali hariç **0**) → hem ≤4 hedefini hem mutlak kontratı **TUTTURUR**.

---

## 4. Adım 4 — Tahlil

### 4.1 10 dk içindeki yeni sistem sayıları (hedef ≤4)

| Aday | 600 s içinde (anomali dahil) | anomali hariç | ≤4 hedefi |
| :--- | ---: | ---: | :--- |
| **A — sabit (mevcut)** | **10** | 9 | HAYIR |
| **B — plan metni** | **10** | 9 | HAYIR |
| **C — görevdeki tarif (ham)** | **3** | 2 | EVET (sayısal) — ama `1e65` çift kapısı mutlak kontratı ihlal eder |
| **C′ — ölçümle düzeltilmiş** | **1** | 0 | **EVET (tam)** |

**Sonuç:** B, A'dan fark etmiyor (10 → 10). Hedefi tutturan tek aile **C ailesi**; onun da `autobuyers` ve `lab` eşiklerinin **`1e68` / `1e70` bandına** çekilmesi gerekir.

### 4.2 C'nin bedeli — "autobuyer 65 dekad'a ertelenirse ne olur?"

1. **600 s anlık görüntü (active, ölçüm):** güncel `log10 = 11.965225`, ömür boyu tepe `67.238101` (480 s), `shifts = 4`, `galaxies = 1`, `tickspeed = 8`, kovalar `D1..D8 = [53, 50, 40, 30, 15, 0, 0, 0]`, 10 özellik açık. Yani 600 s'de oyuncu **Küme (488.5 s) sıfırlamasının sonrası yeniden toparlanma evresinde**. `1e65` bu koşuda **5.9 dakikada** açılıyor — C'nin "65 ≈ 600 s" varsayımı bu eğriyle çelişir.
2. **Eğrinin otomasyona bağımlılığı ölçümle sınırlı:** aktif profilde botsuz şerit **0 → 190 s** (autobuyers 190 s'de açılıyor): `t=60 → 3.379005`, `t=120 → 5.547129`, `t=180 → 6.161987` (60→180 arası **0.0232 dekad/s**), ardından D4 kapısıyla `180 → 190 s` arası **0.284 dekad/s** ve 190 s'de 9.0. Ortalama manuel hız (0→190 s): **0.0421 dekad/s**. `1e9 → 1e70` = 61 dekad; bu şerit doğrusal ölçeklense **~1450 s (≈24 dk)** eder — üstel büyümeyle daha kısa olabilir, ama **botsuz/sekmesiz** bir şerit demektir.
3. **Ölçüm sınırı (açıkça):** hiçbir harness profili `unlockBots: false` değil ve CLI'da böyle bir bayrak **yok** → "autobuyers 1e70'ye ertelendiğinde eğri nasıl yavaşlar" **bu görev kapsamında ölçülemez** (kod/CLI değişikliği yasak). Ölçülebilen alt sınırlar: casual 1800 s'de tepe **69.39** (`feat:autobuyers` 354 s), idle tepe **67.00** (439 s) → **C′ eşikleri (≥1e70) casual/idle oyuncuda 30 dakikada bile açılmıyor.**
4. **Mekanik bağımsızlık notu (kod okuması, `src/stores/game`):** `unlockAutobuyer()` **`autobuyers` feature'ını kontrol ETMİYOR** (kapı = `AUTOBUYER_PROGRESS_REQ` + maliyet). Feature yalnızca **sekme görünürlüğünü** kapatır (`App.vue` `v-if="store.autobuyersUnlocked"`, `useNavigation`). İki sonuç: (i) harness doğrudan `store.unlockAutobuyer` çağırdığı için eşiği kaydırmak **harness eğrisini değiştirmez** (botlar yine 192–210 s'de açılır) → P3'te "eğri aynı çıktı" görülürse bu koddan; (ii) **gerçek oyuncuda** sekme gizliyse botlara erişilemez → otomasyon kaybı gerçek eğriyi yavaşlatır, headless ölçülemez.
5. **Max-all acıyı azaltır mı:** aktif profil zaten **2 s'de bir** `maxAll` + manuel shift/galaxy basıyor (ölçüm böyle modellendi); C′'de acı, eğri kaybından çok **sürekli manuel tetik zorunluluğu**dur. Casual (10 s maxAll) 1800 s'de 69.4, idle (5 s maxAll) 67.0 tepe ile "rahat" oynayışın zaten çok daha yavaş olduğu görülüyor → otomasyon erişimi **özellikle casual/idle oyuncuda ağır bedeldir.**

### 4.3 Önerilen aday ve gerekçe

**Öneri: C′ (C'nin ölçümle düzeltilmişi).**

- **Gerekçe 1:** A ve B hedefi (≤4) tutturmuyor — ikisi de 10'ar sistem; B saniyeleri 190→263.39 s arasına kaydırıyor ama `lab` taşınmadığı için onuncu sistem 353.5 s'de duruyor.
- **Gerekçe 2:** C'nin ham tarifi `1e65` kapılarını 353.5 s'ye yerleştiriyor; ölçüm, 600 s kontratı için **en az `1e68` (816.40 s)** gerektiğini gösteriyor. C′ hem ≤4'ü hem "yalnız YUT + D1–D2 + Hz + 1 anomali" mutlak metnini tutturmuyor değil — **tutturuyor** (1 sistem).
- **Gerekçe 3:** Omurga (D1–D8, Çekim Hızı, Sıçrama, Küme) değişmiyor → öngörülebilirlik ve ADR-0032 dekad omurgası korunuyor; yalnız yatay yüzeyler kayıyor. `crisis_spawn (1e3 → 26 s)` plan gereği sabit kalıyor.

### 4.4 ADR-0023 ile gerilim (açıkça)

- **ADR-0023 bandı:** ilk koşu **180–240 dk** (doğrulama: 3:24:44 / 3:07:28 / 3:06:57 ≈ **187–205 dk**). `src/game/unlocks.ts` yorumu ve `brain/scratchpad/harness/results-308-audit.json` (2026-10-04, active, dt=0.1) **mevcut koşuyu 19057.6 s = 5:17:38 (≈317 dk)** gösteriyor — standart fiilen **zaten bandın üstünde** (plan §3 bunu "300 dk'lık mevcut koşu" diye kaydediyor).
- **Merdiveni ileri taşımak koşuyu uzatır mı?**
  - **Evet, uzatabilir — ve nedeni P3'te ölçülebilir:** C′ espresso gücünü 209.5 s → `>1800 s`'ye, lab'ı 353.5 s → 841 s'ye kaydırır; harness aktif profili bu sistemleri **açıkken** kullanıyor (`doSpells` `crisis` feature'ına, `doLab` `lab` feature'ına bağlı). Erken gelmeyen hız takviyesi + seed çarpanı = daha geç `1e308`. Bu etki **P3.0'da kod değişikliği yasak olduğu için ölçülmüyor; P3 uygulamasında `harness:smoke` + results-308-audit ile yeniden ölçülür** (kabul: ADR-0023 bandı ±%5).
  - **Uzatmaması için iki yol:** (a) yalnızca **görünürlüğü** kaydır (silüet / `LockedFeature`, plan §1'in kendi cümlesi) — ekonomiye dokunmaz, ADR-0023 riski sıfır; ama 10 dk sonunda 9 sistem birden görünür ve §1'in "sindirme vadisi" (≥10–15 dk dikey bölüm) yine ihlal edilir. (b) **üretim etkisi düşük sistemleri** ileri taşı (autobuyers sekmesi — harness'da eğriye etkisi yok, gerçek oyuncuda UX), **üretim etkililerini** (espresso/lab) erken tut ve koşuyu yeniden ölç.
  - **Ters yön de doğru:** A zaten 300+ dk'lık koşuyu ilk **3.5 dakikada** 6 sisteme, **5.9 dakikada** 7 sisteme paketliyor → erken içerik tüketilip sonradan uzun içerik çölü oluşuyor (plan §1'in teşhisi ölçümle doğrulandı). Yani "merdiven ileri taşınırsa koşu uzamaz" diyebilmek için kayan sistemlerin üretim etkisinin ölçülmesi gerekir — bu P3'ün kabul testidir, P3.0'ın değil.

---

## 5. Ölçümün sınırları (raporun parçası)

### 5.1 60 s örneklem çözünürlüğü ve gizli sıçrama
`samples` 60 s'de bir alınır ve boyut alımları kütleyi harcadığı için (`actions-dimensions.ts` → `matter.minus(cost)`) tepe örneklemlerde **kaçabilir**. `1e12 / 1e20 / 1e26 / 1e30 / 1e40` gibi erken eşikler bu yüzden 1.5–5.5 s'lik **kesin çapa parantezlerinden** (milestone + dimUnlock) interpole edildi; `1e56–1e110` arası 60–113 s'lik parantezlere düşer → bu satırlar **parantez aralığı kadar** belirsizdir. Parantezler tabloda yazılıdır; hiçbir değere "yaklaşık" denmemiştir.

### 5.2 `peaks.logMatter` sayacı
`runs[0].peaks.logMatter = 98.393495`, fakat `feat:seed_gluon` (1e100) **1703.5 s**'de açıldı. Yani harness'ın tepe sayacı, `store.update()` **içindeki** anlık tepeyi (bot sıçraması öncesi / otomatik alım arası) kaçırıyor. **Kapı açılış zamanları için `milestones` esastır**; `peaks` alanı bu raporda yalnızca özet olarak kullanıldı.

### 5.3 Üretilen dosyalar / git durumu
- Rapor: `brain/scratchpad/p3-early-ladder-candidates.md` — **bu görevin yazdığı TEK dosya.**
- Harness çıktıları (commit EDİLMEZ): `brain/scratchpad/harness/out/p3-ladder-baseline.json`, `p3-ladder-samples.json`, `p3-ladder-casual.json`, `p3-ladder-idle.json`.
- `src/` DOSYALARINA, sabitlere, arayüzlere **dokunulmadı**; commit **atılmadı**.
- `git status --short` bu rapor yazılmadan önce de başka subagent'ların P3.1 çalışması nedeniyle kalabalıktı (`src/game/unlocks.ts`, `src/game/achievements.ts`, `src/game/branches.ts` vb.); **bu görevin eklediği tek değişiklik bu rapordur.**

---

## Açık karar

1. **Hangi aday seçilecek:** A (mevcut, 10 sistem/10 dk), B (plan metni, yine 10), C ham (3, ama `1e65` kapıları kontratı ihlal ediyor) yoksa **C′ (`autobuyers ≥1e68`, `lab ≥1e70`, duruşlar 1e75/1e80, koloni 1e85, kriz 1e95, büyüler ≥1e110 → 10 dk'da yalnız izinli anomali)** mi?
2. **C′ uygulanırsa ADR-0023 gerilimi kimin onayıyla kapatılır** — büyüler/lab'ın üretim etkisi koşu süresini uzatırsa `harness:smoke` ±%5 mi korunacak, yoksa ADR-0023 bandı yeniden mi açılacak?
3. **Onay gerekenler:** tempo/pacing sahibi (plan §1 ve §5 P3 kabul kriteri: "ilk oturumda ≤4 yeni sistem") + ADR-0023 sahibi — C′ eşiklerinin `src/game/unlocks.ts`'e uygulanmasına kim onay veriyor?
