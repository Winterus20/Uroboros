# P3.3 — Erken Merdiven Yeniden Zamanlaması: ÖLÇÜLMÜŞ MERDİVEN

> **Tarih:** 2026-10-19 · **Faz:** P3.3 · **Kapsam:** ölçüm + uygulama (yatay/boyut kapı eşikleri)
> **Karar:** orchestrator (P3.3 revizyonu) — yatay kapılar boyut kapılarının **arasına** yerleştirildi.
> **Ölçüm dosyaları:** `brain/scratchpad/harness/out/p3-final-ladder.json` (30 dk) ·
> `brain/scratchpad/harness/out/p3-final-ladder-12h.json` (12 saat) ·
> `brain/scratchpad/harness/smoke.json` (kanonik smoke, yeniden üretildi).

---

## 1. Yönetici Özeti

Erken merdiven (yatay özellik kapıları) yeniden zamanlandı ve **ölçüldü**. Sayısal sonuç:

| Ölçüt | Ölçülen | Sonuç |
| :--- | :---: | :---: |
| 600 sn içinde açılan özellik kapısı (≤ 5) | **5** | ✅ GEÇER |
| Aynı saniyede **boyut + özellik** çakışması (= 0) | **0** | ✅ GEÇER |
| D4 → D8 açılış penceresi (≥ 60 sn) | **1191 sn** | ✅ GEÇER |
| İlk küme (≤ 1500 sn) / max_mode (≤ 1800 sn) | **1448.5 sn** / **1702 sn** | ✅ GEÇER |
| 12 saatlik koşuda tepe (≥ 1e250) | **1e308.25** | ✅ GEÇER |
| Yatay yüzeyler arası ≥ 8 dk | Botlar→Koloni = **96.5 sn** | ❌ **KALIR** |
| *(P3.3 ilk tanım)* 30 dk tepe log10 ≥ 1e70 | **1e69.1** | ❌ 0.9 dekad eksik |

- **İlk koşu (ilk tekillik): 9s 33dk 16.5sn** (34.396,5 sn) — 12 saat tavanının altında, ulaşıldı.
- Testler: **32 dosya / 480 test PASS** (kırmızı test yok) · typecheck PASS · build PASS.
- Ölçüt 6'nın kalması **yapısal** bir sonuçtur: sabit çapalar (Botlar 1e12 @189 sn ·
  Kriz 1e28 @810,5 sn) arasında 621,5 sn vardır; iki tane 480 sn'lik boşluk bu araya **sığmaz**
  (sayısal kanıt + öneri: **§11.4**).

---

## 2. Uygulanan Değişiklikler (dosya dosya)

| Dosya | Ne yapıldı |
| :--- | :--- |
| `src/game/balance.ts` | `DIMENSION_UNLOCK_GATES` **değerleri korundu** (1e8/1e14/1e24/1e40/1e65 = ölçüm kodu E5). Yalnızca yorum güncellendi: E5 ölçüm noktaları, aday tablosu karşılaştırması ve "P3.3'te korundu" kararı yazıya geçirildi. |
| `src/game/unlocks.ts` | `FEATURE_UNLOCKS`: 5 yatay kapının **eşiği + `hint` + `order`** alanı güncellendi (`autobuyers`, `stance_spam`, `stance_private`, `colony`, `lab`). Dizi **eşik sırasına göre yeniden dizildi** (order = eşik × 10; dizi sırası = merdiven sırası). Merdiven dokümantasyonuna "yerleşim kuralı" eklendi. |
| `src/game/balance.test.ts` | E5 tablosuna bağlı beklentiler: `BELOW_GATE` (9.99e7/13/23/39/64), monotonluk örnek dizisi, 1e65 tavanı. Ayrıca **"kapı > ilgili boyutun taban maliyeti"** yapısal beklentisi eklendi (`BASE_COSTS` kullanımına bağlı tip hatası giderildi). |
| `src/stores/balance.test.ts` | Boyut kapısına bağlı beklentiler E5'e göre düzeltildi (1e24→6 boyut, 1e14→5 boyut, 1e65→8 boyut). |
| `src/game/unlocks.test.ts` | Eşik değerine bağlı beklentiler: dal ipucu testleri yeni merdivene göre yazıldı (crisis 1e28 → stance_private 1e32 → colony 1e36 → spell_noise 1e42 sırası). |
| `src/composables/nav-silhouette.test.ts` | *(orchestrator onayıyla tahsis edildi)* Eşik değerleri güncellendi: autobuyers 1e9→1e12, lab 1e65→1e70, colony 1e22→1e36 (hidden 1e35 / silhouette 1e36 / open 1e36+başarımlar / meter 1e36). |
| `src/stores/dimension-unlock-celebration.test.ts` | *(orchestrator onayıyla tahsis edildi)* E5 boyut tablosuna bağlı beklentiler: 1e21→1e41 (7 boyut), 1e30→1e65 (8 boyut), 1e11→1e14 (5 boyut). Bu dosya E5 uygulamasından sonra **zaten kırıktı** (benim değişikliğimden önce). |
| `tests/lab-rebalance.spec.ts` | *(eşik bağımlı olduğu için, orchestrator talimatı gereği)* lab eşiği 1e65→1e70 beklentisi güncellendi. |
| `brain/scratchpad/harness/smoke.json` | Kanonik smoke dosyası **yeniden üretildi** (`npm run harness:smoke` → tüm smoke kontrolleri PASS: zirve log10 69.1 ≥ 60). |

