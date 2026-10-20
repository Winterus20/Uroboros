# P0 — Ölçüm Baseline Raporu: Açılış Zaman Çizelgesi & SP Merdiveni

> **Tarih:** 2026-10-19 · **Kapsam:** ölçüm + analiz — **oyun kodu DEĞİŞMEDİ**
> **Kaynak baseline:** `brain/scratchpad/harness/smoke.json` (P2.1 öncesi, ölçüm anındaki hâli)
> **⚠️ GÜNCELLİK (2026-10-19, Faz 2 sonrası):** Bu baseline, ADR-0072 (boyut açılımlarının sıçramadan
> koparılması) **öncesine** aittir ve o kodun ölçümüdür — bir baseline'ın amacı da budur. P2.1 sonrası
> `smoke.json` zorunlu olarak yeniden üretildi ve sayılar DEĞİŞTİ (zirve `log10` 90.72 → **99.8**,
> `shifts` 8 → 9). Ayrıca smoke kapısı artık `peaks` (koşu zirvesi) alanını ölçüyor; gerekçe ve kanıt
> `brain/tasks/completed.md` (2026-10-19 Faz 2 girişi) §9'dadır. §2'deki zaman çizelgesi ve §4'teki
> SP merdiveni tarihsel ölçüm olarak geçerlidir.
> **İlgili plan:** [pacing-economy-shift-redesign-plan-2026-10.md](pacing-economy-shift-redesign-plan-2026-10.md) §1 (şişkinlik teşhisi), §8 (SP ekonomisi), §5 (P0)
> **İlgili kararlar:** ADR-0023 (ilk prestij ~3s30dk), ADR-0034 (SP yalnızca şafakta), ADR-0053 (harness smoke/full)

---

## 1. Yöntem

Baseline, mevcut `smoke.json` dosyasından **olduğu gibi** okundu; harness **tekrar çalıştırılmadı**.

