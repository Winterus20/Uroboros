# Tamamlanan Görevler ve Değişiklik Günlüğü (Changelog)

## [2026-10-27] 🔬 — Zincir büyüme katmanı ölçümü + belge kayması düzeltmesi

### Ne yapıldı

Sıradaki iş "boost + güçlendirme döngüsünün yeniden tasarımı" idi. O turu tahminle değil
**ölçümle** açmak için yedi aday mekanik gerçek zincir matematiği üzerinde koşturuldu.
Rapor: [`chain-growth-layer-2026-10-27.md`](../research/chain-growth-layer-2026-10-27.md).
**Oyun kodu değişmedi** (`src/` dokunulmadı); bu bir ölçüm + belge turudur.

- **Ana bulgu:** zincir-only oyun kapı `1,79e308`"e ulaşamıyor. Gerçek motorla 96 saatte
  **2,76e34**; büyüme hızı 1→2. saat +3,77 basamak/sa iken 48→96. saat **+0,057 basamak/sa** ye
  düşüyor. Sebep yapısal: `N(t) ∝ t⁸/8!` — polinom büyüme üstel hedefe yetişmez.
- **Kaldırılan boost un gerçek kusuru bulundu:** ödül zirveye bağlıydı (`(zirve/10)^0,2`),
  zirve de çarpana bağlı → log uzayında **çift üstel**. Üs 0,12 ile 43 boost un **28 i son 5
  dakikada** alınıyor; tur süresi 12 saniyeye çöküyor. ADR-0082 nin gösterdiği sebep ("halkalar 1 e
  iniyor, oyuncu sıfırlanmadı sanıyor") bir sempTomdu; **kök neden ıraksak geri besleme**.
- **Aritmetik kısıt belgelendi:** 308 basamak = (tur sayısı) × (tur başına ödül). 12 tur → ×1e24
  (okunmaz), 144 tur → ×100, ~300-1 000 tur → ×2…×5. "2 saat + 8 halka + 1,79e308" üçü aynı
  anda tutarlı değil.
- **Ölçülen adaylar:** sabit ödüllü boost (×2 → 1 019 boost / 299 dk), gereksinim merdiveni
  (19 boost ama 120 dk hedefi tutmuyor), yerel bileşik (`r = 1,20` → 35,7 dk; bıçak sırtı),
  milestone çarpanı (k=4 → 1,8e99 @8sa; sıfırlamasız).
- **Belge kayması düzeltildi:** kod v22 ye geçmişti ama belgeler v21 diyordu; silinen
  `upgrades.ts` üç yerde hâlâ referanslıydı.

### Dosyalar

Yeni: `brain/research/chain-growth-layer-2026-10-27.md` ·
`brain/scratchpad/chain-only-probe/` (9 ölçüm aracı: `probe` · `boost-loop` · `boost-sweep` ·
`ladder` · `ad-boost` · `milestone` · `candidates` · `levels` · `compounding`).
Düzeltme: `AGENTS.md` §2 + §4 · `README.md` (yığın · kayıt · repo yapısı) ·
`GAME_DESIGN.md` §9 · `brain/tasks/todo.md` · `brain/tasks/in-progress.md` · bu kayıt.

### Doğrulama

`npx vue-tsc --noEmit` → 0 hata · `npx vitest run` → **95 test / 6 dosya geçti** ·
`npx vite build` → başarılı (23,6 sn).

---

## [2026-10-25] ✔ — Zincir-only dilim: boost, prestij ve Tanım yükseltmeleri kaldırıldı

### Ne yapıldı
Proje sahibinin talebi (*"boosta bastığımda hepsi bir kalıyor, aldıklarım tamamen sıfırlanmıyor"* →
*"kaldır sadece bu zincir kalsın; boost ve diğer güçlendirmeleri daha sonra planlayacağız"*)
[ADR-0082](../decisions/0082-chain-only-slice.md) olarak kayda geçti ve uygulandı.

- **Kaldırılanlar:** mini boost (breathe düğmesi + `B`), kapı/prestij (`gate` düğmesi + `P`),
  `Tanım` yükseltmeleri (`start` · `chain` · `boost` · `autobuy`), otomasyon ve bunların ses/UI/kayıt izleri.
- **Kalan tek katman zincir:** 8 halka, tek havuz, `+1`, mandallı kilitler (10 birim), halka → sayı
  doğrudan katkısı (`RING_DIRECT_SHARE = 1`). Sıfırlama yok.
- **Kayıt v22:** `boostMult`, `boosts`, `tanim`, `tanimTotal`, `prestiges`, `totalBoosts`,
  `gateReached`, `upgrades` şemadan düştü. `MIN_SUPPORTED_SAVE_VERSION = 20` kaldı → v20/v21
  kayıtları açılır, sayı + zincir korunur.
- **Ses havuzu:** 100 satır (92 ticker + 8 sahne, 14 nadir); boost/prestij/kapı replikleri silindi.
- **Ölçüm (zincir-only, 2 tık/sn):** halka açılışları 0 · 1,6 · 4,2 · 6,8 · 9,3 · 11,9 · 14,5 ·
  **17,0 dk** · 60. dk **7,9e15** · 120. dk **4,3e19** · 120. dk **1 440 alım**.

### Dosyalar
`src/game/number/economy.ts` · `src/game/number/tuning.ts` · `src/game/number/upgrades.ts` (silindi) ·
`src/game/number/economy.test.ts` · `src/game/number/balance.test.ts` · `src/stores/game.ts` ·
`src/models/number.ts` · `src/models/save.ts` · `src/core/save-version.ts` · `src/core/save.ts` ·
`src/core/auth/cloud-save-service.ts` · `src/App.vue` · `src/components/UpgradeList.vue` (silindi) ·
`HeroNumber.vue` · `TelemetryLine.vue` · `StatsPanel.vue` · `TickerBar.vue` · `AlgorithmicSwirl.vue` ·
`AuthModal.vue` · `CloudConflictModal.vue` · `src/game/voice/*` · `GAME_DESIGN.md` ·
[ADR-0082](../decisions/0082-chain-only-slice.md) · `brain/decisions/README.md` · bu kayıt.

### Doğrulama
`npx vue-tsc --noEmit` → **0 hata** · `npx vitest run` → **95 test / 6 dosya geçti** ·
`npx vite build` → başarılı. Tarayıcı (Playwright, gerçek dev build): store'da boost/prestij/upgrade
alanı yok; sekmeler `number · stats · settings`; `breathe`/`gate` düğmesi yok; 10 Fingers alımı
sonrası `/s = 10`; kayıt anahtarları yalnız zincir + meta.

---

## [2026-10-23] ✔ — Halkalar sayıya doğrudan katkı veriyor (`RING_DIRECT_SHARE`)

### Ne yapıldı
Proje sahibinin geri bildirimi (*"halkalar sadece kendinden bir öncekini üretiyor; satın alınan her
halka belli bir miktar K/s'ye de eklese"*) [ADR-0081](../decisions/0081-ring-direct-number-contribution.md)
olarak kayda geçti ve uygulandı.

- **Kural:** halka 2–8, bir altındakine verdiği miktarı (`CHAIN_RATE = 0,11/sn`) sayının kendisine
  de yazar: `d_i = p_i · RING_DIRECT_SHARE`, `RING_DIRECT_SHARE = 1`. Halka 1 katkı almaz (o zaten
  sayının kendisi; "1 parmak = 1 sayı/sn" korunur).
- **`D1` korunur:** katkı sayı üretimidir, `boostMult × chainMult × verim` alır; zincir beslemesi
  almaz.
- **Arayüz:** zincir satırı `miktar · x/s` + `+x/s` (faint) okur; `/s` telemetrisi toplamı gösterir.
  Fingers satırı artık toplam `/s`yi değil kendi payını gösterir.
- **Ölçüm (gerçek motor, 20 TPS, K5 politikası):** kapı **118,85 dk** (taban 119,0) · 21 boost ·
  371 alım · halka açılışları 0 · 1,6 · 4,1 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk. Katkının `/s`
  payı tırmanışta %1,4–3,6, boost sonrası ilk saniyede %52. Şerh: `= 2` → 117,9 dk, `= 4` → 116,7 dk.
- **Test:** `economy.test.ts` — iki yeni test (halka 1 katkısız; alım `/s`yi anında büyütür) ve
  `D1` testi yeniden yazıldı (besleme boost almaz, katkı alır). Toplam **104 test**.

### Dosyalar
`src/game/number/tuning.ts` (`RING_DIRECT_SHARE`) · `src/game/number/economy.ts` (`ringDirectRate`,
`directNumberPerSecond`, `ringNumberRate`, `numberPerSecond`, `advance`) · `src/game/number/economy.test.ts` ·
`src/stores/game.ts` (`ringRows.addsPerSecond`) · `src/models/number.ts` (`RingRow.addsPerSecond`) ·
`src/components/ChainList.vue` (`+x/s` okuması) · `GAME_DESIGN.md` §4 + §5.2 + §7 ·
[ADR-0081](../decisions/0081-ring-direct-number-contribution.md) · `brain/decisions/README.md` ·
`brain/tasks/in-progress.md` · bu kayıt.

### Doğrulama
`npm run typecheck` temiz · `npm run test` → **104 test / 6 dosya geçti** · `npm run build` başarılı.
Tarayıcı (Playwright, gerçek dev build, kayıt içe aktarılarak): satırlar `52 · 6/s · +6/s` okudu;
telemetri `1.17 K/s` = Fingers `1.14 K/s` + satır katkıları (`23 + 3 + 0,22`). Ekran görüntüleri:
`brain/scratchpad/direct-rate-probe/chain-rows.png`.


## [2026-10-23] ✔ — Sayı gösterimi: K/M/B/T kısaltmaları, 1000 altında tam sayı, sonra e

### Ne yapıldı
Proje sahibinin oyun içi geri bildirimi (*"1000'de `1e3` yazıyor, çoğu insanın anladığı şekilde
yazsın; bir yere kadar kısaltmalar, sonra e'li sayılar"*) [ADR-0080](../decisions/0080-number-notation-ladder.md)
olarak kayda geçti ve uygulandı.

- **Varsayılan notasyon `standard`:** 1000 artık `1e3` değil `1 K`. Ayarlar'daki dört seçenek
  (`standard` · `scientific` · `engineering` · `logarithm`) duruyor, `standard` ilk sırada.
- **Kısaltma merdiveni 41 → 4 basamak:** `K · M · B · T` (1e3–1e12). 1e15 ve üstü e-notasyonuna
  düşer (`1.23e15`); `layer >= 2` kule yazımı aynı. `Qa`, `NoTg`, `UTg` gibi bileşik kısaltmalar
  kalktı — "çoğu insanın anladığı" ölçü bin/milyon/milyar/trilyon.
- **Yuvarlama taşması:** 999 999 → `1 M`; ekranda `1000 K` görünmez. Aynı kural hero'da da geçerli.
- **1000 altı TAM sayı (`plainSmall`) — aynı gün ikinci geri bildirim:** *"12.35 yerine direkt 12
  yazsın."* 1 ve üstü tam sayıya yuvarlanır (12.345 → `12`, 648.97 → `649`); 1'in altındaki
  oranlar ondalık kalır (0.11 → `0.11`), yoksa "0/sn" yalanı doğardı. 999.6 sınırı `1 K`ya devreder.
- **Hero dizgisi (`G9`) korunur:** `heroParts(value, notation)` kısaltmayı kuyruk parçasına koyar
  (`4.57` + küçük `M`). Negatif sayıda işaret tabana eklenir (eskiden üs dalına düşüyordu).
- **Kayıt v20 → v21 (şema aynı):** v20 kayıtlarındaki `scientific` *eski varsayılan* olduğu için
  `deserialize()` içinde bir kez `standard`'a taşınır; `MIN_SUPPORTED_SAVE_VERSION = 20` kaldı →
  kayıt açılır, sıfırlanmaz.
- **Test:** yeni [`src/core/format.test.ts`](../../src/core/format.test.ts) — dokuz test üç eşiği de
  (düz sayı · kısaltma · e) ve hero/formatParts ayrımını pinler.

### Dosyalar
`src/core/format.ts` (suffix tablosu, `plainSmall`, `formatStandard`, `formatParts`, `heroParts`) ·
`src/core/format.test.ts` (yeni) · `src/stores/game.ts` (varsayılan notasyon, hero getter, v21 göçü) ·
`src/core/save-version.ts` (`SAVE_VERSION = 21`) · `src/components/SettingsModal.vue` (sıra) ·
`src/models/save.ts` (yorum) · `GAME_DESIGN.md` §9 + §12 · `brain/context/visual-language.md` §4 ·
`AGENTS.md` · `README.md` · `brain/context/project-brief.md` · `tech-context.md` ·
[ADR-0080](../decisions/0080-number-notation-ladder.md) · `brain/decisions/README.md` · bu kayıt.

### Doğrulama
`npm run typecheck` temiz · `npm run test` → **102 test / 6 dosya geçti** · `npm run build` başarılı.
Tarayıcı (Playwright, gerçek dev build, kayıt enjekte edilerek): `1.5 → 1.5` · `100 → 100` ·
`12.345 → 12` · `0.11 → 0.11` · `999.6 → 1K` · `1234.5 → 1.23K` · `4567000 → 4.57M` ·
`999999 → 1M` · `1e16 → 1e16` · notasyon `scientific` iken `1234.5 → 1.23e3`.

---

## [2026-10-23] ✔ — A+ ekonomi revizyonu: parmak 1/sn, 10'lu blok, ×8 merdiven

### Ne yapıldı
Ekonomi **A+** turunda yeniden ölçüldü; sabitler değişti ve belgeler yeni sayılara çekildi.
Bu kayıt **belge dalgasıdır** — kod sabitleri aynı gün ayrı dalgada `tuning.ts` · `economy.ts` ·
`upgrades.ts` · `balance.test.ts` içine işlendi (henüz commit edilmedi).

- **Üretim:** halka 1 `NUMBER_RATE = 1` sayı/sn; halka 2–8 `CHAIN_RATE = 0,11` birim/sn
  (alttaki halkadan).
- **Fiyat:** `c_i = 25 · 8^i` → **25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 ·
  52 428 800** (`ladderRatio = 8`).
- **Büyüme:** `g = 1,20` → halka başına `log(8)/log(1,20) = 11,4` birim; tek 10'lu blok bir halka.
- **Blok:** `BLOCK_SIZE = 10`, blok fiyatı `c · g^bought · (g^10 − 1)/(g − 1)` (AD'nin "Buy 10"ı);
  kilit eşiği = tek blok (`D6` mandalı korunur).
- **Geri ödeme:** `c_i/(p_i·c_{i-1}) = 8/0,11 ≈ 73 sn` (halka 1: **25 sn**) — eski "40 sn" kuralı
  ve "tüm halkalar 0,08/sn" varsayımı geçersiz.
- **Ölçüm (gerçek motor, 20 TPS, 2 tık/sn, K5 politikası):** kapı **119,0 dk** · **21** boost ·
  **371** birim alımı · ilk 10 dk **42** alım kararı · halka açılışları
  0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · **17,1** dk.
- **Gerekçe:** zincir 7 katlı bir integraldir, `N(t) ≈ M·(∏p)·t⁸/8!`. Sekiz halka da 1/sn olsaydı
  `∏p = 1` olur ve zincir `(1/0,11)⁷ ≈ 5,1e6` kat güçlenirdi; ölçümde kapı 43 dakikaya iniyor,
  10. dakikada 1,3e10 parmak oluyor. `0,11` iki saatlik koşuyu korur. "10'lu blok" bir fiyat
  sistemi değil ritimdir: merdiven ×8 sabitken büyümeyi 1,4 → 1,20 yapmak halka başına birimi
  6,2 → 11,4 yapar; kapı süresi değişmez (ölçüldü).
- **AD:** orada üretim 1/sn'dir ve fiyat "10 alımda kaç kat" diye yazılır (1. boyut `1e3` …
  8. boyut `1e15`). AD bu dikliği *Dimension Boost* (boyut sayıları sıfırlanmaz) ile dengeler;
  bizim boost'umuz halka sayılarını sıfırlar (`D3`) — bu yüzden AD tablosu birebir alınamaz.

### Dosyalar
`GAME_DESIGN.md` §4 (tablo + fiyat kuralı + blok) · §5.1 (blok formülü, `g = 1,20`) · §5.2
(`p` değerleri) · §7 (A+ ölçümü; Set A tarihsel) · §8 (alım ritmi) ·
[ADR-0079](../decisions/0079-number-economy-vertical-slice.md) "A+ revizyonu" eki ·
[`todo.md`](todo.md) (`K1`/`K5` sayıları, A+ maddesi `[x]`, `P1` notu) · bu kayıt.
Kod (ayrı dalga, commit edilmedi): `src/game/number/tuning.ts` · `economy.ts` ·
`balance.test.ts` · `upgrades.ts` · `src/models/number.ts` · `src/stores/game.ts`.

### Doğrulama
`npx vitest run` → **86 test / 5 dosya geçti** (denge kilidi 6 test dahil) ·
`npx vue-tsc --noEmit` → 0 hata. Eşzamanlı kod dalgası aynı gün 6 test daha ekledi; belge
dalgasının son koşusu **92 test / 5 dosya** ile de yeşil.

---

## [2026-10-23] ✔ — Halka fiyatlandırması: 8 halkanın tam fiyat çalışması

### Ne yapıldı
Fiyatlar ızgara aramasından (`25·10^{0,5(i-1)}` → `79,06 / 790,57 / 7 905,69 / 79 056,94`) çıktı;
okunmuyordu ve geri ödeme süresi halkalar arasında 43 → 32 sn kayıyordu. Fiyat tek değişmezden
yeniden türetildi:

```
T_i = c_i / (p_i · c_{i-1}) = 40 sn   →   c_i = 3,2 · c_{i-1},  p_i = 0,08
```

- **Yeni merdiven:** 25 · 80 · 250 · 800 · 2 500 · 8 000 · 25 000 · 80 000 (×3,2, yuvarlanmış).
- **Üretim:** tüm halkalar `RING_RATE = 0,08`/sn — merdiven hız değil **değer** merdiveni.
- **Ölçülen:** geri ödeme **39–40 sn** (±%2,5) · kapı **121,9 dk** · **23** boost · **122** alım ·
  ilk 10 dk **9** alım · halka açılışları 0 / 11,4 / 21,0 / 26,1 / 29,3 / 31,7 / 33,7 / 35,4 dk.
- **Açılış:** `c_1 = 25` → 15 tık (Cookie Clicker'ın ilk cursor'ı da 15). `c_1 = 20` alternatifi
  (10 tık, 113,3 dk) ölçüldü, uygulanmadı — `todo.md` `P1` olarak açık.

### Dosyalar
`src/game/number/tuning.ts` (yeni sabitler + kural yorumu) · `src/game/number/economy.test.ts`
(sabit `0,071` yerine `NUMBER_TUNING.rings[0].baseRate`) · `GAME_DESIGN.md` §4 · `ADR-0079` ek ·
[`brain/research/ring-pricing-2026-10-23.md`](../research/ring-pricing-2026-10-23.md) (yeni çalışma).

### Doğrulama
`npx vitest run` → **86 test / 5 dosya** (denge kilidi 6 test dahil) · `npx vue-tsc --noEmit` → 0 hata ·
`npx vite build` → başarılı.

---

## [2026-10-23] ✔ — Sayı Ekonomisi Dikey Dilimi · 1. basamak oynanabilir (ADR-0079)

### Ne yapıldı
"Kozmik Oburluk" oyun çekirdeği koddan **silindi**; yerine `Hold That Number` oyununun 1. basamağı
uçtan uca yazıldı. Commit: `013c4b2` — `feat(number): sayi ekonomisi dikey dilimi — eski tema
silindi, 1. basamak oynanabilir`.

- **Ekonomi (saf, Pinia'sız):** 8 halka (Fingers → Mathematician), aşağıdan yukarı besleme,
  sınırsız alım (fiyat ×1,4), 10 birim → sonraki halka kilidi (mandallı), tek havuz.
- **Prestij:** `1,79e308` kapısı, `Tanım = log10(1+A)`, `Birikim` verimi `0,9^log10 A`.
- **Mini boost:** 8. halka koşulu, tam sıfırlama (halkalar 1 birime), `(zirve/başlangıç)^0,2`
  kalıcı basamak içi çarpan; `Tanım` vermez.
- **4 `Tanım` yükseltmesi:** `start` (10 → 1e7), `chain` (+%25/seviye), `boost` (üs 0,20 → 0,40),
  `autobuy` (kapalı / 5 / 2 / 1 sn).
- **`+1`:** gerçekten 1 ekler; gösterim değişmediyse `uselessTaps` sayılır (`S9`).
- **Ses:** `src/game/voice/` — kanal tipleri, `VoiceContext` (`V3` veri sınırı), tekrar önleme,
  sessizlik 0,22, nadir ağırlık 0,1; 1. basamak İngilizce ticker havuzu; `humor` kapısı.
- **UI:** yeni `App.vue` + 9 bileşen (`HeroNumber`, `TapButton`, `ChainList`, `TelemetryLine`,
  `TickerBar`, `UpgradeList`, `StatsPanel`, `SettingsModal`, `OfflineModal`).
- **Kayıt şeması v20:** `MIN_SUPPORTED_SAVE_VERSION = 20` → v19 ve altı açılmaz (`P5`).

### Silinen dosyalar (154 dosya · 34 987 satır)
- ~30 bileşen: `DimensionsTab`, `DimensionRow`, `LabTab`, `CrisisTab`, `NeuralTreeTab`,
  `ColonyTab`, `SingularityTab`, `AutobuyersTab`, `ChallengesTab`, `AchievementsTab`,
  `TimeClockOverlay`, `AnomalyOverlay`, `MotifBand`, `ScreenOverlay`, `JuiceLayer`,
  `SequentialStrikeLayer`, `HeartBurstLayer`, `SideSnapHands`, `Header`, `TabHero`,
  `AdminPanel`, `WelcomeBackModal`, `TeachingToast`, `FloatingThumbBar` + alt klasörler.
- Oyun verisi: `achievements`, `challenges`, `unlocks`, `pacing`, `balance`, `layers`,
  `branches`, `corruption`, `clock-data`, `crisis-data`, `lab-data`, `neural-data`,
  `dimension_identity`, `news` + `news-early/mid/late` (~1 300 satır metin), `motifs`.
- Store dilimleri: `src/stores/game/` altındaki 17 dosya.
- Çekirdek: `cosmic-scale`, `particles`, `screen-shake`, `tilt`, `hold`, `celebrate`,
  `card-physics`, `teaching-display`.
- ~25 test (`unlocks.test` tek başına 1 050 satır) + `tests/*.spec.ts`.
- Varlıklar: `src/assets/motifs/*.svg` (17), `public/assets/hands/*`.

### Eklenen dosyalar (22 dosya · 1 657 satır)
`src/game/number/` (tuning · economy · upgrades · rungs + test), `src/game/voice/`
(types · index · lines-rung1), `src/models/number.ts`, 9 yeni bileşen, yeni `App.vue`,
`index.html` (başlık + Space Grotesk/Space Mono), yeni `style.css` (`--pn-*` tokenları).

### Belgeler
- [`GAME_DESIGN.md`](../../GAME_DESIGN.md) baştan yazıldı (11 basamak, 8 halka, formüller, v20).
- [`brain/context/narrative-voice.md`](../context/narrative-voice.md) baştan yazıldı —
  SİCİL ve 11 basamaklık karakter yayı silindi (`V1`–`V6`, `A4`, `A8`).
- [`project-brief.md`](../context/project-brief.md) · [`tech-context.md`](../context/tech-context.md)
  yeni oyun yönünde güncellendi ("Saf Sayı", ADR-0078).
- [ADR-0079](../decisions/0079-number-economy-vertical-slice.md) yazıldı + indekse eklendi.
- `README.md` (kök) ve `package.json` (`hold-that-number` · `0.40.0`; ölü `harness:*`
  script'leri kaldırıldı, `verify` = `typecheck && test`).

### Doğrulama
- `npm run typecheck` (`vue-tsc --noEmit`) → **0 hata**
- `npm run build` (`vue-tsc && vite build`) → **başarılı** (87 modül)
- `npm test` (`vitest run`) → **50 test geçti** (3 dosya: `math`, `economy`, `cloud-conflict`)

> **Not (belge dalgası, aynı gün):** Yukarıdaki üç satır **commit `013c4b2` anına** aittir.
> Denge dalgası (`K5`) aynı gün `src/game/number/` üzerinde çalışmaya devam etti ve test sayısını
> büyüttü. Belge dalgası sonunda yeniden koşuldu: `npm run verify` → **0** (typecheck 0 hata +
> **86 test** / 5 dosya) · `npm run build` → **başarılı**. Yani "50 test" bugünün değil,
> o commit'in sayısıdır.

### İlgili ikinci commit — `07c45b3` (denge dalgası)
Aynı gün, ayrı bir dalga ölçümü koda geçirdi:
- `tuning.ts` **ölçülmüş** sabitlere geçti: `c_i = 25 · 10^{0,5(i-1)}`, `p_i = 0,071 · 1,05^{i-1}`, `g = 1,4`.
- Yapısal üç düzeltme: `D1` (boost yalnız sayı üretimine), `D3` (boost sonrası halkalar 1 birim),
  `D6` (kilitler mandallı).
- `src/game/number/balance.test.ts` → **6 regresyon testi**; `src/game/voice/voice.test.ts`;
  ses havuzu **110 ticker + 11 sahne** satırına çıktı (~120 hedefi).
- Gerçek motor (20 TPS) ölçümü: kapı **119,6 dk** · 23 boost · 121 alım · ilk 10 dk 9 alım.
- `brain/scratchpad/balance-2026-10-23/report.md` (ölçüm raporu + §11 motor doğrulaması).

### Açılan maddeler
Hedef 4b revizyonunun yazılı kaydı (ölçüm "8 halka <45 dk" diyor) · 2. basamak tasarımı ·
`A4`/`A5`/`A6`/`A7`/`A8` · `G13`/`G14` · `G8` sahne bağlantısı · `G11` boost nefesi.

## [2026-10-23] ✔ — Görsel Dil: "Saf Sayı" (ADR-0078 · `G1`–`G12`)

### Ne yapıldı
Görsel dil oturumu (grilling, 12 soru) kapandı; `A1` maddesi — pivot sonrası kalan son tasarım
engeli — çözüldü. **Hiçbir kod dosyası değişmedi**; üretilen şey karar + ölçüm + mockup.

### Kilitlenen kararlar
| # | Karar |
| :-- | :--- |
| `G1` | Yön **saf sayı** (karanlık tuval + basamak rengi). Kâğıt/kurum ve retro terminal reddedildi |
| `G2` | `AlgorithmicSwirl` kalır — oyunun tek ortamı |
| `G3` | Kemik kalır, süs gider: kart/blur/yuvarlak köşe ölür, 1px hairline + tipografi kalır |
| `G4` | Space Grotesk (hero+UI) + Space Mono (veri); **`m6x11plus` ve Caveat ölür** |
| `G5` | 11 basamak rengi tek OKLCH formülü; amber ve rose yayları boş bırakıldı |
| `G6` | Cyan emekli (bonus = beyaz + kıvılcım) |
| `G7` | `K0–K5` bozulma merdiveni tamamen ölür |
| `G8` | Basamak geçişi 2,5 sn sahne (11 × 2,5 sn = 27 sn / 85 saat) |
| `G9` | Yapısal dizgi: taban büyük, notasyon küçük; auto-fit yasak |
| `G10` | `+1` butonu hiç değişmez (aynı boyut, aynı etiket, aynı his) |
| `G11` | Mini boost = tek nefes, 400 ms; sahne diliyle karışmaz |
| `G12` | Yalnız swirl katman olarak kalır; ticker + toast düz metin olarak yaşar |

### Üretilen dosyalar
- [`brain/decisions/0078-pure-number-visual-language.md`](../decisions/0078-pure-number-visual-language.md) — yeni ADR
- [`brain/context/visual-language.md`](../context/visual-language.md) — sözleşme **baştan yazıldı** (219 satır)
- [`brain/research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md) §12 — oturum kaydı
- `brain/research/mockups/2026-10-23/` — 6 render (tipografi karşılaştırması, 3 renk yayı, 2 tam ekran mockup)

### Ölçümler
- 9 font adayı: hepsi tabular + `↑ ³ ^ ( ) e G` glifleri tam → teknik eleme yoktu, karar estetikti
- 11 basamak kontrastı `#060608` üzerinde **5,4:1 – 13,4:1** (en düşük 8. basamak)
- Komşu basamak hue farkı **25,1°**; amber (70,1°) ve rose (16,4°) yayların dışında

### Doğrulama
Kod değişmediği için `npm run build` gerekmedi; `brain/` bağlantıları ve ADR indeksi güncellendi.

### Açılan maddeler
`G13` mobil dizgi · `G14` ticker yeri/boyu · `A5` LNGN final sahnesi (`G8` motorunu kullanacak).

### Risk
`R1` (85 saatte yoğunluk düşer) artık **korumasız**: bozulma merdiveni ve canvas juice öldü.
Yoğunluk ticker metnine ve iki ana bağlı.


## [2026-10-20] ✔ — Satın Alma Tabanlı Boyut Açılışı ve D8 Çağı Ölçek Sıçraması (ADR-0076)

### Gerekçe (kullanıcı kararı):
1. **Ölçek Sıçraması D8'de kullanılmaya başlansın**, önceki boyutlarda değil. Sıçrama
   artık bir "40 saniyede gelen hile" değil, D8'e ulaştığınızda elde edilen kalıcı
   bir güç olacak.
2. **Her boyut alındığında bir sonraki boyut açılsın** — boyut merdiveni oyuncunun
   satın alımına bağlansın (klasik AD düzeni). Kütle kapıları (ADR-0072) kalktı.

### Çözüm & Değişiklikler:
1. **Açılış modeli (satın alma):** `DIMENSION_UNLOCK_PURCHASE_COUNT = 10` (bir paket).
   Bir boyuttan 1 paket alınınca bir sonraki boyut açılır. Kaynak: yeni kalıcı alan
   `lifetimeMaxDimensionTier` (hayat boyu satın alınmış en yüksek tier) — sıçrama /
   küme / şafak sıfırlamalarından ETKİLENMEZ. D1–D3 taban (3) olarak açık kalır.
   Yazım yolu: dört satın alma action'ı → `registerDimensionPurchase(tier, bought)`.
2. **Sıçrama hedefi (D8):** `shiftRequirement` artık sabit D8 hedefini verir
   (`SCALE_SHIFT_TARGET_TIER`); C7 challenge'ı hedefi D6'ya indirir. `canShift`
   hedef boyut açık değilse false döner → D8 açılmadan sıçrama yapılamaz.
   Miktar rampası korundu (10/15/25/26+16×(n−6); C7'de 30+15×(n−3)).
3. **Otobot kademeleri:** `dimN` botu artık bir altındaki boyuttan satın alınmış olmayı
   ister (bot zinciri kendini besler, deadlock yok). Sıçrama botu **D8 sahibi olmayı**
   ister. Eski `shifts` kademeleri D8-gated sıçramayla döngüsel hale gelecekti.
4. **Kayıt şeması v19:** `lifetimeMaxDimensionTier` eklendi (`SAVE_VERSION` 18→19,
   asgari sürüm 17). v18 ve öncesi kayıtlarda legacy kütle kapıları yeni tabana
   çevrilerek **açık boyut kaybı olmaz**; `LEGACY_DIMENSION_UNLOCK_GATES` yalnız
   göç için yaşar.
5. **Cache:** `dimMultCacheKey` artık açılış kaynağını taşıyor
   (`peakMatter` → `maxDimensionTier`); eski bileşen gereksiz invalidation üretiyordu.
6. **UI (DimensionsTab):** kilitli boyut teaser'ı artık "D3'te 1 paket alınca açılır"
   + paket ilerleme çubuğu gösterir; sıçrama kartı D8 açılmadan "D8 açılınca
   aktifleşir" durumuna geçer (Kozmik Kümeler kartıyla aynı desen).

### Ölçüm (harness:smoke — active, seed 1, dt 0.5, 30 dk):
| Metrik | Yeni | Önceki (ADR-0074/0075) |
| :--- | ---: | ---: |
| d4 / d5 / d6 / d7 / d8 açılışı | 40.5 / 102.5 / 210.5 / 350.5 / 544.5 s | 186 / 195 / 231.5 / 353 / 1377 s |
| ilk sıçrama | 760.5 s (12.7 dk) | 41 s |
| 30 dk sıçrama | 3 | 9 |
| 30 dk zirve log10 | 48.8 | 97.6 |

- **Boyut merdiveni hızlandı** (D8: 23 dk → 9 dk): açılış artık oyuncunun eylemine bağlı.
- **Sıçrama döngüye girdi** (41 s → 12.7 dk): ilk 30 dk'da biriken çarpan 60x → 4.6x;
  ekonomi ~2 kat yavaşladı. Bu, kararın kasıtlı bedelidir (ADR-0075 tempo bandı
  yukarı iter; ayrı denge turuna konudur).
- Smoke eşikleri yeni ölçüme göre yeniden kalibre edildi (log10 ≥ 60 → ≥ 45,
  shifts ≥ 5 → ≥ 3): smoke kapısı "ekonomi nefes alıyor mu" kontrolüdür, denge
  standardı değildir.

### Doğrulama:
- `npm run typecheck` → 0 hata
- `npm run test` → **514/514** yeşil
- `npm run build` → 0 hata
- `npm run harness:smoke` → 6/6 kontrol
- 6 saatlik ölçüm: `brain/scratchpad/harness/out/adr0076-6h.json` (log10 189.5 · 13 sıçrama)
- 12 saatlik ölçüm: `brain/scratchpad/harness/out/adr0076-12h.json` → **ilk tekillik 10:12:00**
  (17 sıçrama, 8 küme) · eski model 9:33:17 → koşu süresi yalnızca **~%7 uzadı**
  (30 dk penceresindeki 2 kat yavaşlama, sıçrama rampası ilerledikçe telafi ediliyor)

## [2026-10-20] ✔ — Harness `--dawns N` modu: Şafak (Tekillik) Serisi Ölçümü (P0 §5)

### Gerekçe:
- P0 §5'te spec'lendi ama **uygulanmamıştı** → ADR-0071'in şafak merdiveni hiç uçtan uca ölçülmemişti.
- Oyun kodu (`src/**`) **değişmedi**; yalnız harness genişledi (ADR-0034 bozulmaz: SP yalnız
  `singularityReset` anında eklenir).

### Çözüm & Değişiklikler:
1. `brain/scratchpad/harness/run.ts`:
   - `DawnRow` / `DawnSummary` şemaları + `buildDawnSummary()` (türev metrikler: zaman-to-break,
     zaman-to-ilk-10-SP, SP/saat (şafak 1'den + marjinal), log10(matter)/SP, şafak başına yeni
     açılan kapılar, fastestSingularity).
   - Şafak döngüsü: `store.canSingularity` → ölçüm satırı → `store.singularityReset(false)` →
     **SP harcama politikası** (şafak 1: `insomnia_heart`; `break_singularity` görününce; sonra
     sabit öncelik listesiyle uygun en ucuz nöral düğüm; rastgelelik yok) → koşu **sıfırlanmadan**
     devam (simTime + şafak sayacı korunur).
   - **CLI kablolaması:** `--dawns N` ayrıştırması + `--help` metni + worker payload'ı
     (`WorkerRunPayload.dawns`) + `runJobBatch`/`runOnce` zinciri. (Bayrak ayrıştırılmadan mod
     sessizce kapalı kalıyordu → ölçüm boş çıkıyordu; düzeltildi.)
2. `brain/scratchpad/harness/run-worker.ts`: payload'a `dawns` eklendi ve `runOnce`'a geçirildi.

### Ölçüm (aktif, seed 1, dt 0.5, çip açık, `--dawns 3`)
| Şafak | Koşu | Kümülatif | SP | Banka | Harcanan | Kırılma |
| ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| 1 | 268.1 dk | 268.1 dk | 1 | 1 | 1 | — |
| 2 | **49.1 dk** | 317.2 dk | 3 | 3 | 3 | — |
| 3 | **13.1 dk** | 330.3 dk | 4 | 4 | 4 | **✓** |

- Toplam 5.51 saat · SP 8/8 · `timeToBreak` = 3. şafak @ 5.51 sa · SP/saat 0.22 → 3.67 → **18.29** ·
  `log10/SP` 308.3 → 102.8 → 77.1 · `fastestSingularity` 8 dk.
- **ADR-0071 doğrulandı:** kırılma duvarı 3. şafakta düşüyor; koşu süresi şafaklar arasında
  6.5× / 3.8× kısalıyor. SP/saat eğrisi üstel → 5. şafaktan sonra SP darboğazı beliriyor.

### Regresyon kanıtı:
- `--dawns` **verilmezken** çıktı birebir aynı: 0 milestone farkı, tepe 69.097 = 69.097, `dawns`
  alanı null (mod kapalıyken doldurulmuyor).

### Doğrulama:
- Harness ölçümleri (yukarıda) + `npm run harness:smoke` **6/6 PASS** · oyun kodu değişmediği için
  `npm test`/`build` etkilenmez (yine de temiz koşuldu).

## [2026-10-20] ✔ — Plan §7.3 P4: Sistem Açılışında Bir Kez Anlat (ilk karşılaşmada anlat)

### Gerekçe:
- Kullanıcı kararı: "Kilitli şeyler görünmesin; sadece kilidi açıldığında görünsün." → bir sistem
  **açıldığı anda** ne işe yaradığını bir kez söylemek, bu kuralın tamamlayıcısı: içerik gizli
  kalır, açıldığında anlaşılır.
- Plan §7.3: "bir sistem oyuncuyla İLK kez karşılaştığında 1-2 cümle öğretir; o andan itibaren
  yüzey saf görsel+sayısal kalır (T4 → T0-T2 geçişi zamanlanır)."

### Çözüm & Değişiklikler:
1. `src/game/feature-teachings.ts` (YENİ, saf veri): 16 özellik için `FeatureTeaching`
   { featureId, title, body, glyph } — `body` **TEK cümle** (90-140 karakter), somut, oyuncuya
   dogrudan hitap eden dille. **Boş kapılara yazılmadı** (`event_horizon_lens`,
   `hawking_resonator`, `cosmic_filament` UI'a bağlı değil → oyuncuya var olmayan yüzey anlatılırdı).
2. State: `taughtFeatures: string[]` (**kaydedilir** → reload sonrası tekrar anlatılmaz) ·
   `pendingTeaching: FeatureTeaching | null` (uçucu).
3. Yakalama (`syncUnlocks`): yeni özellik açıldığında öğretimi **kuyruğa alır** ve `taughtFeatures`'e
   yazar. **Sıra kuralı:** aynı anda birden fazla özellik açılırsa yalnız **ilk** anlatılır (ekran
   yığılması olmasın) — diğerleri sessizce "öğretilmiş" sayılır.
4. Getter `currentTeaching` + aksiyon `dismissTeaching()`.
5. `src/components/TeachingToast.vue` (YENI): üst-ortada, ~7 sn'de otomatik kapanan, tek cümlelik
   öğretim kartı (glyph + başlık + gövde + kapatma). Mevcut görsel dil sınıfları; yeni CSS/kütüphane yok.
6. Ayar: `settings.teachingsEnabled` (varsayılan **açık**) → kapatılabilir. Geriye uyum: kayıt
   yükleyici `{...this.settings, ...data.settings}` ile birleştirdiği için **eski kayıtlarda alan
   yoksa varsayılan açık kalır** (testle kilitli).

### Testler:
- `src/stores/feature-teaching.test.ts` (YENİ): içerik bütünlüğü (id'ler gerçek, tek cümle, uzunluk
  aralığı) · yakalama · tekrar anlatmama · aynı tick'te iki özellik → tek anlatım · kayıt round-trip.
- `src/components/teaching-toast.test.ts` (YENİ): ayar açık/kapalı gösterim kararı + geriye uyum.

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **512/512** (34 dosya) · `npm run build** **0** ·
  `npm run harness:smoke` **6/6 PASS**

## [2026-10-20] ✔ — Plan §10.1 O3: Başarım Aile Kademeleri SP Kazancını da Güçlendirir

### Gerekçe:
- ADR-0073 aile kademe çarpanı **üretimi** güçlendiriyor; prestij döngüsünün ikinci ekseni (SP)
  yalnız nöral ağaç + challenge + relik çarpanlarına bağlıydı. Plan §10.1 O3 bunu kapatır.

### Çözüm & Değişiklikler:
1. `src/game/achievements.ts`: `SP_PER_FAMILY_TIER = 0.03` + `achievementSpMult(unlockedIds)`
   = `1 + 0.03 × countFamilyTiers(...)` → tavan 1.96× (32 kademe). **Yeni reward türü açılmadı**,
   mevcut kademe sayacı yeniden kullanıldı → yeni state/kayıt alanı **yok**, migrasyon **yok**.
2. `src/stores/game/getters-misc.ts`: **TEK KAYNAK** `spGainMultChain(state, relicSpMult)`
   = şafak hızı × challenge × relik × achievement. Hem `singularityGain` (kazanç) hem
   `nextSingularityPointAt` (UI hedef göstergesi) bu zinciri kullanır.
   *Tutarlılık kanıtı:* eski zincirle (achievement çarpanı olmadan) gösterge gereken kütlenin
   **1.14 dekad (≈×13.8) ÜSTÜNÜ** tahmin ediyordu → yeni test bunu kırmızıya düşürüp düzeltiyor.
3. `calcAchievementMultiplier` (üretim çarpanı) **değişmedi** → iki çarpan ayrı: üretim ve SP.

### Testler:
- `src/game/achievements.test.ts` → 41 test (+8): SP_PER_FAMILY_TIER kilidi · boş liste 1 · %25→1.03 ·
  %100→1.12 · tam set 1.96 · bilinmeyen id artırmaz (ADR-0031) · üretim çarpanıyla karışmaz.
- `src/stores/sp-gain.test.ts` (YENİ, 7 test): post-break dalda kazanç oranı kademe oranıyla birebir
  (0→2 kademe: 3.000.000 → 3.180.000) · 32 kademe → 1.96 · pre-break dal da uygular (101→107) ·
  kazanç zinciri ile hedef göstergesi aynı çarpanları kullanır.

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **499/499** (33 dosya) · `npm run build` **0** ·
  `npm run harness:smoke` **6/6 PASS**

### Not (denge):
Pre-break dalda kazanç `Math.floor` ile alındığı için küçük çarpanlar 1 SP'yi değiştirmez; asıl etki
post-break üstel kazançta ve prestij döngüsündedir. İlk koşu ölçümü harness'te SP telemetrisi
olmadığı için yapılamadı — `harness --dawns N` modu (P0 §5) bu ölçümü açacak.

## [2026-10-20] ✔ — Kilitli İçerik Gizleme (kullanıcı kararı) + M1 v2 Otonom Yatırım Çipi

### Gerekçe (kullanıcı):
"Kilitli şeyler görünmesin; sadece kilidi açıldığında görünsün." → P3.2'nin silüet teaser'ı
**geri alındı**: `LockedFeature.vue` silindi, nav silüetleri kaldırıldı, Lab tohumları / Kriz müdahale
kartlarında kilitli içerik hiç render edilmiyor. Boyut satırları, bot/SP ağacı merdivenleri ve
"Sıradaki Açılış" bandı **korunur** (hedef bilgisi) — band, dal kapılı hedefler için **başarım
şartı ipucu** da verir ("… · 2 Kozmik Dalgalanmalar başarımı (1/2)"). Header'daki kilitli duruş
ipuçları kaldırıldı; ColonyTab'daki Lock kartı incelendi (ulaşılamaz durumda, korundu).

### M1 v1 → v2 (ölçümle yeniden tasarım):
- **v1 ("bot hızı") ÖLÇÜLDÜ VE ETKİSİZ ÇIKTI:** aktif 12 sa (9:33:17 → 9:33:09) ve idle 12 sa
  (tepe 121.69 → 121.69). **Teşhis:** darboğaz bot hızı değil **KÜTLE** (botlar paraları olmadığı
  için bekler). Kütleyi çipe harcamak boyut kovasına harcamaktan her zaman daha zayıf →
  mekanizma ekonomik olarak **baskılanmış** (dominated).
- **v2 (uygulandı):** çip *boyut üretim çarpanını* `1.03^seviye` yükseltir (seviye 5 → ×1.16,
  tavan 40 → ×3.26). Uygulama: `getDimensionMultiplier` + **cache anahtarı** (`dimMultCacheKey`)
  `speedChipLevel`'ı içerir (bayat çarpan sessiz hatası kapatıldı).
- **Retun:** 1e12 taban + %10/seviye erken seviyeleri ×45'e biriktiriyor, colony/lab'ı 600 sn'ye
  çekiyordu (F600=6, tepe 181.8) → **taban 1e40** (ilk çip ~353 sn) + **%3/seviye**'ye indirildi.

### Ölçüm (v2, dengeli):
| Koşu | 30 dk tepe | 600 sn kapı | 12 sa ilk tekillik |
| :--- | ---: | ---: | ---: |
| Çipsiz (T0) | 1e69.1 | 4 | 9:33:17 |
| v2 +3%/seviye, taban 1e40 | **1e81.25** | **4** | **4:28:09** |

=> Çip **gerçek fayda** verir (+12 dekad/30 dk), **pacing'i korur** (F600=4) ve koşuyu **2.1×
kısaltır** (9s33dk → 4s28dk). Revize band (8–11 sa) taban oyun içindir; çip, oyuncunun
*kazandığı* hızdır.

### Dosyalar:
- `src/game/speed-chip.ts` (YENİ, v2) · `src/stores/speed-chip.test.ts` (YENİ, 17 test) ·
  `src/stores/game/{state,getters-dimensions,actions-dimensions,actions-misc,cache,store-api}.ts` ·
  `src/game/layers.ts` (reset kancası) · `src/components/AutobuyersTab.vue` (Otonom Hız kartı: seviye
  rozeti, üretim çarpanı göstergesi, maliyet, alım butonu, tavan rozeti) ·
  `brain/scratchpad/harness/{run,run-worker}.ts` (`--chips` opt-in bayrağı + telemetri) ·
  `brain/research/m1-speed-chip-spec-2026-10.md` (spec + ölçüm + v2 kararı).

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **484/484** (32 dosya) · `npm run build` **0**
- `npm run harness:smoke` **6/6 PASS**

## [2026-10-20] ✔ — Tempo & Ekonomi Faz 3 / P3.3: Ölçülmüş Erken Merdiven (ADR-0074)

### Gerekçe:
- Plan §1'in "ilk 10 dakika kontratı" ölçüle göre ihlal ediliyordu: 600 sn'de **10 özellik kapısı**
  (plan "7'ye yakın" diyordu), 4 yüzey 18 saniye içinde (Botlar 190s · Koloni 201s · Kriz 207s ·
  Tekillik ~208s), D4–D8 boyutları 16 saniyede 18 dekad kat ediyordu.
- Plan §1'in önerdiği reçete ("autobuyers 1e9 → 1e12") **ölçümle çürütüldü**: sayı değişmiyor
  (A=10 → B=10); eğri 1e9→1e56 aralığını 74 saniyeye sıkıştırıyor.

### Çözüm & Değişiklikler:
1. **Ölçüm dizisi (E1…E6)**: her aday 30 dakikalık gerçek koşuyla ölçüldü (harness, active/seed1/dt0.5).
   Katkı ayrımı: **fiyat 0** · **dal kapıları −4** · **boyut eşiği yoğunluğu −1…−2**.
2. `src/game/balance.ts` → `DIMENSION_UNLOCK_GATES`: **1e8 / 1e14 / 1e24 / 1e40 / 1e65** (E5).
   Ölçülen açılış: 186 / 195 / 231.5 / 353 / 1377 s (D4→D8 penceresi **1191 s**).
   ADR-0072'nin "eşik = taban fiyatı × 100" türetme kuralı **geçersiz** (PROVISIONAL olarak ölçüldü).
3. `src/game/unlocks.ts` → `FEATURE_UNLOCKS` yatay kapıları: autobuyers **1e12** (189s) ·
   stance_spam **1e20** (207s) · stance_private **1e32** (260s) · colony **1e66** (1417.5s) ·
   lab **1e70** (~1927s). crisis 1e28 + spells 1e34/1e42/1e52 **dal kapılı** (ADR-0073) → ~810 s ve ötesi.
   **Yerleşim kuralı:** her yatay kapı bir boyut kapısının arasına oturur → aynı-tik çakışma 0.
4. Test dosyaları yeni merdivene göre güncellendi (`balance.test.ts`, `stores/balance.test.ts`,
   `unlocks.test.ts`, `nav-silhouette.test.ts`, `dimension-unlock-celebration.test.ts`,
   `tests/lab-rebalance.spec.ts`).
5. [ADR-0074](../decisions/0074-measured-early-ladder.md) yazıldı (deney dizisi + kabul ölçütleri +
   reddedilen seçenekler dahil) + `brain/decisions/README.md` indeksi.
6. Beyin: `brain/research/p3-ladder-experiment-2026-10.md` (E1…E6 analizi) ·
   `brain/scratchpad/p3-final-ladder.md` (P3.3 raporu) · P0 raporu §9 (deney dizisi + §9.5 E1).

### Kabul ölçütleri (ölçülen)
| # | Ölçüt | Ölçülen | Sonuç |
| :-- | :--- | :--- | :--- |
| 1 | 600 sn'de açılan özellik ≤ 5 | **4** | ✅ |
| 2 | Aynı saniyede boyut+özellik çakışması = 0 | **0** | ✅ |
| 3 | D4 → D8 penceresi ≥ 60 s | **1191 s** | ✅ |
| 4 | İlk küme ≤ 1500 s · max_mode ≤ 1800 s | **1448.5 s** · **1702 s** | ✅ |
| 5 | 12 saatlik koşuda tepe ≥ 1e250 | **1e308.25** (ilk tekillik 9s33dk) | ✅ |
| 6 | Yüzeyler arası ≥ 8 dk | 621.5 s · 607 s · ~510 s | ✅ |

### Ölçüt 6'nın zorlayıcı yanı
Sabit çapalar (`autobuyers` 189 s, `crisis` 810.5 s) arasında **621.5 s** var; dört yüzeyin her ardışık
çifti ≥480 s olacaksa araya tek yüzey sığar ve penceresi 669 s ile 330.5 s arasında olmalıdır →
**hiçbir koloni eşiği oraya yerleşemez**. Koloni ancak D8'in (1e65) hemen ardına (~1e66) çekilince dört
yüzey de 8 dk'ya oturur — ve ölçüt 1 5'ten **4'e** iner.

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **484/484** (32 dosya) · `npm run build` **0**
- `npm run harness:smoke` **6/6 PASS**

## [2026-10-20] ✔ — Tempo & Ekonomi Faz 3 / P3.2: Silüet Teaser (ADR-0073 UI yüzeyi)

### Gerekçe:
- Plan §1: "Geri kalan her yüzey silüet (etkileşimsiz, isimsiz teaser) olarak durur."
- ADR-0073 dal kapısı yeni bir durum yarattı: dekad eşiği geçti ama başarım eksik → eski davranışta
  özellik **hiç görünmez** olurdu; oyuncu neden açılmadığını anlamazdı.

### Çözüm & Değişiklikler:
1. `src/composables/useNavigation.ts`: `NAV_FEATURE_IDS` (TabId → özellik id'si; getter'lardan **koddan okunarak**
   türetildi, uydurma id kullanılmadı) + saf `navSilhouetteState()` / `navSilhouetteMeter()` /
   `navSilhouetteStepFlags()`. Durum matrisi: `hidden` (kendi şartı geçmedi → hiç gösterilmez) ·
   `open` (açık) · `silhouette` (görünür + kapalı).
2. `src/App.vue`: 6 kilitli sekmenin ardına `v-else-if` silüet yongası — aynı dış kabuk, **metin etiketi yok**
   (isimsiz), ikon soluk+bulanık, `disabled` + `pointer-events-none` + `!cursor-not-allowed`
   (derlenmiş CSS'te `cursor-pointer` daha sonra geldiği için importance şart), `aria-label`
   ("Kilitli sekme: Kriz"), kademe noktaları.
3. `src/components/LockedFeature.vue`: dal kapısı devredeyken sayaç artık **tam sayı** (`formatNumber`
   1e308 biçimine sokuyordu → "2.00" hatası), + kademe kutucukları + aile ipucu ("Kozmik Dalgalanmalar:
   1/2"). Dekad öncesi hiçbir şey değişmedi.
4. `src/composables/nav-silhouette.test.ts` (YENİ, 18 saf test): omurga sekmeleri hiçbir bağlamda
   silüet değil · crisis/colony akışları · meter yalnız silüette dolu · ADR-0035 monotonluğu.

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **463/463** (31 dosya) · `npm run build` **0**
- `npm run harness:smoke` **6/6 PASS** (UI değişimi simi etkilemiyor)

### ⚠️ KULLANICI KARARIYLA GERİ ALINDI (2026-10-20)
"Kilitli şeyler görünmesin; sadece kilidi açıldığında görünsün." → **nav silüet yongaları kaldırıldı**
(`App.vue`), `LockedFeature.vue` **silindi** ve Lab tohumları / Kriz müdahale kartlarında **kilitli
içerik hiç render edilmiyor** artık. Boyut satırları, bot/SP ağacı merdivenleri ve "Sıradaki Açılış"
bandı **korunur** (hedef bilgisi). Band artık dal kapılı hedefler için **başarım şartı ipucu** da veriyor
("… · 2 Kozmik Dalgalanmalar başarımı (1/2)"). Geri alma dalgası: `src/App.vue`,
`src/composables/useNavigation.ts`, `src/components/LabTab.vue`, `src/components/CrisisTab.vue`,
`src/components/lab/ViralGrid.vue`, `src/components/LockedFeature.vue` (silindi).

---

## [2026-10-20] ✔ — Tempo & Ekonomi Faz 4 / 6a: M1 Otonom Hız Çipi (çekirdek)

### Gerekçe (ölçümden):
- P0 §9.5 (E1 ölçümü): **fiyat eğrisi** erken kalabalığı çözmüyor (30 dk tepe 98.39 → 98.44) ve
  koşuyu **uzatıyor** (12 saatlik tavan aşıldı) → tempo onarımı fiyattan **gelemez**.
- Fizik: bu oyunda kütle üstel geri beslemeyle büyür (`dM/dt ≈ k·M`). **Sabit** üretim çarpanı eğriyi
  yalnız ~0.3 dekad kaydırır (süreyi değiştirmez); süreyi değiştiren tek şey **`k`** = büyüme hızı.
  Geç oyunda tek motor **bot satın alma temposu** → M1 oraya dokunur.

### Çözüm & Değişiklikler:
1. `src/game/speed-chip.ts` (YENİ, saf modül): `CHIP_BASE_COST=1e12` · `CHIP_COST_MULT=1e4` ·
   `CHIP_INTERVAL_GAIN=0.15` · `CHIP_MAX_LEVEL=40` + `speedChipCost()` · `speedChipIntervalDivisor()` ·
   `speedChipFrequencyMult()` · `isSpeedChipMaxed()` · `speedChipEffectLabel()`. Tek kaynak, store bağımsız.
2. `state.speedChipLevel` (koşu içi → **kayıt migrasyonu YOK**, serialize listesine girmiyor).
3. Getter'lar: `speedChipCost` · `speedChipEffectMult` (bölücü) · `canBuySpeedChip`.
4. `buySpeedChip()`: cüzdan yetersiz/tavan → **no-op** (hata fırlatmaz); yeterliyse `matter -= cost`.
5. **Etki yalnız bot yolunda:** `actions-misc.ts` → autobuyer tick döngüsünde `bot.timer += delta × botSpeedMult`,
   `botSpeedMult` çip bölücüsüyle çarpılıyor → etkin aralık `bot.interval / (1 + 0.15×seviye)`.
   Manuel tıklama / üretim döngüsü / üretim çarpanları **etkilenmez**.
6. **Reset kancası:** `src/game/layers.ts` → `applyResetScope` içinde `tickspeedBought` ile **aynı yerde**
   sıfırlanır (ADR-0052 "tek doğru adres") → shift/galaxy/singularity çipi de sıfırlar (koşu içi).
7. `getters-misc.ts` → `autobuyerFleetSpeedMult` çip bölücüsünü içerir (yalnız **gösterim**; işlevsel etki
   tick döngüsünde, çift uygulama yok).
8. `src/stores/speed-chip.test.ts` (YENİ, 15 test): maliyet/etki monotonluğu · cüzdan no-op · tavan ·
   prestij reseti · **bot tick sayacıyla etki ölçümü** · manuel tıklamanın etkilenmediği · kayıtta olmama.
9. `brain/research/m1-speed-chip-spec-2026-10.md` (YENİ): tasarım spec'i (fizik gerekçesi, ikilem kuralı,
   tuzak önleme, sayı aralıkları, ölçüm döngüsü).

### Doğrulama:
- `npm run typecheck` **0** · `npm test` **480/480** (32 dosya) · `npm run build` **0**

### Ölçüm aracı:
- `brain/scratchpad/harness/run.ts` → **`--chips` bayrağı** (varsayılan **KAPALI** → mevcut ölçümlerle
  birebir karşılaştırılabilir) + telemetri (`speedChipLevel`, `speedChipsBought`, `peaks.speedChipLevel`).
  Çip kuralı: "fırsat varsa hemen al" (her tick, cüzdan yeterliyse bir seviye), boyut alımından sonra,
  dünya tick'inden hemen önce → çip aynı tick'teki boyut alımını engellemez (paylaşılan cüzdan kuralı).

## [2026-10-19] ✔ — Tempo & Ekonomi Faz 3 / P3.1: Başarım Kapılı Dallar + Aile Kademe Çarpanı (ADR-0073)

### Gerekçe:
- Plan §2: 86 başarım hiçbir mekanik açmıyor; plan §1: ilk 10 dakikada ~7-10 sistem aynı anda iniyor.
- Ölçülen (P0 baseline): ilk 8 dakikada 7 özellik kapısı; P3.0 ölçümü: **ilk 600 sn'de 10 sistem**.

### Çözüm & Değişiklikler:
1. **YENİ `src/game/branches.ts`** — omurga/opsiyonel dal ayrımının tek kaynağı:
   `BranchGate { featureId, family, requiredAchievements, safeAchievementIds }` × 12 dal kaydı +
   `SPINE_FEATURE_IDS` (8 id) + `getBranchGate` / `isSpineFeature` / `isBranchFeature` /
   `countFamilyAchievements` / `branchProgress`.
2. **Kapı seviyesi = ÖZELLİK (dal değil)** — `lab` ve `guilt` aileleri *kendini kilitler*
   (`lab_seed` için lab açılmış, `gui_seen` için parazitler açılmış olmalı) → dal seviyesinde
   kapı konsa plan §2'nin uyardığı softlock birebir oluşurdu. Bu iki ailenin **giriş** katmanları
   (`lab`, `guilt_slackers`) omurgada; **derin** katmanları (tohumlar, mercek/rezonatör) aile kapısında.
3. **Softlock koruması kodda test edilir:** her kapı `safeAchievementIds` taşır = dal açılmadan
   kazanılabilen aile başarımları. Invariant: `safe.length >= required` — ihlal eden kapı **yazım
   anında** kırmızı testle yakalanır. Sayım yalnızca güvenli listeden yapılır (daha fazlası
   sayılırsa kapı görünürde açık ama gerçekte açılmaz → sahte ilerleme çubuğu).
4. **`src/game/unlocks.ts`**: `UnlockContext.achievements?` alanı; `checkUnlock` = kendi şartı **ve**
   dal kapısı; `unlockProgress` dal devredeyken başarım ilerlemesi (`current` hedefe kırpılır →
   `progress >= target` sözleşmesi korunur); `unlockProgressFraction` dalda **lineer**, dekad öncesi
   logaritmik davranış aynen kalır; `checkVisibility` **EXPORT** (görünürlük = kendi şartı, dal
   katmanı yok) → P3.2 silüet UI'ının temeli.
5. **`src/stores/game/getters-misc.ts`**: `buildUnlockContext(state)` çağrılarına
   `achievements: state.achievements` **gerçekten** bağlandı (aksi halde typecheck yeşil kalır ama
   üretimde dallar hiç açılmaz — sessiz softlock).
6. **`src/game/achievements.ts`**: `ROW_COMPLETION_MULT = 1.06` **silindi**; yerine
   `FAMILY_TIER_STEPS = [0.25, 0.5, 0.75, 1]` × `FAMILY_TIER_MULT = 1.015` kademe sistemi
   (+ `familyTierCount`, `countFamilyTiers`). **Tavan korundu:** 1.06^8 = 1.594 → 1.015^32 = 1.610.
   Fark: ödeme %25'te başlıyor (plan §6.4 "aile tamamlama kademeleri" kabul edildi, çizgisel
   86-nokta modeli reddedildi).
7. **`src/components/AchievementsTab.vue`**: "Tam satır ✓ ×1.06" rozeti yerine kategori başlığında
   **4 kademe tik kutucuğu** (dolu/boş, tooltip'li, `aria-label`'lı) — görsel öncelikli (plan §7).
8. `brain/scratchpad/simulate-economy.ts` + `harness/verify-sim-constants.ts`: kaldırılan sabitin yerine
   **tahmin** yardımcısı (gerçek kaynak `src/game/achievements.ts`, yorumda belirtildi).
9. [ADR-0073](../decisions/0073-achievement-gated-branch-spine-hybrid.md) yazıldı (aile→dal haritası
   dahil) + `brain/decisions/README.md` indeksi güncellendi.
10. `brain/scratchpad/harness/first-prestige-baseline.md` → **TARİHSEL** uyarı bandı eklendi
    ("0:13:13" rakamları geçersiz; güncel otorite P0 raporu).

### YENİ dosyalar:
- `src/game/branches.ts` (YENİ) · `src/game/branches.test.ts` (YENİ, 13 test)

### Ölçüm — P3.0 erken merdiven adayları (`brain/scratchpad/p3-early-ladder-candidates.md`):
| Aday | 600 sn içindeki sistem | ≤4 hedefi |
| :--- | ---: | :--- |
| A — mevcut | **10** | ✗ |
| B — plan metni (autobuyers 1e12) | **10** | ✗ |
| C — ilk 10 dk kontratı (ham) | 3 | sayısal ✓ ama `1e65` kapıları 353.5 sn'de → mutlak kontrat ✗ |
| **C′ — ölçümle düzeltilmiş** | **1** (yalnız izinli anomali) | **✓** |

- Eğri o kadar dik ki **1e9 → 1e56 aralığı 74 saniyeye** sıkışıyor (190 → 263.4 sn) → plan §1'in
  "autobuyers 1e9 → 1e12" önerisi **sayıyı değiştirmiyor**, saniyeleri kaydırıyor.
- 600 sn kontratı için en küçük tam dekad **1e68 → 816.4 sn** (600 sn'deki ömür boyu tepe = 1e67.24).
- **C′ bedeli:** casual profili 1800 sn'de tepe 69.39 · idle 67.00 → 1e70 eşikleri bu profillerde
  30 dakikada bile açılmıyor. Ayrıca `unlockAutobuyer()` feature kapısını kontrol **etmiyor** →
  harness eğrisi eşik kaydırmayı yansıtmaz (ölçüm sınırı, rapor §4.2/§5).

### Doğrulama:
- `npm run typecheck` **exit 0** · `npm test` **445/445** (30 dosya) · `npm run build` **exit 0**
- `npm run harness:smoke` **6/6 PASS** — zirve `log10=99.8`, `shifts=9`, `tickspeed=81` (önceki 98.4/9/80)

### Açık (kullanıcı kararı bekliyor):
1. **Tempo:** ölçülen ilk koşu ~11 saat vs ADR-0023'ün 150–300 dk bandı → onarım mı, revizyon mu, kabul mü?
2. **Erken merdiven:** A / B / C / C′ (C′ kontratı tutturuyor ama otomasyonu geciktiriyor).

## [2026-10-19] ✔ — Tempo & Ekonomi Faz 2 / P2.2: Sıçrama Kalıntıları Temizlendi + Eşik Yayılımı Ölçümü

### Gerekçe:
- ADR-0072 boyut açılımını sıçramadan kopardı; sıçramayla ilgili iki kalıntı varsayım kaldı ve `DimensionsTab`'da ölü bir "Boyut Aç" etiketi duruyordu.

### Çözüm & Değişiklikler:
1. `shiftRequirement` **geç dal** (`shifts >= 6`): sabit `tier: 8` → `tier: unlocked`. Eski sabit "6+ sıçrama ⇒ D8 açıktır" varsayımına dayanıyordu; D8 kilitliyken sıçrama, var olmayan D8 miktarını ister ve oyuncu sıçrama yapamaz hâle gelebilirdi.
2. **Erken dal rampası KORUNDU:** `tier = min(8, BASE_UNLOCKED_DIMENSIONS + shifts)` bir *zorluk rampasıdır*, kilit mekanizması değil — mevcut `min(tier, unlocked)` kırpması zaten gerçek açık sayıya bağlıyor. Kaldırılması denendi ve ölçüldü (**zirve `log10` 99.8 → 88.4, shift 9 → 8**) → geri alındı.
3. `src/components/DimensionsTab.vue`: ölü `isShiftUnlock` computed'i ve "Boyut Aç" / "Yeni Format!" metinleri kaldırıldı (sıçrama artık boyut açmıyor); buton yalnız boost etiketi gösteriyor. `disabled`/rampa/çubuk/`aria-label` değişmedi.