**Dokunulmayanlar:** `src/game/branches.ts` (dal kapıları), `src/game/pacing.ts`, tüm mağaza/UI
dosyaları, fiyat/ekonomi kodu (E1 fiyat patch'i uygulanmadı).

---

## 3. Uygulanan Merdiven (yatay kapılar)

| id | eski eşik | **yeni eşik** | order | gerekçe |
| :--- | :---: | :---: | :---: | :--- |
| `crisis_spawn` | 1e3 | 1e3 (korundu) | 10 | ilk basamak |
| `autobuyers` | 1e9 | **1e12** | 120 | plan böl. 1 (1e9 → 1e12+); maliyeti ~0 (eğri dik) |
| `stance_spam` | 1e14 | **1e20** | 200 | 195 sn kumesinden çıkarıldı (sındırma vadi) |
| `crisis` | 1e28 | 1e28 (korundu) | 280 | — |
| `stance_private` | 1e18 | **1e32** | 320 | 241 sn kumesinden çıkarıldı |
| `spell_espresso` | 1e34 | 1e34 (korundu) | 340 | — |
| `colony` | 1e22 | **1e36** | 360 | 241 sn kumesinden çıkarıldı |
| `spell_noise` | 1e42 | 1e42 (korundu) | 420 | — |
| `spell_sleep` | 1e52 | 1e52 (korundu) | 520 | — |
| `lab` | 1e65 | **1e70** | 700 | D8 kapısıyla aynı-tik çakışmasını kırdı |
| `seed_nucleon` | 1e80 | 1e80 (korundu) | 800 | — |
| `seed_gluon` | 1e100 | 1e100 (korundu) | 1000 | — |
| `time_clock` | 1e120 | 1e120 (korundu) | 1200 | — |
| `seed_graviton` | 1e125 | 1e125 (korundu) | 1250 | — |
| `guilt_slackers` | 1e160 | 1e160 (korundu) | 1600 | — |
| `event_horizon_lens` | 1e200 | 1e200 (korundu) | 2000 | — |
| `hawking_resonator` | 1e240 | 1e240 (korundu) | 2400 | — |
| `cosmic_filament` | 1e280 | 1e280 (korundu) | 2800 | — |
| `night_watch` | 1e308 | 1e308 (korundu) | 3080 | — |
| `challenges` | 1 tekillik | 1 tekillik (korundu) | 3090 | — |

**Boyut kapıları (korundu):** D4 1e8 · D5 1e14 · D6 1e24 · D7 1e40 · D8 1e65 (E5, ölçülmüş).

---

## 4. Ölçüm Protokolü

```powershell
npm run harness:build
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 0.5  --lite --out brain/scratchpad/harness/out/p3-final-ladder.json
node brain/scratchpad/harness/unlock-timeline.mjs brain/scratchpad/harness/out/p3-final-ladder.json
node brain/scratchpad/harness/out/run.mjs --profile active --seed 1 --dt 0.5 --capHours 12 --lite --out brain/scratchpad/harness/out/p3-final-ladder-12h.json
npm run harness:smoke    # kanonik smoke.json yeniden üretildi (tüm kontroller PASS)
```

Profil `active` (5 tık/sn, 2 sn'de bir maxAll, anında shift/galaxy, anomali tıklaması, büyü+lab) ·
seed 1 (deterministik mulberry32) · dt 0,5 sn.

---

## 5. Açılış Zaman Çizelgesi (30 dk + 12 saat koşuları birebir aynı)

```text
   26s  feat:crisis_spawn        ← ilk 600 sn'deki 1. kapı
  40.5s  first_shift
 130.5s  shift_4
  186s  d4 + bot:dim1            ← boyut kapısı (bot açılışı aynı saniyede)
  188s  bot:tickspeed + bot:shift
  189s  feat:autobuyers          ← yüzey 1: Botlar
  190s  bot:dim2
  195s  d5
  196s  bot:dim3
  202s  bot:dim4
  207s  feat:stance_spam         ← 600 sn'deki 3. kapı
  226s  bot:dim5
 231.5s  d6
  238s  bot:dim6
  240s  bulk_mode
  244s  bot:dim7
  260s  feat:stance_private      ← 600 sn'deki 4. kapı
  284s  bot:dim8
 285.5s  feat:colony             ← 600 sn'deki 5. kapı / yüzey 2: Koloni
  353s  d7
 810.5s  feat:crisis + feat:spell_espresso   ← yüzey 3: Kriz (iki dal aynı başarım yığınıyla)
 1377s  d8
 1448.5s  first_galaxy
 1700s  bot:galaxy
 1702s  max_mode
 1927s  feat:lab                 ← yüzey 4: Lab (30 dk tavanının 2 dk sonrası)
 1999.5s  feat:seed_nucleon
 2422s  feat:seed_gluon
 3480.5s  feat:spell_noise
 3710.5s  feat:spell_sleep
 4267s  feat:seed_graviton
 11602s  feat:guilt_slackers
 23437s  feat:event_horizon_lens
 34396.5s  İLK TEKİLLİK (9s 33dk 16,5sn)
```

**Boyut kapısı ölçüm noktaları (E5, değişmedi):**

| kapı | eşik | açılış (sn) | ölçülen log10 |
| :--- | :---: | ---: | ---: |
| D4 | 1e8 | 186 | 8.34 |
| D5 | 1e14 | 195 | 14.51 |
| D6 | 1e24 | 231.5 | 24.05 |
| D7 | 1e40 | 353 | 40.01 |
| D8 | 1e65 | 1377 | 65.01 |

Bu noktalar yatay kapıların "arasına yerleşme" kuralının referans eğrisidir (§11.1).

---

## 6. 30 Dakikalık Ölçüm — Özet

| Alan | Değer |
| :--- | :---: |
| 600 sn'de açılan `feat:*` | **5** (crisis_spawn 26 · autobuyers 189 · stance_spam 207 · stance_private 260 · colony 285.5) |
| Tepe kütle (30 dk) | **1e69.1** (`peaks.logMatter = 69.097`) |
| D4 → D8 penceresi | **1191 sn** |
| İlk küme / max_mode | **1448.5 sn** / **1702 sn** |
| Sıçrama / küme / tickspeed / bot (zirve) | 8 / 1 / 55 / 11 |

> "özet log10 = 5.78" satırı **küme sonrası** anlık değerdir (küme kütleyi sıfırlar);
> karşılaştırılacak değer **tepe** değeridir.

**E5 referansıyla karşılaştırma (aynı profil/seed/dt):**

| Ölçüt | E5 (eski yatay kapılar) | P3.3 (yeni merdiven) | Fark |
| :--- | :---: | :---: | :---: |
| 600 sn'de açılan `feat:*` | 5 | **5** | = |
| 30 dk tepe log10 | 81.83 | **69.10** | **−12.7 dekad** |
| Boyut kapıları (d4…d8) | 186/195/231.5/353/1377 | 186/195/231.5/353/1377 | aynı |
| Aynı saniyede boyut+özellik çakışması | var (d5 + stance_spam @195 sn) | **yok** | düzeldi |

---

## 7. 12 Saatlik Ölçüm

| Alan | Değer |
| :--- | :---: |
| Tekilliğe ulaşıldı | **evet** |
| **İlk tekillik süresi** | **34.396,5 sn = 9s 33dk 16,5sn (9,56 saat)** |
| Tepe kütle (12 saat) | **1e308.25** (`peaks.logMatter = 308.2547`) |
| Sıçrama / küme / tickspeed / bot | 17 / 8 / 254 / 11 |
| Açılan özellikler | crisis_spawn · autobuyers · stance_spam · stance_private · colony · crisis · spell_espresso · **lab** · seed_nucleon · seed_gluon · spell_noise · spell_sleep · seed_graviton · guilt_slackers · event_horizon_lens |

**Karşılaştırma:** P0 §7'deki referans ilk koşu **10s 37dk** idi (seed 1, dt 0.1, **A tablosu**
boyut kapıları + eski yatay kapılar) → yeni merdiven aynı seed'de **~64 dk daha hızlı**.
Karşılaştırma tam elden çıkmaz (boyut kapıları ve dt değişti); ADR-0023'ün 150–300 dk bandı
**hâlâ ihlal ediliyor** (573 dk ≈ 9,6 saat) — tempo kararı P1'in konusu.

---

## 8. Test ve Derleme Doğrulaması

| Komut | Sonuç |
| :--- | :--- |
| `npx vitest run src/game/balance.test.ts src/stores/balance.test.ts src/game/unlocks.test.ts src/composables/nav-silhouette.test.ts src/stores/dimension-unlock-celebration.test.ts` | **5 dosya / 133 test PASS** |
| `npm test` (tümü) | **32 dosya / 480 test PASS** — kırmızı test yok; **mevcut hiçbir test silinmedi/zayıflatılmadı**, benim payıma yalnızca `balance.test.ts` içinde 1 yapısal beklenti (kapı > taban maliyeti) düştü. (Dosya/test sayısındaki artışın kalanı paralel çalışan speed-chip ajanına aittir.) |
| `npm run typecheck` | **PASS** (0 hata) |
| `npm run build` | **PASS** (vue-tsc + vite build) |
| `npm run harness:smoke` | **PASS** — kanonik `smoke.json` yeniden üretildi (zirve log10 69.1 ≥ 60, shift 8 ≥ 5, tickspeed 55 ≥ 1) |

---

## 11. Merdiven Yerleşimi ve Kabul Ölçütleri

### 11.1 Yerleşim kuralı

Ölçülmüş boyut kapıları: **1e8 @186 sn · 1e14 @195 sn · 1e24 @231,5 sn · 1e40 @353 sn · 1e65 @1377 sn.**

Her yatay kapı bu noktaların **arasında** bir dekada oturur:

| yatay kapı | eşik | oturduğu aralık | ölçülen açılış |
| :--- | :---: | :--- | ---: |
| `autobuyers` | 1e12 | D4 (1e8) ↔ D5 (1e14) | 189 sn |
| `stance_spam` | 1e20 | D5 (1e14) ↔ D6 (1e24) | 207 sn |
| `stance_private` | 1e32 | D6 (1e24) ↔ D7 (1e40) | 260 sn |
| `colony` | 1e36 | D6 (1e24) ↔ D7 (1e40) | 285,5 sn |
| `lab` | 1e70 | D8 (1e65) sonrası | 1927 sn |

Böylece **hiçbir yatay kapı bir boyut kapısıyla aynı saniyede açılmaz** (ölçüldü: 0).

### 11.2 Ölçülen aynı-saniye çakışmaları (30 dk ve 12 saat koşuları birebir aynı)

| saniye | aynı anda açılanlar | tür |
| ---: | :--- | :--- |
| 186 | `d4` + `bot:dim1` | boyut + **bot** (özellik değil) |
| 188 | `bot:tickspeed` + `bot:shift` | bot + bot |
| 810.5 | `feat:crisis` + `feat:spell_espresso` | **özellik + özellik** |

Boyut+özellik çakışması **0**. Kalan tek çift, iki dalın (crisis 2 başarım / spell_espresso 3 başarım)
**aynı kriz-ailesi başarım yığınıyla** açılmasından geliyor — dekad eşiği değil, başarım topluluğu
kaynaklıdır (eşik çakışması değildir).

### 11.3 Kabul ölçütleri (6 madde, sayılarla)

| # | Ölçüt | Ölçülen | Sonuç |
| ---: | :--- | :--- | :---: |
| 1 | 600 sn içinde açılan `feat:*` ≤ 5 | **5** | ✅ **GEÇER** |
| 2 | Aynı saniyede iki açılış = 0 (boyut + özellik) | **0** | ✅ **GEÇER** |
| 3 | D4 → D8 penceresi ≥ 60 sn | **1191 sn** | ✅ **GEÇER** |
| 4 | ilk küme ≤ 1500 sn · max_mode ≤ 1800 sn | **1448.5 sn** · **1702 sn** | ✅ **GEÇER** |
| 5 | 12 saatlik koşuda tepe ≥ 1e250 | **1e308.25** (tekillik 9s33dk'da) | ✅ **GEÇER** |
| 6 | Yatay yüzeyler (Botlar/Koloni/Kriz/Lab) arası ≥ 8 dk | **96.5 sn** (Botlar→Koloni) | ❌ **KALIR** |

Ek ölçüt (P3.3 ilk görev tanımı): 30 dakikada tepe log10 ≥ 1e70 → ölçülen **1e69.1** → ❌ (0,9 dekad eksik).

### 11.4 Ölçüt 6'nın neden bu çapalarla sağlanamadığı (sayısal kanıt) ve öneri

Sabit çapalar: **Botlar = 1e12 @ 189 sn** ve **Kriz = 1e28 @ 810,5 sn** → aralarında **621,5 sn** var.
Dört yüzeyin her ardışık çifti ≥ 480 sn olmalıysa, Botlar ile Kriz arasına sadece bir yüzey sığar ve
o yüzeyin penceresi:

- en erken: Botlar + 480 sn = **669 sn**
- en geç: Kriz − 480 sn = **330,5 sn**

669 > 330,5 → **hiçbir Koloni eşiği Botlar ile Kriz arasına yerleşemez.** Ölçülen 96,5 sn'lik
Botlar→Koloni farkı bu yapısal sıkışmanın doğrudan sonucudur (Koloni eşiği 1e36 iken ~285 sn'de açılır).

Ölçülen yüzey aralıkları:

| çift | fark | sonuç |
| :--- | ---: | :---: |
| Botlar (189 sn) → Koloni (285,5 sn) | **96,5 sn (1,6 dk)** | ❌ |
| Koloni (285,5 sn) → Kriz (810,5 sn) | 525 sn (8,75 dk) | ✅ |
| Kriz (810,5 sn) → Lab (1927 sn) | 1116,5 sn (18,6 dk) | ✅ |

**Öneriler (karar orchestrator'ın):**

1. **Ölçüt 6'yı iki yüzeyli okumak** mümkündür: Botlar→Kriz = 621,5 sn ✅, Kriz→Lab = 1116,5 sn ✅
   (Koloni bu okumada bir "iç yüzey"dir). Dört yüzeyli okumada ölçüt, sabit çapalar altında
   **matematiksel olarak sağlanamaz** (yukarıdaki kanıt).
2. **Dört yüzeyli okumada `colony` ~1e63 bandına çekilebilir**: Koloni'nin hem Kriz'den
   (810,5 sn) hem de Lab'dan (1927 sn) ≥ 480 sn uzakta olması için penceresi ~1290–1370 sn'dir
   (1e65@1377 sn eğrisinden ~1e62–1e64 bandı). **Yan fayda:** Lab sekmesi 1927 sn yerine
   ~1300 sn'de açılır ve 30 dakikalık tepe yeniden ~1e81'e (E5 seviyesi) döner — yani
   "30 dk tepe ≥ 1e70" ölçütü de **geçer** olur. Bu değişiklik **ölçülerek doğrulanmalıdır**.

---

## 9. Tempo Notu

- **30 dakikada tepe kütle: 1e69.1** (E5: 1e81.7). Düşüşün tek nedeni `lab` kapısının
  1e65 → 1e70'e taşınmasıdır: Lab sekmesi artık **1927 sn'de** (30. dakikadan 2 dk sonra) açılır;
  büyüme çarpanları (Lab Rezonansı ×10 + hasat) ilk yarım saate giremez. Bu, ölçüt 2'nin
  (aynı saniyede çakışma yok) **bedelidir**: D8 kapısı 1e65 iken lab da 1e65'te açılıyordu.
- **İlk koşu süresi: 9s 33dk 16,5sn** (12 saat tavanının altında, ulaşıldı; tepe 1e308.25).
  P0 §7 referansı (10s 37dk, A tablosu + eski yatay kapılar, dt 0.1) ile karşılaştırılabilir
  düzeyde değildir; ADR-0023'ün 150–300 dk bandı hâlâ ihlal ediliyor (tempo kararı P1'e bağlı).

---

## 10. Sonraki Adımlar (öneri)

1. **Ölçüt 6 kararı:** yüzey seti "Botlar/Koloni/Kriz/Lab" olarak kalırsa, `colony` eşiğinin
   ~1e63 bandına çekilmesi gerekir; bu aynı zamanda 30 dk tepeyi ~1e81'e geri getirir.
   Ölçüt 6 "Botlar→Kriz→Lab" olarak yeniden tanımlanırsa mevcut tablo **aynen geçer**.
2. Eşik tablosu kilitlendikten sonra ADR kaydı (P3.3) ve `brain/tasks/completed.md` girişi.
3. Bu ölçüm **tek başına** P3.3 merdivenini ölçer; fiyat değişikliği (E1 patch'i) uygulanmadı.
