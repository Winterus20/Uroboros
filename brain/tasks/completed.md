# Tamamlanan Görevler ve Değişiklik Günlüğü (Changelog)

## [2026-10-15] ✔ — Geç Oyun Tick Performansı: Reaktivite Muafiyeti, Memoizasyon ve Deterministik Perf Bench (ADR-0059, v0.38.1)

### Problem:
- Termux/Android ölçümünde geç oyun **churn** senaryosu (break_singularity sonrası, shift/galaksi botları sürekli prestige ederken) mean **~20.5 ms**, p95 **~62 ms**; CPU profilinde tick bütçesinin **~%25'i** Pinia/Vue derin reaktivite proxy `get` tuzağında eriyordu — her Decimal örneği proxy'ye sarılıyordu.
- `dimensionCostForBucket` ~18.2 µs/çağrı (iki `Decimal.pow`), küçük sayı biçimlendirmesi ~73 µs (`Intl` formatter her çağrıda yeniden kuruluyordu), satın alma botlarında tüketilmeyen `matterPerSecond` okuması ve tick başına onlarca kez `completedChallenges.join(',')` tekrarı.
- Eski perf kurgusu reset tetikleyen botlar yüzünden farkında olmadan "reset sonrası ara durum" ölçüyordu; A/B karşılaştırması güvenilir değildi.

### Çözüm:
- `src/core/math.ts`: `Decimal.prototype.__v_skip` — tüm Decimal'ler reaktivite proxy'sinden muaf. Güvenlik kanıtı: kod tabanında Decimal yerinde mutasyonu YOK (`.mag =`, `.assign()`, `.copyFrom()` taraması); her güncelleme yeni örnek atamasıdır ve atama reaktif `set`'i zaten tetikler.
- `src/game/balance.ts`: `dimensionCostForBucket` Map memoizasyonu (baseCost/fullMult **referans korumalı**), `calcDimensionExactTotal` hizalı kova (`take === 10`) hızlı yolu, `calcTickspeedExactTotal` kapalı form (floor katmanı — özel mod/başarım/meydan okuma — devredeyken eski döngü birebir korunur).
- `src/core/format.ts`: sabit seçenekli tek `Intl.NumberFormat` örneği yeniden kullanılır.
- `src/stores/game/`: `memoCompletedJoin` (`cache.ts`, referans+uzunluk anahtarlı) — `memoChallengeEffects` ve `getDimensionMultiplier` paylaşır; bot yollarında `mpsBefore = feedbackSurge ? this.matterPerSecond : D_0`.
- **Kalıcı perf altyapısı:** `brain/scratchpad/harness/perf-tick.ts` (churn/wall senaryoları; `Math.random` sabit + `Date.now` sanal → deterministik) + `build-perf.mjs` + `npm run harness:perf`.

### Doğrulama (A/B kanıtı — git stash karşılaştırması, 3 koşu):
- **churn mean: ~20.5 ms → ~5.9 ms (~3.5×)**; p50 14→5.5 ms, p95 62→13.8 ms, p99 ~69→~15 ms. **wall mean: 1.35 → 0.79 ms (~1.7×).**
- İki derlemede `warmupState`/`endState`/`workload` sayaçları **birebir eşit** → optimizasyonlar davranışı değiştirmedi, yalnızca hızlandırdı.
- `npm test`: **18 dosya, 263/263 yeşil** · `npm run build`: **0 hata** · `npm run harness:smoke`: **PASS** (log10=90.7, 8 shift).

## [2026-10-14] ✔ — Planck Duvarı Sert Kilit (Hard-Cap) ve Break Singularity Ritüeli (ADR-0056)

### Problem:
- `break_singularity` yükseltmesi satın alınmamışken bile kütle $1.797 \times 10^{308}\text{ g}$ (`D_INFINITY`) sınırını aşabiliyor, bu da "Planck Duvarı"nın gerçek bir engel olma anlamını ve duvarı kırma anındaki dopamini yok ediyordu.
- Break Singularity alındığında taktil geribildirim sıradan bir pasif yükseltme gibiydi; kırılma anına özel ses, ekran sarsıntısı ve görsel patlama yoktu.
- `SingularityTab.vue` içinde `singularityBroken` yalnızca `store.singularityUpgrades?.break_singularity` kontrol ediyordu; Nöral Ağaç üzerinden alınan yükseltmeyle tam senkron değildi.

### Çözüm:
- **Sert Kilit (Hard-Cap):** `actions-misc.ts` içinde `addMatter()` metoduna ve ana tick döngüsüne sert tavan eklendi: `!hasBreakSingularity && matter.gte(D_INFINITY)` iken kütle `D_INFINITY` değerinde durur.
- **SP & Eşik Sözleşmesi:** Planck Duvarı kırılmamışken kütle tavanda durur ve ilk çöküş tam 1 SP verir (ADR-0034 ile tam uyumlu); `nextSingularityPointAt` kilitliyken `D_INFINITY` döner. Kırıldıktan sonra $10^{318}$ (5 SP), $10^{332}$ (10 SP) üstel büyümesi başlar.
- **Taktil Kırılma Ritüeli:** `buyNeuralNode` ve `buySingularityUpgrade` içinde `break_singularity` alındığında `sounds.playSingularity()`, 160 parçacıklı kozmik konfeti ve `doomscroll:screen-shake` (level: `hard`) ekran sarsıntısı tetiklenir.
- **Olay Ufku Doyum UI Bildirimi:**
  - `CounterDisplay.vue`: Kütle tavana ulaştığında (`isMatterCapped`) sayacın üstünde kırmızı neon `⚠️ PLANCK DUVARI KİLİTLİ: OLAY UFKU DOYDU (1.79e308 g) — ÇÖKÜŞ ZORUNLU` uyarısı çıkar ve saniyelik üretim `0 g/s [Olay Ufku Kilitli]` olarak netleşir.
  - `SingularityTab.vue`: TabHero rozeti `⚠️ Planck Duvarı Kilitli` ve `⚡ Planck Sınırı Yıkıldı` durumlarına bağlanır; sonraki SP eşiği duvar durumunu yansıtır.
- **Testler:** `src/stores/balance.test.ts` güncellendi ve yeni sert kilit/serbest bırakma testleri eklendi.

### Doğrulama:
- `npm test`: **17 dosya, 259/259 test yeşil**.
- `npm run harness:smoke`: **30 dk aktif koşu log10=90.72, 8 shift, 0 hata — 2-3 saatlik ilk çöküş bandı korundu**.
- `npm run build`: **0 tip hatası, 0 derleme hatası, 1781 modül derlendi**.
- ADR: `brain/decisions/0056-break-singularity-hard-cap-and-progression.md`.

## [2026-10-14] ✔ — Faz 0 Doruk Noktası (Climax), 1e160-1e308 Köprü Kilitleri ve VDOM Optimizasyonu

### Problem:
- 1e160 (`guilt_slackers`) sonrasında 1e308 (`night_watch`) Tekillik eşiğine kadar 148 dekad boyunca sıradaki kilit merdiveni boş kalıyordu; oyuncu saatlerce tek bir kilit ilerlemesi görüyordu.
- 1.79e308 g Tekillik (Big Crunch) eşiğine ulaşıldığında işitsel ve görsel doruk noktası (climax) yetersizdi; `playSingularity()` eski temadan kalma 6 AM kuş cıvıltılarını çalıyordu.
- `DimensionRow.vue` içinde sahip olunan miktar metni doğrudan şablonda her 50ms'lik render'da `format(...)` çağırarak VDOM yükü yaratıyordu.

### Çözüm:
- **Dekad Köprü Basamakları:** `src/game/unlocks.ts` içine 3 adet ara kozmik basamak eklendi:
  - 1e200: `event_horizon_lens` ("Olay Ufku Merceği")
  - 1e240: `hawking_resonator` ("Hawking Rezonatörü")
  - 1e280: `cosmic_filament` ("Kozmik İplikçik Dokuması")
  Sıradaki kilit başlığı artık derin kozmik aşamaları adım adım oyuncuya hissettirir.
- **Kozmik Climax & Görsel/İşitsel Efekt:**
  - `src/components/header/CounterDisplay.vue` içine `canSingularity` aktifleştiğinde çalan kristal bildirim akoru (`playAffordableNotice`) ve altın renkli nabız animasyonlu `EVRENSEL TEKİLLİK EŞİĞİ AŞILDI — KOZMİK ÇÖKÜŞ HAZIR` durum rozeti eklendi.
  - `src/core/audio/effects.ts` içindeki `playSingularity()` sesi modernize edildi: eski sabah kuşları kaldırıldı, yerine derin gravitasyonel içe çöküş (880Hz → 110Hz sawtooth sweep), Lydian kuantum rezonans ışıması (C5, E5, G5, B5, E6) ve epik kozmik fanfar akorları entegre edildi.
- **VDOM Performansı:** `DimensionRow.vue` içindeki `format(props.dimension.amount, ...)` çağrısı 220ms'lik `displayAmountText` reaktif önbelleğine taşındı.

### Doğrulama:
- `npm test`: **17 dosya, 257/257 test yeşil**.
- `npm run build`: **0 tip hatası, 0 derleme hatası**.

## [2026-10-14] ✔ — Faz 0 (0 → 1e308 g) Kapsamlı İnceleme, Tematik Stabilizasyon & Mimari Hata Düzeltmeleri (ADR-0055)

### Problem:
- 3 uzman subagent incelemesiyle tespit edilen tematik kalıntılar: Autobuyer isimleri "Kedi Videoları", "Subway Surfers"; Nöral Ağaç "Göz Damlası", "120W GaN Adaptör"; Header telemetrisi 02:47 gece saatinde kalmıştı.
- `DimensionsTab.vue` içinde Antimatter Galaxy kartının adı "Kozmik Çöküş" idi ve 1.79e308 Tekillik prestijiyle çakışıyordu.
- Kütle Patlaması anomali çarpanı kodda `100` iken UI ve GDD `777×` diyordu (gizli nerf).
- Wrinkler (Parazit) ilk koşuda %105 iade ediyordu (GDD %120 vaat ediyordu).
- Web Audio sıfır seste `RangeError` veriyordu.
- `game-loop.ts` 250ms clamp ile lag durumlarında saniyeleri çöpe atıyordu.
- Çevrimdışı ilerlemede autobuyer'lar 300 sn kaba adımda yalnızca 1 alım yapıyordu.
- `AlgorithmicSwirl.vue` her 60 FPS karesinde `tickspeedMultiplier` Decimal getter'ını hesaplatıyor ve unmount'ta WebGL kaynaklarını sızdırıyordu.

### Çözüm:
- **Tematik Senkron:** Autobuyer isimleri `state.ts`'te Uroboros kozmik boyut isimlerine dönüştürüldü. `NEURAL_TREE` düğümleri Uroboros terminolojisiyle senkronlandı (ID'ler birebir korundu).
- **Kavram Ayrışımı:** Galaksi kartı "Kozmik Kümeler" (`Cosmic Galaxies`), butonu "Küme Kur" olarak düzeltildi. D4 ve D5 arasına özel neon "Planck Yırtılması / Mikro Karadelik" bariyeri eklendi.
- **Header Telemetrisi:** 02:47 gece saati kaldırıldı; yerine `1eX g` logaritmik kozmik telemetri ve ilerleme çubuğu konuldu.
- **Matematik & Denge:** Kütle Patlaması çarpanı 777×'e eşitlendi. Wrinkler iade oranı %120'ye (`1.20`) yükseltildi. Kombo metinleri eşitlendi.
- **Mimari & Performans:** Web Audio `safeVolume()` tabanı `0.0001`'e çekildi; sessizde `getContext()` bypass edildi. `game-loop.ts` 1 saniye ve üstünü `simulateOfflineProgress`'e yönlendirdi, 1 sn altı için 20 adıma kadar accumulator tamponu sağlandı. Çevrimdışı autobuyer alımı birikim kadar (`min(triggers, 30)`) çalıştırıldı. WebGL shader'da `tickspeedMultiplier` okuması 500ms throttle edildi; unmount'ta shader ve buffer'lar temizlendi. `D_INFINITY` `Object.freeze` ile donduruldu. `unlockProgressFraction` log10 taşması düzeltildi.

### Doğrulama:
- `npm test`: **17 dosya, 257/257 test yeşil**.
- `npm run build`: **0 tip hatası, 0 derleme hatası**.
- ADR: `brain/decisions/0055-phase0-comprehensive-stabilization.md`.
- Master Rapor: `phase-0-comprehensive-review.md`.

## [2026-10-10] ✔ — Test Harness Konsolidasyonu (ADR-0053, Tek Kapı)

### Problem:
İki katmanlı harness dağınık ve keşfedilemezdi: Vitest `tests/` klasörünü
görmüyordu (lab-rebalance shim ile dolambaçlı koşuyordu), 6 store testi aynı
Pinia kurulumunu tekrarlıyordu, `isNan` kuralını pinleyen test yoktu, sim
harness `npm run` ile çalışmıyordu ve sonuçlar göz kararı okunuyordu.