| Alan | Değer |
| :--- | :--- |
| Üreten komut | `npm run harness:smoke` → `node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 0.5 --lite --out brain/scratchpad/harness/smoke.json` |
| `smoke.json` **generatedAt** | `2026-10-19T17:42:17.007Z` |
| Profil | `active` (5 tık/sn, 2 sn'de bir `maxAll`, anında shift/galaxy, anomali tıklaması, büyü+lab) |
| Seed | `1` (deterministik mulberry32) |
| dt | `0.5` s |
| capHours | `0.5` → simülasyon tavanı **1800 s (30 dk)** |
| Mod | `--lite` (örnekleme yok, kompakt JSON) |
| `runs[0].reached` | `false` |
| `runs[0].timeSeconds` | `null` |
| `runs[0].wallMs` | `3154.2347` ms |

Yardımcı betik (bu görevde oluşturuldu, salt-okuma, sıfır bağımlılık):

```powershell
node brain/scratchpad/harness/unlock-timeline.mjs brain/scratchpad/harness/smoke.json
```

---

## 2. Ölçülen Açılış Zaman Çizelgesi (betik çıktısından birebir)

**Ham betik çıktısı:**

```text
# Açılış zaman çizelgesi — brain/scratchpad/harness/smoke.json
# profil=active seed=1 dt=0.5 capHours=0.5 generatedAt=2026-10-19T17:42:17.007Z
# runs[0] · 28 açılış · null=10

  26s  feat:crisis_spawn
  40.5s  first_shift
  104.5s  d5
  190s  feat:autobuyers
  192s  bot:dim1
  236s  bot:tickspeed
  236s  bot:shift
  244s  bot:dim2
  262s  feat:stance_spam
  268.5s  shift_4
  316s  bot:dim3
  331.5s  feat:stance_private
  332s  bot:dim4
  348s  feat:colony
  352s  bot:dim5
  374s  bot:dim6
  383.5s  feat:crisis
  388s  bulk_mode
  404s  bot:dim7
  470s  feat:spell_espresso
  506s  bot:dim8
  740s  feat:spell_noise
  812s  feat:spell_sleep
  1047.5s  feat:lab
  1182.5s  first_galaxy
  1332s  bot:galaxy
  1334s  max_mode
  1587.5s  feat:seed_nucleon

koşu: ULAŞILMADI (tavan 0.5sa)
özet: log10=90.72  shifts=8  galaxy=1  tickspeed=73  bot=11
```

**Aynı veri, tablo halinde** (28 kayıt; `null=10` = 9 açılmamış özellik kapısı + `bot:singularity`):

| # | Süre (s) | Zaman (dk:sn) | Milestone | Tür |
| --: | --: | :--: | :--- | :--- |
| 1 | 26 | 0:26 | `feat:crisis_spawn` | Özellik kapısı |
| 2 | 40.5 | 0:40.5 | `first_shift` | Omurga |
| 3 | 104.5 | 1:44.5 | `d5` | Omurga (5. boyut görünür) |
| 4 | 190 | 3:10 | `feat:autobuyers` | Özellik kapısı |
| 5 | 192 | 3:12 | `bot:dim1` | Bot |
| 6 | 236 | 3:56 | `bot:tickspeed` | Bot |
| 7 | 236 | 3:56 | `bot:shift` | Bot |
| 8 | 244 | 4:04 | `bot:dim2` | Bot |
| 9 | 262 | 4:22 | `feat:stance_spam` | Özellik kapısı |
| 10 | 268.5 | 4:28.5 | `shift_4` | Omurga (4. sıçrama) |
| 11 | 316 | 5:16 | `bot:dim3` | Bot |
| 12 | 331.5 | 5:31.5 | `feat:stance_private` | Özellik kapısı |
| 13 | 332 | 5:32 | `bot:dim4` | Bot |
| 14 | 348 | 5:48 | `feat:colony` | Özellik kapısı |
| 15 | 352 | 5:52 | `bot:dim5` | Bot |
| 16 | 374 | 6:14 | `bot:dim6` | Bot |
| 17 | 383.5 | 6:23.5 | `feat:crisis` | Özellik kapısı |
| 18 | 388 | 6:28 | `bulk_mode` | Bot modu (toplu alım) |
| 19 | 404 | 6:44 | `bot:dim7` | Bot |
| 20 | 470 | 7:50 | `feat:spell_espresso` | Özellik kapısı |
| 21 | 506 | 8:26 | `bot:dim8` | Bot |
| 22 | 740 | 12:20 | `feat:spell_noise` | Özellik kapısı |
| 23 | 812 | 13:32 | `feat:spell_sleep` | Özellik kapısı |
| 24 | 1047.5 | 17:27.5 | `feat:lab` | Özellik kapısı |
| 25 | 1182.5 | 19:42.5 | `first_galaxy` | Küme (galaxy) |
| 26 | 1332 | 22:12 | `bot:galaxy` | Bot |
| 27 | 1334 | 22:14 | `max_mode` | Bot modu (max alım) |
| 28 | 1587.5 | 26:27.5 | `feat:seed_nucleon` | Özellik kapısı |

---

## 3. Teşhis Doğrulaması (plan §1)

| Soru | Ölçüm | Plan iddiası | Karar |
| :--- | :--- | :--- | :--- |
| İlk **8 dakikada** (≤480 s) kaç özellik kapısı açıldı? | **7** (`crisis_spawn 26`, `autobuyers 190`, `stance_spam 262`, `stance_private 331.5`, `colony 348`, `crisis 383.5`, `spell_espresso 470`) | "~6-7 sistem" | **DOĞRULANDI** (7) |
| İlk **10 dakikada** (≤600 s) kaç kapı? | **7** (yeni kapı 740 s'de: `spell_noise`) | — | 8-10. dakikada **yeni sistem yok** |
| İlk 8 dk'daki 7 kapı, 30 dk'da açılan 11 kapının kaçta kaçı? | **7/11 = %64** | "çoğu sistemi açıyor" | **DOĞRULANDI** |
| Küme (**galaxy**) hangi saniyede? | **1182.5 s = 19 dk 42.5 sn** | "Küme aynı anda iniyor" | Geç: ilk 8 dk'dan **~15 dk sonra** |
| Ölü bölge nerede başlıyor? | Son yatay açılış `feat:seed_nucleon` = **1587.5 s (26 dk 27.5 sn)**; sonrasında 212.5 s boyunca (koşu sonuna dek) **hiçbir yeni yüzey yok** | "uzun dikey çöl" | **DOĞRULANDI**; asıl çöl bu pencerenin **ötesine** taşıyor |
| En büyük kapı aralığı | `lab 1047.5` → `seed_nucleon 1587.5` = **540 s (9 dk)** tek yeni sistem yok | "tersine kilitleniyor" | **DOĞRULANDI** |
| 30 dk'da kat edilen dikey mesafe | `log10(matter)=90.72` / 308 dekad ≈ **%29.5** | 308 dekada yayılı omurga | Pencere kuruluşun ilk ~%30'u |

**Yorum.** Ölçüm, "ilk 10 dakikada 7 yatay sistem + D1-D8 botlarının tamamı (11 bot) + 8 sıçrama + Küme bandı" tablosunu doğruluyor. 0-8. dakika arası **28 açılışın 21'ini** (`t ≤ 506`) içeriyor; 8-19.7. dakika arasında yalnızca **3 açılış** var (740, 812, 1047.5); Küme 19:42'de, son sistem 26:27'de geliyor. Bu, plan §1'deki "temporally kambur" teşhisinin sayısal kanıtıdır.

**Dikkat:** `runs[0].reached = false` ve `timeSeconds = null`. Bu koşu **tekilliğe ulaşmadı**; 30 dk tavanında `log10(matter)=90.72`'de kesildi (`logMarks.capped = logMarks.final = 90.7227...`). Yani bu baseline, kırılma anının **kendisini değil**, kırılmaya giden yolun ilk %30'unu ölçüyor.

---

## 4. SP Merdiveni (ANALİTİK — `totalMult = 1` varsayımı)

**Varsayımlar (açıkça):** `totalMult = dawnSpeedMult × spMult × relicSpMult = 1`; `break_singularity` fiyatı **4 SP** (`src/game/neural-data.ts`); kök `insomnia_heart` maliyeti bu iki senaryoda **sayılmadı** (taban senaryo); SP yalnızca şafakta kazanılır (ADR-0034).

| Şafak (dawn) | (a) Mevcut DÜZ kazanç | (a) Kümülatif kasa | (b) Plan §8A kazanç `1+n` | (b) Kümülatif kasa |
| --: | --: | --: | --: | --: |
| 1 | 1 | **1** | 1 | **1** |
| 2 | 1 | **2** | 2 | **3** |
| 3 | 1 | **3** | 3 | **6** ✅ |
| 4 | 1 | **4** ✅ | 4 | **10** |
| 5 | 1 | 5 | 5 | 15 |

| Soru | (a) Mevcut | (b) Plan §8A |
| :--- | :--- | :--- |
| `break_singularity` (4 SP) hangi şafakta alınabilir? | **4. şafak** | **3. şafak** |
| Kırılmaya kadar koşu sayısı | **4** | **3** |
| ADR-0023 (3s30dk/koşu) ile süre | **14 sa 00 dk** | **10 sa 30 dk** |

**Fark:** Plan §8A, kırılma duvarını **1 koşu** öne çeker → **3 sa 30 dk** tasarruf (kümülatif 4 → 3 koşu). Plan §8.2'deki "~4 tam koşu ≈ 10-14 saat" tespiti ile tutarlı: mevcut merdiven 4 koşu = 14 saat, önerilen merdiven 3 koşu = 10.5 saat.

> **Not (kök maliyeti varyantı):** `insomnia_heart` (1 SP) kırılmadan **önce** alınırsa, kasanın kırılmaya yetmesi için (a) **5. şafak**, (b) **3. şafak** gerekir → fark **2 koşu = 7 saat**'e çıkar. Plan §8.2 kökü "1. şafakta alınır, cepler boş" diye modelliyor; bu yüzden asıl karar bu kök harcamasının sırasına da bağlıdır. Baseline rakamı olarak yukarıdaki **4 → 3 (1 koşu, 3.5 sa)** esas alınmalı; kök varyantı duyarlılık notudur.

---

## 5. ÖLÇÜM BOŞLUĞU — Gerçek "safak sonrası SP/saat" ölçülemiyor

**Kanıt (kod):** `run.ts` simülasyonu `store.canSingularity` ilk `true` olduğu anda durdurur (`run.ts:507-523`) ve **`singularityReset()` hiç çağırmaz** (`run.ts:8-9` başlık sözleşmesi: "It never calls singularityReset(), so the measurement is the raw first run"). Ayrıca bu smoke profili `capHours=0.5` olduğu için `reached=false` — kırılma noktasına **hiç ulaşılmadı**.

**Sonuç:** Aşağıdaki metrikler bugünkü harness ile **ölçülemez**:

1. `safak sonrası SP/saat` (şafaklar arası kazanç/süre eğrisi),
2. `ilk 10 SP'ye süre` (kaç şafak + kaç saat),
3. `break_singularity sonrası SP ölçeklenmesi` (log10(matter) başına SP — `getters-misc.ts:180-188`, divisor 45),
4. Şafak başına **hangi kapıların** açıldığı (koşu-kimliği ölçümü),
5. Plan §8A/§8C kollarının A/B karşılaştırması.

### Kısa Spec — `harness --dawns N` (UYGULAMA YOK, kod yazılmadı)

**Amaç:** Aynı deterministik dünyada **arka arkaya N şafak** koşup SP ekonomisini zaman serisi olarak ölçmek. Oyun kodu değişmez; yalnız `run.ts` içindeki mevcut tick döngüsü bir "şafak döngüsü" ile sarılır.

| Madde | Karar (spec) |
| :--- | :--- |
| **Safak sayısı** | `--dawns N`, varsayılan **N=4** (düz merdivenin kırılma duvarı = 4). İkinci mod: `--dawns 12` ile kırılma sonrası SP/saat eğimi. |
| **Durdurma koşulu** | N şafak tamamlandı **VEYA** `capHours` aşıldı **VEYA** NaN guard tetiklendi. Her şafakta `store.canSingularity` beklenir, sonra `store.singularityReset(false)` çağrılır; `simTime` ve şafak sayacı korunur. |
| **Şafakta SP harcama politikası (deterministik, sıralı)** | 1) Şafak 1: `insomnia_heart` (1 SP). 2) `break_singularity` göründüğü an satın al (4 SP). 3) Kalan SP: sabit öncelik listesi `eye_drops → muted_alerts → prod_echo → ...` (ağaç düğüm sırası), uygun en ucuz ilk düğüm; rastgelelik yok. 4) Hiçbir SP harcanamıyorsa biriktir. |
| **Toplanan metrikler (her şafak için bir satır)** | `dawnIndex`, `tSeconds` (kümülatif), `runDurationSeconds` (bu koşu), `spGain`, `spBank`, `spSpentThisDawn`, `logMatterAtDawn`, `shifts`, `galaxies`, `tickspeedBought`, `unlockedFeatureCount`, `unlockedBots`. |
| **Toplanan türev metrikler (özet)** | zaman-to-break (kaçıncı şafak + saat), zaman-to-ilk-10-SP, `SP/saat` (şafak 1'den itibaren ve şafak-başı marjinal), `log10(matter)/SP` derinlik verimi, şafak başına yeni açılan kapı listesi (koşu-kimliği), `fastestSingularity`. |
| **Çıktı** | `{ generatedAt, profile, seed, dt, capHours, dawns: [ ... ], summary: { ... } }` — `unlock-timeline.mjs` bu şemayı zaten okuyabilir (`runs[0].milestones` + `final`). `--lite` ile örnekleme kapatılır. |
| **Kısıt** | ADR-0034 bozulmaz (SP yalnız `singularityReset` anında eklenir); oyun kodu (`src/**`) değişmez; yalnız harness `run.ts` genişler. |

---

## 6. Doğrulama Kanıtı

| Kontrol | Komut | Sonuç |
| :--- | :--- | :--- |
| Betik gerçekten çalışıyor | `node brain/scratchpad/harness/unlock-timeline.mjs brain/scratchpad/harness/smoke.json` | exit 0 · **28 açılış, null=10** · özet `log10=90.72 shifts=8 galaxy=1 tickspeed=73 bot=11` (tam çıktı §2'de) |
| Baseline tekrarlanabilir | Orchestrator doğrulama turunda `npm run harness:smoke` yeniden koşuldu | **Sayılar birebir aynı** (`log10=90.72 shifts=8 galaxy=1 tickspeed=73 bots=11`) → deterministik; yeni `generatedAt = 2026-10-19T18:07:52.095Z` |
| Dokunulmayan dosyalar | `run.ts`, `build.mjs`, `smoke.json` | Değiştirilmedi (başka subagent'ların) |

---

---

## 7. KRİTİK BULGU — ADR-0023 altın standardı BUGÜN ihlal ediliyor

Baseline kilitlenirken orchestrator, planın katı kısıtını (plan §3: *"ADR-0023 altın standart ilk koşu ≈ 3s 30dk korunmalı"*)
doğrulamak için hedefli bir bant koşusu yaptı. `harness:full` (idle profilinin 12 saatlik tavanı yüzünden çok uzun)
yerine yalnız `active` profili, 3 seed:

```powershell
node brain/scratchpad/harness/out/run.mjs --profile active --seeds 1,2,3 --dt 0.1 --lite --jobs 3 --out brain/scratchpad/harness/results-active-band.json
node brain/scratchpad/harness/assert-results.mjs brain/scratchpad/harness/results-active-band.json --full
```

| Seed | İlk tekillik | Shift | Küme | Tickspeed | Bot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **10:37:34** (637.6 dk) | 17 | 8 | 254 | 11 |
| 2 | **11:46:45** (706.7 dk) | 17 | 8 | 254 | 11 |
| 3 | **11:47:34** (707.6 dk) | 17 | 8 | 251 | 11 |

`assert-results.mjs --full` → **3/3 FAIL**:
`[active seed=N] ilk tekillik 150-300 dk bandinda (bulunan: 637.6 / 706.7 / 707.6 dk)`.

**Yorum:** ADR-0023'ün 150-300 dk bandı bugün tutmuyor; ölçülen ilk koşu **~10.6-11.8 saat**, yani bandın üst
sınırının **~2.4×** üzerinde. Bu sapma planın hiçbir bölümünde yok — plan 3s30dk'yı verili sabit olarak alıyor.

**Neden önemli:**

1. Plan §3'ün kabul kriteri (*"smoke altın standart ±%5"*) bugün **kullanılamaz**: referans bant zaten ihlal edilmiş.
2. Plan §3'ün yönü (fiyatları **kızıştır**) ilk koşuyu daha da **yavaşlatır**. Hedef 3s30dk ise P1, önce mevcut
   ~11 saati düşürmek zorundadır; aksi halde ADR-0023'ten daha da uzaklaşılır.
3. Plan §1'in *"dikey çöl"* teşhisi bu bulguyla **güçleniyor**: ilk 8 dakikadaki 7 kapıdan sonra oyuncu ~10 saat
   boyunca tek bir koşuyu bitirmeye çalışıyor.

**Yan bulgu — bayat ölçüm belgesi:** `brain/scratchpad/harness/first-prestige-baseline.md`, aktif profilin ilk
tekilliğe **0:13:13**'te (≈13 dk) ulaştığını yazıyor. Bu ne ADR-0023 (210 dk) ne de bu ölçüm (637-708 dk) ile
uyuşuyor → belge en az iki rebalance turu öncesine ait. **Güvenilmez; baseline olarak kullanılmamalı**
(açık iş: emekliye ayrılmalı ya da "tarihsel ölçüm" olarak mühürlenmeli).

**Açık karar (P1'in kapısı):** (a) P1'den önce tempoyu ADR-0023 bandına geri çeken bir **onarım fazı** mı,
(b) ADR-0023 bandı güncel tasarıma göre **revize** mi, (c) mevcut ~11 saat **kabul** mü? Bu karar P1'in
kabul kriterini belirler.

---

---

## 8. Eşik Yayılımı Ölçümü (Faz 2 / P2.1 sonrası) — **AÇIK KARAR**

P2.1 boyut açılımını sıçramadan kopardı, ancak planın *"açılışları zamana yay"* hedefine ulaşmadı:
`dimUnlocks` → D4 **185.5s** · D5 191s · D6 197s · D7 205s · D8 216.5s; yani D4→D8 arası **~31 saniye**.

### Yöntem ve ölçülen zarf

`active` profil · seed 1 · `dt=0.1` · 2 saat · örnekli koşu. Kapılar `lifetimePeakMatter`'a bağlı
olduğu için ölçülen metrik **zarf** (koşu boyunca en yüksek `log10`). Koşu galaksi resetleriyle testere
dişlidir (t=5400'de `log10` anlık **1.0**'a düşer) — zarf monotonik kaldığı için kapı mantığı doğrudur
ve ADR-0035'in "açılış bir OLAYdır" ilkesiyle uyumludur.

| t | 60s | 180s | 300s | 600s | 1200s | 1800s | 3000s | 3600s | 4200s | 7200s |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `log10` zarf | 3.7 | 18.5 | 49.0 | 65.0 | 90.7 | 97.9 | 112.4 | 121.8 | 127.4 | 136.6 |

Ekonomi **2 ile 5. dakika arasında `log10` 5.7 → 49.0** (43 dekad) sıçrıyor. Bu yüzden D4 ile D5'i
birbirinden ayırmak o pencerede yapısal olarak imkânsıza yakındır; anlamlı ayrım D6 ve sonrasında kurulur.

### Aday tablolar ve bu koşuda ölçülen açılış zamanları

| Tablo | D4 | D5 | D6 | D7 | D8 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A — mevcut** (1e8 / 1e11 / 1e15 / 1e20 / 1e26) | 3.0 dk | 3.0 dk | 3.0 dk | 4.0 dk | 4.0 dk |
| **C — orta** (1e8 / 1e25 / 1e50 / 1e75 / 1e100) | 3.0 dk | 4.0 dk | 6.0 dk | 17.0 dk | 43.0 dk |
| **B — yayılmış** (1e8 / 1e45 / 1e80 / 1e97 / 1e122) | 3.0 dk | 4.0 dk | 18.0 dk | 25.0 dk | 62.0 dk |

### ⚠️ Tempo takası (kritik)

D8'i **4. dakikadan ~60. dakikaya** taşımak, oyuncunun ilk saatini 8 yerine daha az boyutla oynaması
demektir. Bu, ilk koşuyu **daha da uzatır** — oysa §7'de ölçüldüğü üzere ilk koşu zaten **~11 saat**
(ADR-0023 hedefi 3s30dk). Yani:

- Eşik yayılımı **tek başına** yapılırsa tempo daha da bozulur.
- Altın standart kararı (§7) **önce** verilmezse eşik tablosu bilinçli seçilemez.

**Karar bekleyen:** hangi tablo (A / B / C / başka bir dağılım) ve §7'deki tempo kararıyla birlikte.

---

*P0 çıktısı: teşhis ölçümle kilitlendi; altın standardın bugün ihlal edildiği ortaya çıkarıldı; SP kollarının*
*sayıları için gereken `--dawns N` modu spec'lendi. §8 eşik yayılımı kararını bekliyor. Uygulama bir sonraki faza aittir.*

---

## 9. P3.0 ÖLÇÜMÜ — Erken Merdiven Adayları ve "Aday D" Önerisi (2026-10-19)

Tam rapor: `brain/scratchpad/p3-early-ladder-candidates.md` (salt okunur ölçüm; `src/` dosyasına dokunulmadı).

### 9.1 Ölçülen çarpıklık — eğri ilk 4 dakikada 47 dekad kat ediyor

| Eşik | İlk aşılma | Tür |
| :--- | ---: | :--- |
| 1e3 (crisis_spawn) | 26 s | kesin |
| 1e9 (autobuyers) | 190 s | kesin |
| 1e14 / 1e18 (duruşlar) | 194 / 197.5 s | kesin |
| 1e22 (colony) | 201 s | kesin |
| 1e28 (crisis) | 207 s | kesin |
| 1e34 / 1e42 / 1e52 (büyüler) | 209.5 / 215 / 236 s | kesin |
| 1e65 (lab) | 353.5 s | kesin |
| 1e80 (seed_nucleon) | 893.5 s | kesin |
| 1e100 (seed_gluon) | 1703.5 s | kesin |

**Eğri 1e9 → 1e56 aralığını 74 saniyeye sıkıştırıyor** (190 → 263.4 s). Plan §1'in önerisi
("autobuyers 1e9 → 1e12") bu yüzden **sayıyı değiştirmiyor**, yalnızca saniyeleri kaydırıyor:

| Aday | 600 sn içindeki sistem sayısı | ≤4 kabul ölçütü |
| :--- | ---: | :--- |
| A — mevcut | **10** | ✗ |
| B — plan metni | **10** | ✗ |
| C — ham kontrat | 3 | sayısal ✓ ama 1e65 kapıları 353.5 s'de → mutlak kontrat ✗ |
| C′ — ölçümle düzeltilmiş | **1** | ✓ (ama ağır bedel) |

600 sn kontratı için en küçük tam dekad **1e68 → 816.4 s** (600 sn'deki ömür boyu tepe = 1e67.24).

### 9.2 C′'nin bedeli (rapor §4.2)

- `casual` profili 1800 sn'de tepe **69.39**, `idle` **67.00** → 1e70 eşikleri bu profillerde
  **30 dakikada bile açılmıyor** (otomasyon 30+ dakika yok).
- `unlockAutobuyer()` feature kapısını kontrol **etmiyor** → harness eşiği yansıtmaz (ölçüm sınırı).

### 9.3 Aday D (orchestrator önerisi) — eşiği sentetik yükseltmek yerine **eğriyi yavaşlatmak**

Çarpıklığın kaynağı yatay eşikler değil, **boyut açılım eşiklerinin 190-205 s'de 16 dekadı**
kat etmesi (D4 1e8 → D8 1e26, ADR-0072'nin PROVISIONAL tablosu). Boyutlar üretimin kaynağı olduğu
için, boyut eşikleri yayıldığında **ekonomi kendiliğinden yavaşlar** ve yatay sistemler
kendiliğinden dağılır — sentetik 1e68 eşiklerine gerek kalmaz.

P0 §8'in aday tablosu bu yönde hazır: **A** mevcut (D8 4 dk) · **C** orta (D8 43 dk) · **B** yayılmış (D8 62 dk).

**Beklenen etki (ölçülecek, varsayım değil):**
1. 600 sn içindeki yatay sistem sayısı düşer (≤4 hedefi).
2. İlk koşu süresi **uzar** (geç açılan boyut = geç gelen üretim) → ADR-0023 gerilimi büyür.
3. P3.1'in dal kapıları (başarım gerekli sistemler) bu yavaşlamayı **üretim takviyesi** olarak
   telafi edebilir → iki etki birlikte ölçülmeli.

**Bu, P0 §8'in açık kararının (eşik yayılımı) ve P3.3'ün (erken merdiven) ortak ölçümüdür:**
önce D4-D8 eşikleri yayılır, eğri yeniden ölçülür, sonra yatay merdiven **yeni eğriye göre**
kararlaştırılır. Sırayı tersine çevirmek (önce sentetik eşik, sonra yayılım) iki kez ayar demektir.


### 9.5 E1 deneyi — fiyat eğrisi kolları erken eğriyi değiştirmiyor, koşuyu UZATTIYOR (2026-10-19)

Plan §3'ün üç fiyat kolu birlikte uygulandı (ölçüm için, kod kalıcı değil):
EARLY_D1..D6 oranları 55/42/32/28/24/20 → **75/55/40/34/28/24** · B0_BUCKET_THRESHOLD 30 → **20** ·
COST_ACCEL_DECADES_PER_STEP 0.011 → **0.025**. Patch saklandı: `brain/scratchpad/p1-price-curve-e1.patch`.

| Ölçüm | Değer |
| :--- | :--- |
| 30 dk tepe log10 | **98.44** (baseline 98.39 → **değişmedi**) |
| 30 dk shifts / tickspeed / galaxies | 9 / 80 / 2 (baseline 9 / 80 / 2 → **değişmedi**) |
| 10 dk'da açılan özellik | 6 (P3.1 dal kapısı etkisiyle) |
| **12 saatlik koşu** | **1e308'e ULAŞILMADI** — tepe **1e224**, shifts 14, galaxies 6 |

**İki çıkarım (ölçümden, varsayımdan değil):**
1. **Fiyat eğrisi erken kalabalığı çözmüyor.** 30 dk'da tepe neredeyse birebir aynı; kümelenme
   kaynağı fiyat değil, boyut eşiği yoğunluğu + başarım kapısı. Yani plan §3'ün "fiyatları
   kızıştır" kolu §1'in "ilk 10 dk kontratı" hedefini **taşımıyor**.
2. **Fiyat eğrisi koşuyu uzatıyor.** 12 saatlik tavan aşıldı (tepe 1e224 < 1e308) → plan §3'ün
   katı kısıtı ("ADR-0023 altın standardı korunmalı") **P1'in kendisi tarafından daha da
   zorlaştırılıyor**. Tempo onarımı fiyat tarafından **gelemez**; üretim tarafından (M1 bot hız
   çipleri + ADR-0073 aile kademe çarpanı) gelmelidir.

**Sonuç:** Faz 4'te P1, M1 ile birlikte uygulanmalı (M1 olmadan P1 tek başına işlevsiz);
P1'in sayıları ölçümle yumuşatılmalı. Bu, tempo kararını da netleştirir: onarım kolu **üretim**.

### 10. DİKEY ÇÖL — ÖLÇÜLDÜ, İÇERİK İŞİ ERTELENDİ (2026-10-20)

**Ölçüm** (aktif profil, çip açık, 12 saatlik koşu: `v2c-chips-12h.json`, ilk tekillik 4s28dk):

| dk | yüzey |
| ---: | :--- |
| 0.4 | `crisis_spawn` (anomali) |
| 3.2 | `autobuyers` (Botlar) |
| 3.4 | `stance_spam` |
| 4.3 | `stance_private` |
| 13.5 | `crisis` (Kriz) + `spell_espresso` |
| 21.2 | `colony` (Koloni) |
| 28.9 | `lab` (Lab) + `seed_nucleon` (29.7) + `seed_gluon` (34.2) |
| 54.4 | `seed_graviton` |
| 60.4 / 64.5 | `spell_noise` / `spell_sleep` |
| **121.9** | `guilt_slackers` (Kozmik Parazitler) |
| **202.2** | `event_horizon_lens` |

**Boşluklar:** 2. saat (64 → 122 dk) **hiç yeni yüzey yok**; 3. saat (122 → 202 dk) yalnız bir tane.

**Mekanizma denetimi — boşluk neden var?** `event_horizon_lens`, `hawking_resonator`,
`cosmic_filament` **FEATURE_UNLOCKS'te tanımlı ama hiçbir UI'a bağlı değil** (grep: 0 referans) →
içeriksiz merdiven kapıları; "açılış" ölçümü onlar için oyuncuya hiçbir şey vermiyor.
`guilt_slackers` ise gerçek bir mekanik (parazitler) ama bir **yüzey değil** (kilit açan düğme).
Yani 64. dakikadan tekilliğe (268 dk) kadar oyuncunun elinde **tek bir yeni karar** var (çip seviyesi)
ve gerisi sayı büyümesi → plan §1'in "uzun dikey çöl" teşhisi **ölçümle doğrulandı**.

**Karar (kullanıcı, 2026-10-20):** "Şimdilik dokunma." → Faz 5 (içerik) **ertelendi**; bu dal yalnız
ölçüm + kayıt.

**Erteleme notu — ilk iş yapılacak aday.** Çölü doldurmanın iki yolu var, ikisi de **içerik**
gerektirir (kapı kaydırmak tek başına oyuncuya bir şey vermiyor):

1. **Mevcut boş kapıları gerçek sistem yapmak:** `event_horizon_lens` (1e175 bandı, 3. saat),
   `hawking_resonator` (1e215), `cosmic_filament` (1e250) → merdiven zaten bu saatleri ayırmış,
   **içerik** eksik.
2. **Guilt bandını öne almak** (1e160 → ~1e140): gerçek bir mekanik (parazitler) 2. saati doldurur;
   sıfır yeni sistem.

Kapsam dışı bırakılan ilgili plan maddeleri: **M2** (SP ağacında rekabetçi dallar), **O3**
(başarım → SP çarpanı), **O1** (prestij ritüeli), **O4** (haber bandı önsezdirme — kullanıcının
"kilitli şeyler görünmesin" kuralıyla çatışıyor, dikkat gerektirir), **P4** (öğretim anları),
**`harness --dawns N`** modu (SP telemetri altyapısı, P0 §5'te spec'lendi, uygulanmadı).

---
### 11. ÖLÇÜM SONUCU — Şafak serisi (2026-10-20, `--dawns 3`, aktif profil, seed 1, dt 0.5, çip açık)

ADR-0071'in şafak merdiveni (1. şafak 1 SP → 2. şafak 2 → 3. şafak 3) **ilk kez uçtan uca ölçüldü**:

| Şafak | Koşu süresi | Kümülatif | SP kazanç | Banka | Harcanan | Kırılma |
| ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| 1 | 268.1 dk | 268.1 dk | 1 | 1 | 1 (`insomnia_heart`) | — |
| 2 | **49.1 dk** | 317.2 dk | 3 | 3 | 3 | — |
| 3 | **13.1 dk** | 330.3 dk | 4 | 4 | 4 | **✓ `break_singularity` alındı** |

**Türev metrikler (harness `summary`):** toplam 5.51 saat · toplam SP 8 (kazanılan 8 / harcanan 8) ·
`timeToBreak` = 3. şafak @ 5.51 saat · SP/saat **0.22 → 3.67 → 18.29** (şafak başına marjinal) ·
`log10(matter)/SP` = 308.3 → 102.8 → 77.1 (her şafakta kütle/SP derinliği düşüyor = verim artıyor) ·
`fastestSingularity` = 8 dk.

**1. şafakta açılanlar:** 17 özellik + 11 bot + D4–D8 (boyutların tamamı). 2. şafakta yalnız `time_clock`,
3. şafakta hiçbir yeni yüzey yok.

**Okuma:** koşu süresi şafaklar arasında **268 → 49 → 13 dk**'ya çöküyor (6.5×, 3.8×). Yani ADR-0071'in
merdiveni ölçümle doğrulandı: ilk koşu 4s28dk, ikinci 49dk, üçüncü 13dk → **kırılma duvarı 3. şafakta**
(4 SP) düşüyor. SP/saat eğrisi **hiç düz değil, üstel** (0.22 → 3.67 → 18.3) → 5. şafaktan sonra
kırılma zorlaşır (SP darboğazı).

**Çıktı:** `brain/scratchpad/harness/out/dawns-3.json`.
### 9.4 Açık kararlar (P3.3'ün kapısı)

1. **Tempo:** (a) P1'den önce onarım fazı, (b) ADR-0023 bandını güncel ölçüme revize, (c) ~11 saat
   geçici taban kabul (onarım P1+M1'e bağlanır).
2. **Erken merdiven:** A / B / C / C′ / **D**.

