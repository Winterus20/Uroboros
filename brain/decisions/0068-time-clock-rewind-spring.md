# ADR-0068: Zaman Yayı (Time Clock) — Geri Sarma / Salgı Mekaniği

- **Tarih:** 2026-10-17
- **Durum:** Kabul edildi ve uygulandı
- **Kapsam:** Yeni oyun mekaniği — ekranın ortasında doğan dev saat, dairesel çekmeyle **geriye zaman sarma**, bırakışta **zaman hızı salgısı**. Dokunulan alanlar: state + getter + action + `update()` tick bloğu + üretim faktörü + kayıt şeması (v18) + özellik merdiveni + tam ekran UI katmanı + Web Audio + parçacık sahnesi + testler.
- **Önceller:** ADR-0052 (`applyResetScope` — koşu kapsamlı alanların tek sıfırlama noktası) · ADR-0044 (`position: fixed` UI'ın `#game-main-content` dışında yaşaması) · ADR-0034 (koşu kapsamlı çarpan: `decadeSurgeMult`) · ADR-0064 (`FeastScene` şölen sahnesi altyapısı)
- **Bağlayıcı kopya:** [`brain/scratchpad/time-clock-spec.md`](../scratchpad/time-clock-spec.md) — ajanlar arası **donmuş sözleşme** (denge sabitleri, imzalar, dosya sahipliği)

## 1. Bağlam

Kullanıcı talebi (birebir):

> *"Oyunun arada çıkacak bir saat olsun ekranın ortasında kocaman şekilde, biz o saatin okunu geriye doğru saralım, onu sararken de diğer her şey geriye doğru aksın, sonrasında iyice gerilsin; bu ok bıraktığımızda zaman çok daha hızlı akmaya başlasın, çok daha hızlı kazanalım yutulan kütleyi."*

Karar turlarında kapatılan üç soru:

| Soru | Kullanıcı cevabı | Sonuç |
|---|---|---|
| Geri sarma bedeli | *"saatin belirli bir zamanı olsun, onda ne kadar geriye sararsan o kadar geriye doğru gitsin ve yay da bırakıldığında o kadar hızlı sana kazandırsın, biraz gerçek fizik gibi bir şey yapacağız"* | Kütle **gerçekten** geriye gider; ödül sarma miktarıyla ölçeklenir |
| Kontrol yöntemi | Dairesel çevirme | Repoda **ilk** rotary (dairesel sürükleme) girdisi |
| Sarma sınırı | *"belli bir yere kadar sarabilelim, o noktaya ulaşınca gerçekten gergin şekilde sarması çok zorlaşsın, yay gibi düşün"* | Hiperbolik doyum (sert yay), sabit tavan yok |
| Salgı kapsamı | *"Sadece üretim hızlansın"* | Buff süreleri / lab yaşlanması / bot saatleri **normal akar** |

Mimari keşif (3 paralel subagent) sonucu kritik iki bulgu tasarımı doğrudan şekillendirdi:

1. **`update()` içinde tek bir "global üretim çarpanı" seam'i yok** — gerçek üretim `actions-misc.ts` içinde satır içi çarpılıyor. Mevcut en yakın emsal `offlineSimBoost` ve `reactorTickRateMult`: zamana bağlı çarpan **cache'lenen getter'lara konmaz**, tick başına tek noktada çarpılır (`_dimMultCache` bayatlar — ADR-0029).
2. **`lifetimePeakMatter` / `stats.highestMatter` / `stats.totalMatterProduced` monotoniktir ve asla düşmez.** Yani kütle geri gitse bile açılmış içerik geri kilitlenmez. Bu, cezayı "içerik kaybı" olmaktan çıkarıp saf ekonomi haline getirdi — mekanik bunun üzerine kuruldu.

## 2. Fizik modeli

### 2.1 Gerilim (yay sertleşmesi)

```
tension = drag / (drag + K)          K = 2.0 rad
```

Hiperbolik doyum. Marjinal maliyet gerginlikle patlar: `%50` için **2 rad** (~0.3 tur), `%75` için **6 rad**, `%90` için **18 rad** (~3 tur), `%95` için **38 rad** (~6 tur), `%98` için **98 rad** (~16 tur). Oyuncu son çeyrekte aynı gerginlik için kat kat fazla tur atmak zorunda kalır — sert tavan koymadan doğal sınır.

Tavan gerginlik `MAX_DRAG = 600` ile ≈ **0.9966**; yay asla tam 1'e ulaşmaz.

### 2.2 Bedel ve ödül (tasarımın çekirdeği)

- **Bedel doğrusal:** geri sarılan `T` saniye = kütleden `T × üretim/sn` eksilir. Kadran 120 saniyelik pencereyi temsil eder (`TIME_CLOCK_SPAN_SECONDS`), yani tam sarma = **120 saniyelik üretim** rehin.
- **Ödül kuadratik** (yayda depolanan enerji `½kθ²` ruhu): salgı hızı `peak = 1.5 + 14.5 × t^1.5`, süre `dur = 16 + 59 × t`, sönüm `speed(τ) = 1 + (peak−1)(1−τ)^1.6`.
- Kazanç: `enerji = (peak − 1) × dur / 2.6` (hız eğrisinin analitik alanı) → *"kaç saniyelik normal üretim bedava geldi"*.

| Gerginlik | Peak hız | Süre | Enerji (+sn) | Bedel (sn) | Net | Oran |
|---|---|---|---|---|---|---|
| 0.25 | 3.31× | 30.8 sn | +27.4 | 30 | −2.6 | **0.91× (ZARAR)** |
| 0.50 | 6.63× | 45.5 sn | +98.5 | 60 | +38.5 | 1.64× |
| 0.80 | 11.9× | 63.2 sn | +264 | 96 | +168 | 2.75× |
| 1.00 | 16.0× | 75.0 sn | +432.7 | 120 | +312.7 | **3.61×** |

**Başabaş noktası ≈ gerginlik 0.345.** Bu, mekaniğin bütün derinliğidir: *kütlen azken germek anlamsız, birikmişken germek şart.* Oyuncu "ya iyice ger, ya hiç dokunma" dersini kendi keşfeder; ayrıca sönüm (`0.035 × (0.5 + 0.5t)` gerginlik/sn) yüzünden **durup beklemek istismar değildir** — yay gevşer ve kütle geri gelir (tek yönlü değil, **çift yönlü** yazım: `deltaRewound` negatifse kütle iade edilir).

### 2.3 Denge referansı

Mevcut en güçlü fırsat `Süpernova = 7× / 60 sn` (net +360 sn eşdeğeri). Tam gerilmiş saat **16× / 75 sn** tepe verir, ortalama ~6.8×, ama **120 sn ödenmiş** olduğu için net +312 sn — yani Süpernova ile aynı ligde, üstelik nadir (~4.5 dk'da bir) ve beceri istiyor. Tepe hızın 16× olması *hissi* çok daha büyük yapar; dengede ise onu aşmaz.

## 3. Karar

### 3.1 Faz makinesi ve uçuculuk

```
idle ──spawn──▶ winding ──release──▶ released ──süre biter──▶ idle
                   └──timeout (26 sn)──▶ (otomatik salgı)
```

- `winding` 26 sn (`TIME_CLOCK_LIFETIME_SECONDS`); süre biterse **ceza yok**, o gerginliğin karşılığı kadar ödül verilir (gerçek yay bırakılınca boşalır).
- **Canlı faz uçucudur:** `deserialize` her zaman `idle`'a döner, `floatingAnomalies = []` ile aynı muamele. Yarıda kalmış sarma oturuma taşınmaz; hayalet saat oluşamaz.
- Çevrimdışı simülasyonda saat **hiç doğmaz ve hiç ilerlemez** (`offlineSimActive` kapısı) — oyuncu uyurken kaçırdığı olayı ne kazanır ne kaybeder.

### 3.2 Kapsam: yalnız üretim

Salgı faktörü (`timeClockProductionMult`) **tek yerde** çarpılır: `actions-misc.ts` D1→`matter` hattı. D2→D1 zincir beslemelerine **kasten** dokunulmadı (katlanarak patlar). Buff süreleri, lab yaşlanması ve bot saatleri normal akar — zaman hızı mevcut buff'ları yakmaz.

Parite zorunlu: `matterPerSecond` + `matterProductionBreakdown` aynı faktörü alır (`scale-jumps.test.ts:124-130` bunu kilitler). Faktör **cache'lenen getter'lara konmadı** (`_dimMultCache` bayatlardı). `releaseProfitRatio` yalnız UI'da okunur, ekonomiye girmez.

### 3.3 Yaşam boyu istatistiklerin evi: `stats`

Uygulama ortasında yakalanan mimari tutarsızlık: sayaçlar (`totalRewoundSeconds` / `releases` / `bestTension`) `TimeClockState` içinde "hayat boyu" diye belgelenmişti, ama `timeClock` koşu kapsamlıdır ve `applyResetScope(clearRunFx)` onu sıfırlar → belge ile kod çelişiyordu.

**Karar:** sayaçlar `PlayerStats`'a taşındı (`clockRewinds`, `clockRewoundSeconds`, `clockBestTension`). Repoda istatistiklerin evi `stats`'tır (`anomaliesClicked`, `mythicsClicked`) ve prestijden sağ çıkar. `TimeClockState` artık yalnızca **canlı yay durumu** taşır (7 alan). Böylece `layers.ts` yorumu doğru, sıfırlama semantiği tek anlamlı.

### 3.4 Kilit basamağı

`time_clock`, `decadeGate(120)` (1e120), `order: 1200` — komşuları `seed_gluon` (1e100 / 1000) ve `seed_graviton` (1e125 / 1250); merdiven sıkı artan korunur. Oyuncu saat geldiğinde tick'speed/galaksi/lab ve tohum sistemlerine zaten sahiptir.

### 3.5 UI / ses / efekt

- `TimeClockOverlay.vue` → `#game-main-content` **kardeşi**, yeni `.layer-clock` (z-index **55**: CRT 40 → anomali 50 → **saat 55** → juice 60 → toast 70 → modal 80). Kök `pointer-events-none`, yalnız kadran `pointer-events-auto` → oyunun geri kalanı saat ekrandayken tıklanabilir kalır.
- **Rotary input (repoda ilk):** `pointerdown` → `setPointerCapture` → `atan2(-dy, dx)` → her adım `(-π, π]` aralığına indirgenir (unwrap) → **yalnız saat yönünün tersi** dilim `windTimeClock(delta)`'ya pozitif radyan olarak beslenir. `pointerup`/`pointercancel`/`lostpointercapture` → `releaseTimeClock()`. Merkezde %6 ölü bölge (atan2 kararsızlığı + tek karede 0.6 gerginlik sıçraması engeli). `touch-action: none` şart.
- Salgı fazında kadran sürüklenemez (`pointer-events-none`) ve ibre `cubic-bezier(0.1,0.85,0.3,1)` ile "kamçı" yapıp söner.
- **Uyarı eşiği sabit değil:** `weakRelease = releaseProfitRatio(tension) < 1` → kırmızı çip tam başabaş noktasında (0.345) yanar. Sabit `0.3` yazmak uyarıyı 0.30–0.345 bandında yanlış yere koyardı.
- Sesler: `playClockSpawn`, `playClockWind(intensity01)` (90 ms iç throttle — 60 Hz pointermove akışı osilatörü taramasın), `playClockRelease(tension01)`.
- Parçacık: `FeastSceneId`'ye `time_warp` (sparks 72 — supernova 40 ile crunch 110 arası, cyan→mor→beyaz, `shake: 'hard'`, `big: true`).
- **Motion kapıları:** `useMotionReduced()` yalnız süsleri (konfeti, sarsıntı, dönen süsler) kapatır; **girdi ve okumalar asla kilitlenmez**. Space/Escape bağlanmadı (`Header.vue` Space'i sahipleniyor); `Enter` ile salma var, `role="slider"` + `aria-valuenow/valuetext`.

## 4. Uygulama dalgası

Sözleşme dondurulduktan sonra **4 paralel subagent**, dosya sahipliğine göre çakışmasız:

| Ajan | Kapsam | Sonuç |
|---|---|---|
| **A** | `models/clock.ts`, `game/clock-data.ts` (14 sabit + 12 saf fonksiyon), saf testler | 41/41 test |
| **B** | store: `state.ts`, `getters-clock.ts`, `actions-clock.ts`, `update()` bloğu, üretim faktörü + parite, `store-api.ts`, `game.ts` | 19/19 test |
| **C** | `save-version.ts` (v18), `models/save.ts`, `actions-save.ts`, `layers.ts`, `unlocks.ts` | 18/18 + regresyon 62/62 |
| **D** | `TimeClockOverlay.vue`, `style.css`, `App.vue`, `audio/effects.ts`, `particles.ts` | 14/14 parçacık + rotary matematiği bağımsız script'le kanıtlı |

Orkestratör (bu oturum): keşif dalgası, sözleşme, gerilim/salgı eğrisinin yeniden türetilmesi (ilk tablo eski sabitlerle yazılmıştı), **§3.3 `stats` refactor'ü**, ölü sabit temizliği, entegrasyon doğrulaması, ADR + commit.

## 5. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `npx vue-tsc --noEmit` | **0 hata** |
| `npx vitest run` | **27 dosya / 380 test geçti** (saat'e özel ≈ 64 test) |
| `npm run build` (`vue-tsc && vite build`) | **0 hata**, 1814 modül |
| `npm run harness:smoke` | **baseline değişmedi**: `log10=90.72 shifts=8 gal=1 tickspeed=73 bots=11` (saat 1e120'de kilitli → inert; denge regresyonu yok) |
| Rotary matematiği | CCW tam tur **+6.2832 rad** (72/72 adım), CW tam tur **0**, ±π sınırında sıçrama yok |
| Kayıt round-trip | `drag` sağ çıkar; faz `idle`'a döner; bozuk kayıt (drag 1e9, negatif sayaç, gerginlik 5) clamp'lenir |

## 6. Bilinçli sapmalar

1. **`TIME_CLOCK_PITY_SECONDS` kaldırıldı.** Doğuş aralığı tavanı 330 sn < 600 sn olduğu için sabit hiç ateşlenemiyordu ve hiçbir mantık onu okumuyordu (ölü kod). Ritim deterministik: 240–330 sn.
2. **`TIME_CLOCK_MIN_TENSION` yalnız tasarım tabanı** olarak kaldı; UI eşiği ondan değil `releaseProfitRatio`'dan türetilir (bkz. §3.5).
3. Salgı fazında kadran `pointer-events-none` (16–75 sn boyunca ~520 px ekranı yutmasın).
4. Ömür halkası salgı fazında `speedRemaining / releaseDuration` gösterir (mor) — sarma fazında `remainingTime` (§8.1 birebir).
5. `doomscroll:shake` şölen sahnesine ek olarak ayrıca yayılır (JuiceLayer sınıfı yeniden kurar → çift sarsıntı değil, uzamış tek sarsıntı).
6. `FEAST_SCENE_IDS` export'u repoda yok → yalnız union + kayıt + `BIG_SCENES` + test listesi güncellendi.

## 7. Riskler ve açık kalanlar

- **Tarayıcıda canlı jest testi yapılamadı:** repoda Playwright/jsdom/`@vue/test-utils` yok ve özellik 1e120'de kilitli (doğal doğuş ~4.5 dk). Dairesel matematik bağımsız script'le kanıtlandı; DOM bağlama statik + derleme düzeyinde doğrulandı. **İlk elle oynanışta bakılacak:** kadran parmağın altında kayıyor mu, ölü bölge hissi doğal mı, 26 sn yeterli mi.
- **Denge tek dosyada:** `src/game/clock-data.ts`. Başabaş noktası, tepe hız veya süre ayarı gerekiyorsa yalnız bu dosya değişir; `tests` + `time-clock.spec.ts` bandı kırılırsa ayarın yönü hemen görülür.
- **Hız sıçraması (teorik):** unwrap her pointermove adımını `(0, π]` ile sınırlar; 120 Hz örneklemede 95% gerginliğe 1 saniyenin altında ulaşmak fiziksel olarak mümkün. Bu bir istismar değil, mekaniğin ödüllendirdiği beceri kabul edildi (sert yay zaten son çeyrekte teslim hızını düşürür).
- **Gelecek fırsat:** `stats.clockRewinds` / `clockBestTension` artık kalıcı → başarım ve `StatsTab` girdisi için hazır zemin.