### Çözüm:
- `vitest.config.ts`: include `src` + `tests`, `setupFiles: src/test/setup.ts`, `testTimeout` 60 sn.
- Yeni: `src/test/helpers.ts` + `src/test/setup.ts`, `src/core/math.test.ts` (6),
  `src/stores/smoke.test.ts` (2, gerçek store'da 5 dk aktif oyun).
- Silindi: `src/game/lab-rebalance.test.ts` shimi (spec tek kaynak).
- 6 store testinden tekrarlı Pinia kurulumu silindi (global setup'a taşındı).
- `package.json`: `esbuild ^0.25.0` devDep; `typecheck`, `test:watch`,
  `harness:build/smoke/assert/full`, `verify` scriptleri.
- Yeni: `brain/scratchpad/harness/assert-results.mjs` (`--smoke`/`--full`, exit 1).

### Doğrulama:
- `npm run test`: **17 dosya, 257 test yeşil**.
- `npm run harness:smoke`: **6/6 assert geçti** (log10=89.7, shifts=8, ~30 sn).
- `npm run build`: **0 tip hatası**.

## [2026-10-10] ✔ — Kademeli Maliyet İvmelenmesi (Progressive Cost Acceleration — ADR-0051)

### Problem:
Oyunda maliyet zinciri ile üretim zinciri **aynı sabit hızda** büyüyordu (her 10 alımda maliyet ×COST_MULTS sabit, üretim ×1.595 sabit) → takas oranı hiç değişmiyor → dekadlar gittikçe daha hızlı geçiliyor → duvar algısı yok, tekilliğin anlamı kayboluyordu. Harness kanıtı: koşunun 250→260 dekad aralığı **2.3 saniye** sürüyordu (runaway buy-loop).

### Çözüm:
- **`src/stores/game.ts`:** `dimensionCostForBucket` darboğazına `dimensionCostAccelerationFactor` eklendi: `cost(b) = merdiven_maliyeti(b) × 10^(S·d(d−1)/2)`, `d = b − B0`. `B0_BUCKET_THRESHOLD = 30` eşiği altı fiyatlar ivmelenme öncesiyle **birebir aynı** (ADR-0023/ADR-0026 korunur); üstte efektif kova oranı her kovada tam `COST_ACCEL_DECADES_PER_STEP = 0.02` ondalık ivmelenir. B0'da kesintisizlik garantili (değer ve ilk oran sıçramaz).
- `BASE_COSTS`/`COST_MULTS`/`EARLY_D*` sabitleri test doğruluğu için export edildi.
- **`src/stores/cost-acceleration.test.ts`:** 8 yeni test — (a) eşik altı birebir identiklik, (b) monoton oran artışı, (c) UI darboğazı + maksimum alım + geometrik seri (tickspeed) tutarlılığı, (d) eşikte kesintisizlik.
- **ADR:** `brain/decisions/0051-progressive-cost-acceleration.md`. Harness araçları: `analyze-decades.mjs`, `cost-table.mjs`.

### Doğrulama:
- `npx vitest run`: **233/233 test yeşil** (13 dosya).
- `npm run build`: vue-tsc + vite build **0 hata**.
- Post-accel harness koşusu (active, seed 1, dt 0.1) arka planda; sonuç `results-post-accel.json` + ADR §7'ye işlenecek.

## [2026-10-10] — Bot / Otomatikte Sürekli Ekran Sallanması (Screen Shake Spam) Kökten Çözüldü

### Kök Nedenler ve Yapılan İyileştirmeler:
1. **Autobuyer Otomatik Tetikleme İzolasyonu (`src/stores/game.ts`):**
   - Botlar otomatik olarak Akış Sıçraması (Dimension Shift / Boost) bastığında (`dimensionShift(false)`), `playSound === false` olmasına rağmen koşulsuz fırlatılan `doomscroll:macro-surge` (ve bunun tetiklediği orta sarsıntı) ve `celebrateFormatUnlock` sarsıntısı artık `playSound` korumasına alındı. Botlar otomatik çalışırken bu görsel ve işitsel sarsıntı zincirleri tetiklenmez.
2. **Kütle Patlamasında Dekad Sarsıntısı Spam Koruması (`src/components/Header.vue`):**
   - `checkDecade()` fonksiyonunda her tek dekad (10 katlık artış) için fırlatılan `doomscroll:shake (soft)` tamamen kaldırıldı; yalnızca tiz bildirim sesi bırakıldı.
   - 10'arlı büyük dekadlar (1e10, 1e20, 1e30...) için 4000ms'lik katı cooldown (`lastDecadeShakeAt`) eklendi. Botlar çalışırken kütle üssel roketlendiğinde ekranın her saniye titremesi engellendi.
3. **Merkezi Anti-Spam Sarsıntı Sınırı (`src/components/JuiceLayer.vue`):**
   - `handleShakeEvent` içine hız kontrolü (`lastShakeAt`) eklendi: Soft sarsıntılarda en az 600ms, orta sarsıntılarda en az 400ms aralık zorunlu kılındı.
   - `store.settings.screenShake === false` ve `juiceMode === 'calm'` durumlarında sarsıntı tamamen kapatıldı ve açıkta kalan sınıflar anında temizlendi.
4. **Kullanıcı Ayarı - Ekran Sarsıntısı (Screen Shake) Toggle'ı (`src/components/SettingsModal.vue` & `types.ts`):**
   - Görsel & Ekran ayarlarına "Ekran Sarsıntısı (Screen Shake)" açık/kapalı seçeneği eklendi.
5. **Birim Testleri (`src/core/screen-shake.test.ts`):**
   - 2 yeni birim testi eklendi (ayar kapalıyken sarsıntı eklenmemesi ve anti-spam hız sınırı). 226/226 test yeşil.

## [2026-10-10] — UROBOROS Saf Kuantum-Kozmik Dönüşümü & Antimatter Dimensions Kütle Prestiji

### Kapsam:
- **Saf UROBOROS Tematik Arınması:** Doomscroll/yatak/telefon/uyku kalıntıları tamamen temizlendi. `pacing.ts`'teki 9 dekad bandı, `unlocks.ts`'teki tüm ipuçları/başlıklar, `GUILT_NAMES` (Kozmik Radyasyon Parazitleri) ve `AnomalyOverlay.vue` (Süpernova 7×, Kütle Patlaması 777×) saf kuantum-kozmik tekillik anlatısına kavuşturuldu.
- **Antimatter Dimensions Tarzı Kütle Ölçekli Prestij (`singularityGain`):** Yapay "Break Singularity yoksa 1 SP" barajı kaldırıldı. Artık 1.79e308 g kütleden itibaren oyuncunun yuttuğu kütle ne kadar fazlaysa logaritmik formülle katbekat daha fazla Tekillik Puanı (SP) kazanılıyor.
- **Canlı Sonraki SP Eşiği (`nextSingularityPointAt`):** Hem `Header.vue`'da hem de `SingularityTab.vue`'da oyuncunun bir sonraki +1 SP'yi alabilmesi için gereken kütle canlı rozet ve tooltip olarak gösteriliyor.
- **Denge & Test Senkronizasyonu:** `src/stores/balance.test.ts` güncellendi, 224/224 test yeşil.

### Doğrulama:
- `npx vitest run`: 224/224 test yeşil (12 dosya).
- `npm run build`: vue-tsc ve vite build 0 hata ile tertemiz.

### Kapsam:
- src/stores/game.ts: Sonsuz spam exploit'i kökten çözüldü (3 Kriyojenik Kartuş rezervi, 20-45s bireysel cooldown'lar, 120s buff tavanı ve Tatlı Nokta Rezonans Momenti 1.0x-5.0x).
- src/components/CrisisTab.vue: TabHero Kriyojenik Rezerv 3'lü pil, Rezonans Momenti rozeti, kartlarda canlı cooldown sayacı ve buton durumları.
- src/stores/crisis-reactor.test.ts: 4 yeni birim testi (kartuş tükenmesi, cooldown, buff tavanı, momentum). 15/15 yeşil.
- src/models/types.ts: SerializedPlayerState içine yeni termal alanlar ve save/load tam geriye dönük uyumluluk.

### Doğrulama:
- npm test: 224/224 test yeşil (12 dosya).
- npm run build: vue-tsc ve vite build 0 hata ile tertemiz.
- Playwright canlı tarayıcı testi: Taktil cooldown sayacı ve buton kilitleri başarıyla doğrulandı.


## [2026-10-08] — Lab P0+P1 rebalance (QoL + denge + reviewer düzeltmeleri)

### Kapsam:
- `src/components/LabTab.vue`: toplu hasat/ek, hype `+%X/sn` hızı, rezonans önizleme (foton/graviton/merkez+ağır), cooldown butonu (`canTriggerViralDrop` + geri sayım), efektif maliyet gösterimi.
- `src/stores/game.ts`: tohum maliyet ölçekleme (log10>65 her 25 dekad ×2, tavan ×64), vent cooldown 120sn (`lastViralAt` + save/load uyumu), egzotik lone-penalty 4'lü (`1+(b-1)/2`, magnetic dahil), fluctuation hasat ×2 %20.
- `tests/lab-rebalance.spec.ts` + `src/game/lab-rebalance.test.ts`: 21 test, gerçek tip birliği (`balanced` kaldırıldı), egzotik formül oyunla eşitlendi.
- `brain/decisions/0050-lab-rebalance.md`: ADR.

### Doğrulama:
- `npm run build` temiz (1707 modül, 0 hata).
- `npx vitest run` 220/220 geçti.

## [2026-10-08] — Emin misin kutuları sarsıntıda kaymıyor (Teleport fix)

### Kapsam:
- `src/components/ConfirmModal.vue`: kök overlay `Teleport to="body"` içine alındı — `#game-main-content` shake transform'u artık fixed kutuyu hapsetmiyor, kutu viewport ortasında sabit kalıyor.

### Doğrulama:
- `npm run build` temiz (1707 modül, 0 hata).

## [2026-10-08] — Bot kilidi açılınca açık botlar otomatik vites yükseltir

### Kapsam:
- `src/stores/game.ts`: `unlockBulkMode()` artık kilidi açarken `unlocked && enabled` botları (singularity hariç) `bulk` + interval + timer sıfırlar; `unlockMaxMode()` aynı şekilde `max` moduna geçirir. Kapalı botlara dokunulmaz.

### Doğrulama:
- `npm run build` temiz (1707 modül, 0 hata).

## [2026-10-08] — Konfeti kapısı (yalnızca kullanıcı eyleminde kutlama)

### Kapsam:
- `src/core/celebrate.ts` (yeni): `isPageVisible()` + `safeConfetti()` tek kapı — gizli sekmede asla konfeti yok.
- `src/stores/game.ts`: tüm doğrudan `confetti()` çağrıları `safeConfetti()`'ye çevrildi (20 nokta); `activeGameTab` + `setActiveGameTab()` eklendi (kayıt edilmez); `checkAchievements()` gizli sekmede sessiz (toast kuyruğu yine birikir); lab oto-sentezi yalnızca `lab` sekmesinde + görünürken kutlar; `completeChallenge(celebrate)` eklendi — `update()` oto-tamamlama ve bot yolu `false` geçiyor, manuel butonlar kutlamaya devam ediyor; `singularityReset` bayrağı challenge yoluna taşınıyor.
- `src/components/Header.vue`: dekad konfetisi `safeConfetti` + görünürlük kapısından geçiyor.
- `src/components/AnomalyOverlay.vue`, `CommentTicker.vue`: tıklama konfetileri aynı kapıdan geçiyor (manuel eylem korunur).
- `src/App.vue`: `activeTab` store'a senkronlanıyor (switch + watch immediate + kilit geri dönüşü).

### Doğrulama:
- `npm run build` temiz (1707 modül, 0 hata).
- `npm test -- --run` 199/199 geçti.

## [2026-10-08] — Plaket Sıradaki + ödül şerit çakışması

### Kapsam:
- `AchievementsTab.vue`: ödüllü karttaki yeşil sol şerit, kart aynı zamanda "Sıradaki" ise basılmıyor — amber halka tek vurgu olarak kalıyor, renk çakışması bitti.

### Doğrulama:
- `npm run build` temiz (1706 modül, 0 hata).

## [2026-10-08] — Plaket kart taşma + boy eşitliği düzeltmesi

### Kapsam:
- `AchievementsTab.vue`: ızgara 4→3 sütun (dar kartta rozet sığmıyordu), ödül rozetinde `nowrap` ezildi + satır içi kayma (`[white-space:normal]`, `break-words`, `max-w-full`), başlık satırı `items-start` + esnek isim alanı, kartlara `min-w-0 overflow-hidden h-full`, ızgaraya `items-stretch`, başlık/açıklama `line-clamp-2` + minimum yükseklik, alt rozet yuvası her kartta sabit (`min-h-[1.75rem]`, ödülsüz kartta boşluk bırakır) — satır içi boylar eşit, ödüller alt çizgide hizalı.

### Doğrulama:
- `npm run build` temiz (1706 modül, 0 hata).

## [2026-10-08] — Plaket UI/UX revizyonu (filtre + arama + sıradaki hedef + toast aksiyonu)

### Kapsam:
- `AchievementsTab.vue`: yapışkan araç çubuğu (arama + Tümü/Ödüllü/Açılan/Kilitli + Daralt/Aç + genel ilerleme), alt başlık sadeleşti (formül details içine), kategori başlığı daraltılabilir buton + tam satır rozeti, ödüllü kartta yeşil sol şerit + hediye rozeti, kilitli kart opaklığı 45->60 + sıradaki hedefe amber halka, boş filtre durumu eklendi, şablon içi filter() O(n²) yerine grup haritası.
- `AchievementToast.vue`: "İncele" butonu (plaket sekmesine götürür), 4sn ilerleme çizgisi, kapatma ipucu, z-50.
- `App.vue`: `uroboros:goto-achievements` dinleyicisi + `handleGotoAchievements` (toast -> sekme geçişi), cleanup eklendi.

### Doğrulama:
- `npm run build` temiz (1706 modül, 0 hata).
- `balance.test.ts` 14/14 geçti.

## [2026-10-08] — Satır cila (alt yazı + rozet hiyerarşisi + Çöküş teaser + ticker guard)

### Kapsam:
- `DimensionRow.vue`: satır altı açıklama kaldırıldı (bilgi isim tooltip'ine taşındı); çarpan rozeti ikincil dile çekildi (nötr silik), milestone rozeti öne çıktı.
- `DimensionsTab.vue`: hedef boyut kilitliyken Çöküş kartında ölü ilerleme yerine teaser (`D8 açılınca aktifleşir`).
- `CommentTicker.vue`: boş metinli haber seçilirse dolu bulunana kadar yeniden seçim (bant boş kalmaz).

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — Alt kısım cila (SI rozet + yüzde etiketi + satır vurgusu)

### Kapsam:
- `DimensionRow.vue`: rozette taşan üs yazısı yerine SI sembolü (nm/pm/fm/am/m/Mm/Gm/kpc); tam ölçek tooltip'te duruyor. Sol vurgu çizgisi duruma bağlandı (alınabilir mor, diğerleri sönük).
- `App.vue`: arc bar yüzdelerine etiket eklendi (`ufuk %3,1` / `kilit %67`).

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — Header kayma düzeltmesi (stance latch + sabit aksiyon sırası)

### Kapsam:
- `Header.vue`: stance görünürlüğü `localStorage` mührüyle yapışkan yapıldı (`uroboros-stance-seen`); D1×25 önizlemesi sıçramada sıfırlanıp barı kapatmıyor.
- Kontrol çubuğu yan-yana düzenden alt-alta iki sıraya çevrildi (üstte duruş, altta aksiyon); YUT grubu hep sağda sabit, duruş açılması yatayda itme yapmıyor.

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — ADR-0049 P1 en-iyi-hâl

### Kapsam:
- `AnomalyOverlay.vue`: edition sıradan anomalilerden kaldırıldı (yalnızca void/heart_frenzy poly); beam ve shimmer yalnızca void kapsülünde; kategori rozeti 9px mono→10px sans.
- `Header.vue`: YUT butonundan sürekli `btn-sheen` söküldü + mono→sans; Space rozeti 10px.
- `DimensionRow.vue`: açıklama satırı mobilde gizlendi (sm+ görünür, 11px silik); satır taranır kaldı.
- `LabTab.vue`: birincil buton dili sakinleştirildi (emoji+caps gitti, Inter ton); viral başlık sakin dile çekildi.

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — ADR-0049 Okunaklı Balatro P0

### Kapsam:
- `brain/decisions/0049-legible-balatro-design-language.md` açıldı (zemin sakin + kart karakterli, semantik 5 renk, dozunda efekt, çift ton dil).
- `src/components/DimensionRow.vue`: TIER_ACCENT_COLORS nötrlendi (D1-D7 slate, D8 amber-beyaz özel); ölçek rozeti 9px→10px; sinerji rozeti ve paket satırı mono→sans + 10px; satın alma butonu mono→sans.
- `src/components/Header.vue`: sayaç sürekli nabzı kapatıldı (`counterHeatClass` boş döner, `rateTier` kaldırıldı); alev histerezisi devre dışı (`flameOn` hep false); olay anı efektleri (`count-pop`, `decade-flash`) korundu; `AlgorithmicSwirl` arka planına dokunulmadı.

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — Yutulan Kütle sayacı smooth akış düzeltmesi

### Kapsam:
- `src/components/Header.vue`: 220ms `setInterval` (~4.5Hz) kaldırıldı; metin tazeleme mevcut `tickSmooth` rAF döngüsüne taşındı.
- Ana sayaç ~12Hz (80ms), yan metinler (hız/fiyat) ~2Hz (500ms); pil tasarrufu / hareket kapalı modda sayaç 500ms'ye düşer.
- Ayrı timer kalktı, tek rAF döngüsü kaldı (timer sızıntısı yok, `onUnmounted` temizliği güncellendi).

### Doğrulama:
- `npm run build` temiz (1705 modül, 0 hata).
- `throttledTextInterval` referansı kalmadı (grep temiz).

## [2026-10-08] — GPL-3.0-or-later lisanslaması

### Kapsam:
- Resmi GPL-3.0 metni gnu.org adresinden alınıp verbatim `LICENSE` dosyası olarak eklendi.
- `package.json` içine `"license": "GPL-3.0-or-later"` alanı eklendi.
- README Lisans bölümü güncellendi (telif + copyleft sonucu) ve rozet eklendi.
- Doğrulama: `npm run build` temiz (1705 modül, 0 hata).

## [2026-10-08] — README sıfırdan yazımı (v0.38.0)

### Kapsam:
- İnternetten README en iyi pratikleri araştırıldı (Best-README-Template, readme-best-practices, freeCodeCamp yapısı).
- README.md sıfırdan yazıldı: rozetler, içindekiler, lore, D1-D8 tablosu, nasıl oynanır, hızlı başlangıç, teknoloji yığını, repo yapısı, mimari notlar, kayıt, Firebase, testler, yol haritası, katkı düzeni, teşekkür, lisans notu.
- Doğrulama: dosya okundu, Faz durumu todo.md ile tutarlı (Faz 0/1 ✅, Faz 2/3 ❌).

## [2026-10-08] — Full Codebase Review Fix Pass (v0.38.1-dev)

### Kapsam:
- 5 paralel subagent review bulgularının tamamı düzeltildi (core/store/UI/güvenlik/mimari).
- core: slot-wipe→tek slot temizliği, copySlot doğrulama, deleteSlot yetim anahtar temizliği, saveSuppressed restore, slot başına sayaç, 500K import guard, accumulator clamp, pagehide/beforeunload, precision clamp, e12.35 regex, 999.5 format, badge negatif guard + D() sabitleri, audio resume catch + volume clamp, D_0 freeze, D() guard.
- store: dim-cost cache anahtarı + clear, buff isValid listesi + deserialize süreleri, challenge sayaç serialize, settings whitelist, customRule serialize, maxAge null, sayısal clampSavedNumber, neural maxLevel + 40 cap, strict boolean, FEATURE_IDS filtre + slice cap, mag>1e9 fallback, customAudioUrl https allowlist, singularity 8 id, offline 8k→1.8k iterasyon + log, growth yorumu, buyUnits guard yorumu.
- UI: indir butonu gerçek download, file 1MB guard, import 500K guard, aria-live off + 5sn SR özeti, rAF 2Hz, tipli emits, displayCost gerçek fiyat, 4.5Hz throttled metinler, for-max, confirm payload, customUrl watch, py-0.2→py-0.5, saveFeedback ayrımı, timeout cleanup, aria-label/tab rolleri/label, godmode SELECT+contentEditable.
- config/docs: package 0.26.0→0.38.0, news NewsStoreView + resetNewsState, vite-env any→union, vite/vitest __dirname→fileURLToPath, README Quantum Horizon→UROBOROS, tech-context §3 (firebase/vitest/music/cloud), AGENTS §4 harita, GDD durum indexi.

### Doğrulama:
- npm run build: 1705 modül, 0 hata.
- npm test: 11 dosya, 199/199 yeşil.

## Eski Kayıtlar (Önceki Günlükler)

## [2026-10-06] — Kuantum Parçacık Reaktörü, Akı Matrisi & Kozmik Relikler (Lab Hibrit Reformu v0.38.0)

### Kullanıcı Talebi ve Mimari Kararlar:
- **Lab Bölümü Düşünce Ortaklığı:** Kullanıcıyla birlikte Lab sekmesinin oyunun genel kozmik bilimkurgu temasına (*UROBOROS: The Cosmic Feast*) nasıl uyarlanacağı tartışıldı; *Cookie Clicker Garden*, *Synergism Particle Accelerator* ve *Reactor Idle* devlerinden çıkarılan derslerle 3 büyük vizyon harmanlanarak en iyi hibrit sistem planlandı.
- **Sıfır Geriye Dönük Uyumluluk:** Eski konseptten kalma tohum (*cat_audio*, *cheese_sizzle*, *subway_beat*, *sigma_phonk*, *mukbang_drama*, *cat_burger*, *brainrot_remix*) ve mod (*fyp*, *evergreen*, *mutation*) adları geriye dönük shim/zombi kod bırakılmaksızın tamamen tasfiye edildi.
- **Kozmik Relik Kurbanı (Garden Sacrifice Felsefesi):** 4 temel ve 4 egzotik parçacığın tamamı sentezlendiğinde reaktörü tekilliğe feda edip kalıcı meta-ödüller (*Hz tabanı, Kriz süresi, SP kazancı, hücre başı boyut ivmesi*) kazanma döngüsü kuruldu.

### Gerçekleştirilen Geliştirmeler:
1. **Saf Kuantum Parçacık Kataloğu (src/models/types.ts & src/stores/game.ts):**
   - Temel Parçacıklar: photon_resonator (⚡), heavy_nucleon (⚛️), gluon_binder (🌀), graviton_trap (🕳️).
   - Egzotik Sentezler: dark_matter_core (🌌), magnetic_shield (🛡️), 	achyon_flux (💫), higgs_boson (💥).
   - slackerLeechPercent: Manyetik Plazma Kalkanı parazit emişini %25 soğurur.
   - Başarımlar: higgs_boson (Kozmik Mutasyon ve Saf Tekillik İzotopu) tetikleyicisi güncellendi.
2. **Akı Devresi & Süperiletken Işın Hatları (src/components/LabTab.vue & src/stores/game.ts):**
   - Merkez Hücre 4: Kuantum Odak Çekirdeği (×1.50, komşulara +%20 plazma).
   - Süperiletken Işın Hatları: 3 hücre dolu satır/sütunlarda ×1.12, mono-izotopta ×1.20.
   - Rejimler: overdrive (Aktif / %80 hızlı şarj, 2x boşalım), superconductor (AFK / 2.5x sabit pasif kütle), luctuation (Keşif / 3x sentez şansı).
3. **Süperkritik Boşalım (Supercritical Venting):**
   - 	riggerSupercriticalVent: Kritik kütle %100 olduğunda 60s kütle patlaması, 25s boyunca ×5 - ×25 canlı plazma katsayısı ve 3× Kozmik Kriz sağanağı.
4. **Kozmik Relik Seviyeleri & Reaktör Çöküşü:**
   - collapseReactor: Tüm parçacıklar sentezlendiğinde reaktörü tekilliğe kurban etme.
   - Seviye 1: Çekim Hızı (Hz) tabanına kalıcı bonus.
   - Seviye 2: Kozmik Kriz etki sürelerine kalıcı bonus.
   - Seviye 3: Tekillik Çöküşü (Big Crunch) SP kazancına kalıcı çarpan.
   - Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme.
   - Seviye 5+: Sınırsız ölçeklenen evrensel kütle çarpanı.
5. **Özellik Merdiveni Senkronizasyonu (src/game/unlocks.ts):**
   - seed_nucleon, seed_gluon, seed_graviton tanımlarıyla uyumlu ladder entegrasyonu.
6. **Kalite Kapısı & Doğrulama:**
   - 
pm test: 188/188 test başarılı.
   - 
pm run build: 0 hata ile 1705 modül production bundle olarak derlendi.


## [2026-10-06] — SP İlerleme Eğrisi (1-1-1 Pre-Break & Üstel Post-Break), Başlangıç Kütlesi ve Kozmik Otonomi Kokpiti (v0.37.0)

### Kullanıcı Talebi ve Mimari Kararlar:
- **Tekil SP İlerlemesi:** İlk tekillikte (ve Planck Duvarı kırılana kadar) net **1 SP** kazanımı. Planck Duvarı kırıldıktan (`hasBreakSingularity`) sonra ise diğer inkremental devlerdeki gibi üstel artış ($3 \to 5 \to 10 \to 50 \to 100\dots$).
- **Hibrit Bot Yaşam Döngüsü (Anti-Frustration):** İlk koşuda botlar $10^9\text{ g}$ eşiğinde kütle ile kademeli açılır. Ancak ilk prestijden (`singularities >= 1`) sonra tüm standart botlar (D1–D8, Hz, Shift, Galaxy) **kalıcı olarak açık** kalır, kütle satın alma dükkanı kalkar ve arayüz **Kozmik Otonomi Kokpiti**ne dönüşür.
- **Başlangıç Kütlesi:** Nöral Ağaç kök düğümü (`insomnia_heart`) her çöküş ve sıfırlamada +10.000 g kütle verir, böylece sonraki koşularda ilk botlar saniyeler içinde anında ateşlenir.

### Gerçekleştirilen Geliştirmeler:
1. **SP Eğrisi ve Planck Duvarı Mantığı (`src/stores/game.ts`):**
   - `hasBreakSingularity`: Tekillik yükseltmesi veya nöral düğümü kontrol eden reaktif getter.
   - `singularityGain`: `!hasBreakSingularity` iken net `D_1` (1 SP). `hasBreakSingularity` iken $10^{308}\text{ g}$ için taban 3 SP + kütle arttıkça $3 \times 10^{\frac{\Delta \log_{10}}{45}}$ üstel ölçekleme.
   - `singularityHoldActive`: Planck duvarı kırılana kadar kütle $1.79\times 10^{308}\text{ g}$ eşiğinde kilitlenir.
   - `startingMatter`: `insomnia_heart >= 1` ise 10.000 g; `starting_matter` başarımı varsa 1.000 g; aksi halde 10 g. `resetRunState()`, `dimensionShift()`, `buyGalaxy()` metodlarına entegre edildi.
2. **Kozmik Otonomi Kokpiti (`src/components/AutobuyersTab.vue` & `src/stores/game.ts`):**
   - `singularities >= 1` iken kalıcı lisans (`ensureAutobuyersPreserved()`) ile `resetRunState()` veya meydan okumalarda botların kapanması/kilitlenmesi engellendi.
   - UI dükkandan Kokpite evrildi: Master Switch ("Tümünü Başlat / Durdur"), Filo Hızlı Mod Atama ("Tümünü MAKS Yap", "Tümünü ×10 Yap", "Tümünü ×1 Yap"), kompakt D1-D8 kanadı ve özel otomasyon kartları.
   - `App.vue` sekme butonu dinamikleşti: İlk koşuda `"Botlar"`, çöküşten sonra `"Kokpit"`.
3. **İlk Koşu Pacing İnce Ayarı (3 Saat 30 Dakika Kalibrasyonu):**
   - `DIM_PER_TEN_MULT` parametresi `1.58` $\to$ **`1.595`** olarak güncellendi.
   - Nilpotent ODE kaskadı boyunca kümülatif yayılarak ilk koşu süresini 4 saat 11 dakikadan tam hedeflenen **3 saat 30 dakika** altın standardına sabitledi.
4. **Doğrulama ve Testler:**
   - `src/stores/balance.test.ts`: 1 SP Planck tavanı ve üstel post-break formülü test edildi.
   - `src/stores/autobuyers-cockpit.test.ts`: 7 birim testi ile kokpit dayanıklılığı ve filo kontrolleri doğrulandı.
   - `npm test`: **188/188 test başarılı.**
   - `npm run build`: **0 hata ile temiz production bundle oluşturuldu.**

## [2026-10-06] — UROBOROS Faz 0 (0 → 1.79e308 g) Matematiksel Denetim, Literatür Araştırması ve 3-4 Saatlik Pacing Dengeleme Raporu

### Kullanıcı Talebi:
- *"oyunun guclendirmeler, iste matematiksel her seyini cikaran ve dengeleyecek bir ekip kur bu ekip once olan matematigi cikarsin sonra internetten arastirma yapsin derin ve detayli iste en iyi sekilde nasil olur gibisinden sonra bu verilerle 3,4 saate 1e308 e kadar nasil bir denge kurabiliriz bunu arastirsin ekstradan senin soyleyecegin veya onerecegin bir sey varsa soylersin bu projede sen ve ben iki beyin calisacagiz subagentlari sen yoneteceksin onlar senin ekibin gibi"*

### Kurulan Ekip ve İş Bölümü:
1. **İki Beyin Yönetim Konseyi:** Ürün Sahibi (Creative Director) & Antigravity (Lead System Architect).
2. **Baş Matematik Denetçisi (Subagent 1):** Kod tabanındaki tüm boyutları (D1-D8), maliyet kovalarını, her 10 alım çarpanını (1.58x), tickspeed fonksiyonunu ($16^n$, galaxyBonus), sıçrama gereksinimlerini, galaksi formüllerini, duruşları, anomalileri ve kısıtları çıkardı.
3. **İnkremental Oyun Teorisyeni (Subagent 2):** *Antimatter Dimensions*, *Cookie Clicker*, *Synergism*, *Trimps* literatürünü, $O(t^8 / 8!)$ ODE nil-potent matris kaskadını, polinomik vs üstel tickspeed kesişimini ve bumpy pacing modelini araştırdı.
4. **Doğrulama ve Ölçüm (Headless Harness):** `run.ts` simülatörü çalıştırıldı; aktif oyuncunun ilk tekilliğe (1.79e308 g) **4 saat 11 dakika 12 saniyede (251 dk)** ulaştığı kanıtlandı.

### Çıkan Temel Belgeler:
- `brain/research/ouroboros-phase0-mathematical-architecture-and-pacing.md` (Kapsamlı matematiksel mimari ve dengeleme yol haritası).
- Hassas duyarlılık analizi ve 3-4 saat (180-240 dk) bandına ince ayar stratejileri.

## [2026-10-06] — Başarımların ve Meydan Okumaların UROBOROS: The Cosmic Feast Temasına Dönüştürülmesi (v0.36.0)

### Kullanıcı Talebi:
- *"basarimlarin isimleri onceki temadan kalmanonlari duzelt"*

### Durum ve Tespit:
- Eski prototip teması olan *Doomscroll: The Endless Reels* (Dopamin, başparmak, gece 3, kedi videoları, reels ordusu, vicdan azapları, uykusuzluk, uçak modu) döneminden kalma 67 başarımı ve 8 kategoriyi içeren `src/game/achievements.ts`, UROBOROS'a tam olarak dönüştürülmemişti.
- Meydan okuma tanımları (`src/game/challenges.ts`) ve özellik kilitlerindeki (`src/game/unlocks.ts`) bazı adlandırmalar da eski telefon/gece metaforlarını taşıyordu.

### Yapılan Değişiklikler:
1. **Başarım Kategorileri (`ACHIEVEMENT_CATEGORIES`):**
   - `dopamine` $\to$ **Kozmik Kütle Açlığı** ("Maddeyi yut, kütle biriktir. Olay ufkunun kaderi.")
   - `dimensions` $\to$ **Kütle Boyutları** ("Moleküllerden Samanyolu'na, çekim hızı ve ölçek sıçramaları.")
   - `automation` $\to$ **Otonom Çekim Ağı** ("Botları devreye sok, toplu ve maksimum çekime geç.")
   - `crisis` $\to$ **Kozmik Dalgalanmalar** ("Kozmik anomaliler, süpernova patlamaları ve rezonans komboları.")
   - `guilt` $\to$ **Kozmik Parazitler** ("Olay ufkuna dadanırlar, kütle emerler, patlatılırlar.")
   - `lab` $\to$ **Kuantum Laboratuvarı** ("İzotop ek, reaksiyonu olgunlaştır, hasat et ve mutasyon yarat.")
   - `singularity` $\to$ **Kozmik Tekillik** ("Büyük Çöküşü yaşa, SP biriktir, evrensel döngüyü sürdür.")
   - `challenges` $\to$ **Kozmik Meydan Okumalar** ("Uzay-zaman bozulmalarını ve Planck krizlerini aş.")
2. **Tüm 67 Başarım İsmi, Açıklaması, İkonu ve Ödül Metinleri Yenilendi (`src/game/achievements.ts`):**
   - `dop_first` .. `dop_tekillik`: İlk Kuantum Yutumu, Çekim Isınması, Obur Çekim Maratonu, Doyumsuz Tekillik, İlk Kütle Patlaması, Moleküler Çözünme, Kozmik Obur, Olay Ufku Nöbetçisi, Planck Duvarı Eşiği, Yerçekimi Hükümdarı, Termodinamik İhlali, Işığın Kaçamadığı Nokta, Sonsuz Çekim Alanı, Kozmik Çöküş Eşiği, Evrensel Tekillik.
   - Gizli başarımlar: Kozmik Gece Nöbeti, Kozmik Parazit Sinyali, Doğrudan Kozmik İletim.
   - Boyut başarımları: Bağları Parçala, Kütleçekim Zinciri, Çekim Hızı Yükseltmesi, Hiper-Çekim Rezonansı, İlk Ölçek Sıçraması, Galaktik Genişleme, Kozmik Kütle Kümesi, Saf Tekillik.
   - Otomasyon: İlk Otonom Çekici, Çekim Botu Filosu, Kozmik Otonomi, Toplu Çekim Modu, Maksimum Olay Ufku, Frekans Modülatörü, Sıçrama Operatörü, Küme Mimarı, Kuantum Çekirdeği, Durgunluk Evresi, Milyonluk Alt-Sürü.
   - Dalgalanmalar: İlk Kozmik Dalgalanma, Dalgalanma Avcısı, Kozmik Gözlemci, Süper Rezonans, Boşluk Tekilliği, Rezonans Ustası, İlk Alan Müdahalesi, Kriz Operatörü, Kozmik Anomali Müptelası.
   - Parazitler: İlk Çekim Paraziti, Parazit Püskürtme, Çekim Arındırıcı, Geçirimsiz Olay Ufku, Parazit Kümelenmesi, Kütle Oburu Parazit, Parazit Yalıtkanı, Parazit Katili.
   - Kuantum Lab: İlk Kuantum Tohumu, İlk Kuantum Hasadı, İzotop Araştırmacısı, Endüstriyel Kuantum Sentezi, Reaksiyon Dengesi, Kritik Kütle Matrisi, Kozmik Mutasyon, Saf Tekillik İzotopu.
   - Tekillik: Olay Ufkunun Şafağı, İlk Büyük Çöküş, Üç Çöküş Döngüsü, Tekillik Rezervi, Tekillik Ağacı, Bir Saatlik Tekillik, Kozmik Mesai, Kozmik Hükümdar.
   - Meydan Okumalar: İzolasyonun Sonu, Durgunluk Kırılması, Kuantum Kararlılığı, Kırık Simetri Fatihi, Enflasyon Fatihi, Zamanın Efendisi, Boyut Yırtıcı, Fırtına Dindirici.
3. **Meydan Okuma Tanımları ve Flavorları Kozmik Kimliğe Taşındı (`src/game/challenges.ts`):**
   - C1: **Vakum İzolasyonu** (Otonom botlar devre dışı)
   - C2: **Kütleçekim Durgunluğu** (Her alımda 3 sn duraklama)
   - C3: **Kuantum Kararsızlığı** (D1 zayıf başlar, üstel büyür)
   - C4: **Simetri Kırılması** (Yalnızca tek kütle boyutları çalışır)
   - C5: **Kozmik Enflasyon** (Her alım diğer maliyetleri şişirir)
   - C6: **Zaman Genleşmesi** (Çekim hızı frekansı yavaşlar)
   - C7: **Boyutsal Çöküş** (Yalnızca ilk 6 boyut aktif)
   - C8: **Radyasyon Fırtınası** (Hawking radyasyon birikimi)
4. **UI İpucu ve Kilit Düzeltmeleri:**
   - `src/components/AchievementsTab.vue`: Gizli başarım ipucu "geceyi kurcala" yerine "olay ufkunu kurcala" olarak güncellendi.
   - `src/game/unlocks.ts`: `challenges` özelliği için "Kozmik Meydan Okumalar" ve "1 Kozmik Çöküş yaşa" metinleri sağlandı.
5. **Doğrulama ve Kalite Kapısı:**
   - `npm test`: 176/176 test yeşil.
   - `npm run build`: `vue-tsc && vite build` sıfır hata ile production bundle derlendi.

## [2026-10-06] — Antimatter Dimensions Tarzı Kozmik Haber Bandı (News Ticker) & İronik/Mizahi Mesaj Motoru (v0.35.0)

### Kullanıcı Talebi:
- *"bu canli yayin kismini antimatter dimensions daki gibi yazilar yazdirmak istiyorum onun yazilarini bul internetten oku sonra en iyi plani yap"*
- *"en guzel sekilde ironik seyler mizahi seyler falan hepsinden doldur en iyi sekilde"*

### Araştırma ve Kaynak Kod Bulguları:
- *Antimatter Dimensions* açık kaynak deposu (`IvarK/AntimatterDimensionsSourceCode`) incelendi:
  - `src/core/secret-formula/news.js`: 1.470+ haber ve espri mesajı (`unlocked`, `onClick`, `dynamic`).
  - `src/components/ui-modes/NewsTicker.vue`: Marquee kaydırma motoru, son 15 haberi tutan `recentTickers` tampon belleği, `onLineClick` ile tetiklenen gizli başarımlar.
  - Başarımlar: `FAKE NEWS!` (50 haber gör) ve `Real news` (tıklanabilir habere tıkla).

### Yapılan Geliştirmeler:
1. **Bağımsız Haber Veritabanı Modülü (`src/game/news.ts`):**
   - 100+ özenle hazırlanmış, Türkçe yerelleştirilmiş, ironik, mizahi ve bilimsel haber havuzu.
   - **Grup 1 (AD Klasikleri):** Hevipelle alıntıları ("IN THE END, IT DOESN'T ANTIMATTER"), 5 saatlik güncelleme şakaları, 9. boyut teorileri ("9'un karekökü 3'tür, var olamaz"), $1.79\times 10^{308}$ dertleri, Max All dopamini, `NaN` ve bilimsel notasyon satirleri.
   - **Grup 2 (Uroboros Kozmik Lore):** Su damlasındaki karbon bağından Samanyolu'nu yutan kara deliğe kadar açılan hikaye (Belediye duyuruları, stajyerin kahve fincanı, Jüpiter'in fıstık gibi çıtırdaması, Satürn halkalarının karadeliğe atkı olması, Güneş'e el sallama).
   - **Grup 3 (Doomscroll & Dopamin Satiri):** Gece 03:00 telefon bağımlılığı, maraton koşan başparmak, mavi ışık filtresi ve tost yapılabilen telefon arka kapağı esprileri.
   - **Grup 4 (İnkremental & Sayı Motoru):** Cookie Clicker, Trimps, Synergism göndermeleri; `break_eternity.js`, emekli olan `BigInt` ve accumulator döngüsü satirleri.
   - **Grup 5 (Dinamik Canlı Şablonlar):** Anlık kütleye (`Sadece {kütle} g mı? Yuvarlama hatası`), frekansa (Hz) ve boyut sayısına göre gerçek zamanlı değişen metinler.
   - **Grup 6 (İnteraktif Easter Egg'ler):**
     - `Disco Time! (bana tıkla!)` $\rightarrow$ Gökkuşağı neon border ve parıltılı metin animasyonu.
     - `DİKKAT: Bu haber saf anti-maddeden yapılmıştır!` $\rightarrow$ Ekran sarsıntısı (`doomscroll:shake`), patlama sesi ve metin değişimi.
     - `Bu habere tıkladığında hiçbir şey olmuyor.` $\rightarrow$ Tıklama sayacıyla oyuncuyla dalga geçen ve 10. tıkta kütle veren gizli buton.
     - `Bu mesajı ters çevirmek için tıkla!` $\rightarrow$ 180° takla atan metin transformu.
     - `🎲 Şanslı Dalgalanma!` $\rightarrow$ Konfeti + kütle ödülü.
2. **Store & Kayıt Entegrasyonu (`src/stores/game.ts` & `src/models/types.ts`):**
   - `seenNewsIds: string[]`, `uselessNewsClicks: number`, `hasClickedSecretNews: boolean` alanları state'e, `serialize` ve `deserialize` katmanlarına eklendi.
   - `recordNewsSeen(newsId)` ve `recordNewsClick(isSecret)` aksiyonları tanımlandı.
3. **Başarım Entegrasyonu (`src/game/achievements.ts`):**
   - `dop_fake_news` ("SAHTE HABER!"): 50 farklı haber bandı mesajı gör.
   - `dop_real_news` ("GERÇEK HABER"): Tıklanabilir interaktif bir habere tıkla.
4. **Bileşen Yenilenmesi (`src/components/CommentTicker.vue`):**
   - Tekrarı kesin olarak önleyen 15 elemanlık FIFO `recentTickers` tamponu.
   - Hover ile duraklatma (Pause on hover), hız değiştirici (1x / 1.6x), hızlı ileri sarma butonu.
   - Web Audio (`playTallyTick`, `playMythicCollect`, `playAnomaly`), Haptic titreşim ve `canvas-confetti` entegrasyonu.
5. **Doğrulama:**
   - Birim testleri: `npm test` $\rightarrow$ 165/165 yeşil (%100 başarı).
   - Derleme: `npm run build` (`vue-tsc && vite build`) $\rightarrow$ 0 hata, 4.87 saniye.
   - Mimari Karar Belgesi: [`ADR-0045`](file:///data/data/com.termux/files/home/incremental/brain/decisions/0045-antimatter-dimensions-cosmic-news-ticker.md).

## [2026-10-06] — Sarsıntı (Screen Shake) Sırasında Sabit Arayüz İzolasyonu ve Kapsayıcı Blok Titreme Çözümü (v0.34.4)

### Kullanıcı Talebi:
- *"ekran titrerken falan mobilde alttaki tabler ve yut,maks al seceneklerinin oldugu kisim silinip tekrar geliyor benzer sey pc de de yasaniyor sorunun ana kaynagini bul ve duzelt"*

### Kök Neden & Mimari Analiz:
- W3C CSS Transforms Module Level 1 spesifikasyonu gereği, bir elemana `transform` uygulandığında, o eleman tüm `position: fixed` alt elemanları için yeni bir **Containing Block** (kapsayıcı blok) haline gelir.
- `src/App.vue` içinde `#game-main-content` (~3000px yükseklikteki tüm oyun kartları konteyneri) sarsıntı (`.screen-shake`) aldığında, içinde bulunan mobil alt sekme dock'u (`<nav>`, `max-md:fixed max-md:bottom-0`) ve mobil taktil çubuğu (`<FloatingThumbBar />`, `fixed bottom-[60px]`), viewport yerine 3000px'lik konteynerin en dibine itiliyordu. Bu nedenle sarsıntı sürdüğü 200–400ms boyunca **ekrandan siliniyor**, sarsıntı bitince tekrar geliyordu.
- PC'de ekran < 768px iken birebir aynı durum oluşuyor; masaüstünde ise her sarsıntıda `void target.offsetWidth` ile tetiklenen senkron DOM reflow ve GPU compositing layer yok edilip kurulması nedeniyle header butonlarında titreme/yırtılma yaşanıyordu.

### Yapılan Geliştirmeler:
1. **Sabit Katman İzolasyonu (`src/App.vue`):**
   - `<FloatingThumbBar />` ve tüm modallar (`SettingsModal`, `ConfirmModal`, `AuthModal`, `CloudConflictModal`, `AdminPanel`), `#game-main-content` sarsıntı konteynerinin dışına, doğrudan kök div'e taşındı.
   - `LabTab.vue` içindeki `showCodexModal` (Viral Kodeks) `<Teleport to="body">` ile sarmalandı.
2. **Mobil Alt Dock Dinamik Teleportasyonu (`src/App.vue`):**
   - Tailwind `max-md` (768px) eşiğiyle senkron çalışan `isMobile` reaktif değişkeni ve `window.matchMedia('(max-width: 767px)')` dinleyicisi eklendi.
   - `<Teleport to="body" :disabled="!isMobile">`: Mobilde `<nav>` doğrudan `document.body`'ye taşınır; `#game-main-content`'in sarsıntı transform'undan tamamen izole kalır. Masaüstünde ise yerinde inline render edilir.
3. **Reflow-Free Sarsıntı Yönetimi (`src/components/JuiceLayer.vue`):**
   - Senkron reflow tetikleyen `void target.offsetWidth` kaldırıldı.
   - Zaten sarsıntı aktifken gelen ardışık dekad/satın alma/kombo olaylarında sınıf silinip tekrar eklenmez, animasyon kesilmez, sadece `shakeTimeout` uzatılır (coalescing).
4. **GPU Donanım Hızlandırması (`src/style.css`):**
   - `@keyframes screen-shake`, `shake-soft-anim` ve `shake-hard-anim` yönergeleri `translate3d(x, y, 0)` ile doğrudan GPU kompozitörüne bağlandı; `will-change: transform` eklendi.
5. **Doğrulama:**
   - Yeni birim testi: `src/core/screen-shake.test.ts` (164/164 birim testi eksiksiz geçti).
   - `npm run build`: Production derlemesi 0 hata ile 9.11 saniyede tamamlandı.
   - Mimari karar: [`ADR-0044`](file:///data/data/com.termux/files/home/incremental/brain/decisions/0044-screen-shake-containing-block-and-fixed-ui-isolation.md).

## [2026-10-06] — Sekmeler Arası Yön Duyarlı Akıcı Slide-Fade Geçiş Animasyonu (v0.34.3)

### Kullanıcı Talebi:
- *"kaydirma yaparken guzel bi animasyon olursa iyi olur"*

### Kök Neden & Mimari Analiz:
- Sekmeler arası geçişlerde (mobil yatay jest, dock buton tıklaması, klavye sol/sağ okları) anlık sert geçiş yapılıyordu.
- Mobil jest hissini tamamlayan ve gözü yormayan fiziksel bir kayma ve sönümleme (slide-fade) hissi istendi.
- **Kritik Kısıt:** İki sekmenin aynı anda DOM'da kalarak dikey sayfa boyunu zıplatmaması (`mode="out-in"`), yatay scrollbar oluşturmaması (`overflow-x-hidden`) ve düşük donanım / erişilebilirlik ayarlarında (`reduceAnimations`) sorunsuz çalışması gerekiyordu.

### Yapılan Geliştirmeler:
1. **App.vue (Yön Duyarlılığı ve Geçiş Mantığı):**
   - `slideDirection` (`ref<'next' | 'prev'>`) eklendi.
   - `switchTab` ve `switchTabByOffset` fonksiyonlarında hedef sekmenin mevcut sekmeye göre sağda mı (`next`) solda mı (`prev`) olduğu dinamik tespit edildi.
   - `transitionName`: Kullanıcının `reduceAnimations` ayarına göre `tab-slide-next`, `tab-slide-prev` veya `tab-fade` seçildi.
   - `<Transition :name="transitionName" mode="out-in">` ile sekme bileşenleri sarıldı ve benzersiz `key` nitelikleri eklendi.
2. **GPU Hızlandırmalı CSS Animasyonları:**
   - 180ms süreli, `cubic-bezier(0.16, 1, 0.3, 1)` eğrili `translate3d(±24px, 0, 0)` ve `opacity` geçiş sınıfları eklendi.
   - Yatay taşmaları engellemek için `<main>` kapsayıcısına `overflow-x-hidden min-h-[380px]` sınıfları uygulandı.
3. **Doğrulama:**
   - `npm test`: 162/162 birim testi başarıyla geçti.
   - `npm run build`: Production paketi 0 hata ile derlendi.
   - Mimari karar [`ADR-0043`](file:///data/data/com.termux/files/home/incremental/brain/decisions/0043-directional-tab-slide-fade-transitions.md) dosyasına kaydedildi.

## [2026-10-06] — Mobil Yatay Jest ile Menü/Sekme Gezinimi (Swipe Left/Right Tabs) (v0.34.2)

### Kullanıcı Talebi:
- *"birde mobilde saga sola kaydirinca bu alttaki menuler arasinda gecis yapabilelim"*

### Kök Neden & Mimari Analiz:
- Oyunda 9 farklı ana sekme (`Katmanlar`, `Lab`, `Kriz`, `Botlar`, `Koloni`, `Tekillik`, `Meydan`, `Plaket`, `Rapor`) bulunuyor ve mobilde alt dock (`navRef`) üzerinde yer alıyor.
- Oyuncunun tek elle gezinirken alt menü butonlarına tek tek dokunmak yerine ekranda sağa-sola parmak kaydırarak sekmeler arasında akıcı geçiş yapabilmesi istendi.
- **Kritik Kısıt:** Bir önceki görevde çözülen dikey sayfa kaydırmanın (`vertical scroll`) yatay jestle asla çakışmaması, sadece kasıtlı yatay fiske yapıldığında tetiklenmesi gerekiyordu.

### Yapılan Geliştirmeler:
1. **App.vue (Yatay Jest Algılayıcı & Dinamik Sekme Atlama):**
   - `availableTabs`: Yalnızca açık ve kilitli olmayan sekmeler dinamik olarak hesaplandı (örneğin kilitli sekmeler atlanarak sonraki açık sekmeye geçilir).
   - `switchTabByOffset(direction)`: Sola kaydırmada (`deltaX < 0`) bir sonraki açık sekmeye, sağa kaydırmada (`deltaX > 0`) bir önceki sekmeye geçiş sağlandı.
   - **Katı Scroll İzolasyonu:** `absX > absY * 1.4`, `absX >= 48px`, `velocity >= 0.22 px/ms`, `duration <= 420ms` ve dikey sayfa kayma kontrolü (`Math.abs(scrollY - startScrollY) <= 12px`) ile dikey sayfa kaydırmalar %100 filtrelendi.
   - İnteraktif öğeler (form elemanları, modal pencereler, alt kaydırılabilir dock) jest kapsamı dışında tutuldu.
2. **Taktil Geri Bildirim & Dock Senkronizasyonu:**
   - Sekme değiştiğinde `sounds.playHapticTap()` ve Web Vibration API `navigator.vibrate(12)` ile parmak ucunda tatmin edici bir dokunsal geri bildirim sağlandı.
   - Alttaki gezinme dock'u (`navRef`), yeni aktif sekmeyi otomatik olarak ekranın ortasına kaydırır (`scrollActiveTabIntoView`).
   - Masaüstü kullanıcıları için klavye sol/sağ ok tuşlarıyla (`ArrowLeft` / `ArrowRight`) da sekmeler arası gezinme desteği eklendi.
3. **Doğrulama:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npm run build`: Production derlemesi 0 hata ile 10.68 saniyede tamamlandı.
   - Mimari karar [`ADR-0042`](file:///data/data/com.termux/files/home/incremental/brain/decisions/0042-mobile-horizontal-swipe-tab-navigation.md) dosyasına işlendi.

## [2026-10-06] — Mobil Ekran Kaydırmada Yanlış Dokunma ve İstenmeyen Tıklama Koruması (v0.34.1)

### Kullanıcı Talebi:
- *"telefonda ekrani kaydirirken arada kendi kendine dokunuyor o yuzden iste sayi artiyor o dokunma seyini ayarla hassasiyetini falan veya suresini"*

### Kök Neden Analizi:
1. **DimensionsTab.vue (Süre ve Hız Kontrolsüz Fiske Jest Dinleyicisi):**
   - `@touchstart.passive` ve `@touchend.passive` ile tüm sekme alanında dikey hareket dinleniyordu.
   - Sadece `deltaY <= -36` ve `|deltaY| > |deltaX| * 1.2` kontrolü vardı; süre (`duration`), hız (`velocity`) veya `window.scrollY` değişimi kontrol edilmiyordu.
   - Kullanıcı alt boyutlara bakmak için sayfayı yavaşça yukarı kaydırdığında (normal sayfa kaydırma / scroll), parmağını çektiği an `deltaY <= -36` tetikleniyor ve `store.manualClick()` çağrılarak sayı istemsizce artıyordu.
2. **HeartBurstLayer.vue (Ham pointerdown Çift Tık Yanılgısı):**
   - Doğrudan `window` üzerinde `pointerdown` dinleyip 320ms ve 35px içindeki ardışık iki dokunuşu "Çift Dokunma" sayarak `store.manualClick()` çağırıyordu.
   - Mobilde art arda kaydırma hamleleri yaparken parmakların başlangıç noktası yakın düştüğünde, kullanıcı yalnızca ekranı kaydırıyor olmasına rağmen çift tık algılanıyordu.

### Yapılan Geliştirmeler:
1. **DimensionsTab.vue (Fiske ve Kaydırma İzolasyonu):**
   - **Scroll Drift Kontrolü:** Başlangıç ve bitiş `window.scrollY` farkı 8px'den fazlaysa ekran kaydırılmış demektir; jest anında iptal edilir.
   - **Süre Sınırı:** Yalnızca 45ms ile 280ms arasındaki hızlı hareketler kabul edilir. 280ms'den uzun süren dokunuşlar drag/scroll sayılır.
   - **Hız ve Mesafe Eşiği:** Mesafe 70px'e yükseltildi; minimum hız `velocity >= 0.42 px/ms` ve dikey baskınlık `absY > absX * 1.5` getirildi.
   - **İnteraktif Eleman Koruması:** Buton, link veya form elemanlarına dokunulduğunda jest başlatılmaz.
2. **HeartBurstLayer.vue (PointerUp Tabanlı Statik Çift Tık):**
   - Ham `pointerdown` tetiklemesi kaldırıldı.
   - `pointerup` aşamasında parmağın 12px'den az hareket ettiği, sürenin 240ms'den kısa olduğu ve sayfanın kaymadığı statik dokunuşlar çift tık havuzuna alınır.
3. **Kullanıcı Ayarı (`swipeSensitivity`):**
   - `GameSettings` içine `swipeSensitivity: 'balanced' | 'low' | 'off'` eklendi.
   - `SettingsModal.vue` içine "Dengeli", "Düşük (Sert Fiske)" ve "Kapalı" seçenekleri olan kullanıcı dostu bir kontrol paneli entegre edildi. "Kapalı" seçildiğinde tüm ekran jestleri kapatılır, yalnızca butonla yutulur.
4. **Doğrulama:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npm run build`: Production derlemesi 0 hata ile 10.47 saniyede tamamlandı.

## [2026-10-06] — Antimatter Dimensions Tarzı Kesintisiz Akan Kozmik Canlı Haber Bandı (v0.34.0)

### Kullanıcı Talebi:
- *"bu canli yayin kismini en uste al ve surekli yazilar aksin sagdan sola antimatter dimensionsdaki gibi onu arastir ve en iyi sekilde yap"*

### Kök Neden & Mimari Analiz:
1. **Konum:** `CommentTicker.vue` daha önce `<Header />` bileşeninin altında yer alıyordu. Antimatter Dimensions ve klasik incremental türünde ise haber bandı (News Ticker) her zaman sayfanın en üstünde (`#game-main-content` başlığı üzerinde) yer alır.
2. **Animasyon Eksikliği:** Önceki uygulamada metin akışı yoktu; sabit duran metin 7 saniyede bir `truncate` edilip fade efektiyle değişiyordu.
3. **Antimatter Dimensions Referans Mimarisi:**
   - IvarK / Antimatter Dimensions açık kaynak kod tabanı (`javascripts/core/newsticker.js`) incelendi.
   - Metin sağ kenarın tamamen dışından (`translateX(parentWidth)`) başlayıp, sabit bir piksel hızıyla (`rate = 100 px/s`) sol kenarın tamamen dışına (`translateX(-textWidth)`) akmaktadır.
   - Bir metin ekranı terk ettiğinde derhal sonraki metin rastgele seçilip akış kesintisiz sürdürülür.
   - Metne tıklandığında easter egg ve başarımlar tetiklenir.

### Yapılan Geliştirmeler:
1. **Sayfanın En Üstüne Taşıma (`src/App.vue`):**
   - `<CommentTicker />` bileşeni `<Header />` üzerine, oyunun en tepesine taşındı.
   - `store.settings.newsTickerEnabled !== false` koşulu ile ayarlar modalından açılıp kapatılabilmesi sağlandı.
2. **GPU Hızlandırmalı 60 FPS Sağdan Sola Kesintisiz Marquee (`src/components/CommentTicker.vue`):**
   - CSS `translate3d(var(--start-x), 0, 0)` ile `--start-x` (konteyner genişliği) ve `--end-x` (-metin genişliği) dinamik hesaplandı.
   - Sabit lineer hız (`100 px/s`) ile kayma sağlandı; animasyon sonlandığında (`@animationend`) bir sonraki rastgele haber sıfır gecikmeyle akışa alındı.
   - **Hover-to-Pause (Okuma Kolaylığı):** Kullanıcı fareyle bandın üzerine geldiğinde `animation-play-state: paused` tetiklenerek metin anında duraklar ve "DURAKLATILDI" göstergesi belirir; ayrıldığında kaldığı pikselden pürüzsüzce devam eder.
   - Sol ve sağ kenarlara yumuşak gradyan maskeleri eklenerek metinlerin kenarlardan sihirli bir şekilde doğup kaybolması sağlandı.
3. **Zenginleştirilmiş Kozmik & Lore Haber Havuzu (52 Özgün Haber):**
   - 6 kategori: Moleküler/Laboratuvar (`innocent`), Kuantum Çöküş (`hypnotic`), Makro Kriz (`crisis`), Kozmik Tekillik (`dawn`), AD Meta Esprileri (`meta`) ve Gizli Easter Egg'ler (`secret`).
   - Oyuncunun kütle miktarına ve kriz/kombo durumuna göre haberler filtrelenir ve aşama ilerledikçe yeni temalar sahneye çıkar.
4. **Taktil Doyum, Hız Ayarı & Gizli Easter Egg Mekaniği:**
   - **Kuantum Rezonans Tıklaması:** Haber bandına veya Beğeni butonuna tıklandığında +%20 saniyelik kütle ödülü, ses efekti (`playTallyTick`), haptik titreşim (`navigator.vibrate(8)`) ve ekranda floating juice dalgası oluşur.
   - **Gizli Sinyal Easter Egg:** Gizli haberlere (`@kuantum_sirri`, `@kozmik_piyango`) tıklandığında konfeti patlaması (`canvas-confetti`), mistik ses (`playMythicCollect`) ve 10x üretim kütle ödülü verilir.
   - **Hız Değiştirici (1x / 1.6x):** Okuma hızına göre 100 px/s ve 160 px/s modları arasında tek tıkla geçiş eklendi.
   - **Hızlı Geçiş (Skip):** İleri butonu ile istenildiğinde derhal sonraki habere atlama imkanı sağlandı.
5. **Doğrulama:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npm run build`: Production derlemesi 0 hata ile 24.30 saniyede tamamlandı.

## [2026-10-06] — Mobil HUD Çift Aksiyon Butonları (Yut, Hz, Tümü Al) Çakışması Giderildi (v0.33.2)

### Kullanıcı Talebi:
- *"mobilde iki tane yut,hz arttirici ve tumu al butonu var"*

### Kök Neden Analizi:
- Masaüstü görünümde üst başlık panelinde (`Header.vue`) yer alan birincil taktil butonlar (`Manuel Yut`, `Çekim Hızı Hz`, `Tümünü Al`) duyarlı medya sorgusu (`hidden md:flex`) içermediği için mobil cihazlarda da (`<768px`) render ediliyordu.
- Aynı anda, mobilde başparmak ergonomisini sağlamak amacıyla ekranın alt kısmına sabitlenen `FloatingThumbBar.vue` bileşeni (`md:hidden`) de aktif durumdaydı.
- Bu durum, mobil ekranda hem en üstte (Header) hem de en altta (FloatingThumbBar) aynı anda 2 adet "YUT!", 2 adet "Hz (Çekim Hızı)" ve 2 adet "Tümü (Maks Al)" butonu belirmesine yol açıyordu.

### Yapılan Değişiklikler:
1. **Header.vue (Masaüstü/Mobil Ayrımı & Duyarlı HUD):**
   - Header içindeki taktil eylem butonları (`Manuel Yut`, `Çekim Hızı Hz`, `Tümünü Maks Al`), kombo rozeti ve masaüstü Ayarlar butonu `hidden md:flex` sınıfı ile mobilde gizlendi, sadece masaüstü ekranlarda görünür kılındı.
   - Mobilde Ayarlar menüsüne her zaman kesintisiz erişilebilmesi için üst durum çubuğunun sağ tarafına doğrudan mobil Ayarlar butonu (`md:hidden`) yerleştirildi.
   - Header'ın 3. denetim çubuğu, mobilde yalnızca gösterilecek bir mobil kontrol (Kuantum/Obur/Kalkan Duruşları veya Tekillik/Meydan Okuma) varsa render edilecek şekilde dinamik `hasMobileControls` koşuluna bağlandı; erken oyunda boş çizgi kalması engellendi.
2. **FloatingThumbBar.vue (Taktil Geri Bildirim & Rehberlik):**
   - Mobil `handleConsume` fonksiyonuna Web Vibration API haptik titreşim (`navigator.vibrate(8)`) ve taktil floating juice parçacığı (`doomscroll:tap`) entegre edildi.
   - İlk açılışta oyuncuyu yönlendirmek üzere ilk boyut alınana kadar YUT butonuna hafif `cta-beacon` nabız sınıfı bağlandı.
3. **Doğrulama & Test:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npm run build`: Production derlemesi 0 hata/uyarı ile 11.55 saniyede tamamlandı.

## [2026-10-06] — Arka Plan Büyüme/Küçülme ve Kaybolan Pop-Up Hatalarının Giderilmesi (v0.33.1)

### Kullanıcı Talebi:
- *"pop uplar veya baska bir sey yuzunden arada arka plan boyle buyuyor sonra kuculuyor falan arada pop uplar kayboluyor"*

### Kök Neden Analizi:
1. **`document.body` Üzerindeki CSS Transform (Containing Block Kırılması):**
   - Boyut alımlarında, dekad atlamalarında veya kriz pop-up'larına tıklandığında `JuiceLayer.vue` tarafından `document.body`'ye `.screen-shake` / `.shake-hard` sınıfları ekleniyordu.
   - W3C CSS standartlarına göre `body` üzerine `transform` uygulandığında, tüm `position: fixed` elemanlar (`AlgorithmicSwirl` arka planı, `AnomalyOverlay`, modallar) ekran penceresi (viewport) yerine `document.body`'yi kapsayıcı blok (containing block) kabul eder.
   - Sayfa yüksekliği (~2500px) viewport'tan (~800px) kat kat büyük olduğundan, `fixed inset-0` olan WebGL arka planı anlık olarak 3000px'e genişleyip devasa şekilde büyüyor (**"arka plan böyle büyüyor"**), shake süresi (250-400ms) bitince `transform` kalktığı için aniden küçülüyordu (**"sonra küçülüyor"**).
   - Aynı anda `AnomalyOverlay` de `body` koordinatlarına kilitlendiği için yüzen anomali pop-up'ları ekran dışına fırlıyor veya kayboluyordu (**"arada pop uplar kayboluyor"**).
2. **Mobilde Çift Dokunma Yakınlaştırması (Double-Tap-To-Zoom):**
   - `index.html`'de `user-scalable=no, maximum-scale=1.0` ve CSS'te `touch-action: manipulation` eksikliği nedeniyle, oyuncular pop-up'lara veya butonlara hızlı tıkladığında mobil tarayıcı çift tık yakınlaştırması tetikliyor, arka plan büyüyüp küçülüyordu.
3. **Anomali Kapsül Geçiş ve Animasyon Çakışması:**
   - `AnomalyOverlay.vue`'daki `<TransitionGroup>` bileşeninde `.anomaly-pop-leave-to` ve `.anomaly-pop-leave-from` tanımlanmadığı için süresi biten veya tıklanan pop-up'lar tek karede kayboluyordu.
   - `.panic-pulse` animasyonu `!important` ile ana wobble transform'unu eziyor ve `.anomaly-wobble` üzerindeki `contain: layout paint` görsel taşmaları kırpıyordu.

### Yapılan Düzeltmeler:
1. **İzole Sarsıntı Konteyneri (`src/App.vue`, `src/components/JuiceLayer.vue`, `src/style.css`):**
   - Sarsıntı efekti asla `document.body` veya `html`'e uygulanmayacak şekilde izole edildi; doğrudan oyun kartlarını barındıran `#game-main-content` konteynerine bağlandı.
   - `.screen-shake`, `.shake-soft` ve `.shake-hard` sınıflarından lingering `both` kaldırıldı, `transform-origin: center center` eklendi.
2. **Arka Plan Görünüm Sabitlemesi (`src/components/AlgorithmicSwirl.vue`):**
   - WebGL tuval konteyneri `w-screen h-screen max-w-full max-h-full` ve `contain: strict` ile kesin viewport sınırlarına kelepçelendi; gereksiz `will-change: transform` kaldırıldı.
3. **Pop-Up & Katman Düzenlemeleri (`src/components/AnomalyOverlay.vue`, `src/components/ScreenOverlay.vue`):**
   - `.layer-anomaly` z-index değeri 50'ye yükseltildi; `ScreenOverlay` z-index'i 30'a çekilerek auraların pop-up'ları örtmesi engellendi.
   - `panic-pulse` uyarısı ana wobble taşıyıcısından alınıp doğrudan iç `.anomaly-capsule` sınırına taşındı.
   - Vue TransitionGroup için `.anomaly-pop-leave-from` ve `.anomaly-pop-leave-to` eklenerek yumuşak kaybolma sağlandı.
   - `.anomaly-wobble` üzerindeki `contain: layout paint` kaldırıldı.
4. **Mobil Çift Dokunma Koruması (`index.html`, `src/style.css`):**
   - `viewport` meta etiketine `maximum-scale=1.0, user-scalable=no, viewport-fit=cover` eklendi.
   - `html, body`, butonlar ve tıklanabilir öğelere `touch-action: manipulation;` ve `overscroll-behavior: none;` uygulandı.
5. **Doğrulama:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npm run build`: Production derlemesi 0 hata ile 10.75 saniyede tamamlandı.

## [2026-10-06] — Modern Minimalist Kuantum-Kozmik HUD & Anti-Slop UI/UX Dönüşümü (v0.33.0)

### Kullanıcı Talebi:
- *"arayuzu ve ui ux i ai sloptan daha modern minimalist bir gorunume cevir oyuna uygun olsun"*

### Mimari Karar & Vizyon (ADR-0040):
- Arayüz bütünüyle "AI slop" kalıntılarından (rastgele neon degrade butonlar, 9:16 telefon video posterleri, yağlı parmak izi lekeleri, kırık telefon camı SVG'leri, TikTok çift tık kalpleri, telefon pili %3 widget'ı) arındırıldı.
- Yerine modern, minimalist, yüksek çözünürlüklü **"Kuantum-Kozmik Gözlemevi HUD" (Cosmic Singularity HUD)** tasarım sistemi inşa edildi.

### Kapsam ve Yapılan Değişiklikler:
1. **Tasarım Sistemi & Global Stiller (`src/style.css`):**
   - Obsidian Singularity HUD panel token'ları (`--ds-bg: #07090e`, `--ds-panel: rgba(12, 16, 24, 0.78)`), crisp 1px kenarlıklar ve üst ışık vurgusu.
   - Cırtlak degrade ve pofuduk hap buton stilleri kaldırılarak taktil mekanik HUD butonları oluşturuldu.
   - 9:16 telefon video motifi (`.hero-orb`) ve yatak odası vinyeti (`.bedroom-vignette`) kaldırılarak derin uzay gravite merceklenmesi (`.cosmic-vignette`) ve olay ufku ışıması (`.singularity-horizon`) getirildi.
2. **Üst Bar & Merkezi Sayaç (`src/components/Header.vue`):**
   - Eski telefon pili `%3 (Düşük Güç Modu)` kaldırıldı; yerine gerçek zamanlı **Tekillik Kararlılığı Telemetrisi (KARARLI / KARARSIZ)** yerleştirildi.
   - Gece saati fazları doomscroll terminolojisinden ("Yorgan Altı", "Kuş Vakti") hard sci-fi çöküş fazlarına dönüştürüldü ("Planck Yırtılması", "Mikro Karadelik", "Makro Çöküş", "Galaktik Olay Ufku", "Kozmik Tekillik").
   - Müzik çubuğu Kuantum Sinyal Modülatörü olarak rafine edildi.
   - YUT!, Hz, Tümü ve Tekillik butonları minimalist, yüksek kontrastlı mekanik HUD butonlarına dönüştürüldü.
3. **Kozmik Telemetri Akışı (`src/components/CommentTicker.vue`):**
   - "CANLI REELS SOHBETİ" sosyal medya kalıntısı kaldırılarak **"Kozmik Gözlem & Telemetri Kayıtları"** akışı haline getirildi.
   - Kalp butonu rezonans enerji aktarımı (+Kütle) ile bilimkurgu temasına entegre edildi.
4. **Katmanlar & Efektler (`src/components/ScreenOverlay.vue`, `src/components/HeartBurstLayer.vue`, `src/components/FloatingThumbBar.vue`):**
   - Yağlı başparmak izi ve çatlak cam vektörleri bütünüyle temizlendi; derin uzay gravite dalgalanması eklendi.
   - Çift tıklamada çıkan pembe TikTok kalpleri kaldırıldı; yerini eşmerkezli **Kuantum Rezonans Halkaları (Gravitational Shockwaves)** aldı.
   - Mobil kaydırma çubuğu garish mor-pembe gradient yerine minimalist koyu cam HUD dock'a ve "YUT!" aksiyonuna kavuştu.
5. **Boyut Satırları & Tablar (`src/components/DimensionRow.vue`, `src/components/TabHero.vue`, `src/components/LabTab.vue`, `src/components/CrisisTab.vue`, `src/components/ChallengesTab.vue`, `src/components/AchievementsTab.vue`):**
   - 9:16 video posterleri ve dağınık emojiler kaldırıldı; yerini Planck metrik ölçek rozetleri (`10⁻⁹ m` ... `10²¹ m`), kusursuz tabular hizalama ve temiz 10'luk paket ilerleme çubuğu aldı.
   - TabHero bileşenindeki eski telefon çerçevesi minimalist HUD reticle / koordinat vurgusu ile yenilendi.
   - Tüm sekmelerdeki başlık ve alt metinler UROBOROS kozmik tekillik lore'uyla tam senkronize edildi.
6. **Doğrulama:**
   - `npm test`: 162/162 birim testi eksiksiz geçti.
   - `npx vue-tsc --noEmit`: 0 TypeScript hatası.
   - `npm run build`: Production derlemesi 0 hata ile 10.26 saniyede tamamlandı.

## [2026-10-04] — UROBOROS: The Cosmic Feast Tematik Dönüşümü ve Kalite Kapısı Onayı (v0.32.0)

### Kullanıcı talebi:
- *"uroboros yapalım buna karar verdim"*
- *"o zaman bununla devam edelim ve her kısımdaki temayı değiştir sonra subagentla kontrol ettir yaptığını"*

### Mimari ve Felsefi Vizyon:
- Oyun "Doomscroll: The Endless Reels" (gece yatakta reels kaydırma) temasından çıkarılarak, bir su damlasındaki kovalent moleküler bağları ayrıştırmakla başlayıp Planck duvarını delen, şehri, Dünya'yı, Güneş'i ve tüm Samanyolu Galaksisi'ni yutan iki fazlı kuantum-kozmik obur tekillik döngüsü olan **"UROBOROS: The Cosmic Feast"** evrenine geçirildi.
- Faz 0 ($0 \to 1.79 \times 10^{308}\text{ g}$ arasındaki ilk koşu) kapsam sınırına sadık kalındı.

### Kapsam ve İcra Edilen Değişiklikler:
1. **Mimari & Yaşayan Hafıza:**
   - [`brain/decisions/0039-thematic-pivot-to-uroboros.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0039-thematic-pivot-to-uroboros.md): Kapsamlı ADR mimari karar belgesi oluşturuldu.
   - [`brain/context/project-brief.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/context/project-brief.md): UROBOROS vizyonu ve döngüsüyle güncellendi.
   - [`GAME_DESIGN.md`](file:///c:/Users/Yigit/Documents/Incremental/GAME_DESIGN.md) & [`AGENTS.md`](file:///c:/Users/Yigit/Documents/Incremental/AGENTS.md): UROBOROS GDD ve operasyon kuralları olarak baştan yazıldı.
   - [`index.html`](file:///c:/Users/Yigit/Documents/Incremental/index.html) & [`package.json`](file:///c:/Users/Yigit/Documents/Incremental/package.json): Paket adı `uroboros-cosmic-feast`, sayfa başlığı `UROBOROS` yapıldı.
2. **Kuantum-Kozmik Boyut Kimlikleri (D1–D8):**
   - [`src/game/dimension_identity.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/game/dimension_identity.ts): Moleküler Bağlar 💧 $\to$ Elektron Orbitalleri ⚛️ $\to$ Nükleer Çekirdek 🔬 $\to$ Kuark Çorbası 💥 $\to$ Laboratuvar & Şehir 🏙️ $\to$ Gezegenler & Dünya 🌍 $\to$ Yıldızlar & Güneş ☀️ $\to$ Samanyolu & Karadelik 🕳️ olarak güncellendi.
   - [`src/components/DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue): Rozetler, ikonlar, tooltip'ler ve kademe ruh halleri UROBOROS'a uyarlandı.
3. **Merkezi Sayaç, Hız ve Taktil Kontroller:**
   - [`src/core/format.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/format.ts): `getMassScaleBadge()` eklendi (Kovalent Kırıntı $\to$ Samanyolu Tekilliği).
   - [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): Sayaç "Yutulan Kütle", Hız "Çekim Hızı (Hz)", buton "YUT!", duruşlar "Kuantum Odak / Obur Çekim / Vakum Kalkanı" yapıldı.
   - [`src/components/FloatingThumbBar.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/FloatingThumbBar.vue): Mobil aksiyon butonu "YUT! 🕳️" ve "Çekim Hızı Hz" ile senkronize edildi.
4. **Tüm Sekmeler ve Modallar:**
   - [`src/components/DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue): "Ölçek Sıçraması", "Kozmik Çöküş", "Kozmik Parazit", "Tekillik Besle (Sacrifice)".
   - [`src/components/StatsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/StatsTab.vue): "Son 10 Çöküş", "Tekillik Telemetrisi", "Manuel Yutma", çarpanlar ve kriz telemetrisi uyarlandı.
   - [`src/components/SettingsModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/SettingsModal.vue): Save dosya adı (`uroboros-save`), dokular ve açıklamalar UROBOROS diline çevrildi.
   - [`src/components/AutobuyersTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AutobuyersTab.vue), [`ChallengesTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/ChallengesTab.vue), [`ColonyTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/ColonyTab.vue), [`SingularityTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/SingularityTab.vue), [`AuthModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AuthModal.vue), [`CloudConflictModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/CloudConflictModal.vue), [`AdminPanel.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AdminPanel.vue), [`WelcomeBackModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/WelcomeBackModal.vue): Bakiye birimleri "g Kütle", krizler "Kozmik Kriz", koloniler "Kuantum Rezonatör", tekillik "Kozmik Çöküş" olarak uyarlandı.
   - [`src/components/CommentTicker.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/CommentTicker.vue): 20 absürt bilimkurgu/kuantum canlı haber metni yazıldı.
   - [`src/stores/game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts): Biyometrik unvanlar, kriz büyüleri, laboratuvar tohumları, tekillik yükseltmeleri ve çözünürlük kilometre taşları baştan aşağı UROBOROS kozmolojisine geçirildi.
5. **Bağımsız Subagent Kalite Kapısı (Evaluator-Optimizer):**
   - Subagent `Quality Gate Evaluator` (`10e47fea-2002-4c51-adbf-b663ab9d0a3f`) iki tur adversarial denetim gerçekleştirdi.
   - Tüm UI string'leri, lore ve kod bütünlüğü incelendi ve resmi olarak `<evaluation>PASS</evaluation>` onayı verildi.
6. **Doğrulama:** `npm test` 162/162 yeşil, `npm run build` (vite v6.4.3, vue-tsc) 0 hata, 1701 modül.

## [2026-10-04] — SOTA UI/UX Faz 1 Paketi: Çift Tık Kalp + Canlı Yorum + Mobil Başparmak Barı (v0.31.0)

### Kullanıcı talebi:
- *"ui ux için neler yapılabilir detaylı ve derin araştırma başlat subagentlarla beraber"*
- *"paralel şekilde birbirleriyle çakışmayacak şekilde oluyorsa subagentları çalıştır olmuyorsa kendin yap"*

### Kapsam ve İcra Edilen Yenilikler:
1. **Derin Filo Araştırması:** 3 uzman alt ajan (UI Codebase Auditor, Game Feel Specialist, Design System Ergonomist) ile mimari denetim, Balatro/Cookie Clicker taktil sentezi ve 2026 Bento Grid 2.0 tasarımı.
2. **`HeartBurstLayer.vue`:** Instagram/TikTok kas hafızasını tetikleyen küresel çift dokunuş (double-tap) kalp patlaması. 3D yaylanma animasyonu, neon pembe ışıltı, psikoakustik ses ve anlık dopamin vuruş ödülü.
3. **`CommentTicker.vue`:** Cookie Clicker haber bandının TikTok canlı yayın sohbetine uyarlanması. Gece saatine göre değişen 20+ absürt hiciv yorumu, tıklanabilir kalp butonu (`❤️`) ve dopamin primi.
4. **`FloatingThumbBar.vue`:** Mobilde (`<768px`) başparmak erişim tersliğini çözen alt sabit hızlı aksiyon alanı. Tek elle rahatça basılabilen büyük "KAYDIR! 👆" butonu, kombo/debuff rozeti, Tümü (Max All) ve Tickspeed Hz butonları.
5. **`DimensionsTab.vue`:** Format satırları aralığı `space-y-2 sm:space-y-1.5` yapılarak mobilde 44px'lik dokunma alanlarının dikey çakışması (overlap) ortadan kaldırıldı.
6. **`App.vue`:** Yeni bileşenler monte edildi, mobil alt boşluğu `max-md:pb-36` ile ferahlatıldı.
7. **Doğrulama:** `npm run build` 0 hata (1701 modül), `npm test` 162/162 yeşil, Playwright canlı web testi (masaüstü & 390x844 iPhone görünümü) başarıyla tamamlandı.

## [2026-10-04] — Gece Teması UI Paketi: Saat + Yozlaşma + Yatak Odası (v0.30.0)

### Kullanıcı talebi:
- *"ui ve görünüm kısmı için detaylı araştırma yap"* → *"en iyi şekilde yap"*

### Kapsam (5 dosya, cerrahi):
- `Header.vue`: gece saati 02:47→06:15 (208 dk, log10/308.25), faz rozeti (Yorgan Altı/Derin Gece/Cızırtı/Kuş Vakti/Şafak), ince gökyüzü şeridi.
- `DimensionRow.vue`: D1→D8 yozlaşma dili — emoji poster (🐱→☠️) + satır dokusu (static/flicker/glitch).
- `ScreenOverlay.vue`: yatak odası vinyeti (sabit) + şafak ufku (ilerleme %60 sonrası, max 0.85 opaklık).
- `AlgorithmicSwirl.vue`: şafak öncesi ısınma (%75+ koşuda zemini turuncuya kaydırır, tekillik altını ayrı kalır).
- `style.css`: bedroom/dawn/decay stilleri + reduced-motion ve battery-saver koruması.
- Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

## [2026-10-04] — Reset Tuşu Kök Neden Düzeltmesi

### Kullanıcı talebi:
- *"reset tuşu çalışmıyor"*

### Kök neden (iki yük taşıyıcı hata):
1. `App.vue:320-321` `beforeunload/pagehide → persistLocalSave` — Sıfırla localStorage'ı temizleyip `reload()` diyordu; unload sırasında persist ESKİ bellek durumunu diske geri yazıyordu. Misafir için bile %100 tutmuyordu.
2. Girişli kullanıcıda `saveToCloud(true)` ESKİ serialize'ı buluta itiyordu (yorum "taze durum" diyordu ama store sıfırlanmamıştı) + promise reject olursa `.then(reload)` hiç çalışmıyordu (catch yok).

### Düzeltme (`SettingsModal.vue:executeHardReset`):
önce `store.$reset()` (bellek) → `SaveSystem.hardReset()` (disk) → `suppressSaves()` (reload'a kadar yarış koruması) → buluta TAZE durum + her halükarda reload.
Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

## [2026-10-04] — Alev Okunabilirlik 5.5 (gradyan sökümü + çekirdek renk)

### Kullanıcı talebi:
- Ekran görüntüsü: alevli sayı okunmuyordu.
- Neden: `background-clip:text + transparent fill` piksel fontu çamurlaştırıyor, `-webkit-text-fill-color` soneklere miras kalıp çekirdeği yok ediyordu.
- Düzeltme: alev = soluk sıcak çekirdek + turuncu hale + hafif titreme; sonek aralığı açıldı.
- Doğrulama: `npm run build` 0 hata, `npm test` 162/162 yeşil.

## [2026-10-04] — Çerçevesiz Sayaç 5.3 + Alev Efekti 5.4

### Kullanıcı talebi:
- *"o sayıyının çerçevesini sil"*
- *"sayı aşırı hızlı artmaya başladığında yanmaya başlasın alev alsın sonra yavaşladığında normale dönsün"*

### Gerçekleştirilen İyileştirmeler:
1. **5.3 Çerçeve silindi:** [`Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue) plaka sarmalayıcısı sade `dopa-wrap` oldu; `style.css` plaka/sheeen/ramp CSS'i silindi. Isı hissi yazı glow + nabız + /s okunda sürüyor.
2. **5.4 Alev:** ısı skoru 0.75'te tutuşur, 0.6'nın altına inmeden sönmez (histerezis — titreme yok); tutuşma anında tek kor patlaması + tiz tick; alevde sonek rozetleri ve `/s` turuncuya döner; yavaşlayınca beyaz normale döner.
3. Güvenlik: pil tasarrufu / azaltılmış hareket / OS terciğinde alev beyaza düşer (görünmez metin riski kapatıldı).
4. Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

## [2026-10-04] — Sayaç Okunabilirliği 5.2 (sonek rozeti + keskin gölge + hover netleşme)

### Kullanıcı talebi:
- *"daha okunabilir olsun sayılar"*

### Gerçekleştirilen İyileştirmeler:
1. [`src/core/format.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/format.ts): `formatParts()` — sonek gövdeden ayrıldı (`1.23 M`, `1.23e45`, `e12.34` regex korumalı).
2. [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): sonek ruloya girmiyor, küçük renkli rozet (üs amber, harf mor); `/s` 13→15px ve daha parlak.
3. [`src/style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css): glow bulanıklığı ~yarıya indi, supernova kroması 1px'e çekildi (elektrik plaka çerçevesinde kaldı), harf aralığı açıldı, üzerine gelince rulo 0.12 sn'ye iniyor.
4. Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

## [2026-10-04] — Dopamin Nabzı 2.0 (Sütun 5.1: log-hız ısısı + büyüklük pop + tally tick)

### Kullanıcı talebi:
- *"en iyi ve en güzel görünecek şekilde yapmaya başlat"*
- *"assetler de kullanabilirsin mcplerden yapıp veya internetten araştırıp"*

### Gerçekleştirilen İyileştirmeler:
1. [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): ısı artık `mps/matter` oranı yerine `log10(mps)` tabanı + anlık burst (geç oyunda `calm` ölümü bitti); büyüklük kademeli pop (tık / sıçrama / büyük sıçrama); `/s` yanında ▲/▼ delta oku (~1.5 sn örnek); sheen hızı ısıya kenetli (4.5→1.4 sn); tek dekadda soft shake + tick, 10'arlı dekadda konfeti + medium shake + shockwave + payoff.
2. [`src/style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css): dosyasız ısı rampası (`dopa-plate::before`, `--glow-i`), `count-pop-md/lg` kademesi, dekad flaşına scale zıplaması, `dps-delta` ok stilleri, `m6x11plus` Türkçe fallback, yeni animasyonlar reduce-motion listesinde.
3. [`src/core/audio.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/audio.ts): `playTallyTick` (hıza göre tizleşen blip, 45ms throttle) + `playPayoff` (E6→B6 chime). Harici ses dosyası yok — synth kuralı korundu.
4. Not: `texture-mcp` export kökü `Elementum`'a bakıyor (`Incremental` değil), bu yüzden dokular dosya yerine CSS gradient olarak üretildi — kök düzelince PNG'ye çevrilebilir.
5. Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

---

## [2026-10-04] — Balatro Sütun 5: Hız-Reaktif Dopamin Sayacı (Odometre + Isı + Dekad Flaşı)

### Kullanıcı talebi:
- *"dopamin sayısı balatrodaki gibi artış hızına göre sürekli dopamin verecek şekilde gözüksün"*
- *"en iyi şekilde yap"*

### Gerçekleştirilen İyileştirmeler:
1. [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): rAF üstel yumuşatmalı `displayedMatter` (kesikli pencere yerine sürekli akış, log fark > 2'de anında yapış), logaritmik `rateTier` (sakin/ılık/sıcak/süpernova), konuma sabit slot şeritleri (`reel-strip` translateY, remount yok), dekad flaşı + 10'arlı dekadda konfeti, `aria-live` + `sr-only` erişilebilirlik, tıklama pop'u dış tablada (nabızla çakışmaz).
2. [`src/style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css): kullanılmayan `public/fonts/m6x11.woff2` piksel font asset'i `@font-face` ile bağlandı, `dopa-plate` premium plaka (ısıya göre renk + sheen), `rate-warm/hot/supernova` nabız, `prefers-reduced-motion` + `reduce-anim` + `battery-saver` uyumu.
3. Doğrulama: `npm run build` 0 hata (1692 modül), `npm test` 162/162 yeşil.

---

## [2026-10-04] — Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering) (v0.28.0)

### Kullanıcı talebi:
- *"@[brain/research/balatro-uiux-synthesis-roadmap.md] buradaki sütun 2 için detaylı araştırma yap ve en iyi planı oluştur"*
- *"en iyi şekilde yap"*

### Gerçekleştirilen İyileştirmeler:
1. **Derin Araştırma & Mimari Analiz:**
   - [`brain/research/balatro-column-2-sequential-triggering-deep-dive.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/research/balatro-column-2-sequential-triggering-deep-dive.md): Tek kare sayı boşalması sorununun teşhisi, Incremental spam-click paradoksu ve Çift Hızlı Sıralı Nedensellik mimarisinin formüle edilmesi.
   - [ADR-0038](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0038-balatro-sequential-triggering-reels-strike.md): Mimari karar kaydı.
2. **Veri ve Tip Katmanı:**
   - [`src/models/types.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/models/types.ts): `StrikeStageId`, `StrikeStage`, `SequentialStrikePayload` tipleri ve `GameSettings.sequentialStrike` (varsayılan: `true`).
   - [`src/stores/game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts): `swipeBreakdown` getter'ı (Taban, Sinerji, Duruş/Kombo, Histeri CRIT, Final Slam) ve non-blocking `manualClick(coords)` aksiyonu; `dimensionShift` ve `buyGalaxy` fonksiyonlarına `doomscroll:macro-surge` olay yayımı.
3. **Web Audio Polifonik Lydian Arpej Sentezleyici:**
   - [`src/core/audio.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/audio.ts): `playSequentialStrike(stageCount, isCrit)` ile C4 $\to$ E4 $\to$ G4 $\to$ C5 Lydian arpeji, hızlı vuruşlarda pitch-ramping oktav tırmanışı, 65 Hz $\to$ 35 Hz tok mekanik sub-bass tokmağı ve `playMacroSurge` format basamak tonları.
4. **Taktil Mikro ve Makro UI Katmanı:**
   - [`src/components/SequentialStrikeLayer.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/SequentialStrikeLayer.vue): Balatro tarzı soldan sağa fırlayan yaylanan rozet patlamaları (`spring pop`), anti-lag coalescing (maks 3-4 grup) ve sinematik makro sıçrama barı.
   - [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue) & [`src/components/DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue): Koordinat senkronizasyonu.
   - [`src/components/SettingsModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/SettingsModal.vue): Görsel sekmesine "Sıralı Reels Vuruşu (Balatro Pop-Chain)" toggle anahtarı.
   - [`src/App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue): Katman montajı.
5. **Kalite Kapısı Doğrulaması:**
   - `npm run build`: 0 hata, 1692 modül başarıyla paketlendi.
   - `npx vitest run`: 7 dosya, **162/162 test yeşil** ([`src/stores/sequential-strike.test.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/sequential-strike.test.ts) dahil).
   - Playwright canlı tarayıcı testi: Kaydır butonu, Space klavye kısayolu ve Ayarlar modalındaki anahtar canlı olarak doğrulandı.

---

## [2026-10-04] — Balatro Canlı GLSL Arka Plan Girdabı (AlgorithmicSwirl.vue) (v0.27.0)

### Kullanıcı talebi:
- *"@[brain/research/balatro-visual-math-uiux-breakdown.md] bununla beraber bizim ui kısmında neler yapabiliriz"*
- *"bu dediklerini bir yere kaydet ve 1. için en iyi planı hazırla"*
- *"en iyi şekilde yap"*

### Gerçekleştirilen İyileştirmeler:
1. **Canlı WebGL Balatro Procedural Paint Swirl Shader'ı:**
   - [`AlgorithmicSwirl.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AlgorithmicSwirl.vue):
     - Aspect-correct quantized UV basamaklandırması ve CRT retro piksel filtresi (480).
     - Kutupsal UV açısı ve merkezkaç girdap deformasyonu (`atan2(uv.y, uv.x)` + açısal hız).
     - 5 kademeli iteratif sinüs-kosinüs kaos dalgası döngüsü.
     - 3-renkli boya ayrışması ve dinamik aydınlatma formülü.
2. **Oyun Durumu Reaksiyon Matrisi & Pürüzsüz Lerp Motoru:**
   - *Dingin Gece (02:47):* Koyu Gece Mavisi (`#0a0c16`) + Koyu Mor (`#4c1d95`).
   - *Algoritma Frekansı (Hz):* $0.8 + 0.28 \times \log_{10}(\text{tickspeedMultiplier})$ ile logaritmik ivmelenme.
   - *Kombo Hipnozu:* Elektrik İndigo + Neon Camgöbeği (`#06b6d4`), yüksek kontrast.
   - *Gece Krizleri / Meydan Okumalar:* Kan Kırmızısı (`#e11d48`) + Abis.
   - *Şafak 06:00 / Tekillik Eşiği:* Güneş Altını (`#f59e0b`) genişleyen süpernova.
   - Ani renk sıçramalarını önleyen 60 FPS `lerp(current, target, dt * 2.8)` interpolasyonu.
3. **Sıfır Performans Kaybı & Pil/Erişilebilirlik Kalkanı:**
   - 0.5x dahili render tamponu ile %75 GPU fill-rate tasarrufu ve gerçek 90'lar piksel estetiği.
   - `visibilitychange` ile sekme arka plana geçtiğinde rAF döngüsünün durdurulması (0% CPU/GPU).
   - `batterySaver` veya `reduceAnimations` açıkken WebGL döngüsünün kapatılıp statik CSS gradyanına çekilmesi.
4. **Ayarlar ve Store Entegrasyonu:**
   - [`types.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/models/types.ts) ve [`game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts): `swirlShaderQuality: 'off' | 'balanced' | 'high'`.
   - [`SettingsModal.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/SettingsModal.vue): "Algoritma Arka Plan Girdabı (Balatro Swirl)" ayar kartı (`Yüksek (0.75x)`, `Dengeli (0.5x Retro)`, `Kapalı (Statik)`).
   - [`App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue): En alt z-katmanına montaj.

### Doğrulama:
- `npm run build`: 0 hata, 1689 modül derlendi.
- `npx vitest run`: 157/157 test geçti.
- Playwright ile canlı tarayıcı testi: WebGL canvas doğrulaması (768x337 dahili tampon, 1531x674 görünüm), Ayarlar modalı etkileşimi ve ekran görüntüsü kanıtı alındı.

---

## [2026-10-04] — Boyut Satın Alma Butonuna Çift Katmanlı Önizleme Barı (Preview Fill)

### Kullanıcı talebi:
- *"mesela dimlerde tekli alacağımız zaman paramızın kaç taneye yeteceğini gösteriyor ama mesela 5 tane alacaksam o barın ne kadarını dolduracağını göstermiyor onu düzelt"*

### Gerçekleştirilen İyileştirmeler:
1. **Çift Katmanlı Zemin Barı (Current vs Preview Fill):**
   - [DimensionRow.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue):
     - **1. Katman (Önizleme Dolgusu):** Oyuncunun parası yettiği adet miktarında (`preview.units`), 10'luk paket içinde barın nereye kadar dolacağını (`previewProgress = Math.min(10, packProgress + affordableUnits)`) şeffaf açık mor ve parıltılı bir zeminle gösterir (`previewFillPct`).
     - **2. Katman (Mevcut Doluluk):** Şu ana kadar alınmış olan adedi koyu ve sabit mor dolguyla gösterir (`currentFillPct = (packProgress / 10) * 100`).
2. **Kompakt Adet Artışı Rozeti:**
   - Adet göstergesine yeşil renkte `(+X)` birim artış önizlemesi eklendi: örn. `2/10 (+5)` veya `0/10 (+3)`.
3. **10'luk Paket Tamamlama Nabzı:**
   - Eğer bu alımla 10'luk kova dolup tamamlanıyorsa (`completesPack`), önizleme barı %100'e ulaşıp `animate-pulse` ile ışıldar.

### Doğrulama:
- `npm run build`: 0 hata, 1686 modül derlendi.
- `npx vitest run`: 154/154 test geçti.

---

## [2026-10-04] — Kullanıcı İlerlemelerinin Küresel Sıfırlanması (ADR-0037: Global Save Wipe)

### Kullanıcı talebi:
- *"kullanıcıların bütün ilerlemelerini sıfırla"*

### Gerçekleştirilen İşlemler:
1. **Sürüm Yükseltme ve Asgari Sürüm Eşiği (v16):**
   - [save-version.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/save-version.ts): `SAVE_VERSION = 16`, `MIN_SUPPORTED_SAVE_VERSION = 16` yapıldı.
2. **Otomatik Tasfiye ve Temizleme Kancası (`loadDetailed`):**
   - [save.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/save.ts): Oyunu açan her kullanıcının yerel tarayıcısındaki v16 öncesi eski kayıtları veya yedekleri algılandığında otomatik olarak `SaveSystem.hardReset()` tetiklenerek tüm slotlar, yedekler (`_BAK`), legacy kayıtlar ve mock bulut verileri temizlendi.
   - Oyun motorunun temiz 10 dopaminlik taze state ile başlaması sağlandı.
3. **İçe Aktarma Kalkanı:**
   - [save.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/save.ts) ve [game.ts](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts): Eski metin kayıtlarının geri yüklenmesi engellendi.

### Doğrulama:
- `npm run build`: 0 hata, 1686 modül derlendi.
- `npx vitest run`: 154/154 test geçti.

---

## [2026-10-04] — Reels UI/UX, Taktil Ergonomi ve Tematik İyileştirme Mimarisi (ADR-0036)

### Kullanıcı talebi:
- *"reels kısmının ui ux kısmını iyice inceleyecek subagentlar oluştur ve neler yapabiliriz neyi geliştirebiliriz minimalist şekilde bunları araştırsınlar"*
- *"düzelt"*

### Gerçekleştirilen İyileştirmeler:
1. **Space Tuşu Odak Tuzağı (Keyboard Focus Trap) Düzeltildi:**
   - [Header.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): Kullanıcı herhangi bir butona bastıktan sonra Space tuşuna bastığında son tıklanan butonu tekrar tetikleme hatası giderildi; `target.blur()` ile odak temizlendi ve `e.preventDefault()` uygulandı.
2. **Web Vibration API Taktil Dokunsal Titreşim:**
   - [Header.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue) & [DimensionsTab.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue): Manuel kaydırmalarda `navigator.vibrate(8)` haptik mikrotık entegre edildi.
3. **Dokunmatik Yukarı Kaydırma (Touch Swipe-Up Gesture):**
   - [DimensionsTab.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue): Mobilde parmakla dikey yukarı fiskeleme (`touchstart`/`touchend` $\Delta y \le -36px$) jesti doğrudan kaydırma eylemini tetikler hale getirildi.
4. **9:16 Dikey Mikro Video Posteri ve Yüzeye Çıkarılan Altyazılar:**
   - [DimensionRow.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue): Sol kenara formata özel renkte minik `Play` (▶) ikonu ve alt oynatma çizgisi içeren 9:16 dikey video çerçevesi eklendi.
   - Başlığın altına gece saatini ve ironik alıntıyı içeren tek satır akıcı altyazı (`tierConfig.subtitle`) yüzeye çıkarıldı.
5. **Linear Zemin Dolgusu & Bilişsel Yük Temizliği:**
   - [DimensionRow.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue): 10 ayrı `span` çubuğu yerine; butonun arka planında `%0 → %100` dolan gradyan zemin dolgusu ve kompakt `(X/10)` göstergesine geçildi. 80 gereksiz DOM span elemanı tasfiye edildi.
   - Anlamsız gri `144p` etiketleri ve açılmamış partner formatların `🔗 Ayna Sinerjisi` rozetleri gizlendi.
6. **Kademeli Açılma & Bento Sadeleştirmesi:**
   - [Header.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue): Duruş (Stance) butonları acemi oyuncudan (`bought < 25`) gizlendi.
   - [DimensionsTab.vue](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue): Boş "Akış Kümesi D8 çağında açılır" gri kutusu kaldırıldı; erken oyunda tek kalan Akış Sıçraması kartı bento ızgarasını tam kaplayacak şekilde dinamikleştirildi (`gridColsClass`).

### Doğrulama:
- `npm run build`: **0 hata**, 1686 modül başarıyla derlendi.
- `npx vitest run`: **154 testin 154'ü (%100) geçti**.
- Detaylar: `brain/decisions/0036-reels-ui-ux-ergonomics-and-thematic-polish.md` ve [walkthrough.md](file:///C:/Users/Yigit/.gemini/antigravity/brain/7702511a-7f25-457d-8a92-554ea72fb888/walkthrough.md).

---

### Kullanıcı talebi:
- *"oyundaki şu an olan bütün güçlendirmeler, matematik vs. gibi şeyleri kontrol et her şeyi subagentlarla beraber didik didik arayın oyunu bozacak şeyleri ve dengeleme için neler yapılması gerektiklerini bir sürü subagent oluştur hepsi derin ve detaylı araştırsın"*
- *"oyunun dengesini bozacak demek istedim"*
- *"düzelt hepsini ve dekad bonuslarını kaldır"*

### Kök Neden Analizi ve Gerçekleştirilen Düzeltmeler:
1. **Dekat Bonuslarının (Decade Surges / ADR-0034) Tasfiyesi:**
   - `DECADE_SURGES`, `DecadeSurge` ve yardımcı fonksiyonlar `src/game/pacing.ts`'den; ilgili UI göstergeleri `src/App.vue`'dan; çarpan döngüsü `src/stores/game.ts`'den arındırıldı.
2. **Challenge Hedef Desync'i (Severity 1 Bug Düzeltmesi):**
   - Kriz tamamlanması `canSingularity` ($1.79 \times 10^{308}$) koşulundan kurtarıldı. `challengeGoalReached` getter'ı eklenerek her kriz kendi `goalMatter` eşiğinde bitirilir hale getirildi.
3. **Çevrimdışı İlerlemede $1.800\times$ Kaskad Açığı:**
   - `offlineSimBoost` `getDimensionMultiplier`'dan çıkarıldı; `update()` içindeki son dopamin adımında tekil olarak uygulandı ($(2.55)^8 \to 2.55\times$).
4. **Seçim Düğümlerinde (Choice Nodes) Sessiz SP Buharlaşması:**
   - Şafak veya kriz geçişinde sıfırlanan seçim düğümlerinin SP bedeli oyuncunun havuzuna eksiksiz iade edildi.
5. **Shift 2 / D5 Tuğla Duvarı (8 Dekadlık Uçurum):**
   - $D_5$ ve $D_6$ için `EARLY_D5_COST_RATIO = 24`, `EARLY_D5_SOFT_BUCKETS = 2` eklendi; erken sıçrama gereksinimi ilk adımlarda 10 adede çekildi.
6. **Kriz Kilitlenmeleri (Softlocks):**
   - C2'de durma süresince autobuyer botları otomatik beklemeye alındı; C5 maliyet şişmesine $10^{12}$ tavanı (softcap) konuldu.
7. **Tickspeed 12.5x Patlaması & Distant Galaxies:**
   - `galaxyBonus` tabanı 0.35 yapıldı; 60 galaksiden sonra Distant Galaxies kuadratik freni eklendi.
8. **Toplu Uyku (Power Nap) Sonsuz Spam İstismarı:**
   - Asgari bot eşiği `minNapBots` ile her nap sonrası dinamik artırıldı (`100 * 1.8^napCount`). Bot üremesine lojistik kapasite freni eklendi.
9. **Başarım Çarpan Senkronizasyonu & SP Tabanı:**
   - `achievementProductionMult` (2.5x) `update()` dopamin hesabına eklendi; taban SP 3'e çıkarıldı, `break_singularity` maliyeti 4 SP'ye çekildi; zayıf hibritler güçlendirildi.

### Doğrulama:
- `npm test`: 6 test dosyası, **154 testin 154'ü (%100) geçti**.
- `npm run build`: Sıfır tip hatasıyla başarıyla derlendi.
- Canlı Playwright UI testi: Konsolda sıfır hata/uyarı ile doğrulandı.

---

### Kullanıcı talebi:
- *"botların otomatik alım da o sesler gelmesin"*
- *"birde alt tab attıktan sonra geri döndüğümde o zamana kadar olan bütün sesleri yığıyor açılışta"*

### Kök Neden Analizi:
1. **Bot Alım Sesleri:**
   - Botlar `buyMaxDimension`, `buyDimension`, `buyOneUnit`, `buyTickspeed`, `buyMaxTickspeed` çağırırken `playSound = false` verilse dahi, boyut satın alımlarında çağrılan `finalizeDimensionPurchase()` içinde `emitProductionSurge()` tetikleniyor ve her artışta koşulsuz `sounds.playProductionSurge()` çalıyordu.
   - `buyTickspeed()` ve `buyMaxTickspeed()` içinde `emitProductionSurge(mpsBefore)` çağrısı `playSound` parametresine bakmadan ses çalıyordu.
   - Bot döngüsünde `buyOneUnit(tier)` varsayılan parametreyle çağrılıyordu ve `buyMaxDimension(tier, false)` / `buyMaxTickspeed(false)` çağrılarında `feedbackSurge` true kalıyordu.
2. **Alt-Tab Ses Yığılması (Web Audio Queueing / Catch-Up Backlog):**
   - Tarayıcı sekmesi arka plana geçtiğinde (`document.hidden`), Web Audio API AudioContext donuyor veya tarayıcı tarafından zamanlayıcıları askıya alınıyordu.
   - Sekmeye geri dönüldüğünde `game-loop.ts` veya `simulateOfflineProgress` devreye girip binlerce döngü adımını işletirken, tetiklenen tüm ses düğümleri donmuş AudioContext kuyruğuna yazılıyor ve odaklanıldığı milisaniyede yüzlerce ses aynı anda patlıyordu.
   - `simulateOfflineProgress` içinde ses susturma bayrağı yoktu; Lab mutasyonları ve dekad dönüm noktaları offline simülasyonda da ses tetikliyordu.

### Uygulanan Çözüm:
1. **`src/core/audio.ts` (SoundManager Donanımsal Ses Susturma Zırhı):**
   - `suppressed` bayrağı ve `suppressFor(ms)` metodu eklendi.
   - `getContext()` içine `if (this.suppressed || (typeof document !== 'undefined' && document.hidden)) return null` guard'ı eklendi. Sekme arka plandayken veya susturulmuşken tek bir osilatör veya ses düğümü dahi oluşturulamaz/kuyruğa eklenemez.
   - `visibilitychange` dinleyicisi eklendi: Sekme gizlendiğinde anında sessize alınır; sekmeye geri dönüldüğünde (`visible`) ilk 500ms boyunca tüm catch-up süresince ses üretimi engellenir.
2. **`src/stores/game.ts` (Bot Alımlarında Sıfır Ses):**
   - `emitProductionSurge(beforeMatterPerSec, playSound = true)` fonksiyonuna `playSound` ve `if (this.offlineSimActive) return` kontrolü eklendi.
   - `finalizeDimensionPurchase(tier, mpsBefore, playSound = false)` imzası güncellenip alım metodlarından `playSound` aktarıldı.
   - `buyDimension`, `buyMaxDimension`, `buyTickspeed`, `buyMaxTickspeed`, `buyDimensionUnits`, `buyOneUnit` fonksiyonları `playSound` parametresini `finalizeDimensionPurchase` ve `emitProductionSurge`'a iletir hale getirildi.
   - Autobuyer döngüsündeki tüm alımlar `playSound = false` ve `feedbackSurge = false` ile çağrıldı.
   - `simulateOfflineProgress()` başlarken `sounds.suppressed = true` yapıldı ve `try...finally` ile işlem bitince `sounds.suppressFor(300)` çalıştırıldı.
   - Lab mutasyon sesleri (`playPlant`, `playCombo`) ve Dekad Milestone sesi (`playMilestone`) `if (!this.offlineSimActive)` şartına bağlandı.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) çalıştırıldı → **0 hata**, sorunsuz derlendi.

---

## [2026-10-06] — Açılış Artık Kapı Değil, Olay (ADR-0035)

### Kullanıcı talebi:
- *"bir özellik açıldığında ben eğer akış sıçraması veya akış kümesi alırsam dopamin sıfırlandığından açılan şey görünmez oluyor"*

### Sorunun kaynağı:
ADR-0009 kilitlemeleri `state`'ten türetmiş, kalıcılığı da `unlockedFeatures`
yapışkan listesine bırakmıştı. Ama **kapının kendisi koşu içi sayaca bakıyordu**:

- `src/game/unlocks.ts` → `checkUnlock()`, `dopamine` dalı: `ctx.matter.gte(req.amount)`.
- `buildUnlockContext()` `state.matter`'i doğrudan kopyalıyordu.
- `matter` bir **ölçüm**: `dimensionShift()`, `buyGalaxy()` ve `resetRunState()`
  (şafak + `enterChallenge`/`exitChallenge`/`completeChallenge`) hepsini 10'a
  sıfırlıyor. Ölçüm hafıza değildir.

Merdivenin 15/16 basamağı dopamin eşiğine bağlı (1e3 → 1e308), yani rapordaki
Gece Krizleri, Otomatik Botlar, Çılgın Kaydırma, Koloni, Kriz Yönetimi, Lab,
Vicdan Azapları dahil **tümü** bu hatadan etkileniyordu. Kalıcılığın tek dayanağı
olan `unlockedFeatures` listesi ise yalnızca `update()` başındaki 0.5 sn'lik
`unlockCheckAcc` penceresinde yazılıyordu — Şafak Nöbeti Botu, çevrimdışı
ilerlemenin büyük adımları veya oyuncunun tıklaması eşik aşıldığı anda listeye
yazılmadan reseti tetikleyebiliyordu.

Ayrıca merdiven dışındaki iki görünürlük kararı da aynı hatayı taşıyordu:
`singularityUnlocked` (`matter.gte(1e30)`) ve Önbellek Temizleme kartı
(`dimensionShifts >= 5`; `buyGalaxy()` bu sayacı 0'a indirdiği için ilk kümeden
sonra kayboluyordu).

### Uygulanan:
- **`src/game/unlocks.ts`** (tek doğru kaynak): saf ve NaN korumalı
  `raisedLifetimePeak()` / `lifetimeUnlockDopamine()` / `meetsDopamineGate()`
  eklendi. `UnlockContext.lifetimePeakMatter` (opsiyonel) eklendi;
  `checkUnlock` / `unlockProgress` / `unlockProgressFraction` dopamin dalları
  artık `max(matter, hayat boyu tepe)` üzerinden okuyor — ilerleme çubuğu da
  reset sonrası geriye gitmiyor.
- **`src/stores/game.ts`**: `lifetimePeakMatter` (Decimal) + `lifetimePeakShifts`
  (number) state alanları; **tek yazıcı** `syncUnlocks()`. `update()` döngüsünde
  0.5 sn seyreltisiyle (merdiven tamamlandı kısa devresi kaldırıldı),
  `dimensionShift()`'te sayaç artırıldıktan sonra ve `resetRunState()`'in başında
  (şafak + 3 challenge yolu tek kancadan) çağrılır. `singularityUnlocked` ve
  yeni saf `sacrificeUnlocked` getter'ı aynı mekanizmaya bağlandı.
- **`src/components/DimensionsTab.vue`**: Önbellek Temizleme kartı artık
  `store.sacrificeUnlocked`'ı okuyor, kendi kopyasını hesaplamıyor.
- **Kayıt**: `SAVE_VERSION` 14 → **15**; `SerializedPlayerState`'e opsiyonel
  `lifetimePeakMatter?: string` ve `lifetimePeakShifts?: number`.
- **Geriye dönük uyum (veri kaybı yok)**: göç kancası yerine türetme —
  `lifetimePeakMatter ← max(stats.highestMatter, matter, kayıtlı tepe)`,
  `lifetimePeakShifts ← max(dimensionShifts, eski D8 alımı, kayıtlı tepe)`.
  `stats.highestMatter` zaten hayat boyu zirve olduğundan bir v14 oyuncusu ilk
  yüklemede kaybettiği açılışların tamamını geri kazanır.
- **`src/game/unlocks.test.ts`**: 46 → 62 test (+16 ADR-0035 bloğu).

### Doğrulama:
- `npx vitest run` → **151/151 test geçti** (5 dosya).
- `npm run build` (`vue-tsc && vite build`) → **0 tip hatası**, 1686 modül.
- Store seviyesinde ayrıca uçtan uca doğrulandı (geçici test, sonra silindi):
  Sıçrama/Küme sonrası tüm merdiven + Şafak sekmesi + Önbellek Temizleme kartı
  açık kalıyor; `syncUnlocks()` hiç çalışmadan `resetRunState()` çağrılan yarış
  penceresi kapalı; çevrimdışı ilerleme açılışları kaydediyor; v14 kayıt eksiksiz
  geri yükleniyor; sıfırdan başlayan oyuncu hiçbir şey açık görmüyor.

### Kapsam kararı:
Satın alma kapıları **koşuya bağlı kaldı** — "görünürlük" değil "şu an alınabilir mi"
soruları. `decadeSurgeMult` (ADR-0034) de bilinçli olarak koşu içi buff olarak kaldı.

**Kapsam genişletmesi (koordinatör ajan, aynı gün):** Ajan "D4–D8 boyut açılışı koşuya
bağlı kalsın" diye teslim etti; ancak bu, kullanıcı şikâyetinin **boyut tarafında açıkta
kalan aynı semptomdu** — `buyGalaxy()` koşu sayacını 0'a indirdiği için tavan 8'den 3'e
düşüyor ve ilk kümeden sonra D4–D8 satırları kayboluyordu. Karar: boyut açılışı da
kalıcıdır (AD davranışı). `resolvedUnlockedDimensionCount()` artık
`max(dimensionShifts, lifetimePeakShifts)` okur; `dimMultCacheKey`'e `lifetimePeakShifts`
eklendi (türev bağımlılığı — eklenmeseydi bayat çarpan cache'ten dönerdi).
İlk kümeden önce davranış birebir aynıdır; ücretsiz çarpan kazanılmaz (`bought`/`amount`
sıfırlanır, tier çarpanları sıfırdan başlar). Yan fayda: `celebrateFormatUnlock` her
koşuda aynı tier'ları tekrar kutlamıyor.

### Bulut kayıt riski kapandı:
`src/core/auth/cloud-conflict.ts` alan-bazlı birleştirme **yapmaz** (`isSameSave` /
`evaluateWriteGuard` / `decideSyncAction` tam-payload karşılaştırması + tek parça
yükleme-indirme) — `lifetimePeakMatter` düşme riski yoktur.

### Bilinçli trade-off:
`lifetimePeakMatter` kalıcı bir sayı olarak **daha fazla açılış korur**; bu, şu
anda ölçülebilir bir denge maliyeti doğurmuyor (hiçbir yeni içerik erken açılmıyor,
yalnızca ulaşılmış olan artık kaybolmuyor). Kayıt boyutu +2 alan (~30 bayt).

Kayıtlar: [ADR-0035](../decisions/0035-permanent-unlock-record-lifetime-dopamine.md)

---

## [2026-10-05] — SP Artık Yalnızca Şafakta Kazanılır (ADR-0034)

### Kullanıcı talebi:
- *"bir dakika neden şafak yapmadan sp kazanıyoruz biz? bunun kaldırılması gerekiyor sp sadece şafak yaptığımızda gelmeli"*

### Sorunun kaynağı:
ADR-0032'nin **Dekad Primi** tablosu (`pacing.ts`), 1e6 → 1e300 arası 13 basamakta hayat boyu bir kez olmak üzere **72 SP** doğrudan SP bankasına yazıyordu. Yani hiç şafak (Sabah 06:00 Çöküşü) yapmadan SP kazanılıyor, Nöral Ağaç'tan düğüm alınabiliyor ve `spPerMinute` telemetrisi çöküş dışı kazancı da kapsıyordu.

### Kullanıcı seçimi (3 seçenekten):
- ✅ **Koşu içi buff'a çevir** — ödül SP değil, şafa kadar süren geçici üretim/hız çarpanı.

### Uygulanan:
- **`src/game/pacing.ts`**: `DECADE_BOUNTIES` → **`DECADE_SURGES`** (`sp` → `mult`); `DecadeBounty` → `DecadeSurge`; `totalDecadeBounty` → `totalDecadeSurgeMult`; `bountyForLog10` → `surgeForLog10`; `nextBountyForLog10` → `nextSurgeForLog10`. 13 eşik korundu, toplam **+36× koşu içi çarpan**.
- **`src/stores/game.ts`**: basamak döngüsü artık SP yazmıyor, `decadeSurgeMult` biriktiriyor; çarpan `tickspeedMultiplier` içine bağlandı (üretim + tıklama); `resetRunState()` şafakta ve challenge girişinde 1'e döndürüyor.
- **Kayıt**: `SAVE_VERSION` 13 → **14**; `decadeSurgeMult` serialize/deserialize ediliyor (v13- kayıtlarda 1).
- **`src/App.vue`**: rozet "Sıradaki Dekad Yükselişi — ×N hız" (cyan) + **"Aktif ×N"** göstergesi; ipucu metinleri güncellendi.
- **`src/game/pacing.test.ts`**: 11 teste güncellendi (`surgeForLog10`, `nextSurgeForLog10`, pozitif çarpan invariantı).

### Doğrulama:
- `npx vitest run` → **135/135 test geçti** (5 dosya).
- `npm run build` → **0 tip hatası**, 1686 modül, 16.43 sn.

### Bilinçli trade-off:
İlk koşu artık 1 SP verir (kök düğüm) — eskiden 73 SP ile ağacın ~%20'si alınabiliyordu. Bu, kullanıcının kuralının doğrudan maliyetidir. Detay: `brain/decisions/0034-sp-only-at-dawn-decade-surge-run-buff.md`.

---

## [2026-10-04] — 1e308'e Kadar İçerik Merdiveni + Erken Oyun Düzeltmesi (v0.27.0 → v0.27.1)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi 1: *"oyunda açılabilir ve zamanla elde edilen güçlendirmeler ve başarımları 1e308'e kadar sürecek şekilde dengelemek istiyorum, şu ankileri bunun için plan yap"* → ardından *"en iyi şekilde düzelt, hatta başlamadan önce benzer projelerde neler yapmışlar onlara da bak"*.
- Kullanıcı talebi 2: *"milyardan trilyona geçmek çok uzun sürüyor dimleri alması falan"* ve *"d4 yok 1. akış sıçramasında"*.

### Ölçüm (önce):
Headless harness gerçek Pinia store'unu sürdü (`results-308-audit.json`): **13 özellik kilidinin tamamı 60. dakikada açılıyordu**; kalan 257 dakikada (koşunun %81'i) sıfır yeni içerik. Dopamin ölçeğiyle bağlı yalnızca 4 içerik vardı → **1e30 ile 1e308 arası 278 dekad boş**. SP formülü tüm ağaç için 1e1401 gerektiriyordu; 8 meydan okumanın 8'i de aynı hedefteydi; idle profili `log10=12.41`de ölü kilitliydi.

### Araştırma:
Antimatter Dimensions (IvarK master), Cookie Clicker v2.058, Synergism, Progress Knight ve idle-game matematiği literatürü (Pecorella / Guan) kaynak kod seviyesinde incelendi. Alınan ilkeler: onluk kadanslı bot merdiveni, log-uzayı prestij formülü, kademeli meydan okuma açılışı, "3-Decade Kuralı", karesel maliyet ivmelenmesi.

### Uygulanan (ADR-0032, v0.27.0):
- **`src/game/pacing.ts`** (yeni): 9 adlandırılmış dekad bandı (0→308), `log10Safe`, `arcProgress01`, 13 basamaklı Dekad Primi tablosu (toplam 72 SP) + 10 test.
- **`unlocks.ts`**: 14 → **16 basamaklı** merdiven; `dimBought` kapıları yerine dekad kapıları (1e3 … 1e308). `unlockProgressFraction` ile dopamin kapılarında logaritmik ilerleme çubuğu (1e308'de `Infinity/Infinity` hatası giderildi).
- **`App.vue`**: **"Sonraki Açılacak" bandı** — bant adı, Şafak Yolu % çubuğu, sıradaki açılış + % ve sıradaki Dekad Primi rozeti.
- **`achievements.ts`**: dopamin kategorisi 3 → **11 ölçek basamağı** (1e50…1e308) + **5 yeni kalıcı ödül** (`prod_x125`, `dim_cost_x085`, `click_x3`, `shift_power_boost`, `prod_x2`). Toplam başarım 68 → 75.
- **`challenges.ts`**: 8 meydan okuma `1.79e308` → artan eğri **1e40 … 1e1000**.
- **`game.ts`**: SP periyodu 308 → **45**; Dekad Primi ödül döngüsü (`claimedBounties` + kayıt yükleme); `break_singularity` doğrudan `eye_drops` arkasına taşındı; bot maliyetleri gevşetildi (idle kilidi); telafi kolları (DIM_PER_TEN_MULT 1.58, DIMENSION_CHAIN_RATE 0.060, MAX_BUY_PACKS_CAP 380).

### Uygulanan (ADR-0033, v0.27.1):
- **`BASE_UNLOCKED_DIMENSIONS` 2 → 3** → yeni oyun D1+D2+D3 ile başlar ve **1. Akış Sıçraması D4'ü açar**. Sabit dışa açıldı; `DimensionsTab.vue` teaser'ı tek kaynaktan hesaplıyor.
- **D3/D4 yumuşak maliyet merdiveni** (D3 ×32/3 bucket, D4 ×28/2 bucket) — milyar→trilyon duvarını kırar.
- **Erken sıçrama gereksinimi 25 → 20** (yalnızca ilk üç sıçrama).

### Doğrulama:
- `npx vitest run` → **134/134 test geçti** (5 dosya).
- `npm run build` → **0 tip hatası**, temiz derleme.
- Harness: **1e8 → 1e13 geçişi 4. ve 5. dakika arasında** tamamlanıyor (öncesi ~40 dk sıkışma). İlk 90 dakikada **~7 dakikada bir yeni içerik**. Idle profili 6 saatte `log10=100.55` (önceki: 12 saatte 12.41).
- Yan etki: active toplam koşu 4:29 → **2:28**; hedef bandın (180–240 dk) altında. Telafi kolu bilinçli olarak uygulanmadı (ADR-0033 §3).
- Detay: [`decisions/0032-decade-pacing-ladder-and-bounties.md`](../decisions/0032-decade-pacing-ladder-and-bounties.md) · [`decisions/0033-three-dimension-start-and-early-ladder.md`](../decisions/0033-three-dimension-start-and-early-ladder.md)

---

## [2026-10-03] — Bulut Kaydetme Sistemi Düzeltme Turu: Çakışma Ekrânı Artık Çalışıyor (v0.26.1)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"buluta kaydetme kısmını bi review yap detaylı"* → inceleme sonucu özellikle **işlevsel olarak bozuk** bulundu; kullanıcı *"en iyi şekilde düzelt"* ile düzeltilmesini istedi.
- Kök Neden: Bulut kaydetme katmanı ADR-0029'un Playwright doğrulamasından sonra **kimse tarafından tekrar elle çalıştırılmamıştı**. Üç P0 hata birbirine bağlıydı ve hepsi aynı kök nedenden geliyordu: karar mantığı ağ/depolama detaylarıyla iç içe geçmiş, test edilemez hale gelmişti.

### Bulunan ve Düzeltilen 3 Kritik Kusur (P0):
1. **`force` bayrağı tüm uygulamada ölü koddu** → Çakışma ekranındaki *"Bu Cıhazdakini Sakla"* butonu **her zaman sessizce başarısızdı** (modal kapanır, hiçbir şey yazılmaz, hata gösterilmez). Elle *"Buluta Yedekle"* butonu da boşa dönüyordu — oyuncunun verisini korumak için bastığı buton.
2. **5 dakikalık otomatik senkronizasyon tek seferlik çalışıyordu** → Çakışma tespiti "yerel vs bulut farklı mı?" diye soruyordu; oyuncu 5 dakika oynayınca ikisi zaten farklı olduğu için **ilk yazımdan sonra hiçbir şey yazılmıyor**, oyuncu 5 dakikada bir kapatılamayan modal görüyordu. Normal oynanış ile gerçek çakışma ayırt edilemiyordu.
3. **`updatedAt` çalışma zamanında `Timestamp`, tipi `number`** → Canlı ortamda "Invalid Date" gösteriyordu. Mock yol düz sayı döndürdüğü ve doğrulama mock modunda yapıldığı için **görünmemişti**.

### Ek Düzeltmeler (P1/P2):
- **`beforeunload` bulut yazımı gerçekte hiç tamamlanmıyordu** → `visibilitychange` tabanlı senkrona geçildi + sekmeye dönünce bayat yedeği hemen yakalama.
- **Yazma koruması istemci saatine dayanıyordu** → Yanlış saatli cihaz başka cihazın ilerlemesini sessizce eziyordu. Saat bağımsız (referans eşitliği) korumaya geçildi.
- **Çıkış yarışı** → `sessionEpoch` koruması; çıkışta uçuşta kalan yazma state'i bozuyordu.
- **Çakışmada yerel yedek alınmıyordu** → Modal *"mevcut slot yedeği tutulur"* diyordu ama yedek almıyordu; söz tutulmuyordu. Artık alınıyor.
- **Hard Reset kalıcı değildi** → Sıfırlamadan 5 dakika sonra eski ilerleme çakışma ekranıyla geri geliyordu.
- **`hardReset()` otomatik kayıt kalıcı olarak susturuyordu** → `resumeSaves()` hiçbir yerden çağrılmıyordu.
- **Çevrimdışı oyuncuya "veritabanı oluşturun" mesajı** → Geçici kalıcı hata ayrımı yapıldı.
- **Simülasyon modunda giriş sonrası hiçbir şey yazılmıyordu** → `storage` olayı yalnızca diğer sekmelerde tetiklendiği için; aynı sekmeye de bildirim gönderiliyor.
- **Zaman aşımı / ölü timer / denetimsiz cast / iPad etiketi / kalıcı önbellek** düzeltildi.

### Yapılan Mimari Değişiklik:
1. **Saf karar katmanı ayrıldı** — [src/core/auth/cloud-conflict.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/auth/cloud-conflict.ts). Firebase/localStorage bilmeyen, doğrudan test edilebilir modül: `evaluateWriteGuard()`, `decideSyncAction()`, `isSameSave()`, `toMillis()`, `isCloudSavePayload()`.
2. **Referans (ETag) tabanlı çakışma tespiti** — Cihazın "en son gördüğü bulut revizyonu" slot başına saklanıyor. Soru artık *"bulut hâlâ benim bildiğim belge mi?"*. Bu, normal oynanışı çakışmadan ayırırken ADR-0029'un yeni cihaz korumasını yaşatıyor.
3. **Firestore kuralları DEĞİŞMEDİ** — Veri modeline dokunulmadı, yeniden deploy **gerekmiyor**; sadece satır referansları güncellendi.
4. **27 regresyon testi** eklendi — Her P0 için "önce şuydu, şimdi böyle" kilidi.

### Doğrulama:
- `npm test` → **5 dosya, 134 test geçti** (27'si yeni).
- `npm run build` (`vue-tsc && vite build`) → **0 tip hatası**, 1686 modül.

### ADR:
- [ADR-0033 — Bulut Kaydetme Karar Katmanının Yeniden Tasarımı](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0033-cloud-sync-decision-layer-and-etag-conflict-detection.md)

---

## [2026-10-03] — Uzun Basış (Hold / Long-Press) Taktil Tooltip & Format Pasifleri Görünürlüğü (v0.26.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"Pasiflerin Görünürlüğü için tooltipleri açalım ama tooltip biz üstüne götürdüğümüz gibi değilde üstüne uzun basarsak açılsın"*.
- Kök Neden & Amaç: Eski hover tabanlı tooltip sistemi farenin gezdiği her yerde anında popup çıkararak ekran kirliliği (hover pollution) yarattığı için devre dışı bırakılmıştı. Pasiflerin ne işe yaradığı (D1 CPS senkronu, D3 vicdan kesintisi, D4 kriz frekansı vb.) gizli kalmıştı. Amaç; hover gürültüsünü sıfırlayıp mobilde ve masaüstünde sadece **bilinçli uzun basış (Hold / Long-Press ~380ms)** ile açılan dokunsal, haptik ve siberpunk cam detay kartları sunmak.

### Yapılan Mimari ve Arayüz Geliştirmeleri:
1. **Uzun Basış (Long-Press / Hold) Tooltip Motoru (`src/core/tooltip.ts`):**
   - Hover gürültüsü tamamen engellendi (`mouseenter` tetiklenmez).
   - `pointerdown` ile ~380ms zamanlayıcı başlatılır. 380ms dolmadan parmak/fare kaldırılırsa veya 8px'den fazla kaydırılırsa (scroll hareketi) anında iptal edilir (normal tıklamalar sıfır gecikmeyle çalışır).
   - Tetiklendiğinde mobil cihazlarda `navigator.vibrate(15)` hafif haptik dokunuş geri bildirimi verilir.
   - Balatro / Cyberpunk temalı cam kart: `backdrop-blur-md`, neon mor/mavi parlama, başlık ve gövde ayrımı.
   - Ekran dışına taşmayı önleyen dinamik sınır tespiti (Viewport Clamping).
   - Parmak/fare kaldırıldığında rahat okuma için 1200ms gecikmeli kapanma veya ekrana dokunulduğunda anında gizlenme.
2. **Format Pasiflerinin Görünür Kılınması (`DimensionRow.vue`):**
   - Her format (D1-D8) için satır içine özel `⚡ [Pasif Adı]` rozeti eklendi:
     - D1 Masum Kedi: `⚡ Sync +0.5%`
     - D2 Gece 3 Lezzet: `⚡ Üretim +3%`
     - D3 ASMR Hipnoz: `⚡ Vicdan -3%`
     - D4 Bölünmüş Dikkat: `⚡ Kriz +8%`
     - D5 Sigma Grindset: `⚡ Sıçrama -3%`
     - D6 Hint Cliffhanger: `⚡ Offline +2%`
     - D7 Varoluş Vakti: `⚡ Üretim +4%`
     - D8 Brainrot Singularity: `⚡ D8 +6%`
   - Bu rozetlerin üzerine uzun basıldığında pasifin adı ve detaylı etkisi ekranda parlar.
   - Format başlığı, çözünürlük rozeti (144p - 4K), toplam çarpan ve Ayna Sinerjisi rozetleri de bu uzun basış sistemiyle net ve bilgilendirici hale getirildi.
3. **DimensionsTab & CrisisTab Senkronizasyonu (`DimensionsTab.vue`, `CrisisTab.vue`):**
   - `d3Passive` (Vicdan paneli), `d4Passive` (Kriz sekmesi hero başlığı) ve `d5Passive` (Sıçrama kartı) rozetleri başlık-açıklama formatıyla zenginleştirildi.
4. **Doğrulama:**
   - `npm run build` ile 1682 modül 0 tip/derleme hatası ile doğrulandı.
   - Playwright MCP ile canlı yerel dev server üzerinde uzun basış simülasyonu yapıldı: `Masum Kedi Pasifi` ipucu kartının `opacity: 1` ile doğru HTML yapısında açıldığı ve normal `mouseenter` durumunda kesinlikle açılmadığı (`hoverTriggered: false`) kanıtlandı.

---

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"oyuna giriş sistemi ekleyelim oyuncu hem normal kayıt olmadan oynayabilsin hem kayıt olarak kayıt olduğunda google dan giriş ekleyelim mesela orada yedekleme seçeneği olsun ona basınca bulutuna yedekle gibi bir şey olsun işte sen biliyorsundur neler yapılacağını birde email ve şifreyle kayıt olma olsun bunun için en iyi planı yap"*.
- Kök Neden & Amaç: Oyuncuların cihazlar arasında (PC, mobil, tablet) ilerlemelerini kaybetmeden oynamaları, yerel tarayıcı temizliğinde dopamin kaybı yaşamamaları ve sıfır sürtünmeyle ister misafir ister bağlı hesapla oynayabilmeleri.

### Yapılan Mimari ve Arayüz Geliştirmeleri:
1. **Sıfır Sürtünmeli Misafir Modu (Zero-Friction Guest Mode):**
   - Oyuncu siteyi açtığında hiçbir zorunlu giriş ekranı gösterilmez; yerel 3-slot `LocalStorage` sistemi aynen çalışır.
   - Giriş yapıldığında yerel ilerleme silinmez; kullanıcının ilk bulut yedeği olarak doğrudan hesaba bağlanır.
2. **Google ile Tek Tık Giriş & E-posta Desteği (`src/core/auth/auth-service.ts`):**
   - Sayfa yenilenmeden açılan Google OAuth Popup (`signInWithPopup`).
   - E-posta ve Şifre ile kayıt, giriş ve şifre sıfırlama (Password Reset) desteği.
   - Provider-agnostic mimari + `.env` tanımlanmadığında otomatik çalışan **"Simülasyon / Dev Modu"** (sıfır kilitlenme).
3. **Akıllı Bulut Senkronizasyon & Yedekleme Motoru (`src/core/auth/cloud-save-service.ts`):**
   - Firestore üzerinde `users/{uid}/cloud_saves/{slotId}` şeması.
   - "Buluta Yedekle" (Upload Current Save) ve "Buluttan Yükle" (Download Cloud Save) aksiyonları.
   - 5 dakikalık periyodik arka plan oto-senkronizasyonu ve `beforeunload` güvencesi.
4. **Çakışma Kalkanı (`src/components/CloudConflictModal.vue`):**
   - Buluttaki kayıt ile yerel kayıt arasında fark tespit edildiğinde açılan iki sütunlu karşılaştırma kartı (Dopamin, Şafak, Oynama Süresi, Son Güncelleme).
   - Kullanıcıya "Bu Cihazdakini Sakla" vs "Buluttakini Yükle" seçim hakkı.
5. **Arayüz Entegrasyonları (`AuthModal.vue`, `Header.vue`, `SettingsModal.vue`):**
   - **Header:** Üst barda pilin yanına ve mobil dock'ta ayarların yanına profil/bulut rozeti ve canlı senkron ışığı.
   - **AuthModal:** Siberpunk neon cam tasarım, Google butonu, E-posta/Şifre sekmeleri, bağlı hesap ve bulut depolama durum kartı.
   - **SettingsModal:** "Kayıt & Slotlar" sekmesinin tepesine Bento tarzı "Bulut Senkronizasyonu" yönetim kartı.
6. **Doğrulama:**
   - `npm run build` ile 1682 modül 0 hata ile derlendi.
   - Playwright ile canlı tarayıcıda Google girişi, buluta yedekleme, Header durum güncellemesi ve SettingsModal kartı test edildi.
- **ADR Referansı:** `brain/decisions/0029-guest-mode-google-auth-and-cloud-save-system.md`
- **Plan Referansı:** `auth_cloud_save_plan.md`

---

## [2026-10-03] — En İyi Sistem Ayarları Mimarisi & Çoklu Kayıt Slotları (v0.24.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"sistem ayarları kısmını en iyi hale getir internetten araştırma yap"*.
- Kök neden: Eski ayarlar penceresi 668 satırlık tek parça dikey bir listeydi; çoklu slot desteği, dosya seçimi, kayıt önizleme doğrulaması ve donanım tasarrufu gibi modern incremental oyun standartlarından yoksundu.
- İnternet Araştırması: *Cookie Clicker*, *Antimatter Dimensions*, *Synergism* ve Reddit topluluğu incremental QoL best practice'leri iki aşamalı canlı web fetch ile incelendi.

### Yapılan Mimari ve Arayüz Geliştirmeleri:
1. **Çoklu Kayıt Slotları (3 Bağımsız Slot — `src/core/save.ts` & `src/stores/game.ts`):**
   - Slot 1, Slot 2 ve Slot 3 bağımsız saklama alanları.
   - Slot 1 eski kayıtlarla %100 geriye dönük uyumlu (`DOOMSCROLL_SAVE_V1`).
   - Her slot için canlı meta verisi (Dopamin, Çöküş, Süre, Son Kayıt Zamanı).
   - Slotlar arası geçiş (`switchSaveSlot`), slot klonlama (`copySaveSlot`), slot temizleme.
   - 1 dakikalık otomatik rotasyon yedeği ve arayüzden tek tıkla kurtarma (`restoreFromBackup`).
2. **Kayıt Güvenliği & Akıllı Önizleme:**
   - `inspectSaveString`: Dışarıdan yapıştırılan veya yüklenen `.txt` save dosyasını doğrular, içindeki dopamin, çöküş, süre ve sürüm özetini gösterir.
   - Güvenli Hard Reset: Yanlışlıkla basmayı önlemek için input kutusuna `RESET` yazma şartı.
3. **Yeni QoL & Performans Kontrolleri (`src/models/types.ts` & `src/style.css`):**
   - Sayı Hassasiyeti (2 vs 3 ondalık basamak).
   - Pil & Düşük GPU Tasarruf Modu (`.battery-saver`: neon glow ve ağır filtreleri kapatır).
   - Uçan Yazılar (+Dopamin / Floating Text) Aç/Kapa.
   - Satirik Reels Haber Bandı (News Ticker) Aç/Kapa.
   - Çevrimdışı İlerleme Karşılama Ekranı Aç/Kapa.
   - Klavye Kısayolları Aç/Kapa (1-9, M, Space).
4. **Bento Grid & Tabbed Modal Arayüzü (`src/components/SettingsModal.vue`):**
   - 5 ergonomik sekme: 🎮 Oynanış & QoL, 🎨 Görsel & Ekran, 🎧 Lo-Fi Radyo & SFX, 💾 Kayıt & Slotlar, ⌨️ Kısayollar & Bilgi.
   - Canlı otomatik kayıt telemetrisi ("Son kayıt: X sn önce · 10 sn aralık").
   - Panoya Kopyalama + `.txt` dosya olarak bilgisayara indirme + `<input type="file">` dosya seçici.

### Doğrulama:
- `vue-tsc && vite build`: Sıfır TypeScript hatası, 1657 modül başarıyla derlendi.
- `Playwright MCP`: Canlı tarayıcıda yerel dev server üzerinde Settings modalı açıldı, sekmeler arası geçiş ve reaktif state doğrulaması kanıtlandı.
- Detaylı ADR: [`brain/decisions/0028-best-in-class-settings-and-multi-slot-save-system.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0028-best-in-class-settings-and-multi-slot-save-system.md).

---

## [2026-10-03] — Modüler Müzik Motoru Mimarisi & Kod Ayrıştırma (v0.23.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"birde sanırım bu music engine çok büyük oldu dosya onu parçalasak nasıl olur"* -> *"yap"*.
- Kök neden: `src/core/music-engine.ts` dosyası 2843 satıra ulaşarak monolitik bir yapı almıştı; ses sentezi, enstrüman modellemeleri, akor bankaları, mikser grafiği ve scheduler aynı dosyada bulunuyordu.
- Hedef: 2843 satırlık monolitik dosyayı `src/core/music/` paketi altında modüler, odaklanmış ve tip-güvenli alt modüllere bölmek; tüketici bileşenler (`Header.vue`, `App.vue`, `SettingsModal.vue`, `stores/game.ts`) için sıfır kırılma garantili geriye dönük uyumlu bir façade sunmak.

### Oluşturulan Modüler Mimari (`src/core/music/`):
1. **`types.ts`:** `MusicTrackInfo`, `MUSIC_TRACKS` ve enstrümanlar/sequencer'lar arasındaki bağımlılığı çözen `SynthContext` sözleşmesi.
2. **`notes.ts`:** C1'den B6'ya 12-ton tam kromatik frekans haritası.
3. **`instruments/keys.ts`:** Rhodes Mark I fiziksel modelleme (`playRhodesNote`), Lo-Fi pluck (`playLofiPluck`), Juno supersaw pad (`playSupersawPad`), synth lead (`playLeadSynth`).
4. **`instruments/bass.ts`:** Sub-bass sentezi (`playSubBass`), portamento yönetimi ve analog synth bas (`playSynthBass`).
5. **`instruments/drums.ts`:** J Dilla drunk davulları (`playSoftKick`, `playGhostSnare`, `playSnare`, `playGatedSnare`, `playClapLayer`, `playRimshot`, `playTom`, `playCrash`, `playHiHat`, `playShaker`).
6. **`instruments/ambient.ts`:** Boru orgu (`playPipeOrgan`), koro nefesi (`playChoirExhale`), Shepard inişi (`playShepardFall`), balina uğultusu (`playWhaleCall`), kristal çan (`playCrystalBell`), müzik kutusu (`playMusicBox`), uzay pingi (`playSpacePing`).
7. **`tracks/lofi-chill.ts`:** 6 caz akor bankası ve 4-cycle formlu `02:47 AM Lo-Fi Chill` Auto-DJ sıralayıcısı.
8. **`tracks/synthwave.ts`:** 8-bölümlü sinematik `Cyberpunk Midnight` sıralayıcısı.
9. **`tracks/ambient-drone.ts`:** Sürekli katedral & derin uyku `Interstellar Deep Sleep` sıralayıcısı.
10. **`tracks/subway-groove.ts`:** Senkoplu funk `Subway Beats & Groove` sıralayıcısı.
11. **`audio-graph.ts`:** Web Audio API bağlamı, master zincir, analog bant satüratörü (`WaveShaperNode tanh`), konvolüsyon reverbi, delay ve sürekli pembe/kahve gürültü yatağı.
12. **`index.ts`:** `MusicEngine` orkestratör sınıfı, lookahead zamanlayıcısı ("A Tale of Two Clocks"), public API ve `musicEngine` singleton'ı.
13. **`src/core/music-engine.ts`:** Tüketiciler için geriye dönük uyumlu tek satırlık temiz façade (`export * from './music'`).

### Doğrulama:
- `vue-tsc && vite build`: Sıfır TypeScript hatası, temiz production paketi oluşturuldu (1655 modül başarıyla derlendi).

---

## [2026-10-03] — Master Lo-Fi Chill Müzik Motoru & Akustik DSP Devrimi (v0.22.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"lofi radyosunu geliştirelim çok iyi hale getirelim bunun için araştırma yap ve kendi bilginle harmanla"* -> *"direkt lo fi diye bir radyo var onun müziğini en iyi hale getirmek istedim onun için araştırma yap"*.
- Hedef: Oyundaki `lofi_chill` ("02:47 AM Lo-Fi Chill") parçasını sıradan yapay bir synth döngüsünden çıkarıp; gerçek Lo-Fi hip hop prodüksiyonları (Lofi Girl, J Dilla, Nujabes, Potsu, ChilledCow) kalitesinde, analog kaset sıcaklığına sahip, zengin caz/neo-soul akorları içeren, unquantized "drunk" davul hissiyatlı ve asla sıkmayan bir başyapıta dönüştürmek.

### Yapılan Akustik ve Müzik Teorisi İyileştirmeleri (`src/core/music-engine.ts`):
1. **Tam Kromatik Frekans Tablosu (`NOTES`):**
   - 12 tonluk tam kromatik aralık (C1'den B6'ya kadar hem bemol hem diyez alias'ları ile) sisteme eklendi.
2. **Analog Kaset Manyetik Doygunluğu (`WaveShaperNode` Tape Saturation):**
   - `Math.tanh(x * 1.35)` transfer eğrisi ve `oversample = '4x'` ile master zincire analog bant sıcaklığı ve soft-clipping harmonikleri entegre edildi.
3. **Fender Rhodes Mark I Fiziksel Modellemesi (`playRhodesNote`):**
   - **Tine Çanı (Metallic Chime):** 3.96x temel frekansta hızla sönen metalik rezonans çanı eklendi.
   - **Keçe Tokmak Darbesi (Felt Thump):** 95Hz mekanik tokmak vuruşu transient'i.
   - **Suitcase Stereo Optik Tremolo:** 3.4 Hz hızında sol/sağ kulak arasında yumuşakça salınan stereo panner modülasyonu.
   - **Çift LFO Tape Wow & Flutter:** 0.32 Hz yavaş bant esnemesi ve 5.3 Hz mikro-titreme.
   - **Tuş Hassasiyeti (Velocity Bark):** Sert vuruşlarda açılan, yumuşak vuruşlarda kadifeleşen dinamik filtre takibi.
4. **6 Zengin Neo-Soul & Caz Akor Bankası (`getLofiBank`):**
   - Rootless 9'lu, 11'li, 13'lü akorlar, ikincil dominantlar ve tritone substitution (Db9) yürüyüşleri.
   - Bank 0 (Sunday Rain Fmaj9-Em9-Dm9-Cmaj9), Bank 1 (3AM Thoughts Am9-Dm9-Db9-Cmaj9), Bank 2 (Tokyo Highway Fmaj9-G13-Em7-Am9), Bank 3 (Midnight Cafe Dm9-G13-Cmaj9-A7b13), Bank 4 (Paper Cranes Bm7b5-E7b9-Am9-Fmaj7#11), Bank 5 (Raindrops Bbmaj9-Am7-Gm9-Fmaj9).
5. **İnsan Eli Akor Taraması (Strum / Rake):**
   - Notalar aynı anda değil, 22ms'lik organik arpej gecikmesi ve hafif stereo yayılımla klavyeye dökülür.
6. **Yürüyen Sub-Bas ve Kromatik Yaklaşım:**
   - 14. adımda bir sonraki ölçünün kök sesine yarım ton alttan/üstten basarak kayan (chromatic approach) yürüyen bas.
   - Notalar arasında 35ms portamento/glide ve 340Hz sıcaklık filtresi.
7. **J Dilla "Drunk" Davul Hissiyatı:**
   - **Laid-back Snare:** Trampet tam vuruşta değil, +22ms kasti gecikmeyle arkadan gelir.
   - **Ghost Snare:** 14/15. adımlarda fısıltı gibi fırça/kasnak dokunuşları.
   - **Swung Drunk Kick:** 7. ve 10. adımlarda +14ms sürüklenen gevşek kick darbesi.
   - **SP-404 Pumping:** Her kick vuruşunda müziği ve arka planı nefes gibi eğen ducking sidechain.
   - **Vintage Muffled Hi-Hat:** 5400-6400Hz bandpass sıcak vintage kaset şapkası.
8. **Şarkı Formu (Arrangement Cycle):**
   - 4 döngülük döngü formu: A (Full Beat) -> Varyasyon -> B (Melodik Zirve) -> C (Gece Boşluğu / Breakdown).
   - Breakdown bölümünde davullar kısılır, Rhodes akorları genişler, yağmur ve vinil öne çıkar, 62-63. adımlarda yumuşak trampet süpürmesiyle ana akışa tekrar drop yapılır.
9. **Çağrı-Cevap (Call & Response) Melodisi (`playLofiPluck`):**
   - 0-1. ölçüde soru motifi, 2-3. ölçüde cevap motifi, vintage vibrato ve stereo delay.

### Doğrulama:
- `vue-tsc && vite build`: Sıfır TypeScript hatası, sıfır linter uyarısı (1643 modül başarıyla derlendi).

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"saniyede binlerce hızlı şey olurken işte satın alma ve sayının artması falan böyle olunca sayfa donmaya başlıyor onu bi kontrol et"* -> *"en iyi şekilde optimize et"*.
- Kök neden: `buyMax` 500 turlu `Decimal.pow` döngüleri + iç-fonksiyon getter'larının her tick yeniden hesaplanması + her 50 ms başarım/unlock taraması + juice sıcak döngüde disk okuma + sınırsız tick kaskadı.

### Yapılan İşler:
1. **Matematiksel toplu alım (`src/stores/game.ts`):** `calcGeometricTotal + calcMaxPacks` ile `buyMaxDimension`, `buyMaxTickspeed` (yeni), `maxAll`, bot `max` ve `getDimensionPackCost` O(1) oldu. Aynı toplam maliyet ve `registerChallengeBuy` birimi korunur.
2. **Memo'lar:** `memoChallengeEffects`, `memoNeuralEffects`, tier bazlı `_dimMultCache / _dimCostCache` (içerik-anahtarlı). `singularityGain`, `shiftPower`, `tickspeed` ve maliyet yolları memo'lu hale geldi.
3. **Tick sadeleştirme:** zincir + D1 üretimi tick başına tek çarpan seti (`dimMults[]`), `highestDps` tek `matterPerSecond` çağrısı, `syncUnlocks/checkAchievements` 0,5 sn seyreltilir + tam açıkken erken çıkış.
4. **Offline:** 1 sn → 10 sn → 60 sn kademesi (uzun süreler ~6 kat hızlı).
5. **Juice (`JuiceLayer.vue` + `App.vue`):** sıcak döngüde `localStorage` yok; `juiceModeCache + __setJuiceMode + doomscroll:juice-mode` olayı + `doomscroll-juice-mode` minik anahtarı.
6. **Döngü koruması (`src/core/game-loop.ts`):** kare başına max 5 tick.
7. **Doğrulama:** `npm run build` 0 hata (1642 modül). ADR: `brain/decisions/0020-performance-optimization-tick-buy-max-ui.md`.

---

## [2026-10-02] — Hibrit Rapor ve Gece Telemetrisi Mimarisi (v0.21.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"Rapor sekmesini cok daha iyi hale getirmek istiyorum neler yapabiliriz hem koddan hem internetten derin arastir"* -> *"en iyi plani yap hibrit"*.
- Rapor sekmesi pasif, 11 kartlık bir sayfadan; *Antimatter Dimensions* (Past 10 & Çarpan Laboratuvarı), *Cookie Clicker* (Aktif/Pasif oran & Kriz bilançosu) ve gece uykusuzluğu hiciv temalarını (Başparmak kilometresi, REM uykusu, Biyometrik teşhis, Paylaşım kartı) birleştiren 5 alt sekmeli kapsamlı bir **Telemetri ve Teşhis Merkezine** dönüştürüldü.

### Yapılan İşler ve Mimari Yenilikler:
1. **Beş Alt Sekmeli (Sub-Tabs) Modüler Navigasyon (`StatsTab.vue`):**
   - **`overview` (Genel Bakış):** 6'lı Hero KPI Grid (Uykusuz Süre, Bu Koşu, Zirve Debi, Rekor Çöküş, Tıklamalar), Aktif vs Pasif Üretim Oran Barı (% parmak vs % otonom akış), İnteraktif SVG Zaman Çizelgesi (Zirve debi çizgisi, hover değeri, -10 dk dökümü).
   - **`multipliers` (Çarpan Laboratuvarı):** Pasif Dopamin Çarpanları, Manuel Dokunuş Gücü Formülü (Base, Shift, Stance, Combo, Buff, CPS Sync), Algoritma Frekansı (Hz) ve 8 İstasyonun tekil güç dökümü.
   - **`past10` (Son 10 Gece Günlüğü — Antimatter Dimensions Standartı):** Son 10 çöküşün süresi, kazanılan SP'si, **SP / Dakika verimi (yeşil neon parlayan optimizasyon metriği)**, zirve dopamini ve ortalama koşu süresi ile ortalama SP/dk göstergesi.
   - **`challenges` (Kriz & Rekorlar):** C1–C8 meydan okuma hız rekorları (`challengeBestTimes`), tamamlanma rozetleri, anomali tür dağılımları ve Vicdan Azabı susturma kâr bilançosu.
   - **`biometrics` (Gece Biyometrisi & Hiciv):**
     - Fiziksel Başparmak Kaydırma Mesafesi ($clicks \times 0.05$ m) ve Eyfel/Everest/Galata Kulesi dönüm noktaları.
     - Feda Edilen Kaliteli Uyku (saat/dakika) ve dinamik Zihinsel Pil Seviyesi (%).
     - Retinaya Çarpan Mavi Işık Foton Dozu ($playtime \times 1.25\times 10^{15}$).
     - Gece Nöbeti Bağımlılık Teşhisi (6 kademeli dinamik unvan).
     - **"Gece Raporunu Kopyala" Butonu:** Tek tıkla Discord/Reddit/WhatsApp için emojili karneli özet metni kopyalama.
2. **Kritik Hata Düzeltmeleri & Veri Modeli (`types.ts` & `game.ts`):**
   - **`fastestSingularity` Bug Fix:** `singularityReset()` içinde en hızlı çöküş süresinin daima `Infinity` kalması hatası düzeltildi; her reset ve meydan okumada en iyi süre güncelleniyor.
   - **`pastSingularities` Hafızası:** Son 10 koşunun süre, SP ve SP/dk verileri store state ve serileştirme döngüsüne dahil edildi.
   - **`highestDps` & `totalManualDopamine`:** Anlık ulaşılan zirve saniyelik debi ve başparmakla üretilen kümülatif dopamin takibi bağlandı.
3. **Doğrulama & Standartlar:**
   - `npx vue-tsc --noEmit` ile TypeScript 5.7+ strict kontrollerinden 0 hata ile geçildi.
   - `npm run build` ile production paketi (1642 modül) başarıyla derlendi.
   - ADR: `brain/decisions/0019-hybrid-stats-and-telemetry-system.md`
   - Plan & Araştırma: `brain/research/stats-tab-hybrid-plan.md`

---

## [2026-10-02] — Gece Krizleri Hibrit Görsel ve Ses Sistemi (v0.20.0)

### Motivasyon & Kullanıcı Talebi:
- Kullanıcı talebi: *"gece krizleri icin bir seyler yapalim nasil bir teknoloji kullansak en guzel gozukur secenekler neler"* -> *"en iyi sekilde nasil oluyorsa hibrit seklinde oyle yap en iyisini"*.
- Oyunun en kritik dopamin patlama mekaniği olan Gece Krizleri (Altın Kurabiye eşdeğeri anomaliler), standart kartlardan Balatro ve Cyberpunk neon estetiğini birleştiren yüksek taktil doyuma sahip bir hibrit görsel/ses sistemine dönüştürüldü.

### Yapılan İşler ve Mimari Yenilikler:
1. **Özel Neon Animasyonlu SVG Vektör Varlıkları (`AnomalyOverlay.vue`):**
   - Jenerik ikonlar yerine her kriz türüne özel katmanlı neon SVG grafikleri modellendi:
     - `fyp` (🔥 Gece 3 Çılgınlığı): Dış mor alev aurası + iç dans eden pembe alev çekirdeği (`animate-flame-sub`) + yükselen parıltı parçacığı.
     - `heart_frenzy` (👆 Başparmak Histerisi): Çift vuruşlu atan sibernetik neon kalp (`animate-cyber-heart`) + kesintisiz akan dinamik EKG nabız çizgisi (`animate-ekg-line`).
     - `sponsor` (💎 50 Milyonluk Viral Video): Dönen 8 köşeli altın halo yıldızı (`animate-starburst-spin`) + altın prizmatik elmas fasetleri.
2. **Balatro Tarzı Lazer Çerçeve ve Holografik Kapsül (`AnomalyOverlay.vue` & `src/style.css`):**
   - Kapsül etrafında 360° dönen neon lazer şeridi (`conic-gradient` border beam, `anomaly-beam-border`).
   - Kapsül yüzeyinden periyodik olarak süzülen holografik cam parlaması (`crisis-shimmer`).
   - Kalan süre $\le 3.5\text{s}$ altına düştüğünde oyuncuyu uyaran telaşlı kırmızı nabız (`panic-pulse`).
3. **Canvas 2D Neon Şok Dalgaları ve Kıvılcım Fiziği (`JuiceLayer.vue`):**
   - Kriz tıklandığı anda tıklama merkezinden dışa doğru genişleyen çift katmanlı neon şok dalgası halkaları (`shockwaves`).
   - 360 derece saçılan, hafif yerçekimi ve hız sürtünmesi içeren 20–32 adet neon kıvılcım parçacığı (`sparks`).
   - `doomscroll:shockwave` CustomEvent veri yolu üzerinden tam senkronizasyon.
4. **Gece Kriz Ambiyansı ve Ekran Kenar Aurası (`ScreenOverlay.vue` & `src/style.css`):**
   - Ekranda kriz belirdiğinde veya aktif kriz buff'ı varken ekran kenarlarında nefes alan renkli neon perimetre aurası (`crisis-perimeter-aura`): Mor (`fyp`), Gül Kırmızısı (`heart_frenzy`), Altın Sarısı (`sponsor`).
   - Rezonans Hipnozu kombo modunda çift renkli psikedelik nabız (`crisis-aura-combo`).
   - Kriz toplandığında anlık parlayan ekran flaşı tepkisi.
5. **Web Audio API Sentezleyici Derinliği (`src/core/audio.ts` & `src/stores/game.ts`):**
   - `playAnomalySpawn`: Kriz ekranda belirdiğinde gizemli, uzaysal yükselen 4'lü kristal synth arpeji.
   - `playCrisisCollect`: Kriz tipine göre imza tınılar: Mor alev için enerjik arpej, kalp histerisi için sub-kick + voltaj cızırtısı, viral video için altın çan kaskadı.
   - `src/stores/game.ts` içinde `spawnAnomaly` ve `clickAnomaly` akışlarına bağlandı.
6. **Ekonomi / Mutasyon Düzeltmesi (`src/stores/game.ts`):**
   - Lab mutasyon döngüsünde eksik tanımlanmış `neighborTypes` dizisi giderildi.

### Doğrulama & Kanıt:
- `npm run build` (`vue-tsc && vite build`): **0 hata**, 1642 modül derlendi (6.18s).
- ADR dokümante edildi: `brain/decisions/0018-hybrid-night-crisis-visual-and-audio-system.md`.

---

## [2026-10-02] — Derin Ekonomi & İlerleme Denetimi, Akış Sıçraması (Shift 5+) & Küme Duvarı Düzeltmesi (v0.19.0)

### Motivasyon & Kullanıcı Bildirimi:
- Kullanıcı tespiti: *"akış sıçraması 5. seviyeden sonra 3 bin istiyor ama kullanıcı en fazla 50 zorlasa 60 yapabiliyor onu bi kontrol et ve bunun gibi bugları iste oyunun ekonomisini subagentlar kullan detayli ve derin"*.
- Subagent araştırması ve matematiksel analiz sonucunda `shiftRequirement` içinde `25 * 100^(shifts - 4)` formülünün Shift 5'te 2.500 D8 istediği ve 250 paket ($10^{3759}$ Dopamin) gerektirdiği kanıtlandı. Singularity sınırı ($1.79 \times 10^{308}$) aşıldığı için oyunun fiziksel olarak tıkandığı doğrulandı.

### Yapılan Düzeltmeler ve İyileştirmeler:
1. **Akış Sıçraması (Shift 5+) Lineer Ölçeklemesi:**
   - `src/stores/game.ts`: Üstel $100^{\text{shifts}-4}$ formülü kaldırılarak *Antimatter Dimensions* standardı lineer artışa geçildi: `20 + 15 * (shifts - 4)` D8.
   - Sıçrama 4: 20 D8 ($10^{39}$ Dopamin), Sıçrama 5: 35 D8 ($10^{69}$ Dopamin), Sıçrama 6: 50 D8 ($10^{84}$ Dopamin), Sıçrama 7: 65 D8 ($10^{99}$ Dopamin). Oyuncunun 50–60 D8 biriktirdiği evrede Sıçrama 5 ve 6 tamamen erişilebilir hale getirildi.
2. **Sonsuz Akış Kümesi (Galaxy) Gereksinimi Yeniden Dengelendi:**
   - `src/stores/game.ts`: `100 + 60 * galaxies` ($10^{159}$ Dopamin) olan 1. Küme maliyeti, Sıçrama 5–6 seviyesine uyumlu `40 + 20 * galaxies` ($10^{69}$ Dopamin) olarak güncellendi.
   - Dinamik `galaxyRequirementTier` getter'ı eklendi (normalde D8, C7'de D6).
3. **Akış Sıçraması Çarpanı (`BASE_SHIFT_POWER`):**
   - `src/game/challenges.ts`: %7 (1.07) olan taban çarpan, tahtayı sıfırlamaya değer gerçek bir boost hissi için **2.0×** değerine çekildi (C7 ödülü 2.2×).
4. **Gece Kriz Meydan Okumaları Hata Düzeltmeleri:**
   - **C7 (Hesap Kısıtlaması):** Üstel D6 gereksinimleri kaldırıldı; D6 üst sınırı için lineer artış ve $1.5\times$ küme çarpanı getirildi.
   - **C5 (Gece Enflasyonu):** `relieveChallengeOnPrestige` içine `challengeCostInflation = 0` eklendi; sıçrama veya küme yapıldığında enflasyon sıfırlanarak $10^{308}$ softlock'u önlendi.
   - **C4 (Sansür Matrisi):** Çift boyutların üretimi 0 iken tek boyut zinciri bağlandı: $D_7 \to D_5 \to D_3 \to D_1 \to \text{Dopamin}$.
5. **Autobuyer İlerleme Kilitleri:**
   - `AUTOBUYER_PROGRESS_REQ` içinde D7 ve D8 botlarının Sıçrama 2'de erken açılma hatası düzeltildi (`dim7: shifts 3, dim8: shifts 4`).
6. **Nöral Ağaç & SP Kazanç Düzeltmeleri:**
   - `guilt_immunity` ve `break_singularity` düğümleri `NEURAL_TREE` ve `NEURAL_LEGACY_UPGRADE_IDS` içine entegre edildi. `gui_drug` başarımının kilitli kalması ve Break Singularity botlarının çalışmaması düzeltildi.
   - `dawn_harbinger` tekillik çarpanı $2.0\times$'a çıkarıldı ve `singularityGain` erken floor kesintisi giderildi (en az 1 SP garanti).
   - `spUpgradesTotal` sayacı hem Nöral Ağaç hem legacy dükkan düğümlerini kapsayacak şekilde birleştirildi.
7. **UI Cila & İletişim:**
   - `DimensionsTab.vue`: Küme kartında C7'de D8 yerine D6 dinamik gösterimi sağlandı (`currentGalaxyDimAmount` ve `D{{ galaxyTier }}`).
   - Sıçrama butonu üzerindeki metin mevcut kümülatif çarpan yerine bir sonraki boost değerini gösterecek şekilde `×${format(store.singleShiftPower, 1)} Boost` yapıldı.

### Doğrulama:
- Node.js simülasyonları (`brain/scratchpad/simulate-economy.js` ve `verify-updated-logic.js`) ile 5 saatlik kesintisiz ilerleme test edildi: 0 softlock, 0 NaN, 0 çökme.
- `npm run build`: **0 hata** (1642 modül).
- ADR belgelendi: `brain/decisions/0017-economy-rebalancing-and-progression-wall-fix.md`.

## [2026-10-02] — Balatro Tarzı Hibrit Görsel Mimari & Gece Ekran Dokuları (v0.18.0)

### Motivasyon:
- Oyuncunun oyundaki taktil geri bildirimini ve gece telefon bağımlılığı atmosferini AAA seviyesine taşımak.
- WebGL batarya yükü yerine Simon Goellner stili Pure CSS 3D donanım hızlandırması + SVG gürültü filtreleri + Balatro 4 Edition (Foil, Holo, Poly, Negative) + Gece Ekran Dokuları (yağlı parmak izi, kriz çatlak camı) entegre edildi.

### Yapılan İşler:
1. **`src/core/tilt.ts`:** Donanım hızlandırmalı `v-tilt` direktifi (`useCardTilt` deseni). `pointermove` üzerinden `--pointer-x`, `--pointer-y`, `--tilt-rx`, `--tilt-ry`, `--pointer-angle` değişkenlerini rAF ile reflow yapmadan elemente aktarır. `prefers-reduced-motion` desteğiyle otomatik devre dışı kalır. `src/main.ts` içinde global olarak tanımlandı.
2. **`src/style.css`:** Balatro 4 Editions sınıfları:
   - `.card-tilt-surface`: 3D `preserve-3d` perspektif yüzeyi.
   - `.edition-foil`: Gümüş/mavi metalik ışık süpürmesi (`color-dodge`).
   - `.edition-holo`: Simon Goellner prizmatik gökkuşağı (`conic-gradient` + SVG sim/glitter mikro-gren dokusu).
   - `.edition-poly`: Balatro akışkan psikedelik sıvı petrol girdabı (`conic-gradient` + dönen plazma).
   - `.edition-negative`: İnvert edilmiş siyah-mor karanlık madde ve neon kontürler.
   - `.edition-tag` (Foil, Holo, Poly, Negative): Kartlar ve milestone'lar için minyatür eğimli etiket çipleri.
   - `prefers-reduced-motion` korumaları eklendi.
3. **`src/components/ScreenOverlay.vue`:**
   - Gece boyunca ekranda oluşan hafif saydam **Yağlı Başparmak İzi** lekesi (`mix-blend-mode: screen`). Tıklama/kaydırma yapıldıkça parıldayan taktil geri bildirim.
   - Kriz Meydan Okumalarında (C1-C8) veya kriz ters tepmesinde ekranın sol üst köşesinden uzanan **Çatlak Cam** vektörü.
   - `App.vue` ana hiyerarşisine bağlandı.
4. **`src/models/types.ts` & `src/stores/game.ts`:**
   - Yeni ayarlar: `screenOverlayEffects: boolean` (varsayılan true) + `holoCardsEnabled: boolean` (varsayılan true).
   - Kayıt serileştirme/deserializasyon geriye dönük uyumluluk fallbacks.
5. **`src/components/SettingsModal.vue`:**
   - "3D Kart & Holo Efektleri" ve "Gece Ekran Dokuları" aç/kapa ayar butonları eklendi.
6. **Oyun İçi Entegrasyonlar:**
   - `ChallengesTab.vue`: Tamamlanan challenge'lara Holo Mühür (`edition-holo`), aktif olanlara Polychrome (`edition-poly`), 3D tilt kart yüzeyi.
   - `DimensionRow.vue`: Çözünürlük seviyelerine göre (50+ Foil, 100+ Holo, 500+ Poly) rozetler ve 100+/500+ alımlarda kart gövdesinde dinamik Foil/Holo ışıması.
   - `AnomalyOverlay.vue`: Toast kapsüllerine 3D tilt, Gece 3 / Başparmak krizlerine Polychrome/Foil/Holo ışıması, Rezonans Hipnozu banner'ına canlı Polychrome kaplama.
   - `DimensionsTab.vue`: Akış Sıçraması (Foil), Akış Kümesi (Polychrome) ve Önbellek Silme (Negative) bento kartlarına 3D tilt ve Balatro kaplamaları.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1642 modül).
- ADR belgelendi: `brain/decisions/0016-balatro-hybrid-visual-system.md`.

## [2026-10-02] — Minimalist + Balatro P0: Gece 3 CRT, kart bounce/tilt, kromatik kombo, kademeli shake (v0.17.2 adayı)

### Motivasyon:
- Kullanıcı talebi: minimalist iskelet korunacak ama sıkıcı olmayacak — Balatro havası. Kod denetimi (9 bileşen) + internet araştırması (Balatro juice-stack/CRT, Linear/Apple minimalizm, teemo.dev prestij UX) sentezlendi. İlke: sakin zemin, coşkulu an.

### Yapılan İşler:
1. **`src/models/types.ts` + `src/stores/game.ts`:** yeni ayarlar `crtEffect: boolean` (varsayılan true) + `juiceMode: 'calm'|'balanced'|'tilt'` (varsayılan balanced). Eski kayıt uyumu: deserialize'da `undefined` ise varsayılan dolar; state/serialize dokunulmadı.
2. **`src/style.css`:** CSS-only CRT (body::before vinyet + body::after scanline, animasyonsuz, `mix-blend-mode: overlay`); `.crt-off`/`.reduce-anim`'de katmanlar `display:none`. Yeni: `buy-bounce` (spring), `tilt-card` (hover -1px), `count-pop-combo` (kromatik text-shadow), `shake-soft`/`shake-hard` kademeleri. Hepsi `prefers-reduced-motion` + `.reduce-anim`'da kapalı.
3. **`src/App.vue`:** `syncEffectClasses()` — reduce + crt tek elden (`reduce-anim` / `crt-off`).
4. **`src/components/SettingsModal.vue`:** "Gece 3 CRT" toggle + "Juice Yoğunluğu" 3'lü seçici (Sade/Dengeli/Full Tilt).
5. **`src/components/DimensionRow.vue`:** karta `tilt-card`, satın almada `buy-bounce` tetikleme (reduce açıkken atlanır).
6. **`src/components/Header.vue`:** kombo aktifken sayaç `count-pop-combo` (kromatik) ile patlar; normalde eski `count-pop`.
7. **`src/components/JuiceLayer.vue`:** big anlarda burst (balanced 3, tilt 5 + büyük font, calm 1); cap moda göre (30/60/120); shake `detail.level` destekler (soft/medium/hard).
8. **`src/components/DimensionsTab.vue` + `ColonyTab.vue`:** shake kademeleri bağlandı (Shift/Galaksi/vicdan soft, sacrifice/anomali medium, tekillik/Toplu Uyku hard; Shift/Galaksi big juice).
9. **`src/core/audio.ts`:** tıklama pitch ramp pentatoniğe çekildi (C-D-E-G-A oranları: 1.0/1.125/1.25/1.5/1.667).
10. **P1 görünen kimlik (aynı sürüm, devam turu):** CRT bug fix (katman `z-index:1` ile içeriğin arkasındaydı → 200/201, opaklık artırıldı, `mix-blend-mode` kaldırıldı); Header'da Balatro skor kutuları (mavi Fiş + kırmızı Mult, mult>1'de nabız + `hot`); sayaçta kalıcı glow (tekillik hazırsa altın); Kaydır + alınabilir boyut butonlarında sheen süpürmesi; `DimensionRow`'da 8 tier renk şeridi + foil milestone rozeti; `AnomalyOverlay`'de wobble + tip glow'u. Yeni CSS'lerin tamamı `prefers-reduced-motion` + `.reduce-anim`'da kapalı.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1639 modül).

## [2026-10-02] — İlk prestij öncesi cila: B paketi Satın alma UX (v0.17.1 adayı)

### Kapsam:
- Kullanıcı kararı: 2. prestij (Kolektif Nöbet) kapalı; önce ilk prestije kadar olan kısım cilalanacak. İki paralel denetim (pacing + UX) yapıldı, B paketi seçildi.

### Yapılan İşler:
1. **`src/components/DimensionRow.vue`:** Maks butonu artık tek paket fiyatına (`canAffordSingle`) bakıyor — ×100 modunda 10 pakete güç yetmezken tek paket alınabilirken kilitli görünme hatası düzeltildi. Mobilde isim yanına `×bought` rozeti eklendi (orta miktar bloğu `sm:` altında gizliydi).
2. **`src/components/DimensionsTab.vue`:** satın alma modu ipuçları netleştirildi (`1 paket = 10 adet`, en küçük alım vurgusu) + seçici yanına kalıcı açıklama. Kolektif Trend kartı `collectiveMinBought < 10` iken tek satır hedef gösterir (darboğaz rozeti + bar gizli). Akış Kümesi kartı ilk sıçrama + D5 öncesi gizli, yerine tek satır hedef satırı.
3. Save uyumlu: yalnızca görünürlük koşulları + buton disabled mantığı; state/serialize dokunulmadı.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1639 modül).

## [2026-10-02] — Hotfix: GODMODE paneli açılmıyordu (M kısayolu kodu bölüyordu)

### Neden:
- `godmode` yazarken `m` harfi Max All kısayoluna takılıp `return` ediyordu; harf buffer'a eklenmediği için sıra asla tamamlanamıyordu.
- Çözüm (`src/App.vue` `handleGodmode`): gizli-kod kontrolü kısayollardan önce; kod öneki yazılırken kısayol tetiklenmez. Node ile mantık testi ✓ (`godmode`→PANEL, tek `m`→Max All).
- Doğrulama: `npm run build` 0 hata.

## [2026-10-02] — Gece Kriz Meydan Okumaları Faz 3: Kurallar + Denge (v0.17.0 adayı)

### Motivasyon:
- Faz 1 motoru (registry, state, enter/exit/complete, save v10, G1/G2) üzerine C2–C8 kural wiring'i + meta ödüller + 8. başarım kategorisi + ADR-0015. Plan: `brain/research/challenges-research-and-plan.md` v2 (§5–§7, §10).

### Yapılan İşler:
1. **`src/stores/game.ts`:** `registerChallengeBuy()` (4 yaprak alım fn'unda: C2 halt+rampa, C5 ×1.5 sayaç) + `relieveChallengeOnPrestige()` (Sıçrama/Küme sonu: C3 reset, C8 ×0.6); `challengeProdMult` (C2 60 sn rampa + C8 fırtına 0.5×0.75^n, taban 0.15) + `challengeHalted`; `getDimensionMultiplier` (C3 taban+sayaç, C4 çift-tier 0, çift ×2, 8/8 ×1.25, süre-metas koşu-içi); maliyet getter'ları (C5 şişme + −%10); `tickspeedMultiplier` (C6 taban %40 + üs yarı + C2 +%15); `unlockedDimensionsCount`/kolektif sayaçlar (C7 kap 6); `shiftRequirement`/`canBuyGalaxy` (C7 D6 dengesi); `singularityGain` (C8 +%15 pre-floor); `manualClickPower` (C3 ×2); `update()` G3 (C2 sayaç, C3 ×1.004^dt, C8 sayaç + offline donması); yeni state `challengeSinceBuy`.
2. **`src/game/challenges.ts`:** `CHALLENGE_TIME_TIERS` + `challengeTimeTierMult()` (Bronz <8 sa ×1.1 / Gümüş <4 sa ×1.25 / Altın <90 dk ×1.4) + `isAllChallengesComplete()` + `ALL_CHALLENGES_COMPLETE_MULT` (1.25).
3. **`src/game/achievements.ts` + `src/models/types.ts`:** 8. kategori "Meydan Okumalar" (8 başarım, C8 gizli) + `AchievementContext.completedChallenges`; L8-11 bayat yorum fix'i (67 + 8 satır ≈ ×3.55, node ile doğrulandı: 3.5444).
4. **Kalibrasyon:** saf-fonksiyon birim testleri (esbuild+node ✓); güç bütçesi ✓; tempo bandı tutarlılık kontrolü. Tam koşu simülasyonu altyapı yokluğundan yapılamadı — C7/C8 katsayıları + süre eşikleri "varsayılanla yayınlandı", ADR-0015'te işaretli.
5. **ADR:** `brain/decisions/0015-night-crisis-challenges.md` (reddedilenler: zamanlı challenge, otomasyon ödülü, SP-içeride, sessiz koşu-silme, tek eşikli süre-metas, C²-kapsamı).

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1639 modül). Yasaklı dosyalar (App/Header/SingularityTab/ChallengesTab) ellenmedi.

## [2026-10-01] — UI/UX Kimlik Paketi: Display Font + Juice + Onboarding + Mobil Dock (v0.16.0 adayı)

### Motivasyon:
- Kullanıcı talebi: "UI/UX ve arayüzü en iyi hale getirmek için skill + web araştırması yap." `ui-ux-pro-max` ve `frontend-design` skill veritabanları + idle/clicker UI web araştırması sentezlendi. Ana bulgular: <50ms geri bildirim, floating ödül metinlerinin okunabilirliği, tipografik kimlik eksikliği, 0-state yönlendirme, mobil dokunma ergonomisi.

### Yapılan İşler:
1. **Tipografik kimlik (`index.html` + `tailwind.config.js` + `Header.vue`):** Chakra Petch (600/700) display font eklendi; hero Dopamin sayacı `font-display` ile imza öğeye dönüştürüldü (eski `font-mono font-black` yerine `font-display font-bold`).
2. **Juice katmanı (`JuiceLayer.vue`):** floating +X metinlerine koyu kontur (`strokeText`, 3.5px) — her zeminde okunabilirlik; spawn noktasına ±14px yatay saçılım (üst üste yığın engeli); `color` ve `big` opsiyonları; font 700 Chakra Petch'e geçti.
3. **Renk sözlüğü juice'a uygulandı (`DimensionsTab.vue`):** trend=cyan, yama=cyan, sıçrama=mor, küme=amber, sacrifice/sustur=gül, güneş=amber+big. Mevcut semantik renk tablosu artık ödül anlarında da okunuyor.
4. **0-state onboarding (`Header.vue` + `style.css`):** ilk format alınana kadar (D1 bought=0) "Başparmağı hazırla" ipucu pill'i + Kaydır butonunda `.cta-beacon` nefes halkası + `.arrow-nudge` ok animasyonu. Her ikisi de `prefers-reduced-motion` ve `.reduce-anim` tarafından söndürülür.
5. **Mobil alt dock (`App.vue`):** <768px'te nav alt sabit dock'a dönüşür (`max-md:fixed bottom-0`, safe-area inset desteği, koyu opak zemin); `main`'e `max-md:pb-28` payı.

### Bilinçli Ertelenen (perf):
- Pinia state'indeki Decimal'lerin deep-reactive proxy maliyeti (20 TPS döngüde ~25 atama noktası) ölçülmeden refactor edilmedi — `markRaw`/`shallowRef` dönüşümü ayrı, ölçümlü bir turda yapılmalı. 375px viewport testinde takılma gözlenmedi.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1636 modül, JS 494.16 kB / gzip 136.89 kB).
- Canlı doğrulama: desktop 0-state ipucu + Chakra Petch sayaç, 375×812 mobil viewport'ta alt dock + safe-area, click akışı (sayaç artışı) gözlemlendi.

## [2026-10-01] — Kapsamlı QoL Turu: P0 + P1 (v0.15.0 adayı)

### Motivasyon:
- Kullanıcı talebi: "QoL yapalım, farklı yerlere subagentlar gönder, internetten araştırma yapsınlar." Üç paralel denetim yapıldı (UI/UX kod denetimi, çekirdek sistem denetimi, web araştırması) ve P0+P1 paketinin tamamı uygulandı. ADR: `brain/decisions/0014-qol-pass-p0-p1.md`.

### Kritik Bulgu (P0):
- Arka plan sekmesinde oyun tamamen duruyordu: rAF gizli sekmede çalışmaz, delta 1000 ms ile sınırlıydı ve offline catch-up dalı ölü koddı. Idle oyun sekme arkasında sıfır üretiyordu.

### Yapılan İşler:
1. **`src/core/game-loop.ts`:** ham delta 5 sn'yi aşınca offline yakalamaya devir; `visibilitychange` ile gizlenen sekme anında kaydeder; negatif delta (saat sıçraması) güvenliği.
2. **`src/stores/game.ts` (offline):** 24 saat cap + kademeli adımlar (5 dk × 0.1 sn → 1 saate kadar 1 sn → sonrası 10 sn); `OfflineReport` üretir; `offlineSimActive` ile ses/konfeti bastırılır; başarım kontrolü offline'da 120 adımda bir seyreltilir.
3. **`src/components/WelcomeBackModal.vue` (yeni):** "Tekrar hoş geldin" — uzakta geçen süre, kazanılan dopamin, ortalama/sn, cap uyarısı.
4. **`src/core/save.ts`:** yedek slot (`DOOMSCROLL_SAVE_V1_BAK`, ~1 dk rotasyon), üç kademeli yükleme (ana → yedek → legacy), bozuk kayıt artık silinmiyor, `loadDetailed()` + `lastSaveSucceeded`; `deserialize`'ta version okuyan sıralı migration kancası.
5. **`src/components/ConfirmModal.vue` (yeni):** tek onay diyaloğu — Singularity (Header + SingularityTab + DimensionsTab), Power Nap, Önbellek Silme; `settings.confirmDialogs` ile kapatılabilir. Native `confirm()` kaldırıldı.
6. **Satın alma modları:** ×10 / ×100 (geometrik seri maliyet — `getDimensionPackCost`) / Maks seçici DimensionsTab başında; `buyAmount` save v10'a eklendi. **`src/core/hold.ts` (yeni):** `v-hold` basılı tut tekrar direktifi (400 ms + 100 ms) — satın alma, Maks ve Hz butonlarında.
7. **Kısayollar:** 1-8 sekme, M = Max All, Esc = modal kapat (input'ta devre dışı).
8. **Rapor sekmesi:** Dopamin Çarpan Kırılımı paneli (`multiplierBreakdown`: başarımlar, kolektif, koloni, nap, duruş, buff, lab, D8 sacrifice) + 10 dakikalık saniyelik üretim sparkline'ı (`dpsHistory`, 600 örnek).
9. **Bildirim noktaları:** Şafak — alınabilir Nöral Ağaç düğümü (`hasAffordableNeuralNode`); Botlar — alınabilir kilitli bot (`hasAffordableLockedBot`).
10. **Ayarlar:** Onay Diyaloğu + Animasyonları Azalt toggle'ları (`.reduce-anim` CSS), kısayol rehberi, panoya kopyalama başarısızsa dosyaya indirme fallback'i, `alert()` yerine inline durum mesajları, import iki adımlı onay + üzerine yazar uyarısı.
11. **Güvenlik üst sınırları:** `maxAll`/`buyMaxDimension` döngülerine 500 paket guard; anomali spawn aralığı mobil ekran güvenliğine çekildi; AutobuyersTab tetiklenme süresi ham çarpanla hesaplanır.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1636 modül, JS 493.22 kB / gzip 136.53 kB).

## [2026-10-01] — Tekillik Sonrası Döngü: Şafak Botu + Break Singularity + Faz 2 (v0.14.0 adayı)

### Yapılan İşler:
- **Şafak Nöbeti Botu (Singularity Autobuyer):** 3 çöküş + 1.79e308 Dopamin kilidiyle açılan bot, marjinal kazanç optimizatörüyle çalışır (ExponentialIdle modeli): saniyelik `log10(matter)` örnekleri, 3-sn eğim kıyası, 3 saniyelik deceleration streak + min-SP tabanı (kullanıcı ayarlı, default 1) sağlandığında sessiz `singularityReset(false)`.
- Optimizatör runtime state (`singularityBotSamples`, `singularityDecelStreak`, `singularityRunSeconds`, `singularitySampleAcc`) serialize edilmez; `dimensionShift`/`buyGalaxy`/`singularityReset` rampayı sıfırlar.
- **Break Singularity (`break_singularity`, 8 SP):** alınmadığında Shift/Galaxy botları tekillikte bekler (`singularityHoldActive` getter), alındığında e308 üstünde normal çalışır. SingularityTab rozeti "Sınır Yıkıldı" durumuna geçer.
- **Faz 2 kilometre taşı:** `nightWatchUnlocked` kalıcı flag, 1e4000 Dopamin eşiğinde konfeti ile açılır; SingularityTab'de kilitli/açık ilerleme kartı.
- **Save (v9 payload genişletildi):** `singularities`, `nightWatchUnlocked` ve autobuyer subset'ine `minGainSp` eklendi; eski kayıtlarda `singularities` fallback'i `stats.singularityCount`'tan alınır; deserialize `minGainSp` yalnızca pozitif sayıda restore eder.
- AutobuyersTab: Şafak Botu kartında mod seçici yerine min-SP girişi + optimizatör açıklaması; Header CTA tooltip'i Break durumuna göre değişir.
- ADR: `brain/decisions/0013-singularity-autobuyer-break.md`; GDD §7.2 eklendi.

### Doğrulama:
- `npm run build`: **0 hata** (1631 modül).
- Canlı AdminPanel enjeksiyon testi ve ekran görüntüsü doğrulaması yapıldı (bot kilidi, sessiz otomatik çöküş, kart ilerlemesi).

## [2026-10-01] — İlk Prestij Pacing Recalibration (v0.13.1 adayı)

### Yapılan İşler:
- Boyut zinciri üst katman üretimi `1.0×` yerine referans modeldeki `0.1×` taban hızına getirildi.
- Shift üretim/tıklama çarpanı `1.07^shifts` olarak kalibre edildi.
- Dördüncü Shift sonrası D8 gereksinimi `25 × 100^(shifts - 4)` eğrisine geçirildi.
- Tekrarlanabilir Lab/Kriz/Viral ödüllerinin önceki azaltılmış değerleri korundu.
- ADR: `brain/decisions/0011-prestige-pacing-recalibration.md`.

### Doğrulama:
- `npm run build`: **0 hata** (1629 modül).
- Temiz in-memory store, seeded RNG, `0.1s` simülasyon ve tüm yan güçlendirmelerle ilk Singularity: **13.938,0 sn / 3,872 saat**.
- Simülasyon sonucu: `log10(Dopamin) ≈ 308.495`, 5 Shift, 2 galaxy.

## [2026-10-01] — Ekonomi Dengeleme Uygulaması (v0.13.0 adayı)

### Yapılan İşler:
- Resolution ve Collective milestone çarpanları kümülatif çarpımdan en yüksek aktif milestone semantiğine geçirildi.
- Power Nap kalıcı çarpanı üretim hesabına bağlandı ve ilk Toplu Uyku ödülü soft-cap’li eğriyle dengelendi.
- Espresso ayrı bir Algoritma Frekansı buff’ı oldu; Fast Charge anomaly kapasitesine saygı duyuyor.
- Lab/Kriz tekrar eden ödülleri azaltıldı; çoklu olgun hücre hasatları aktif bütçe ile sınırlandı.
- Viral Kodeks yalnızca sentezlenen tarif sonuçlarını sayacak şekilde düzeltildi.
- Save import Decimal, buff, seed ve timer doğrulamalarıyla güvenli hale getirildi.
- Kombo banner’ı gerçek üretim/kaydırma kanallarını açıklıyor.

### Doğrulama:
- `npm run build`: **0 hata** (1629 modül).
- Final aktif 5 dakika playtest: `244.71 Qa` toplam Dopamin, `6.37 Qa/s`, `1.290` kaydırma.
- Önceki aynı aktif rota: `757.64 Qa`, `19.65 Qa/s`; üretim ivmesi belirgin biçimde azaltıldı.

## [2026-10-01] — İlk Prestij Pacing Simülasyonu

### Sonuç:
- Temiz in-memory store, seeded RNG ve `0.1s` update adımıyla simülasyon yapıldı.
- Aktif + tüm yan güçlendirmeler: **379.5 sn / 6.33 dk**.
- Daha yavaş aktif + yan güçlendirmeler: **1842.5 sn / 30.71 dk**.
- Yan güçlendirmesiz aktif rota: 2 saatte prestije ulaşamadı.

### Sonuç değerlendirmesi:
- Önceki 2–4 saatlik tahmin doğrulanmadı.
- Lab, kriz, bot, anomaly, shift ve galaxy sistemleri birlikte çalıştığında ilk prestij dakikalar içinde geliyor.
- Ayrıntılı ölçüm `brain/research/economy-balancing-research.md` dosyasına eklendi.

## [2026-10-01] — Ekonomi Dengeleme Araştırması

### Kapsam:
- `src/stores/game.ts`, `src/game/unlocks.ts` ve 5 dakikalık playtest logları incelendi.
- Antimatter Dimensions, Synergism, Cookie Clicker ve geliştirici kaynaklı incremental ekonomi modelleri karşılaştırıldı.

### Bulgular:
- Resolution ve Collective milestone çarpanları UI değerlerine rağmen kümülatif çarpılıyor; sırasıyla `×98.304` ve `×375.000` üst sınırlarına ulaşıyor.
- `napMultiplier` kaydediliyor ve gösteriliyor ancak üretim hesabına uygulanmıyor.
- Dört boyutun başlangıçta açık olması ve `Max All` kullanımı erken üretim zincirini aşırı hızlandırıyor.
- Tekrarlanabilir Lab/Kriz ödülleri, yeterince sınırlandırılmazsa pasif üretimi gölgede bırakabiliyor.

### Çıktı ve doğrulama:
- Ayrıntılı rapor: `brain/research/economy-balancing-research.md`
- Kaynak kodunda değişiklik yapılmadı; araştırma, mevcut playtest verileri ve kaynak bağlantılarıyla belgelendi.

## [2026-10-01] — 🧪 Algoritma Stüdyosu: Hibrit Viral Matris & Trend Reaktörü (v0.12.0)

### Kapsam & Motivasyon:
- Kullanıcı talebi: *"oyunun bu lab kisminda neler yapabiliriz fikirler ver bu kisim hakkinda guzel dusuncelerim var... peki ya hibrit bir sey yapsak en iyi ne yapabiliriz bir plan yap... bu guzel bunu en iyi sekilde yap"*.
- Eski durum: Cookie Clicker Garden klonu tarla/çiftlik modeli — tohum ekme, bekleme, `maxAge` aşımıyla tohumların çürümesi (`rot`), dar 3x3 ızgara ve yalnızca 1 mutasyon. Gece 03:00'te Reels izleme temasına aykırıydı ve AFK kalan oyuncuyu cezalandırıyordu.
- Çözüm: **"Algoritma Stüdyosu: Viral Matris & Trend Reaktörü"** hibrit sistemi geliştirildi.

### Yapılan İşler:
1. **Çürümesiz 3×3 Akış Matrisi (Sinerji Devresi):**
   - Çürüme cezası tamamen kaldırıldı (`maxAge` zorlaması bitti). Formatlar kalıcı soket/kart olarak 7/24 çalışır.
   - **Nöral Çekirdek (Merkez Hücre 4):** Kendi çarpanını $\times 1.5$ yapar ve 4 komşusuna $+%20$ verim yayar.
   - **Yönlü Sinerjiler:** Kedi ($+%15$ rezonans), Phonk (Bas Şoku $\times 1.25$ ve $+%50$ kriz sıklığı), Yemek Sinerjisi (Kaşar, Mukbang, Burger yan yana $+%30$).
   - **Satır / Sütun Uyumları:** 3 olgun hücre $\times 1.25$, aynı tür 3 format $\times 1.40$ mono-format çarpanı.
   - **Taktil Hasat:** Olgun hücreye tıklandığında anlık dopamin & Hype toplar, hücre yok olmaz sadece taze rezonans için yeniden ısınır.
2. **Viral Kodeks & Çift Yönlü Formül Sentezi:**
   - 8 farklı Reels meme/ses formatı (4 temel + 4 sentezlenen hibrit format):
     - 🍜 *Gece 3 Mukbang & Drama* (🧀+🛹): $+%50$ Pasif & $\times 1.5$ Tıklama.
     - 🍔 *Cheeseburger Kedi* (🐱+🧀): $+%40$ Pasif & **Vicdan Azabı emişi $-\%25$**.
     - 🏎️ *Tokyo Drift Dublajı* (🗿+🛹): $\times 2.0$ Tıklama & $+%30$ Gece Krizi sıklığı.
     - 🧠 *Saf Nöron Çürütücü* (🐱+🗿): $+%200$ ($\times 3$) Tüm Küresel Dopamin!
   - Çift yönlü sentez: Boş komşu hücreye filizlenme VEYA ızgara dolu olsa bile rezonansla doğrudan Kodekse keşif ekleme.
   - **Kalıcı Ödül:** Keşfedilen her formül tüm oyuna kalıcı **$+%3$ Global Dopamin** kazandırır.
3. **Trend Reaktörü & "🚀 AKIŞA FIRLAT!" (Viral Drop):**
   - Matris çalışması ve manuel kaydırma ($+\%0.4$/tık) ile dolan Hype Barı (%0-100).
   - Fırlatıldığında: Anında 60 sn Dopamin, 25 sn boyunca $\times 5$ ile $\times 25$ arasında değişen **Canlı Viral Zirve Çarpanı**, 3× Gece Krizleri yağmuru ve dinamik canlı izlenme sayacı ($10K \to 10M$).
4. **Algoritma Besleme Zeminleri (FYP Stratejileri):**
   - 🔥 *Agresif FYP:* Hype $\%80$ hızlı dolar, fırlatma $2\times$ dopamin verir (Aktif mod).
   - ☕ *Evergreen Arşiv:* Hype durur, matrisin tüm pasif üretimi **$2.5\times$** katlanır (AFK/gece modu).
   - 🧬 *Nöral Sentez:* Yeni formül keşfetme şansı **$3\times$** katına çıkar (Kaşif modu).
5. **Ses & UI:**
   - Web Audio API synthesizer motoruna `playViralDrop()` (riser sweep + ağır bas drop + çan akorları) eklendi.
   - `LabTab.vue` sıfırdan modern cyberpunk/stüdyo paneline dönüştürüldü; Viral Kodeks modalı, canlı akış banner'ı, zemin seçiciler eklendi.
   - `AdminPanel.vue`'ya tek tıkla Hype'ı %100 yapma butonu eklendi.

### Doğrulama & Geriye Dönük Uyumluluk:
- `npm run build` (`vue-tsc && vite build`): **0 hata, kusursuz derleme** (1629 modül).
- Eski save dosyaları otomatik olarak `discoveredFormulas` ile zenginleştirilir; mevcut hiçbir başarım bozulmaz.
- Mimari Karar Kaydı: `brain/decisions/0010-hybrid-algorithm-studio-viral-matrix.md`.

---

### Kapsam & Motivasyon:
- Kullanıcı geri bildirimi (v0.11.3 sonrası): *"erken oyunda bile tiklamadan aşırı hızlı yükseliyorum, tıklama bir işe yarıyor sanmıyorum"*.
- Kök neden (koda göre): erken oyunda tıklama/CPS oranı zaten **orta-oyun seviyesindeydi**. D1×10 alınıp CPS ≈ 20/s olunca tıklama = flat 1 + CPS×%1 ≈ 1.2 → gelirin sadece **%6'sı/tıklama** (4 tıklama/sn ≈ %24). Cookie Clicker'da erken oyunda bu oran ~150×'tir. Flat taban (1) hiçbir zaman büyümüyor, tek büyüyen çarpan `2^shifts` ise D4×25 (ilk Akış Sıçraması) geçene kadar geliyor.

### Yapılan İş (`src/stores/game.ts`, `manualClickPower` — getter-only, save uyumlu):
1. **Koleksiyon Senkronizasyonu** (Cookie Clicker "cursor level" tasarımı): `taban = (1 + 0.25 × toplamSatınAlınanReelAdedi) × 2^shifts × ...`. Tüm 8 katmanın `bought` toplamı tabanı büyütür.
   - Erken: D1×10 → tıklama ≈ 3.9 (CPS'in %20'si/tıklama; 4 tıklama/sn ≈ gelirin %78'i) — tıklama artık görünür ve anlamlı.
   - Orta: D1×50 → düz terim ~13.5, CPS ~6400 → payı doğal olarak ~%2'ye çöker (üretim üstel: `2^(bought/10)` × Hz × sıçramalar × kolektif).
   - Sıçrama/Küme ile `bought` sıfırlanır → her koşuda tıklama yeniden büyür (pacing tutarlı).
2. **Temel Senkronizasyon 1% → 2%:** orta oyunun ölü bölgesinde 5-10 tıklama/sn ≈ gelirin **%10-20'si** (Cookie Clicker benchmark'ı). Kafein Serumu (%25) + 1080p milestone'ları (~%8) ile geç oyun toplamı ~%35 CPS/tıklama — dengeli kalır.
3. Yan etki: **Başparmak Histerisi (777×)** artık orta oyunda da gerçek spike üretir (D1×50 civarında 777 × ~140 ≈ 110K/tıklama ≈ CPS'in 17'si × 15 sn) — v0.11.3 analizindeki "boşa gidiyor" bulgusu kapatıldı.

### Değişmeyenler:
- `matterPerSecond`, anomali/lab/vicdan ödül formülleri, serialize/deserialize dokunulmadı → **migrasyon yok, eski save'lar otomatik yararlanır**.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.49 kB / gzip 116.00 kB, 9.23s).

---

## [2026-10-01] — Tıklama Etkinliği Araştırması (click-to-score)

### Kapsam & Motivasyon:
- Kullanıcı sorusu: "oyundaki tiklama ile puan alma yontemi ne kadar ise yariyor?" → `src/stores/game.ts` mekaniği (manualClickPower formülü, anomali/lab/vicdan ödülleri) + tür literatürü (Cookie Clicker Wiki: orta oyuncu tıklamada CPS'in ~%10-13'ü; Antimatter Dimensions: tıklama yok; Synergism; Machinations/GridInc idle tasarım en iyi uygulamaları) kıyaslandı.

### Bulgular:
- **Erken oyun (0→~1e4):** tıklama gelirin %50-90'ı — tamamen işe yarıyor. ✅
- **Orta oyun (~1e4→1.79e308):** **ölü bölge**. Tıklama çarpanları flat (max ~8192× + 2^shifts) iken üretim üstel ($O(t^8)$); ~1e12-1e20 civarında payı ~%0'a düşüyor. Başparmak Histerisi 777× bu fazda boşa gidiyor. ⚠️
- **Geç oyun (tekillik sonrası):** Kafein Serumu (%25 CPS/tıklama) + 1080p milestone'ları (~%1-8) ile ~%25-35 CPS/tıklama — CC benchmark'ına yakın, dengeli. ✅
- Aktif oyunun gerçek kazancı orta oyunda **üretime bağlı** mekaniklerde (anomali sponsor 900 sn, lab hasadı 30-3600 sn, vicdan azabı 1.2-1.65× prim) — bu parça doğru tasarım.
- Oyunun açıklanan felsefesi ("bekleme oyunu değil; taktil yukarı kaydırma") ile orta oyun ölü bölgesi çelişiyor.

### Yapılan İş:
1. Rapor: `brain/research/click-effectiveness-analysis.md` (faz tablosu, formül envanteri, benchmark karşılaştırması, dengeleme önerileri).
2. **Düzeltme (`src/stores/game.ts`, `manualClickPower` — v0.11.3):** Cookie Clicker "%CPS to click" tasarımı olan **Temel Senkronizasyon** eklendi: `power += CPS × 0.01`. Artık tıklama hiçbir fazda sıfıra düşmez (5-10 tıklama/sn ≈ gelirin %5-10'u, her zaman). Yeni yama/SP/başarım gerekmez; serialize'a dokunulmadığı için **save uyumlu, migrasyon gerekmez**.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.41 kB / gzip 115.98 kB).

---

## [2026-10-01] — Yama Fiyat Senkronizasyonu (v0.11.2)

### Kapsam & Motivasyon:
- Kullanıcı sorusu: "itemlerin satın alma fiyatları nasıl?" → tam fiyat envanteri çekildi (D1-D8 taban+múlt, Hz 1000×13^n, yamalar, tohumlar, botlar, SP, koloni). Fiyatlar AD-standardında ve doğruydı; asıl sorun **dükkan açılış senkronizasyonu** yoktu: yama dükkanı 100K Dopamin'de açılırken ilk 3 yama 500 / 2.5K / 25K — açılma anında hepsi birden ucuz, anlamlı ilk karar yoktu. Cookie Clicker'da yükseltme açılış anında gelirin anlamlı bir kesarına mal olur.

### Yapılan İş:
1. **`src/stores/game.ts` (`ALGORITHM_UPGRADES`):** ilk 3 yama fiyatı senkronize edildi — `play_speed` 500→**1e5** · `double_tap` 2.5K→**1e6** · `amoled_black` 25K→**1e7**. `patch_shop` kilidi (1e5 Dopamin) açılınca ilk yama tam olarak afford edilebilir = anlamlı ilk karar.
2. **Basamak çakışması düzeltmesi:** 4. yama (`bg_listen`) 1e6'da kalırsa yeni 2. yama (1e6) ile eşitleniyordu → `bg_listen` 1e6→**1e8**, `bookmark_pack` 1e8→**1e9** (`bass_boost` 1e11 sabit). Yeni merdiven: **1e5 → 1e6 → 1e7 → 1e8 → 1e9 → 1e11** (sıkı artan 10× basamaklar).
3. **`src/components/DimensionsTab.vue`:** satır 375 yorumu "500 Dopamin ile açılır" → "100K Dopamin ile açılır" (gerçek `patch_shop` kilidine göre düzeltme).
4. **Aynen kaldı:** Lab tohumları (flat 500/50K/5M/1e9/1e15, Garden'daki gerginlik hücre kıtlığı gibi tekrarlanabilirlik baskısı mevcut), D1 `costMult` 1e3 (777× Başparmak Histerisi ile dengeli), Hz 1000×13^n (indirimler uygulanır), bot fiyatları (dim1 5e5 … dim8 1e34, tickspeed 5e8), `AUTOBUYER_BULK_COST` 2.5e11+1 Shift, `AUTOBUYER_MAX_COST` 1e22+1 Galaxy, `COLONY_CORE_COST` 1e13.

### Save uyumlu:
- `algorithmUpgrades` yalnızca **id listesi** olarak serileştirilir (serialize ~2218 / deserialize ~2343); fiyatlar live `ALGORITHM_UPGRADES` def'inden okunur → eski kayıtlar satın alınan yamaları korur, **migrasyon gerekmez**. UI (`DimensionsTab.vue` dükkanı) `upg.cost`'u dinamik okuduğu için yalnızca sabit değişti.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.37 kB / gzip 115.97 kB).

---

## [2026-10-01] — Özellik Merdiveni Pacing Revizyonu (v0.11.1)

### Kapsam & Motivasyon:
- Kullanıcı talebi: "oyunda bir şeyin açılması veya alınması çok kolay, bunu biraz daha uzun tut". Cookie Clicker / Antimatter Dimensions / Synergism ve idle UX literatürüyle kıyaslandı (ölçüt: ilk 5 dakikada 3-5 açılış, ilk büyük sekme 3-5 dk; Cookie Clicker yükseltmeleri sahiplik 1/5/15/25 eşiklerinde; AD ilk boost ~19 dk).

### Tespit (kritik bug):
- `dimBought` kilitlemeleri `dim.amount` (üretimle kendiliğinden büyür) ile değil `dim.bought` (gerçek satın alım) ile karşılaştırılmıyordu. Max-all simülasyonunda D1×50 duruşu **~13 sn'de** açılıyordu (tahmin ~2.3 dk). Cookie Clicker tasarımı 'own N' = satın alım üzerinden çalışır.

### Yapılan İş:
1. **`src/game/unlocks.ts`:** `UnlockContext` ve `buildUnlockContext` girdisine `bought: number` eklendi; `checkUnlock` / `unlockProgress` `dimBought` dalı artık `dim.bought` üzerinden (`>= count`, `Math.min(dim.bought, count)`).
2. **Dopamin eşikleri:** `crisis_spawn` 100→**1e3** · `patch_shop` 500→**1e5** · `refresh_feed` 1e3→**1e7** · `autobuyers` 1e6→**1e9** · `guilt_slackers` 1e6→**1e9** (hint metinleri: 1.000 / 100K / 10M / 1B / 1B Dopamin).
3. **Aynen kaldı:** Kriz sekmesi D4×10, stance'lar D1×50, Lab D2×25, tohumlar (D2×50 / D3×25 / D4×25), büyüler 2/3/4 cast — hepsi artık gerçek satın alım sayılır.
4. **`src/components/DimensionsTab.vue`:** merdiven kademeleri yorumu güncellendi (10M / 100K Dopamin).
5. **Pacing (günlük oyuncu modeli, 1.5 tıklama/sn + 2× kayıt):** Kriz doğurması ~16 sn · Yamalar ~41 sn · Kriz sekmesi ~57 sn · Lab ~1 dk 51 sn · Akışı Yenile ~1 dk 10 sn · Botlar & Azaplar ~1 dk 27 sn · Stance'lar ~3 dk 02 sn · Subway tohumu ~3 dk 22 sn · Phonk tohumu ~8 dk 40 sn.
6. **ADR-0009** eşik tablosu ve rasyoneli güncellendi (v0.11.1 revizyon notu).

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata**.

---

## [2026-10-01] — Özellik Merdiveni / Progressive Unlock (v0.11.0)

### Kapsam & Motivasyon:
- Kullanıcı talebi: oyun özellikleri başlangıçta hepsi açık olmasın, sırayla (merdiven halinde) açılsın. Araştırma (Cookie Clicker / Antimatter Dimensions / Synergism + idle UX literatürü): `brain/research/feature-unlock-ladder-plan.md`. ADR: `brain/decisions/0009-feature-unlock-ladder.md`.

### Yapılan İş:
1. **`src/game/unlocks.ts` (yeni):** Tek kaynaklı registry — `UnlockReq` discriminated union (dimBought/dopamine/shifts/galaxies/singularities/anomalies/spellsCast), 15 `FeatureUnlock` (`order` alanlı), `buildUnlockContext` / `checkUnlock` / `unlockProgress` / `getFeatureById` / `nextLocked`.
2. **`src/components/LockedFeature.vue` (yeni):** 🔒 + özellik adı + şart metni + current/target + slate ilerleme çubuğu (`progress-fill-slate`), `v-tip` tooltip. `featureId: string | null` prop'u.
3. **`src/stores/game.ts`:** `unlockedFeatures: string[]` state (sticky); `isFeatureUnlocked(id)` getter (liste veya koşul); `syncUnlocks()` action (her `update()` başında + deserialize sonrası); `labUnlocked`/`crisisUnlocked`/`autobuyersUnlocked` artık yalnızca registry üzerinden; `setStance` korumaları; `canRefresh` kilit kontrolü; anomali doğurması `crisis_spawn`, slacker doğurması `guilt_slackers` kilidine bağlı; serialize/deserialize (`unlockedFeatures`).
4. **Kritik bug fix:** `unlockedDimensionsCount` başlangıçta 4 olduğundan eski Lab/Kriz getter'ları her zaman `true` idi (sekme başlangıçtan açık oluyordu) — registry'e bağlanarak düzeltildi.
5. **Sekme içi kademeler:** LabTab (Kaşar/Subway/Phonk tohumları kilitli kart + eklenemez), CrisisTab (Espresso/Kulaklık/Yalan kilitli kart + cast edilemez), DimensionsTab (Akışı Yenile + Algoritma Yamaları dükkanı).
6. **`src/components/Header.vue`:** Çılgın Kaydırma / Düşük Parlaklık butonları D1×50'e kadar kilitli (devre dışı + Lock ikonu + "(current/target)" tooltip).
7. **`src/App.vue`:** Nav altında "Sonraki Açılacak" bandı (`nextLocked` + ilerleme çubuğu + current/target notasyonu); nav tooltip'ları güncellendi.
8. **Eşik ince ayarı** (pacing simülasyonu, 2 tıklama/sn max-all): Gece Krizleri 100 Dopamin (~30sn) · Yamalar 500 (~1dk) · Akışı Yenile 1.000 (~1.2dk) · Botlar 1e6 (~1.6dk) · Vicdan Azapları 1e6 · Kriz D4×10 (~2.1dk) · Stance'lar D1×50 (~2.3dk) · Lab D2×25 (~3.6dk) · tohumlar D2×50/D3×25/D4×25 · büyüler 2/3/4 cast.
9. **Save uyumlu:** kilitlemeler state'ten türetilmiş, koşul sağlanmışsa eski save'larda otomatik açılır — kayıp yok, migrasyon yok.
10. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.39 kB / gzip 115.97 kB). İlk derlemedeki 6 TS hatası (formatNumber argüman sırası, `string | null` prop) düzeltildi.

---

## [2026-10-01] — Nöral İzleme Kolonisi & Toplu Uyku (v0.10.0)

### Kapsam & Motivasyon:
- Backlog'daki ilk Synergism katmanı mekaniği: kendi kendini üreyen nöral alt-bot kolonisi + Toplu Uyku (Power Nap) ile botları feda edip kalıcı kök dopamin çarpanı katlama. ADR: `brain/decisions/0008-neural-colony-power-nap.md`.

### Yapılan İş:
1. **`src/stores/game.ts`:**
   - Sabitler: `COLONY_CORE_COST = 1e13`, `COLONY_MIN_NAP_BOTS = 100`, `COLONY_BREED_RATE = 0.008`, `COLONY_PASSIVE_LOG_FACTOR = 0.3`.
   - State: `neuralBots`, `napCount`, `napMultiplier` (kalıcı, prestijden sağ kalır).
   - Getter'lar: `colonyUnlocked` (sticky), `botBreedRate`, `colonyMultiplier` (logaritmik), `canPowerNap`, `powerNapGain`.
   - `hatchCore()` ve `powerNap()` aksiyonları; update() 7.5. aşamasında üreme; D1 net üretimi + `matterPerSecond`'a çarpan (kolektif çarpanla aynı yere).
   - SP dükkanı: `neural_nest` (Nöral Yuva, 6 SP, ×3 maliyet, max 5 seviye, üremeyi +%10/seviye).
2. **`src/models/types.ts`:** `AchievementContext` (`neuralBots`, `napCount`) ve `SerializedPlayerState` (opsiyonel alanlar, save versiyonu 7→8) eklendi.
3. **`src/game/achievements.ts`:** 3 Otomasyon başarımı: `colony_hatch`, `colony_nap`, `colony_million` (gizli, ≥1e6 bot).
4. **`src/components/ColonyTab.vue` (yeni):** TabHero (violet, Network), çekirdek yumurtlama, üreme oranı + 10 dk projeksiyon, ilk uykuya kalan süre tahmini, Toplu Uyku kartı.
5. **`src/App.vue`:** "Koloni" sekmesi (Botlar ile Şafak arası), kilitli durumda "1e13" ipucu, nap-ready `tab-dot-violet` bildirim noktası.
6. **`src/style.css`:** `.tab-dot-violet`, `.hero-accent-violet`, `.ds-badge-violet` ekleri.
7. **Seri hale getirme:** save v8 — eski kayıtlar `??`/fallback ile uyumlu.
8. **Bugfix (kullanıcı bildirimi):** Çekirdek aktivasyon paneli `!colonyUnlocked` koşuluyla gizlenmişti; sekmenin açılış koşuluyla aynı değer olduğundan buton hiç render olmuyordu → `neuralBots.lte(0)` (çekirdek yumurtlanmamış) koşuluna düzeltildi.
9. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1626 modül, JS 408.83 kB / gzip 113.62 kB).

---

## [2026-10-01] — Anti-Slop UI Yönü & Erişilebilirlik Turu (v0.9.0)

### Kapsam & Motivasyon:
- İnternet araştırması (avoid-ai-design 67-tell katalogu, Zach Gage Three Reads, Kukshtel oyun UI prensipleri, WCAG 2.2, backdrop-filter performans) + kod denetimi → 5 fazlı plan: `brain/research/ui-ux-anti-slop-research-and-plan.md`. ADR: `brain/decisions/0007-anti-slop-ui-and-accessibility-pass.md`.

### Yapılan İş:
1. **Faz 0 — Ölçüm:** slate-500 = 4.18:1, slate-600 = 2.63:1 (AA altı); dokunma hedefleri 28-30px; 52 ölü `title`.
2. **Faz 1 — Erişilebilirlik:**
   - `tailwind.config.js`: slate 500/600/700 override → 55 metin kullanımı tek seferde AA (5.23/4.87/4.6:1).
   - `style.css`: `.hit-44` (görsel boyutu bozmadan 44px hit-area) — nav/stance/radyo/satır butonlarına uygulandı.
   - `style.css`: `.affordance-pulse` → `--pulse-c1/c2` custom property; Hz butonu artık **amber** nabız atıyor (renk sözlüğü ihlali A5 kapandı).
   - `public/favicon.svg` (telefon + yukarı ok) + `index.html` description/theme-color (A3).
3. **Faz 2 — Anti-slop:**
   - Eyebrow temizliği (A1): `.section-label`, TabHero h2, SettingsModal başlığı, "DOPAMİN", "Tümü", toast vb. → sentence-case gövde yüzü; nav etiketleri mono→`font-semibold` sans.
   - Blur budama (A4): `glass-panel-card`, `panel-hero`, `glass-panel-glow` → katı yüzey; blur yalnız `.glass-panel-glow`+`.modal-glass` (SettingsModal) ve AnomalyOverlay overlay'lerinde; nav/header radyo blur kaldırıldı. Toplam backdrop-filter kullanımı >20 → 5.
   - 9:16 kimlik motifi: `.hero-orb` dairesel blur → dikey 9:16 telefon çerçevesi (rotate 8°).
4. **Faz 3 — Three Reads:**
   - `src/core/tooltip.ts` (yeni): `v-tip` directive — hover anında, mobil tap'ta konumlu tooltip; `main.ts` kaydı; 43 `title` → `v-tip` (TabHero prop'ları geri alındı).
   - Header: **"Sıradaki hedef" satırı** (U4) — alınabilir varsa "Frekans hazır / D3 alınabilir", yoksa en yakın hedefe kalan %.
   - Header: radyo widget'ı `hidden sm:flex`, şebeke/WiFi ikonları `hidden sm:block` (U1) — mobilde ilk bakış: sayaç + hedef.
5. **Faz 4 — Juice:** `count-pop` (tıklama/space anında sayaç mikro-pop, `prefers-reduced-motion` kapalı) + DimensionRow "10:" butonuna `affordance-pulse`.
6. **Doğrulama:** kontrast yeniden hesap (tüm metinler AA ✅), `npm run build` (`vue-tsc && vite build`) **sıfır hata**.

---

## [2026-10-01] - Hibrit Format Sinerjisi & Kolektif Trend Motoru (v0.8.1)

### Kapsam & Motivasyon:
- Üst kademe formatlar (D5-D8) açıldığında alt kademelerin (D1-D4) önemsizleşmesi ("Lower Tier Obsolescence") problemini çözmek için hibrit mekanik entegre edildi.

### Yapılan İş:
1. **`src/models/types.ts`:** `CollectiveMilestone` arayüzü eklendi.
2. **`src/stores/game.ts`:**
   - `COLLECTIVE_MILESTONES`: 25 (2x), 50 (3x), 100 (5x + %10 Frekans indirim), 250 (10x), 500 (25x), 1000 (50x).
   - `MIRROR_PAIRS`: D1↔D8, D2↔D7, D3↔D6, D4↔D5.
   - `getDimensionSynergyMultiplier`: $1 + \sqrt{\text{Partner.bought}} \times 0.15$ yakıt çarpanı hem `getDimensionMultiplier` hem de `getPartnerInfo`'ya bağlandı.
   - `collectiveMinBought`, `collectiveBottleneck`, `collectiveMilestoneInfo` ve `collectiveMultiplier` getter'ları.
   - `matterPerSecond` ve `update()` içindeki `rawProduced` hesabına `collectiveMultiplier` uygulandı; 100+ seviyede `tickspeedCost`'a %10 indirim entegre edildi.
3. **`src/components/DimensionRow.vue`:**
   - Her formata eşleştiği partneri ve sağladığı yakıt çarpanını gösteren neon rozet eklendi (`🔗 D8: ×2.50`).
4. **`src/components/DimensionsTab.vue`:**
   - Şafak barının altına "Kolektif Trend" bento kartı eklendi: Canlı ilerleme çubuğu ve oyuncuya en gerideki formatı gösteren "En Geride: D3 ASMR Sabun (38/50)" darboğaz uyarısı.
5. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) sıfır hata ile doğrulandı.

## [2026-10-01] - Reels Pro: Akış Motoru & Algoritma Devrimi (v0.8.0)

### Kapsam & Motivasyon:
- Reels (Boyutlar) sekmesi sadece düz "10 Al" ve "Maks Al" butonlarından ibaretti; orta oyunda yavaşlama ve tekdüzelik oluşuyordu.
- *Antimatter Dimensions* (Dimension Sacrifice), *Cookie Clicker* (Milestone Çözünürlükleri, Upgrade Dükkanı) ve mobil sosyal medya refleksleri (Pull to Refresh) hibrit biçimde entegre edildi.

### Yapılan İş:
1. **`src/models/types.ts`:**
   - `ResolutionMilestone` ve `AlgorithmUpgradeDef`/`AlgorithmUpgradeId` tipleri eklendi.
   - `SerializedPlayerState`'e `sacrificeCount`, `sacrificeMultiplier`, `algorithmUpgrades`, `refreshCooldown` eklendi.
2. **`src/core/audio.ts`:**
   - `playSacrifice()`: Sub-bass sweep frekans süpürme efekti.
   - `playRefresh()`: Taktil hava swoosh ve parlak synth efekti.
   - `playMilestone()`: 4 tonlu arpej seviye atlama kristal çanı.
   - `playUpgrade()`: Yükseltme satın alma kilidi açma sesi.
3. **`src/stores/game.ts`:**
   - `RESOLUTION_MILESTONES`: 25 (360p - 2x), 50 (720p HD - 3x), 100 (1080p 60fps - 4x + %1 Tıklama payı), 250 (4K HDR - 8x), 500 (Nöro-Link - 16x), 1000 (Kozmik - 32x).
   - `ALGORITHM_UPGRADES`: 6 adet tek seferlik Dopamin yükseltmesi (1.25x Oynatma Hızı, Çift Dokunarak Beğen, OLED Sonsuz Siyah, Arka Planda Dinle, Kayıtlılara Ekle, Kulaklık Bass Boost).
   - `sacrificeDimensions()`: D1-D7 sıfırlanıp D8 Saf Beyin Çürümesine `(1 + log10(D1)/4)^2.5` kalıcı katlanan çarpan.
   - `pullToRefresh()`: 60 sn cooldown ile 12 sn boyunca 3x üretim dalgası.
   - Save / Load (serialize / deserialize) desteği tamamlandı.
4. **`src/components/DimensionRow.vue`:**
   - Her formata ulaştığı çözünürlük seviyesine göre neon rozet (`144p`, `360p`, `720p HD`, `1080p 60fps`, `4K HDR`).
   - Bir sonraki çözünürlük kademesine kalan adeti gösteren dinamik mini progress bar.
5. **`src/components/DimensionsTab.vue`:**
   - Üst çubukta "Akışı Yenile (Pull to Refresh)" taktil butonu ve canlı geri sayım/dalga rozeti.
   - 6 kartlık "Algoritma Yamaları" yükseltme dükkanı paneli.
   - 5. Sıçramadan sonra açılan "Önbelleği Sil (Dimension Sacrifice)" bento kartı.
6. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) sıfır hata ile doğrulandı.

## [2026-10-01] - UI Bütünlük & Senkronizasyon Devrimi (v0.7.1)

### Tespit Edilen Dağınıklık:
- 2 ayrı panel dili (`bg-dark-900/border-slate-800` eski vs `bg-black/40/border-white-alpha` yeni) 8 sekmede karışık kullanılıyordu.
- 5 farklı progress bar yüksekliği/rengi (h-1, h-1.5, h-2, h-3) ve 4 farklı hero başlık şablonu.
- `SettingsModal` ayrı renk sözlüğü (`dark-*`, `quantum-*`) kullanıyordu; diğerleri Tailwind mor/camgöbeği/amber dilindeydi.
- `AnomalyOverlay` ikonları tipine bakılmaksızın hep mor gösteriyordu (renk bug'ı).
- Z-index çakışması: Juice/Anomali/Toast/Modal hepsi `z-50` idi.
- `AchievementToast` kuyruğu hızlı ardışık açılışlarda takılıyordu; konum üst-sağda buff bar ile çakışıyordu.
- Header saati statik `02:47 AM` yazıyordu; oyun ilerlemesinden kopuktu. Duruş etiketi de statikti.
- Nav'da kilitli sekmeye tıklama + prestij sonrası kilitli sekmede kalma senkron hataları vardı.

### Yapılan İş:
1. **`src/style.css`:** Birleşik "Obsidian Dock" tasarım sistemi — `.panel-hero` + 7 accent, `.stat-box`, `.section-label/.section-hint`, `.ds-badge` (6 renk), `.progress-track` (mini/sm/md) + `.progress-fill` (7 renk), `.tab-dot` (6 renk, tek nabız animasyonu), `.btn-primary-*`, `.layer-anomaly/juice/toast/modal` katman sıralaması, `focus-visible` + `prefers-reduced-motion`.
2. **`src/components/TabHero.vue` (yeni):** Tüm sekmelerin tek hero bileşeni (icon/title/badge/subtitle/accent + stats/progress/alert slotları).
3. **`src/App.vue`:** Nav stilleri `NAV_BTN`/`navClass()` ile tekleşti; `tabLocked` haritası + kilitli tıklamada "Kilitli" juice geri bildirimi; prestij sonrası güvenli sekmeye otomatik dönüş watcher'ı; Kriz (enerji dolu/backfire) ve Bot (bulk/max açılabilir) için yeni senkron bildirim noktaları; `no-scrollbar` + `pb-8` ritim.
4. **`src/components/Header.vue`:** Gece saati Şafak ilerlemesiyle senkron (02:47→06:00 log interpolasyonu, tabular-nums); duruş etiketi stance ile senkron.
5. **Sekmeler:** `LabTab`/`CrisisTab`/`AutobuyersTab`/`SingularityTab`/`AchievementsTab`/`StatsTab` → `TabHero` + `.stat-box` + `.progress-track` birliği; `DimensionsTab`/`DimensionRow` mini barlar birleşik sınıflara geçti; `space-y-3` tek ritim; `dark-900/slate-800` kalıntıları `black/40 + white-alpha` diline göçtü.
6. **Katman & bug:** `AnomalyOverlay` tip-bazlı ikon rengi (`getIconColor`) + `layer-anomaly`; `JuiceLayer` → `layer-juice`; `AchievementToast` kuyruk pompası düzeltmesi + sağ-alt konum + `layer-toast`; `SettingsModal`/`AdminPanel` → `layer-modal`; Settings modal `quantum/dark` sınıflarından arındırıldı.
7. **Doğrulama:** `vue-tsc --noEmit` sıfır hata. (`vite build` bu ortamda `@rollup/rollup-linux-x64-gnu` eksik olduğu için çalışmıyor — değişikliklerden bağımsız ortam sorunu; `dist/` önceki derlemeden mevcut.)

## [2026-09-30] - Gece Başarımları Sekmesi + Kalıcı Ödüller (v0.7.0)

### Yapılan İş:
1. **`src/models/types.ts`:** `AchievementCategoryId`, `AchievementRewardKind` (10 niş ödül), `AchievementDef`, `AchievementContext` tipleri; `PlayerStats.seedsPlanted`; `SerializedPlayerState.achievements?` + `achievementsSeenCount?`.
2. **`src/game/achievements.ts` (yeni):** 7 kategori × 8 = 56 başarım tanımı (7 gizli/shadow), denge sabitleri (`1.012`/satır `1.06` → tam set ≈×2.93), `calcAchievementMultiplier`, `hasAchievementReward`.
3. **`src/stores/game.ts`:** `state.achievements` (reset'lere dokunulmaz → prestij kalıcı) + toast kuyruğu + 14 getter (global çarpan + 10 niş ödül + başlangıç maddesi); `checkAchievements()` `update()` sonunda (offline'da da tetiklenir); ödüller `matterPerSecond`, boyut zinciri, `manualClickPower`, tickspeed maliyeti, anomali aralığı, sızıntı, kafein, SP maliyeti, hasat, buff süresi ve 3 reset'in başlangıç maddesine uygulandı; `singularityGain` bilinçli olarak hariç; serialize v7.
4. **`src/components/AchievementsTab.vue` + `AchievementToast.vue` (yeni):** Kategori satırları, ilerleme barları, ödül rozetleri, gizli `???` kartları; sağ üst 4 sn toast kuyruğu.
5. **`src/App.vue`:** `Plaket` dock butonu (Trophy, yeni başarım noktası) + render + `markAchievementsSeen`.
6. **`src/components/SingularityTab.vue`:** SP maliyet gösterimi indirimi yansıtacak şekilde güncellendi.
7. **`GAME_DESIGN.md`:** §8 Başarımlar bölümü eklendi.
8. **Doğrulama:** `npm run build` sıfır hata (1621 modül).

## [2026-09-30] - Hard Reset Dirilme Hatası Düzeltmesi (v0.6.5)

### Kök Neden:
- `SettingsModal.vue` içindeki "Evet, Sıfırla" butonu `SaveSystem.hardReset()` (anahtarı siler) + `window.location.reload()` çalıştırıyordu.
- Ama `App.vue` içindeki `beforeunload` dinleyicisi ve oyun döngüsünün 10sn otomatik kaydı, yeniden yükleme anında hafızadaki ESKİ state'i tekrar kaydedip silinen kaydı diriltiyordu. Sonuç: sıfırlama çalışmıyor gibi görünüyordu.

### Yapılan İş:
1. `src/core/save.ts`: `saveSuppressed` bayrağı eklendi; `hardReset()` bayrağı kurup anahtarı siler, `save()` bayrak kuruluysa yazmayı atlar. Sayfa yeniden yüklenince modül sıfırlanır, normal kayıt devam eder. Admin panelindeki Hard Reset de aynı fonksiyonu kullandığı için otomatik düzeltildi.
2. **Doğrulama:** `npm run build` sıfır hata (1616 modül).

## [2026-09-30] - Gizli GODMODE Admin Paneli (v0.6.4)

### Yapılan İş:
1. **`src/components/AdminPanel.vue` (yeni):** Kaynaklar (Dopamin preset/özel ekle-ayarla, SP, Tekillik), Boyutlar (D1-D8 +10, tümü +100, Hz/Shift/Galaksi), Buff & Olay (Gece 3, Histeri, 5439x kombo, anomali/vicdan doğur-temizle-primli bozdur), Lab/Kriz/Bot (kafein full, lab olgunlaştır, 🧠 ekle, tüm botları aç-çalıştır-durdur, SP dükkanı maxla), Zaman/Prestij (1dk-8sa ileri sar, Shift/Galaksi/Tekillik zorla, Hard Reset).
2. **`src/App.vue`:** Global `keydown` dinleyicisi ile `godmode` tamponu (son 7 harf, büyük/küçük harf duyarsız); eşleşmede panel aç/kapat + `ESC` ile kapatma; `onUnmounted` temizliği.
3. **Doğrulama:** `npm run build` sıfır hata (1616 modül, 2.74s).

## [2026-09-30] - İlk Prestij Denge Ayari: ~3 Saat Hedefi (v0.6.3)

### Hesap:
- Simülasyon (hibrit tekli ağırlıklı + 15sn manuel): eski değerlerle 53 dk, hedef 2-4 saat.
- Seçilen ayar (a): tick 10x->13x, shift 20->25, galaxy 80->100 = 178 dk (~2.98 saat).
- Tür standardı: AD ilk Infinity 4sa-2gün, Cookie ilk ascension 1-2 gün.

### Yapılan İş:
1. `src/stores/game.ts:388`: `tickspeedCost` 10x -> 13x.
2. `src/stores/game.ts:397`: `shiftRequirement` 20 -> 25.
3. `src/stores/game.ts:412`: `galaxyRequirement` 80 -> 100.
4. **Doğrulama:** `npm run build` sıfır hata.

## [2026-09-30] - Hibrit Oto-Alım Kademesi: Tekli -> Toplu -> Max (v0.6.2)

### Yapılan İş:
1. **`src/models/types.ts`:** `AutobuyerMode` eklendi, `AutobuyerConfig.mode` ve save alanları (`mode`, `autobuyerBulkUnlocked`, `autobuyerMaxUnlocked`) eklendi.
2. **`src/stores/game.ts`:** `AUTOBUYER_BULK_COST (2.5e11 + 1 Shift)`, `AUTOBUYER_MAX_COST (1e22 + 1 Galaxy)`, `getAutobuyerInterval()` (tekli 3sn / toplu 1.5sn / max 0.5sn; shift/galaxy daha yavaş), `unlockBulkMode/unlockMaxMode/setAutobuyerMode`, update döngüsü moda duyarlı (tekli 1 paket, toplu 5 paket, max sınırsız), serialize v6 + eski kayıt göçü.
3. **`src/components/AutobuyersTab.vue`:** 3 kademe kartı + bot başına TEKLİ/TOPLU/MAX seçici, kilitli modlar devre dışı.
4. **Doğrulama:** `npm run build` sıfır hata (1614 modül).

## [2026-09-30] - Müzik Motoru v2 Yükseltmesi (v0.6.1)

### Araştırma Kaynakları:
- gskinner convolution reverb (decaying noise impulse + pre-delay + multitap)
- MDN Advanced Audio (envelope, noise buffer, lookahead scheduler)
- Melodics lo-fi teori (min7/maj7/9th, ii-V-I, broken chords)

### Yapılan İş:
1. **`src/core/music-engine.ts` tam yükseltme:**
   - Master zincir: Filter -> Duck -> Compressor (-18dB, 4:1) -> Master -> Analyser.
   - Convolution reverb (2.2sn stereo impulse) + delay hem filtreye hem reverbe.
   - Davullar gerçek noise tamponuna geçti (snare/hat/shaker + kick klik).
   - Swing (lo-fi %14, groove %10) + humanize (±8ms, ±%15 velocity).
   - Caz akorları: Fmaj9-Em9-Dm9-Cmaj9 + inversiyon varyasyonu, ghost vuruşlar.
   - Sidechain duck, per-nota stereo pan, wow/flutter vibrato, bas reverbden muaf.
   - Yeni `setIntensity()` API (geriye uyumlu, store kırılmadı).
2. **ADR:** `brain/decisions/0004-music-engine-v2.md` açıldı.
3. **Doğrulama:** `npm run build` sıfır hata (8.77s, 1614 modül).

## [2026-09-30] - Faz 6: Night Owl Lo-Fi & Synth BGM Engine Yayını (v0.6.0)

### Tamamlanan Özellikler:
1. **Kesintisiz Prosedürel Web Audio Müzik Motoru (`src/core/music-engine.ts`):**
   - **Sıfır Harici Ağ Bağımlılığı (0 KB):** Ağ kopması veya CORS sorunlarından etkilenmeyen, tamamen yerel Web Audio API osilatörleri ve filtreleri ile çalışan sonsuz sentezleyici motoru.
   - **Chris Wilson "A Tale of Two Clocks" (Lookahead Scheduler):** 25ms hassasiyetli zamanlayıcı ile notaları 120ms önceden donanım saatine (`ctx.currentTime`) programlayan, UI gecikmelerinde sıfır ritim kayması garantili mimari.
   - **Analog Lo-Fi & DSP Efekt Zinciri:**
     - Sıcak kaset alçak geçiren filtre (Warm BiquadFilter 1400Hz, Q: 1.2).
     - Stereo uzaysal delay hattı (380ms delay + %28 feedback).
     - Pembe gürültü (Pink noise) + seyrek mikro plak kıvılcımları ile oluşturulmuş **Nostaljik Vinil/Kaset Cızırtısı**.
     - Yavaş analog kaset yalpalaması (Tape wow/flutter LFO detuning).
2. **4 Özel Gece 3 Radyo İstasyonu (Kanallar):**
   - 🌙 **02:47 AM Lo-Fi Chill (68 BPM):** `Cmaj9 -> Am9 -> Dm9 -> G13` döngüsü, sıcak Rhodes E-Piano (Triangle+Sine, chorus detune), derin 808 sub-bass, fırçalı yumuşak lo-fi beat.
   - 🌌 **Cyberpunk Midnight (104 BPM):** `F#m -> D -> A -> E`, 16'lık hipnotik neon arpej, 8'lik yürüyen analog bas hattı, elektro kick & snare.
   - 🪐 **Deep Sleep Ambient (46 BPM):** Yavaşça nefes alan 432Hz meditatif analog pad'ler, derin uzaysal sub-drone ve rastgele parıldayan kristal gece çanları.
   - 🛹 **Subway Beats & Groove (88 BPM):** Taktil yukarı kaydırma refleksiyle senkronize ritmik funk bas yürüyüşü ve groovy pluck stabs.
   - 📻 **Özel Akış / Web Radyo:** Kullanıcının dilediği harici MP3 veya lofi radyo stream URL'sini girebileceği HTML5 `Audio` köprüsü.
3. **Minimalist Telefon Durum Çubuğuna Entegre Lo-Fi Radyo Widget'ı (`Header.vue`):**
   - Gerçek zamanlı dans eden 4 kanallı ekolayzır (Visualizer) barları.
   - Parça adı ve ikonu.
   - Hızlı Oynat/Duraklat (Play/Pause) ve Sonraki Kanal (SkipForward) butonları.
4. **Gelişmiş Müzik ve Ses Ayarları Modalı (`SettingsModal.vue`):**
   - Bağımsız BGM & SFX ses seviyesi kaydırıcıları (%0 - %100).
   - 5 istasyon seçim kartı (aktif seçim neon mor ışıltılı).
   - Analog vinil/kaset cızırtısı açma/kapatma anahtarı.
   - Harici stream URL girdi alanı.
5. **Tarayıcı Autoplay Kilit Çözücü (`App.vue`):**
   - Kullanıcının sayfaya ilk tıklamasında veya Space tuşuna basmasında `AudioContext`'i anında uyandıran listener.
6. **Doğrulama & Görsel Kanıt:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı (2.19s).
   - Headless Chrome ile 1600x1000 masaüstü, 390x844 mobil ve 1600x1100 ayarlar modalı ekran görüntüleri alındı ve onaylandı.

---

## [2026-09-30] - Faz 3: Doomscroll: The Endless Reels Yayını (v0.3.0)

### Tamamlanan Özellikler:
1. **Evren ve Konu Dönüşümü (Doomscroll: The Endless Reels):**
   - Oyunun adı ve hikayesi **Doomscroll: The Endless Reels** (*"Gece 3'te 2 Dakika Bakıp Çıkacaktım"*) olarak baştan sona güncellendi.
   - Ana kaynak **DOPAMİN (Dopamine)** ve **+X Dopamin / sn**.
   - Tıklama Butonu: **👆 YUKARI KAYDIR! (Swipe Up / Scroll!)** (ve Space tuşu).
   - 8 Reels İstasyonu ($D_1 - D_8$):
     1. *Masum Kedi & Köpek Videoları*
     2. *Gece 3 Sokak Lezzetleri & Eritme Peynir*
     3. *ASMR Sabun Kesme & Halı Yıkama*
     4. *Subway Surfers Eşliğinde Reddit Hikayesi*
     5. *Gece 4 'Sigma' Girişimci Tavsiyeleri*
     6. *12 Kısımlık Hint Dizisi (Part 1/12)*
     7. *Gece 5 Varoluşsal Kriz Belgeselleri*
     8. *Saf Beyin Çürümesi (Brainrot Singularity)*
   - Tickspeed $\to$ **Algoritma Frekansı (Hz)**; Boost $\to$ **Akış Sıçraması**; Galaksiler $\to$ **Sonsuz Akış Kümeleri**; Singularity $\to$ **Sabah 06:00 Çöküşü (Güneş Doğdu Ama Duramıyorum!)**.
2. **Kuantum Dalgalanmaları / Rastgele Gece Krizleri (Cookie Clicker):**
   - Ekranda belirli aralıklarla yüzen ve 14 saniye içinde tıklanmayı bekleyen **Işıltılı Gece Krizleri** (`AnomalyOverlay.vue`).
   - 3 Farklı Güçlü Etki:
     - **🔥 Gece 3 Çılgınlığı:** 60 sn boyunca tüm dopamin akışı $7\times$ katlanır.
     - **👆 Başparmak Histerisi:** 15 sn boyunca Yukarı Kaydırma gücü $777\times$ fırlar.
     - **💎 50 Milyonluk Viral Video:** Anında 15 dakikalık dopamin doğrudan beyne enjekte edilir.
   - **Rezonans Hipnozu:** Gece 3 ve Başparmak Histerisi aynı anda aktifleştiğinde katlanarak **$5,439\times$ süper dopamin patlaması** yaşanır.
3. **Taktiksel Gece Duruşları (Trimps Stance Sistemi):**
   - **🛌 Yorgan Altı Modu:** Pasif dopamin akışına $+100\%$ odak (2× Üretim).
   - **⚡ Çılgın Kaydırma:** Manuel kaydırma gücüne $+300\%$ (4× Tıklama) ve Gece Krizi sıklığına $+50\%$ ivme.
   - **🕶️ Düşük Parlaklık Modu:** Algoritma Frekansı satın alma maliyetlerinde $\%15$ indirim (Gözleri yakmaz!).
4. **Vicdan Azabı ve Göz Batması (Cookie Clicker Wrinklers):**
   - Gece ilerledikçe ekrana dadanan vicdan sesleri (*"Yarın Erken Kalkacaksın!"*, *"Gözlerin Kan Çanağı Oldu"*, *"Telefon Yüzüne Düşmek Üzere"*) üretimin %3'ünü emer.
   - Üzerlerine **3 kez tıklanarak "Sadece 1 Video Daha!"** denilip susturulurlar; susturulduklarında uykuyu yendiğin için emdikleri dopaminin **%120'sini iade ederler**.
5. **Gece Reels Ses Synthesizer'ı:**
   - Web Audio API ile taktil yukarı kaydırma sweep whoosh sesi, kamera deklanşör/flaş, gece bildirim çanı, sabah 06:00 kuş cıvıltıları ve fanfar eklendi.
6. **Doğrulama & Görsel Kanıt:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı.
   - Headless Chrome ile tam çözünürlüklü test yapıldı; gece neon moru/siberpunk akış arayüzü görsel olarak kanıtlandı.

---

## [2026-09-30] - Faz 4: Katman 1 Mini-Oyunları & Otomasyon Botları Yayını (v0.4.0)

### Tamamlanan Özellikler:
1. **Algoritma Laboratuvarı (*The Garden - 3×3 Trend & Ses Çaprazlama*):**
   - 2. İstasyon (Sokak Lezzetleri) açıldığında aktifleşir.
   - 5 farklı tohum formatı:
     - 🐱 *Kedi Miyavlaması:* Hızlı büyüme, hücre başına +15% pasif dopamin çarpanı.
     - 🧀 *Eritme Kaşar Cızırtısı:* Orta büyüme, hücre başına +35% pasif dopamin çarpanı.
     - 🛹 *Subway Surfers Beat:* Yavaş büyüme, hücre başına +100% Yukarı Kaydırma gücü.
     - 🗿 *Sigma Phonk:* Gece Krizleri sıklığını %50 artırır.
     - 🧠 *Saf Nöron Çürütücü (Efsanevi Mutasyon):* Kedi ve Phonk tohumları komşu olduğunda kendiliğinden mutasyona uğrar; tüm küresel dopamin üretimini +150% katlar!
   - Canlı tutma, hasat etme ve budama mekanikleri.
2. **Gece Yarısı Kriz Yönetimi (*The Grimoire / Spells - Uykusuzluk & Kafein Enerjisi*):**
   - 4. İstasyon (Subway Surfers + Reddit) ile açılır.
   - Saniyede 1.2 birim dolan dinamik 100'lük Kafein Enerji Barı.
   - 4 riskli gece kararı (Büyü):
     - ⚡ *Telefonu Hızlı Şarja Tak (30 Enerji):* Anında 1 Altın Anomali doğurur (%15 risk: Şarj kablosu temassızlık yaptı -> 15 sn %50 hız kaybı).
     - ☕ *Çift Espresso Shot (45 Enerji):* 30 sn boyunca Algoritma Frekansını 3× katlar (%10 risk: Kalp çarpıntısı -> Enerji sıfırlanır).
     - 🎧 *Gürültü Önleyici Kulaklık (35 Enerji):* Mevcut tüm Vicdan Azaplarını %150 primle anında susturur (%0 risk).
     - 🛌 *'Yarın Erken Kalkmam Gerekmiyor' Yalanı (60 Enerji):* Anında 30 dakikalık dopamin enjekte eder (%20 risk: 3 yeni Vicdan Azabı dadanır).
3. **Otomatik Kaydırma Botları (Autobuyers - Antimatter Dimensions):**
   - 1-8 İstasyon, Algoritma Frekansı, Akış Sıçraması ve Kümeler için 11 bağımsız bot.
   - Dopamin veya prestij ile açılabilir, her an tek tıkla AÇIK / KAPALI yapılabilir.
   - "Tümünü Aç / Tümünü Kapat" master kontrolü.
   - Otonom Kaydırma Çipi yükseltmesi ile işlem hızı 1.5×, 2.25×, 3.37× katlanır.
4. **Sabah 06:00 Çöküşü & Kalıcı Uykusuzluk Dükkanı (SP Upgrades):**
   - 1.79e308 Dopamine ulaşıldığında güneş doğar, evren çöker ve Uykusuzluk Puanı (SP) kazanılır.
   - SP Harcanabilir 6 Kalıcı Yükseltme:
     - 💧 *Göz Damlası:* İstasyon üretimlerini kalıcı $2\times$ katlar.
     - 🔕 *Sessize Alınmış Bildirimler:* Gece Krizi aralığını her seviye %12 kısaltır.
     - 🔌 *GaN 120W Adaptör:* Algoritma Frekansı taban bonusunu güçlendirir.
     - 🧪 *Damardan Kafein Serumu:* Yukarı Kaydırma gücüne saniyelik üretimin %5'ini ekler.
     - 🤖 *Otonom Kaydırma Çipi:* Botların hızını 1.5× artırır.
     - 🛡️ *Vicdan Uyuşturucu:* Vicdan azaplarının emişini azaltır, primini %150'ye çıkarır.
5. **Görsel Kanıt & Ekran Görüntüleri:**
   - [`brain/screenshots/v0.4.0_doomscroll_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.4.0_doomscroll_desktop.png)
   - [`brain/screenshots/v0.4.0_doomscroll_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.4.0_doomscroll_mobile.png)
   - `brain/screenshots/README.md` güncellendi.

---

## [2026-09-30] - Faz 5: OLED Cyber-Midnight UI/UX & Game Feel (Juice) Devrimi (v0.5.0)

### Tamamlanan Özellikler:
1. **OLED Cyber-Midnight Tasarım Sistemi & Glassmorphism 2.0 ([`style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css), [`index.html`](file:///c:/Users/Yigit/Documents/Incremental/index.html)):**
   - Google Fonts üzerinden Inter (400-900) ve JetBrains Mono (400-700) font aileleri eksiksiz yüklendi.
   - Derin OLED siyahı zemin sınıfları (`.glass-panel`, `.glass-panel-glow`, `.glass-panel-card`).
   - Neon bordür sınıfları (`.neon-border-purple`, `.neon-border-rose`, `.neon-border-amber`, `.neon-border-cyan`, `.neon-border-emerald`).
   - Alınabilirlik ışıltısı (`.affordance-pulse`, `.affordance-glow`), taktil basma hissi (`.btn-tactile`), ekran sarsıntısı (`.screen-shake`) ve sayıların titremesini önleyen `.tabular-nums`.
2. **Yüksek Performanslı 60 FPS Floating Juice Katmanı ([`JuiceLayer.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/JuiceLayer.vue)):**
   - Virtual DOM yükü yaratmayan, uyuyan `requestAnimationFrame` döngülü tam ekran Canvas motoru.
   - Tıklamalarda ve Space tuşunda süzülen renkli sayılar (`+1.42M Dopamin`) ve fırlayan taktil reaksiyon emojileri (❤️, 🔥, 💀, 🧠, 🤯).
   - `doomscroll:tap` ve `doomscroll:shake` olay yöneticileri.
3. **Akıllı Telefon Gece Simülasyonu & Dynamic Island ([`Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue)):**
   - Üst durum çubuğu: `02:47 AM` saati, kırmızı yanıp sönen `⚡ %3 Pil` (Düşük Güç Modu), Wi-Fi dalgası ve hücresel şebeke.
   - Merkezi Dopamin Çekirdeği: `font-mono tabular-nums` ile zıplamayan büyük neon sayaç ve üretim hızları.
   - Taktiksel Gece Duruşları: Cam kontrol merkezi widget'ları olarak yeniden tasarlandı.
   - Yukarı Kaydır, Frekans ve Tümünü Al butonlarına taktil dokunuş ve parçacık entegrasyonu.
4. **Reels Algoritma Kartları & Dopamin İlerleme Barı ([`DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue), [`DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - 8 Formata özel tematik renk ve rozet ayrımı (Kedi = Mor, Sokak Yemeği = Peynir Turuncusu, ASMR = Nane Turkuaz, Subway = Neon Yeşil, Sigma = Altın, Hint Dizisi = Kırmızı, Kriz = Kozmik Lacivert, Beyin Çürümesi = Glitch Moru).
   - Her satıra bir sonraki çarpan eşiğini gösteren dinamik 10'luk dolum barı (`7/10`) ve 10'a ulaşıldığında altın `✨ 2× KATLANDI!` ışıltısı.
   - Vicdan Azapları ve Şafak vakti panelleri canlı bento-grid yapısına kavuşturuldu.
5. **Viral Bildirimler & Süper Rezonans Başlığı ([`AnomalyOverlay.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AnomalyOverlay.vue)):**
   - Yüzen anomaliler modern mobil canlı yayın / TikTok DM kapsüllerine dönüştürüldü; tıklandığında `canvas-confetti`, ekran sarsıntısı ve dopamin fışkırması sağlandı.
   - 5,439× Kombo aktifleştiğinde ekran tepesinde nabız gibi atan alevli `HİPNOTİK REZONANS` başlığı.
6. **Ses Synthesizer Dopamin Rampası ([`audio.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/audio.ts)):**
   - Hızlı ardışık tıklamalarda kademeli yükselen frekans çarpanı (`1.0x -> 1.1x -> 1.25x -> 1.4x -> 1.6x`).
   - `playHapticTap()` mekanik dokunma tonu ve `playAffordableNotice()` kristal çan armonisi.
7. **App Kabuğu & Bildirim Rozetli Cam Dock ([`App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue)):**
   - Kapsül cam dock bar, haptik ses geçişleri, pulsing bildirim rozetleri ve derin OLED radyal atmosfer.
8. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) 0 hata ile doğrulandı (2.38s).

---

## [2026-09-30] - Faz 6: Bilişsel Yük Sadeleştirmesi & "Zero Text Fatigue" (v0.5.1)

### Tamamlanan İyileştirmeler:
1. **Kademeli Açığa Çıkarma (Progressive Disclosure) Mimarisi:**
   - Ekranda yer kaplayan ve oyuncuyu boğan uzun açıklama cümleleri, kurallar ve anlatı paragrafları doğrudan arayüzden kaldırıldı; yerel tarayıcı `title` tooltip'lerine taşındı.
2. **Kompakt ve Taranabilir D1-D8 Boyut Şeritleri ([`DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue)):**
   - Satır yüksekliği 130px'ten ~42px'e indirildi. 4 satırlık metin yığını yerine tek satırlık temiz yatay dizilim: `[Tier] İsim ×Çarpan | Miktar | 10x Mini Bar | [10: Fiyat] [Maks]`.
   - Tüm 8 boyut aynı anda ekranda kaydırma yapmadan taranabilir hale getirildi.
3. **Şafak, Sıçrama ve Küme Kartlarının Sadeleştirilmesi ([`DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - Şafak yolu tek satırlık minimal bir bar oldu (`Şafak (06:00): %0.32`).
   - Sıçrama ve Küme kartlarındaki çok satırlı paragraflar kaldırılarak sadece isim, seviye ve mini ilerleme çubuğu bırakıldı.
4. **Kompakt Dock Menüsü ([`App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue)):**
   - Sekme adları kısaltıldı (`Reels`, `Lab`, `Kriz`, `Botlar`, `Şafak`, `Rapor`), görsel yerleşim rahatlatıldı.
5. **Görsel Kanıt & Ekran Görüntüleri:**
   - [`v0.5.1_clean_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.1_clean_desktop.png) (81.6 KB - %70 daha ferah).
   - [`v0.5.1_clean_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.1_clean_mobile.png) (53.0 KB).

---

## [2026-09-30] - Bot Tıklama/Satın Alım Sesi İzolasyonu (Sessiz Botlar) (v0.5.2)

### Tamamlanan Değişiklikler:
1. **Bot Satın Alımlarının Sessizleştirilmesi ([`game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts)):**
   - `buyDimension`, `buyMaxDimension`, `buyTickspeed`, `dimensionShift` ve `buyGalaxy` fonksiyonlarına opsiyonel `playSound = true` parametresi eklendi.
   - Oyun döngüsündeki 7. aşamada (`tick()` -> autobuyers) otomatik çalışan botların tetiklediği tüm işlemler (`buyMaxDimension`, `buyTickspeed`, `dimensionShift`, `buyGalaxy`) `playSound = false` argümanı ile çağrılarak tamamen sessiz moda alındı.
   - Botların arka planda tetiklediği otomatik Sıçrama ve Küme işlemleri de kullanıcıyı rahatsız etmeyecek şekilde sessizleştirildi ve rastgele konfeti patlamaları engellendi.
2. **Kullanıcı Etkileşimi ve Taktil Geri Bildirim Korundu:**
   - Oyuncunun bizzat tıkladığı Yukarı Kaydırma (`manualClick` -> `sounds.playClick()`), İstasyon Satın Alımları, Frekans Yükseltme, Sıçrama ve Küme butonları varsayılan `playSound = true` ile tüm ses ve parçacık efektlerini eksiksiz çalmaya devam ediyor.
   - `maxAll()` optimize edilerek döngü içi ses spam'ı engellendi ve tek seferlik net bir satın alım sesi (`playBuy(1)`) ile yanıt vermesi sağlandı.
   - [`AutobuyersTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AutobuyersTab.vue) üzerinde "Tümünü Aç / Tümünü Kapat" butonuna oyuncu tıkladığında `sounds.playToggleBot()` geri bildirimi eklendi.
3. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile derlendi.

---

## [2026-09-30] - Üst Panel Buton Yerleşim Stabilitesi (Zero Layout Shift) (v0.5.2)

### Kök Neden Analizi:
1. `Header.vue` içerisindeki sağ buton grubu `flex-wrap` ve dinamik metin genişliklerine bağlıydı.
2. Tıklama gücü (`formattedClickPower`), Frekans çarpanı (`tickspeedMultiplier`) ve maliyeti (`tickspeedCost`) her alışveriş veya stance değişiminde basamak kazandığında buton genişlikleri esneyerek yanındaki butonları sağa/sola itiyordu.
3. Dopamin sayısı büyüdüğünde orta sütun sağ sütunu sıkıştırıyor, `flex-wrap` nedeniyle "Tümü" veya "Ayarlar" butonu ansızın alt satıra düşüyor; dopamin harcandığında ise tekrar yukarı fırlayarak görsel sıçrama yaratıyordu.
4. Butonların yükseklikleri eşleşmiyordu (tek satır vs. çift satır).

### Uygulanan Çözümler:
1. **Dopamin Çekirdeği ve Denetim Çubuğunun İki Kademeli Ayrımı ([`Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue)):**
   - Dopamin sayacı (`122.83 B`) ve saniye başına üretim göstergesi, butonlarla aynı yatay satıra sıkıştırılmak yerine bağımsız merkezi bir satıra (`flex flex-col items-center justify-center my-3`) alındı. Sayı ne kadar büyürse büyüsün (`122.83 B`, `1.79e308`) sağında ve solunda buton olmadığı için butonların üzerine binmesi (overlap) imkansız hale getirildi.
   - Doğrudan altına zarif bir ayırıcı çizgi (`border-t border-white/[0.05] pt-3`) ile dengeli bir kontrol şeridi yerleştirildi: Sol tarafta Stance modları (`Yorgan (2×) | Çılgın (4×) | Karanlık`), sağ tarafta ise Aksiyon butonları (`Kaydır | Hz | TÜMÜ | Ayarlar`).
2. **Kaya Gibi Sağlam Buton Mimarisi:**
   - Buton grubuna `flex-nowrap` ve `shrink-0` verildi; kesinlikle alt satıra kırılma veya sıkışma yapmaz.
   - Tüm butonlara (Kaydır, Hz, Tümü, Ayarlar) eşit `h-11` (44px) sabit yükseklik verildi.
   - Tüm butonlar 2 kademeli sabit hiyerarşiye kavuşturuldu (Üstte kalın başlık, altta `tabular-nums truncate` alt etiket).
   - Butonlara `min-w-[85px]`, `min-w-[78px]`, `min-w-[65px]`, `w-10 sm:w-11` gibi sabit alt genişlikler atanarak basamak artışlarında titreme ve yan butonları itme sorunu tamamen giderildi.
3. **Görsel Doğrulama & Kanıt:**
   - [`v0.5.2_header_stable_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.2_header_stable_desktop.png) (82.4 KB)
   - [`v0.5.2_header_stable_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.2_header_stable_mobile.png) (53.6 KB)
   - `npm run build` ile sıfır hata doğrulandı.





---

## [2026-10-01] - Doomscroll Tema Arındırma & Kalıntı Temizliği (v0.6.1)

### Kök Neden Analizi:
Projenin ilk geliştirme aşamasındaki prototiplerden (ofis/troll/sosyal medya ajansı) ve ilham kaynağı oyunlardan (Antimatter Dimensions, Cookie Clicker The Grimoire/The Garden, Quantum Horizon) kalan yabancı rozetler, değişkenler, ses metodları, yorumlar ve kayıt anahtarları mevcuttu.

### Uygulanan Çözümler:
1. **Arayüz (UI) Rozetleri & Metin Düzenlemeleri:**
   - [`AutobuyersTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/AutobuyersTab.vue): `badge="Antimatter Dimensions"` rozeti `badge="Otonom Algoritma"` olarak güncellendi.
   - [`CrisisTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/CrisisTab.vue): `badge="The Grimoire"` rozeti `badge="Gece Kararları"` olarak güncellendi, büyü ifadeleri kaldırıldı.
   - [`LabTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/LabTab.vue): `badge="The Garden"` rozeti `badge="Viral Laboratuvar"` olarak güncellendi.
   - [`StatsTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/StatsTab.vue): `Gece Kriz Kararları (Büyüler)` ifadesinden `(Büyüler)` temizlendi.
   - [`achievements.ts`](file:///data/data/com.termux/files/home/incremental/src/game/achievements.ts): Büyü, büyücü (`🧙`), sera gibi kalıntı başarım ad ve açıklamaları gece kararları ve trend format küratörlüğüne dönüştürüldü.
2. **Model, Tip ve Değişken İyileştirmeleri:**
   - [`types.ts`](file:///data/data/com.termux/files/home/incremental/src/models/types.ts): `InternetTroll` tipi `GuiltWrinkler` ile değiştirildi, geriye dönük tip alias'ı bırakıldı.
   - `leechedLikes` alanı `leechedDopamine` olarak refactor edildi.
   - `PlayerStats` ve `SerializedPlayerState` yorumlarındaki eski kavramlar (Kalp Atma, Beğeni, Mavi Tik, Troller, Likes) temizlenerek Doomscroll terminolojisine kavuşturuldu.
3. **Kayıt Sistemi (Save) ve Geriye Dönük Uyumluluk:**
   - [`save.ts`](file:///data/data/com.termux/files/home/incremental/src/core/save.ts): Anahtar `DOOMSCROLL_SAVE_V1` yapıldı; mevcut oyuncuların ilerlemesini korumak için `QUANTUM_HORIZON_SAVE_V1` fallback desteği eklendi.
   - [`stores/game.ts`](file:///data/data/com.termux/files/home/incremental/src/stores/game.ts): `serialize` ve `deserialize` çift taraflı geriye dönük uyumluluk (`leechedDopamine` || `leechedKpi`) ile korundu.
4. **Ses Motoru:**
   - [`audio.ts`](file:///data/data/com.termux/files/home/incremental/src/core/audio.ts): `playFireWorker` $\to$ `playSilenceGuilt()`, `playSlackerClick` $\to$ `playGuiltClick()`, `playCastSpell` $\to$ `playCrisisDecision()` eklendi ve geriye uyumluluk alias'ları korundu.
5. **Paket ve Direktif Tanımları:**
   - [`package.json`](file:///data/data/com.termux/files/home/incremental/package.json): `"name": "doomscroll-endless-reels"`.
   - [`AGENTS.md`](file:///data/data/com.termux/files/home/incremental/AGENTS.md): "Doomscroll: The Endless Reels" direktif başlığı ile hizalandı.
6. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı (6.37s).

---

## [2026-10-01] - Nöral Ağaç (Neural Tree) + Combo Serisi (v0.7.0)

### Neden Analizi:
Düz SP dükkânı seçim yaratmıyordu; aktif (tıklama) oyun geç oyunda anlamsuzlaşıyordu (tıklama ≈ üretimin %2.5'i). Kullanıcı talebi: Cookie Clicker'ın Heavenly ağacı + Realm Grinder tarikat seçimi + tıklama dalı gibi farklı oynanış build'leri. Araştırma: `brain/research/economy-balancing-research.md` (aktif oyuncu idle'dan zayıf kalıyor), Realm Grinder/Synergism/Cookie Clicker web araştırması. Karar: `brain/decisions/0012-neural-tree.md`.

### Uygulanan Adımlar:
1. **Tip ve State:**
   - [`types.ts`](src/models/types.ts): `NeuralBranch`, `NeuralNode`, `NeuralEffects` tipleri; state'e `neuralNodesBought: Record<string, number>` ve `clickCombo: { count, lastClickAt }` eklendi.
2. **Ağaç Verisi ve Efekt Entegrasyonu:**
   - [`stores/game.ts`](src/stores/game.ts): `NEURAL_TREE` (22 düğüm: kök + Uyku/Başparmak dalları + hibrit köprüler + 2 ikili `choiceGroup` seçim çifti); `computeNeuralEffects()` toplayıcısı; üretim, tıklama gücü, bot frekansı, koloni üreme hızı, offline kazanç ve SP kazanç çarpanlarına bağlandı.
   - CPS-to-click senkronu: sabit %2 → `min(0.08, 0.02 + 0.015×seviye)` (max %8).
   - `buyNeuralNode(id)` action'ı: SP, öncül zinciri ve choiceGroup hariç kilidi doğrular; `singularityReset` seçim düğümlerini serbest bırakır.
   - Eski `SINGULARITY_UPGRADES` id'leri (eye_drops vb.) ağaç düğümleriyle senkron: her iki satın alma yolu paylaşımlı `singularityUpgrades` seviyesini günceller.
3. **Combo (Hipnotik Seri) Mekaniği:**
   - `manualClick` 1500 ms pencere içinde seriyi büyütür; `update()` tick'inde sessizlikte söner. `COMBO_THRESHOLDS` ×2 (5 tık) / ×3 (15) / ×5 (40); sadece `combo_unlock` düğümü alınmışsa aktif.
4. **Save Migration:**
   - `serialize`/`deserialize` sürüm 8 → 9: `neuralNodesBought` + `clickCombo` alanları; düğüm id doğrulama ve eski dükkân seviyelerinin ağaca backfill'i (`NEURAL_LEGACY_UPGRADE_IDS`). Eski save'ler değişmeden yüklenir.
5. **UI:**
   - [`NeuralTreeTab.vue`](src/components/NeuralTreeTab.vue) (yeni): Cookie Clicker tarzı öncüllü ağaç — tam bilgi yalnızca tüm ebeveynler alınınca görünür, "???" slotu kısmen kilitli, amber (alınabilir) / zümrüt (maks) durumları, SEÇİM kilit ipucu, `Seviye X/Y` tekrarlanabilir düğümler, dal renk açıklaması.
   - [`SingularityTab.vue`](src/components/SingularityTab.vue): düz SP dükkânı grid'i ağaç paneliyle değiştirildi (TabHero ve çöküş butonu korundu).
   - [`Header.vue`](src/components/Header.vue): Kaydır butonu yanında combo rozeti (×N + rAF tabanlı 1.5 sn geri sayım çubuğu; serisizken CPU kullanımı sıfır).
   - [`AdminPanel.vue`](src/components/AdminPanel.vue): "Nöral Ağaç" debug bölümü (maxNeuralTree / resetNeuralTree / grantNeuralNode).
6. **Dokümantasyon:**
   - `brain/decisions/0012-neural-tree.md` (ADR) ve `GAME_DESIGN.md` 7.1 "Nöral Ağaç" bölümü eklendi.
7. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır TypeScript hatası ile tamamlandı (çekirdek faz 6.82s, UI fazı ve son kontrol dahil).

---

## [2026-10-06] - Kozmik Kütle Eşdeğerliği, Olay Ufku ve Zaman Paradoksu (S-Tier StatsTab Dönüşümü) (v0.30.0)

### Kök Neden Analizi:
- `StatsTab.vue`'daki "Fiziksel Kütle Çekim Mesafesi" bölümü, eski prototipten kalan dünyevi bir başparmak metriğiydi (`clicks * 0.05` m, Galata/Eyfel/Everest kıyaslamaları).
- Oyunun teması olan $10^{-24}\text{ g}$'dan $1.79 \times 10^{308}\text{ g}$'a uzanan evrensel kütle açlığı ve kuantum-kozmik tekillik konseptiyle uyuşmuyordu.
- Ayrıca saf basamak yazma hesabı ($10^{308}$ için 309 basamak = 103 saniye) tek başına sunulduğunda anti-klimaks yaratabilirdi.

### Uygulanan Çözümler:
1. **Yeni Çekirdek Motor ([`src/core/cosmic-scale.ts`](file:///data/data/com.termux/files/home/incremental/src/core/cosmic-scale.ts)):**
   - **Kozmik Av Merdiveni (Tasty Planet Modeli):** 18 kademeli gerçek kütle skalası (Su damlası $0.05\text{ g}$ $\to$ Ataş $\to$ Elma $\to$ İnsan $\to$ Piramit $\to$ Okyanus $\to$ Ay $\to$ Dünya $\to$ Jüpiter $\to$ Güneş $\to$ Sagittarius A* $\to$ TON 618 $\to$ Samanyolu $\to$ Gözlemlenebilir Evren $\to$ Multiverse $10^{70}\text{ g}$). Canlı çarpan, logaritmik ilerleme çubuğu ve lore açıklaması.
   - **Schwarzschild Olay Ufku ($R_s = \frac{2GM}{c^2}$):** Yutulan kütlenin oluşturduğu karadeliğin gerçek astrofiziksel çapı (Sub-attometre kuantum köpüğünden $\to$ Fındık/Bilye $\to$ Futbol Topu $\to$ Şehir $\to$ Işık Yılı hiper-tekilliğine).
   - **Çifte Zaman Paradoksu (Antimatter Dimensions Modeli):** Hem saniyede 3 basamakla elle yazma süresi, hem kütleyi saniyede 1 gram tek tek sayma süresi ($10^{290}$ × Evrenin Yaşı), hem de 10 punto kağıt şeridi uzunluğu hesabı.
2. **Store Entegrasyonu ([`src/stores/game.ts`](file:///data/data/com.termux/files/home/incremental/src/stores/game.ts)):**
   - `biometrics` getter'ı `cosmicPrey`, `eventHorizon` ve `writingParadox` hesaplamalarıyla zenginleştirildi; geriye dönük alanlar tam korundu.
3. **Kullanıcı Arayüzü ([`src/components/StatsTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/StatsTab.vue)):**
   - Eski dünyevi kart kaldırılarak yerine 3 modlu interaktif Cyberpunk/Bento kart eklendi:
     - `[ 🪐 Kozmik Avlar ]`
     - `[ 🌀 Olay Ufku Çapı ]`
     - `[ ⏱️ Zaman Paradoksu ]`
   - `copyReport()` paylaşım metni yeni telemetri verileriyle (`Kütle Eşdeğeri`, `Olay Ufku Çapı`, `Kütleyi Yazma Süresi`) güncellendi.
4. **Birim Testleri ([`src/core/cosmic-scale.test.ts`](file:///data/data/com.termux/files/home/incremental/src/core/cosmic-scale.test.ts)):**
   - 11 kapsamlı birim testi eklendi; sınır değerleri, formüller ve NaN/sıfır korumaları doğrulandı (176/176 test yeşil).
5. **Doğrulama:**
   - `npm test -- --run` $\to$ 176/176 test geçti.
   - `npm run build` $\to$ Sıfır TypeScript hatası ile başarılı derleme kanıtlandı.
- **[2026-10-06 Düzeltme & Sadeleştirme]**: Kullanıcı geri bildirimi doğrultusunda 3 modlu widget yapısı kaldırıldı; *Antimatter Dimensions* tarzı tekil, sade ve ferah bir telemetri kartına dönüştürüldü. Basamak yazma süresi ve kütle eşdeğerliği doğrudan tek kartta sunuldu.

---

## [2026-10-06] - Ölçek Sıçraması ve Kozmik Galaksi Matematiği Denetimi ve Pürüzsüzleştirme (v0.30.1)

### Kök Neden Analizi:
1. **Süreksizlik (Discontinuity):** `shiftRequirement` içinde `dimensionShifts = 5` iken istenen taban miktar 25 D8 idi; ancak 6. sıçramaya geçildiğinde (`dimensionShifts >= 6`) formül `22 + 16 * (shifts - 6)` olduğundan gereksinim geçici olarak 22 D8'e düşüyordu (25 -> 22 gerilemesi).
2. **Terminoloji Çakışması:** `DimensionsTab.vue` içindeki Galaksi kartının başlığı "Kozmik Çöküş", butonu "Çöküş Yap" olarak etiketlenmişti. Oysa oyunun asıl prestiji $1.79e308 g eşiğindeki Tekillik Çöküşü (Cosmic Collapse / Big Crunch) idi. İki mekanizmanın aynı ismi paylaşması kavram kargaşası yaratıyordu.
3. **UI Bildirimi Yanıltıcılığı:** Galaksi satın alımında ekranda çıkan `-%X FREKANS MALİYETİ` bildirimi, kodun gerçek mekanizmasıyla çelişiyordu. Kodda galaksiler maliyeti indirmiyor; `tickspeedMultiplier` taban hız çarpanını üssel olarak katlıyordu.

### Uygulanan Çözümler:
1. **Matematiksel Merdiven Pürüzsüzleştirme ([`src/stores/game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts)):**
   - 6+ sıçramalar için taban `22` yerine `26` olarak güncellendi (`26 + 16 * (state.dimensionShifts - 6)`).
   - Böylece D8 gereksinimi monoton artan (monotonically increasing) bir diziye dönüştürüldü: Shift 5 (25 D8) -> Shift 6 (26 D8) -> Shift 7 (42 D8) -> Shift 8 (58 D8).
2. **Terminoloji ve Arayüz Netliği ([`src/components/DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - Boyutlar sekmesindeki Galaksi kartı **"Kozmik Küme"** olarak yeniden adlandırıldı.
   - Buton metni **"Küme Yarat"** olarak güncellendi.
   - Böylece $1.79e308 g Tekillik Çöküşü ile olan kavram kargaşası bütünüyle giderildi.
3. **Doğrulanmış Macro-Surge ve Telemetri Metinleri ([`src/stores/game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts)):**
   - Sıçrama bildirimi `ÖLÇEK SIÇRAMASI #X` olarak senkronize edildi.
   - Galaksi bildirimi `KOZMİK GALAKSİ KÜMESİ #X` ve gerçek çarpan etkisi olan `×X.XX TABAN FREKANS GÜCÜ` olarak düzeltildi.
   - Telemetri satırı "Kozmik Galaksi Kümeleri (Güçlendirilmiş Frekans İvmesi)" olarak güncellendi.
4. **Birim Testleri ve Doğrulama ([`src/stores/balance.test.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/balance.test.ts)):**
   - Taban 26 ve D5 pasifi sonrası 25 adet D8 testleri güncellendi; monoton artış assertion'ı eklendi.
   - `npx vitest run` -> 188/188 test yeşil.
   - `npm run build` -> Sıfır hata ile production paketi derlendi.

---

## [2026-10-06] - Kozmik Parazit Kartı Otomatik Açılma (Auto-Expand on Spawn) (v0.30.2)

### Kök Neden Analizi:
- `DimensionsTab.vue` içinde parazit (slacker) kartı `slackersOpen = ref(false)` ile varsayılan olarak kapalı başlıyordu.
- Parazit geldiğinde dahi panel kapalı kaldığından oyuncu paraziti yok etmek için önce başlığa tıklayıp açmak zorunda kalıyordu; bu durum taktil hızı kesiyor ve sürtünme yaratıyordu.

### Uygulanan Çözüm:
1. **Reaktif Başlangıç ve İzleyici ([`src/components/DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - Panel başlangıç durumu `slackersOpen = ref(store.slackers.length > 0)` olarak bağlandı (parazit varsa doğrudan açık başlar).
   - `watch(() => store.slackers.length)` izleyicisi eklendi: Yeni bir parazit doğduğunda (`newCount > 0 && newCount > oldCount`), kullanıcı daha önce paneli kapatmış olsa dahi panel **otomatik olarak açık (`slackersOpen.value = true`)** konuma geçer.
2. **Playwright Canlı Tarayıcı Doğrulaması:**
   - Sayfa canlı geliştirme ortamında açıldı; test paraziti enjekte edildiğinde butonun DOM'da anında görünür (`visible: true`, `rect.width: 310px`) olduğu ve kullanıcının elle açmasına gerek kalmadığı somut olarak kanıtlandı.
3. **Doğrulama:**
   - `npx vitest run` $\to$ 188/188 test yeşil.
   - `npm run build` $\to$ 0 hata, başarılı derleme.

---

## [2026-10-10] - 02:47 AM Lo-Fi Chill Radyosu: Auto-DJ Set Yapısı (v0.38.1)

### Araştırma Temelli Kök Neden Analizi:
Oyun içi lo-fi radyosu (`src/core/music/tracks/lofi-chill.ts`) teknik altyapısı sağlamdı (Rhodes fiziksel modellemesi, tape wow, vinil cızırtısı) ancak internet araştırması (Soundfly "Three Examples of Dilla Swing", Dan Charnas "Dilla Time" analizleri, Richar Pryn "How to Structure Lofi Music", lo-fi chord voicing rehberleri) ve uzman değerlendirmesi 5 kritik eksik ortaya çıkardı:
1. **Dilla zamanlaması tersydi:** kick erken (-6ms), snare geç (+10ms) çalıyordu. Dilla hissinin kalbinde kick'lerin laid-back (geç), snare'ların ahead (erken) gelmesi gerekir.
2. **Swing %17 ile çok hafifti:** MPC "%66 sweet spot" ≈ 0.30 swing; mevcut his "yarım kalmış" sallantı.
3. **Radyo/DJ akışı yoktu:** 6 caz bankası vardı ama parça geçişleri keskindi; intro, beat girişi ve plak dönüşü geçişleri yoktu.
4. **Yapı 4 cycle'da sabitti:** Standart → Ritmik → Zirve → Breakdown döngüsü uzun oynanışta monotonlaşıyordu.
5. **Register ve motif tutarsızlığı:** Bank 4 (Paper Cranes) akorları orta register dışına çıkıyordu; 6 bankanın hepsi aynı call-response melodisini çalıyordu.

### Uygulanan Çözüm:
1. **Auto-DJ Set Yapısı ([`src/core/music/tracks/lofi-chill.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/music/tracks/lofi-chill.ts) — tam yeniden yazım):**
   - 8 bölümlü "radyo seti": INTRO (plak düştü, sadece Rhodes) → BEAT IN → GROOVE (yürüyen bas) → PEAK (Nujabes tarzı üst oktav parıltıları) → BREAKDOWN (gece boşluğu) → SECOND HALF → LATE GROOVE → VINYL RESET (plak yavaşlaması → iğne tıkırtısı → sonraki parça).
   - Her "parça" artık 8 loop (~100 sn) sürüyor ve 6 caz bankası arasında tam bir set turu yapıyor; `npm run dev` sonrası set en baştan (intro) başlıyor.
   - Her bankaya kendi 4 ölçümlük melodik motifi atandı (6 farklı motif); Bank 4 akorları orta register'a (F3-C5) çekildi ve seslendirme hataları (C5 → B4, E7b9 düzeltmesi) giderildi.
   - Strum'a "tembel üçüncü nota" (30ms gecikmeli vuruş) eklendi — Dilla'nın uyuyan elleri.
2. **Yeni radyo geçiş efektleri ([`src/core/music/instruments/drums.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/music/instruments/drums.ts)):**
   - `playTapeStopSweep`: 6.2kHz → 240Hz filtreli gürültü süpürmesi + 420→60Hz mekanik uğultu (bant/plak durması).
   - `playVinylClick`: iğne bırakma tıkırtısı (parça açılışı ve kapanışı).
3. **Dilla zamanlaması ve mix düzeltmeleri ([`src/core/music/index.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/music/index.ts)):**
   - `kickTime` +12ms (laid-back), `snareTime` -9ms (ahead) — kaynak: Soundfly Ian Chang / "Dilla Time".
   - Lo-Fi swing 0.17 → 0.30 (MPC %66 sweet spot).
   - Sidechain ducking 0.58 → 0.74 (nazik 2-3 dB pompa — lo-fi mixing rehberleri).
4. **Analog karakter ([`src/core/music/audio-graph.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/music/audio-graph.ts)):**
   - Kaset bandı "tape hiss" yatağı (3.6kHz band-pass, çok ince seviye).
   - Reverb bus'una 25ms pre-delay: direkt çağışlar net, kuyruk arkadan gelir.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) → 0 hata, production paketi derlendi.
- Ses kontrollü test tarifi: müzik açıkken intro (davulsuz) → ~13 sn sonra beat girişi → zirve → çöküş → son bölümde plak yavaşlaması (perde çöküşü) ve yeni parçaya geçiş duyulmalı.

---
## 2026-10-15 — Görsel Dil Geçişi (Yazı → Renk/Görsel) — `dfa4dce`

**Problem:** UI yazı/tooltip ağırlıklıydı (44+ v-tip); AD/Cookie Clicker tarzı renk, glif, çubuk ve ritimle anlatım eksikti.

**Yapılanlar:**
1. **Rezerve Renk Sözleşmesi (A):** `dimension_identity.ts`'e D1-D8 özgün dizgi glifi (ϱ ϵ Ω χ Ξ ⊕ ✶ ◉) + accent kanalı; `style.css`'e `--ds-prestige/locked/bonus/danger` rezervleri + üç durumlu uygunluk rampası (`.ds-ramp-locked/partial/ready`) + `.dim-glyph` (tabular, jitter yok).
2. **Metni görsele çevirme (B):** DimensionRow'da rozette AD-tarzı glif (D n ünitesi silindi), butonda üç durumlu ramp, akışta ↑ yön oku.
3. **Nav renk-lengüajı (D):** Sol kenarlık rengi = ikon rengi (purple/emerald/cyan/blue/violet/amber/rose); aktifte ikon+yazı, pasifte sade ikon + 2px üst çizgi (`navClass`/`navLabelClass`).
4. **Header combo rampası (C):** Rozet rose→cyan rampaya bağlandı (bonus durumu; amber/rose rezerve).
5. **Motion 3-state (E):** `motionMode: full|reduced|off` (type+state), kök `.motion-off`, ayarlarda 3 durumlu segment; `reduceAnimations` geriye uyumlu senkron.
6. **Juice altyapısı:** `.juice-punch` (140ms impuls+decay), `.juice-bloom`, `.rise-float` keyframe'leri.

**Doğrulama:** `vue-tsc --noEmit` 0 hata; `vite build` ✓ 12.93s.

**Not:** Subagent spawn'ları `Unauthorized` hatası verdiği için Dalga 2-3 doğrudan ana ajanca yapıldı; Dalga 1 agent'ı kapsam aşımı yapıp App/Header/useNavigation'ı yarım bırakmıştı, tamamlandı.

**Kalanlar (sonraki faz):** F — Prestige ritüeli (iki ekran kuralı, sıfırlama anı); B — DimensionsTab shift/galaxy bar metin sadeleştirmesi; v-tip sayısının azaltılması (Header 14→daha az).

---
## 2026-10-15 — Balatro Sütun 3: Taktil Kart Fiziği — Spring Damping & Push Dynamics (ADR-0057)

**Problem:** Yol haritasının son taktil sütunu uygulanmamıştı. `v-tilt` ayar değişimini canlı izlemiyor, dokunmatikte kaydırma jank'ı üretiyor ve oyun içi `motionMode` kontratına bağlı değildi. Bas-bırak geri bildirimi yoktu: `buy-bounce` v-hold spam'inde her 100ms yeniden başlayıp titriyordu; komşu kartların satın almada açılması (push dynamics) hiç yoktu.

**Çözüm:**
1. **`src/core/card-physics.ts` (yeni saf çekirdek):** `pushDirectionFor()` (D1-D8 sınır korumalı komşu yönü) + `isPressFeedbackFresh()` (300ms pencere) + süre sabitleri; `card-physics.test.ts` ile pinlendi. Sınır testi, tier 0/9'un yanlışlıkla komşu sayılmasını yakalattı ve koruma eklendi.
2. **`core/tilt.ts` sertleştirme:** `updated` kancası (canlı disabled), `pointerType === 'touch'` koruması, yay bırakışı (`cubic-bezier(0.34, 1.56, 0.64, 1)` / 500ms), `motionBlocked()` ile `.reduce-anim` / `.motion-off` + OS tercihi etkileşim anında okunur; hover sırasında kısıt gelirse tilt anında geri oturur.
3. **`DimensionRow.vue`:** Yeni `.card-physics-shell` sarmalayıcı katmanı (inline tilt transform'u ile sınıf transform'ları çakışmaz): pointerdown → squash `scale3d(1.04, 0.92, 1)`; bırakınca 420ms spring release; pencere seviyesi `pointerup` güvenlik ağı (buton basılıyken disabled olursa takılı kalmaz). `doomscroll:dimension-buy` CustomEvent ile ±1 tier komşular 2.5px / 240ms açılır — yalnız tek tık alımlarında (hold-spam'de titreşimsiz). Bas-bırak penceresi tazeyken eski `buy-bounce` bastırılır; klavye aktivasyonunda bounce korunur.
4. **`style.css`:** `.card-squash` / `.card-released` / `.card-push-up/down` keyframe'leri + OS `prefers-reduced-motion` kapsamı.

**Doğrulama:**
- `npm test`: **18 dosya, 263/263 test yeşil** (4 yeni test).
- `npm run typecheck`: 0 hata. `npm run build`: 1782 modül, 0 hata.
- `npm run harness:smoke`: 30 dk aktif koşu log10=90.72, 8 shift — ADR-0056 tabanıyla birebir aynı (denge regresyonu yok).
- ADR: `brain/decisions/0057-balatro-column3-card-physics.md`.
- Ortam notu: Termux `node_modules/.bin` shebang'leri `termux-fix-shebang` ile düzeltildi (temiz kurulum sonrası tekrarlanabilir).

---
## 2026-10-15 — Görsel Dil Yayılımı: Tüm Proje (Rezerve Renk, 3-State Ramp, Metin→Görsel, Motion Kapısı) — ADR-0058

**Problem:** `dfa4dce` görsel dili yalnız `DimensionRow` + nav + ayarlarda konuşuyordu. Denetim (4 paralel subagent): 24 satın alma yüzeyi ikili durumda, 46 dosyada 147 renk sapması, 19 metin-oran çubuksuz, ~30 konfeti çağrısı motion kapısız, legacy kayıtta `motionMode` migrasyonu yok, `CommentTicker` kısıtlı harekette sonsuz `animationend` zinciri riski taşıyordu.

**Çözüm (Dalga 1-4, subagent'lı):**
1. **Sözleşme:** `brain/research/visual-language-adoption-spec-2026-10.md` (5 kural + acceptance) — uygulama ve QA tek gerçeğe karşı koştu; brief `brain/scratchpad/visual-language-wave2-brief.md`.
2. **Paylaşılan altyapı (orchestrator):** `src/composables/useMotion.ts` (yeni: `useMotionMode` reaktif + `isMotionOff`/`isMotionReduced` kök-sınıf mührü); `core/celebrate.ts` `safeConfetti` motion kapısı (`force` ritüel opsiyonu); `actions-save.ts` legacy `motionMode` migrasyonu (`reduceAnimations:true → 'reduced'` — HEAD taban çizgisiyle aynı; her yazımda çift alan senkronu); `style.css` `.ds-badge-slate`, `.btn-primary-violet`, `.crisis-aura-cyan`, `rise-float` düzeltmesi.
3. **Uygulama (5 paralel subagent, dosya sahipliği bölüşülmüş):** Tüm satın alma yüzeylerinde ready/partial/locked ramp (ready = kimlik hue + pulse; `ds-ramp-ready` DOM'a yazılmaz); rezerve renk sözleşmesi tüm sekmelerde (amber=milestone, cyan=bonus, rose=tehlike, kimlik hue'ları korunur); 19+ oran göstergesi `progress-track` çubuğa; Header duruş çipleri + NeuralTree etkileri görünür karşılık kazandı (tooltip additive kaldı, bilgi kaybı yok); `CommentTicker` statik mod (marquee hiç başlamaz, 9s JS rotasyon, gizli sekmede duraklar); tüm pointerdown geri bildirimleri `juice-punch` + motion kapılı.
4. **Bağımsız QA (ayrı subagent):** İlk tur CONDITIONAL PASS → fix dalgası: sponsor ekran aurası amber→cyan (`.crisis-aura-cyan`), plaket filtre çipi nötr-parlak (`bg-white/[0.10] border-white/25 text-white`), 3 ölü `ds-ramp-ready` dönüşü `""` (ready şablon dalında). Doğrulama turu: **FINAL QA VERDICT: PASS**.

**Doğrulama:**
- `npm test`: **18 dosya, 263/263 test yeşil** (baseline birebir).
- `npm run build` (`vue-tsc && vite build`): 1783 modül, 0 hata.
- `npm run harness:smoke`: 30 dk aktif koşu **log10=90.72, 8 shift** — ADR-0056/0057 tabanıyla birebir (denge regresyonu yok).
- ADR: `brain/decisions/0058-visual-language-adoption.md`.
- Kapsam: 58 dosya değişti + 3 yeni (`useMotion.ts`, sözleşme, brief).

**Kalanlar (kapsam dışı bırakılanlar):** F — Prestige ritüeli (iki ekran kuralı) ayrı iş; bloklamayan NIT'ler ADR-0058 §4'te listeli (`progress-track-lg` tanımsız sınıfı önceden beri var; kök-sınıf mührü setup okumaları savunma amaçlı).
