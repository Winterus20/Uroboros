# A4 — Katman Mimarisi (L0–L4) + Hareket/Juice Kapıları Denetimi

- **Tarih:** 2026-10-18
- **Kapsam:** L0–L4 z-index haritası, `useMotion` tek-kapı disiplini, motion kapılarının kapsaması, juice bütçesi (pointerdown ≤100 ms / timestamp-driven / emisyon cap), partikül disiplini, wobble/squish/spring kullanımı, canvas sayısı ve GPU maliyeti.
- **Yöntem:** Salt-okunur kod denetimi. `src/` altında hiçbir dosya değiştirilmedi; build/test çalıştırılmadı.
- **Sözleşme tabanı:** `brain/context/visual-language.md` §1/§3/§4/§9.1/§9.4 · ADR-0044 · ADR-0049 · ADR-0057 · ADR-0058 · ADR-0060 · ADR-0061 §2.3–2.5 · ADR-0062 · plan §3 (M1–M4) / §4 (Faz A) / §7 (Faz D).
- **Ölçülen hacim:** `style.css` 2049 satır · 18 dosya `useMotion` tüketicisi · 52 bileşen · 2 tam ekran canvas.

---

## 0. Özet sayılar

| Ölçüm | Değer | Kanıt |
| :--- | :--- | :--- |
| Bulgu toplam | **19** (KRİTİK 1 · YÜKSEK 4 · ORTA 8 · DÜŞÜK 6) | §3 |
| Katman sınıfı (`.layer-*`) tanımı | 7 (crt/motif/anomaly/clock/juice/toast/modal) | `style.css:495-501` |
| `.layer-*` fiilen tüketen bileşen | 6/7 — `.layer-crt` **0 tüketici** | §1 |
| Çıplak (sınıfsız) `z-*` kullanımı | 27 eşleşme, 19'u katman kararı | §1 |
| `useMotion` tüketen dosya | **18** | §2 |
| `useMotion` dışı doğrudan `matchMedia` (hareket) | **3** dosya | §2 |
| OS-listesinde olmayan sonsuz animasyon sınıfı | **8** (panic-pulse, flame-sub, cyber-heart, starburst, ekg, animate-ping, animate-bounce, animate-spin) | §2.3 |
| Ölü CSS seçici | **13** (+7 ölü `@keyframes`) | B16 |
| Ölü CSS token beyanı | **12** (`--crt-intensity` ×6 + `--glitch-intensity` ×6) | B6 |
| Ölü ayar | 1 (`crtEffect`) | B1 |
| Tanımsız utility sınıfı kullanımı | 7 kullanım / 0 tanım (`animate-fade-in`) | B15 |

---

## 1. Z-INDEX HARİTASI (L0–L4)

Sözleşme §3 katmanları: **L0 Panel Dünyası · L1 CRT · L2 Substrat · L3 Motif Bandı · L4 Olay Şöleni**. Tek-kaynak harita: `style.css:486-501`.

### 1.1 Tek kaynak katman sınıfları

| Sınıf | z | Sözleşme katmanı | Tüketici | Durum |
| :--- | ---: | :--- | :--- | :--- |
| `.layer-crt` | 40 | L1 CRT | **yok** | **ÖLÜ** — `style.css:521` `display:none !important` |
| `.layer-motif` | 45 | L3 Motif | `MotifBand.vue:51` | OK |
| `.layer-anomaly` | 50 | L4 öncesi | `AnomalyOverlay.vue:178` | OK |
| `.layer-clock` | 55 | (ADR-0068) | `TimeClockOverlay.vue:338` | OK |
| `.layer-juice` | 60 | L4 Şölen | `JuiceLayer.vue:849` | OK |
| `.layer-toast` | 70 | Toast | `AchievementToast.vue:49` (+ `z-50` çifti) | OK / çift beyan |
| `.layer-modal` | 80 | Modal | `ConfirmModal.vue:38`, `WelcomeBackModal.vue:52`, `AdminPanel.vue:416`, `SettingsModal.vue:144` (+ `z-50`) | OK / çift beyan |

### 1.2 Envanter (tüm z değerleri)

| z | Kaynak (dosya:satır) | Rol | Verdict |
| ---: | :--- | :--- | :--- |
| 0 | `AlgorithmicSwirl.vue:501` `... z-0 ...` | L0 girdap | OK (hardcoded) |
| 1 | `style.css:1436` `.edition-holo::before z-index: 1` | kart-içi | OK (yerel, katman değil) |
| 10 | `App.vue:208` `id="game-main-content" ... z-10` | içerik | OK |
| 10/20 | `CommentTicker.vue:394-401`, `AchievementsTab.vue:137`, `DimensionRow.vue:468-472`, `TabHero.vue:35/55`, `CounterDisplay.vue:195`, `ViralGrid.vue:240/263` | içerik-içi | OK |
| 30 | `ScreenOverlay.vue:94`; `App.vue:266` `max-md:z-30` (dock); `FloatingThumbBar.vue:105` | vinyet/dock | OK (hardcoded) |
| 40 | `.layer-crt` | L1 | **ÖLÜ** |
| 45 | `SideSnapHands.vue:93` `z-index: 45` (scoped) | L3 ailesi | OK değer / ikinci kaynak |
| 50 | `HeartBurstLayer.vue:143`, `SequentialStrikeLayer.vue:154` `z-50` | strike/heart | OK değer / ikinci kaynak |
| 50 | **`AuthModal.vue:138`, `CloudConflictModal.vue:56`, `LabTab.vue:398` `z-50`** | modal | **HATALI — 80 olmalı** |
| 55 | `.layer-clock` | saat | OK |
| 60 | `.layer-juice` | L4 | OK |
| 70 | `.layer-toast` | toast | OK |
| 80 | `.layer-modal` | modal | OK |
| 9999 | **0 referans** | (eski tooltip) | Temiz — ADR-0061 §2.4 haritasındaki "9999 tooltip" artık **stale** |

**Sık kaçağı:** `z-[9999]` / `z-[100]` gibi keyfi değer **yok** (0 eşleşme). Kaçak `z-50` biçimindedir (B2).

### 1.3 Katman sırası doğrulaması

- L0→L4 dikey sırası **tutarlı**: 0 < 10 < 30 < 40 < 45 < 50 < 55 < 60 < 70 < 80.
- `SideSnapHands` (45) ve `MotifBand` (45) **aynı katmanda**; App.vue DOM sırası MotifBand'i üste koyar (`App.vue:189/193`). Bilinçli olabilir, ama iki bağımsız z kaynağı → B14.
- **L2 substrat katmanı z almıyor**: `ScreenOverlay` (z-30) içinde yaşar (`ScreenOverlay.vue:118-145`). Sözleşme §3'te L2 = L1 ile L3 arası; pratikte z-30 → katman adı ile z konumu uyuşmuyor. *Belirsiz* (tek full-screen overlay optimizasyonu olabilir).

### 1.4 ADR-0044 (shake containment) — hâlâ geçerli mi?

**GEÇERLİ (PASS).** Kanıt:

| Kural | Kanıt | Durum |
| :--- | :--- | :--- |
| Shake yalnız `#game-main-content`'e uygulanır | `JuiceLayer.vue:665-716` `document.getElementById('game-main-content')` | PASS |
| Fixed UI kabın **kardeşi** (içinde değil) | `App.vue:208` (açılış) → `App.vue:353` (kapanış); `FloatingThumbBar` 356, `SettingsModal` 359, `ConfirmModal` 365, `AuthModal` 375, `CloudConflictModal` 381, `AdminPanel` 384 → hepsi 353'ten **sonra** | PASS |
| Mobil dock teleport ile ayrılır | `App.vue:263` `<Teleport to="body" :disabled="!isMobile">` | PASS |
| Ek teleport'lar | `ConfirmModal.vue:36`, `LabTab.vue:395` | PASS |
| Köke `filter/transform` yok (M3) | `App.vue:168` kök yalnız `min-h-screen ... relative` | PASS |
| Knock-down filtreleri yalnız arka plan kardeşlerine | `style.css:836-845` | PASS |
| `offsetWidth` zorlaması yok | grep: 0 eşleşme | PASS |

Tek nüans: `.layer-clock` kökü `pointer-events-none` ama **kadran `pointer-events-auto`**; modal `z-50` ile açılırsa (B2) saat kadranı modal üstünde kalıp dokunma çalabilir.

---

## 2. HAREKET KAPISI DENETİMİ

### 2.1 Tek kapı mı, paralel kapılar mı?

`useMotion.ts` üç fonksiyon sunar: `useMotionMode()` (reaktif 3-state), `isMotionOff()` / `isMotionReduced()` (kök-sınıf mührü, **OS okumaz**), `useMotionReduced()` (ayar + kök mühür + **OS**, `useMotion.ts:80-85`).

| Kapı API'si | OS tercihini okur? | Kullanan dosya | Dosyalar |
| :--- | :--- | ---: | :--- |
| `useMotionReduced()` | **Evet** | 4 | CommentTicker, MusicControls, TimeClockOverlay, (useMotion içi) |
| `useMotionMode()` | Hayır (yalnız ayar) | 9 | AlgorithmicSwirl, useNavigation, useCounterHeat, JuiceLayer, SequentialStrikeLayer, MotifBand, SideSnapHands, MusicControls, CommentTicker |
| `isMotionReduced()` | **Hayır** | 9 | DimensionRow, Header, useCounterHeat, actions-neural, JuiceLayer, SequentialStrikeLayer, ScreenOverlay, HeartBurstLayer, useNavigation |
| `isMotionOff()` | **Hayır** | 4 | DimensionsTab, FloatingThumbBar, CounterDisplay, Header |
| Doğrudan `matchMedia` | — | **3** | `core/tilt.ts:38`, `AlgorithmicSwirl.vue:445-446`, `JuiceLayer.vue:777-778` |

Toplam `useMotion` tüketicisi: **18 dosya**. **Sonuç:** "tek kapı" kavramsal olarak var (`useMotion.ts:46-52`) ama **pratikte 4 farklı okuma biçimi** kullanılıyor. En kritik sonuç: OS `prefers-reduced-motion` **root sınıfına yazılmadığı** için (`useNavigation.ts:321-333` yalnız `settings` okur), `isMotionReduced()`/`isMotionOff()` kullanan tüm JS karar noktaları OS tercihini **görmez**.

### 2.2 Kapsama matrisi (dosya × durum)

| Bileşen / modül | JS kapısı | OS (JS) | batterySaver (JS) | CSS telafisi | Verdict |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `useMotion.ts` | 3 API tek modülde | ✓ | — | — | PASS |
| `useNavigation.ts:321-333` | kök mühür yazar | **✗** (`crt-off` daima eklenir) | ✓ | — | KISMİ |
| `core/tilt.ts:36-41` | `matchMedia` + kök mühür | ✓ | ✗ | — | KISMİ |
| `JuiceLayer.vue` | 4 kaynak birleşik (`139-147`) | ✓ | ✓ | — (canvas) | PASS |
| `AlgorithmicSwirl.vue:79-86` | mod+pil+mühür+OS | ✓ | ✓ | statik fallback | PASS |
| `SequentialStrikeLayer.vue:44-48` | `isMotionReduced`+mod+pil | **✗** | ✓ | scoped CSS'te gate yok | KISMİ |
| `HeartBurstLayer.vue:36` | yalnız `isMotionReduced()` | **✗** | **✗** | yok | KISMİ |
| `ScreenOverlay.vue:24-27,69` | `batterySaver` + `isMotionReduced` | **✗** | ✓ | `animate-pulse` OS listesinde | KISMİ |
| `MotifBand.vue:28-34` | yalnız `motionMode==='off'` | ✗ (JS) | ✓ | `style.css:709-722` | KISMİ (CSS telafi) |
| `SideSnapHands.vue:28-37` | `motionMode`+pil | ✗ (JS) | ✓ | `.snap-hand` kendi media'sı (`247-251`) | KISMİ (CSS telafi) |
| `TimeClockOverlay.vue:27,346,354,452,463` | `useMotionReduced` | ✓ | ✓ (CSS `2005-2022`) | `clock-static` | **PASS** (örnek uygulama) |
| `CommentTicker.vue:37,308` | `useMotionReduced` | ✓ | **✗** | scoped marquee (JS kapısı şart) | KISMİ |
| `MusicControls.vue:30-35,61` | `useMotionReduced` | ✓ | ✗ | — | KISMİ |
| `AchievementToast.vue` | **yok** | ✗ | ✗ | `.toast-progress` (`89`) OS listesinde yok | KISMİ |
| `Header.vue:358`, `FloatingThumbBar.vue:93`, `DimensionsTab.vue:235` `punchTap` | `isMotionOff()` | **✗** | ✗ | `.reduce-anim *` 0.001s maskeler | KISMİ |
| `DimensionRow.vue:31,66,85` | `isMotionReduced()` | **✗** | ✗ | `style.css:1630-1634` | KISMİ |
| `AnomalyOverlay.vue` | **yok** | ✗ | ✗ | yalnız `.anomaly-wobble`/`animate-pulse` | KISMİ |

### 2.3 OS prefers-reduced-motion kapsama denetimi (istenen tek tek liste)

Global OS listesi: `style.css:1584-1647`. `.reduce-anim *` ve `.motion-off *` (`866-872`, `1806-1821`) **tüm** alt öğeleri duration 0.001 s + iteration 1'e çeker → *ayar* modunda hepsi durur. Ancak **OS-only** senaryoda (uygulama ayarı `full`, root mühür yok) yalnız açık liste çalışır:

| Animasyon sınıfı | Tanım | Kapı | Tüketici | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `animate-pulse` | Tailwind (∞) | `style.css:1622` | ~45 kullanım | **Kapılı** |
| `affordance-pulse` | `336-338` (∞ 2.4s) | `style.css:1585` | 16 kullanım | **Kapılı** |
| `tab-dot` (pulse) | `303-320` (∞ 2s) | `style.css:1586` | App.vue sekmeleri | **Kapılı** |
| `heartbeat` → `animate-cyber-heart` | `1330-1333` (∞ 1.1s) | **YOK** | `AnomalyOverlay.vue:283` | **AÇIK** |
| `flame` → `flame-text`/`flame-flicker` | `1095-1104` | `1617` + `1636` | CounterDisplay | **Kapılı** |
| `flame-sub-dance` → `animate-flame-sub` | `1318-1321` (∞) | **YOK** | `AnomalyOverlay.vue:255` | **AÇIK** |
| `twinkle` | **repoda tanım yok** (0 eşleşme) | — | — | Yok |
| `marquee` (CommentTicker scoped) | `CommentTicker.vue` scoped | JS `useMotionReduced` (`37`) | CommentTicker | **Kapılı (JS)** |
| `ticker` | = marquee | aynı | aynı | **Kapılı (JS)** |
| `wobble` (`anomaly-wobble`) | `1165-1168` (∞ 3.2s) | `1592` | AnomalyOverlay | **Kapılı** |
| `panic-pulse` | `1278-1280` (∞ 0.42s alternate) | **YOK** | `AnomalyOverlay.vue:202` | **AÇIK** |
| `starburst-spin-anim` | `1339-1342` (∞ 9s) | **YOK** | `AnomalyOverlay.vue:314,345` | **AÇIK** |
| `ekg-dash-anim` | `1348-1351` (∞ 1.2s) | **YOK** | `AnomalyOverlay.vue:290` | **AÇIK** |
| `animate-ping` | Tailwind (∞) | **YOK** | `CommentTicker.vue:374`, `TrendReactor.vue:87` | **AÇIK** |
| `animate-bounce` | Tailwind (∞) | **YOK** | `TrendReactor.vue:48,160` | **AÇIK** |
| `animate-spin` | Tailwind (∞) | **YOK** | AuthModal ×3, CrisisTab, CloudSaveSection | **AÇIK** |
| `motif-drift` | `701-703` (∞ 38s) | `716-718` | MotifBand | **Kapılı** |
| `toast-shrink` | `AchievementToast.vue:89` (4s, tek) | **YOK** (sonlu) | Toast | Tolere |
| `clock-*` | `1908-1984` | `1997-2036` | TimeClockOverlay | **Kapılı** |
| `rate-warm/hot/supernova` | `1077-1090` (∞) | `1614-1616` | **0 tüketici** | Ölü (B16) |

**Sonuç:** Sözleşme §9.4 "reduced/off **+ OS** azaltılmış harekette style.css **hepsini** animation: none ile durdurur" ifadesi **OS ayağında tutulmuyor**: 8 sonsuz animasyon sınıfı listede yok (B4).

---

## 3. BULGU LİSTESİ (kanıtlı)

### B1 — KRİTİK · L1 CRT katmanı tamamen ölü; crtEffect ayarı ve --crt-* eğrisi tüketicisiz

- **Kanıt 1 (katman susmuş):** `src/style.css:516-524` — yorum: "CRT KALDIRILDI: fullscreen şerit dokusu istenmiyor — tüm crt katmanları susar."; seçici: `.crt-layer, .crt-scanlines, .crt-vignette, .crt-glow, .layer-crt { display: none !important; background: none !important; }`
- **Kanıt 2 (kök sınıfı zorla kapalı):** `src/composables/useNavigation.ts:325-326` — "CRT katmanı kaldırıldı: kök her zaman crt-off taşır (eski kayıt uyumu)." + `document.documentElement.classList.add("crt-off");`
- **Kanıt 3 (bileşen yok):** `glob src/components/*Crt*` → 0 dosya; `App.vue` şablonunda CrtOverlay yok (`App.vue:167-210`).
- **Kanıt 4 (ölü ayar):** `crtEffect` yalnız 4 yerde — `models/settings.ts:26` (tip), `state.ts:229` (varsayılan), `actions-save.ts:804` (migrasyon), `__tests__/save.test.ts:73` (fikstür). **UI toggle yok, okuyan yok.**
- **İhlal:** `visual-language.md` §3 `L1 — CRT KAPLAMA ... (HEP AÇIK, frenli)`; §4 K0 "CRT ~%10"; ADR-0061 §2.3/§2.5; plan §4 A4/A5 kabul kriterleri (*"crtEffect ayarı gerçekten çalışıyor"*).
- **Önerilen düzeltme:** (a) CRT istenmiyorsa yeni ADR + §3/§4'ten L1'i düşür, `crtEffect` alanını ve `--crt-*`/`.crt-*`/`.layer-crt` bloklarını sil. (b) İsteniyorsa `style.css:516-524` sil, `useNavigation.ts:326` koşullu yap (`crtEffect === false`), `--crt-intensity`i `.crt-layer` içinde tüket. Her iki durumda da yarı-ölü hâl bırakılmamalı.

### B2 — YÜKSEK · Üç modal .layer-modal yerine z-50 kullanıyor → juice/saat/toast modalların ÜSTÜNDE

- **Kanıt:** `AuthModal.vue:138` "fixed inset-0 z-50 ..."; `CloudConflictModal.vue:56` "fixed inset-0 z-50 ..."; `LabTab.vue:398` "fixed inset-0 z-50 ...".
- **Neden hatalı:** `z-50` = 50; `.layer-clock` 55, `.layer-juice` 60, `.layer-toast` 70 (`style.css:498-500`). Modal partikül canvas'ının ve saatin **altında** kalır; saat kadranı `pointer-events-auto` (`TimeClockOverlay.vue:365`) olduğundan dokunma çalabilir.
- **İhlal:** ADR-0061 §2.4 haritası ("80 modaller"), `style.css:486-488` tek-kaynak yorumu.
- **Önerilen düzeltme:** üç modalde `z-50` → `layer-modal`. `SettingsModal.vue:144` ve `AchievementToast.vue:49`'daki `layer-*` + `z-50` çift beyanı da teke indirilmeli.

### B3 — YÜKSEK · JuiceLayer fizik motoru frame-counted (timestamp-driven değil)

- **Kanıt:** `src/components/JuiceLayer.vue:245` `maxLife: 35 + Math.floor(Math.random() * 10), // ~0.6 - 0.8 saniye`; `562` `s.life++`; `587` `p.life++`; `541` `sw.radius += (...)*0.16 + 2.2` — hepsi **kare başına** adım. `520` `function loop()` **timestamp parametresi almaz**; `620-628` rAF zinciri delta kullanmaz.
- **Sonuç:** 60 Hz'de ~0.6 s olan yüzen yazı ömrü 120 Hz'de ~0.3 s'ye iner; şok dalgası hızı ekran tazeleme hızına bağlı olur.
- **İhlal:** `visual-language.md` §9.1 "hareketler timestamp-driven (frame-counted asla)".
- **Önerilen düzeltme:** `loop(ts)` imzası + `dt = ts - lastTs` normalize faktörü (60 Hz referans); `maxLife`/hızları saniye cinsine çevir.

### B4 — YÜKSEK · OS prefers-reduced-motion kapısında 8 sonsuz animasyon açık kalıyor

- **Kanıt (liste):** `style.css:1584-1647` reduced-motion bloğu şu sınıfları **içermiyor**: `.panic-pulse` (`1278`), `.animate-flame-sub` (`1318`), `.animate-cyber-heart` (`1330`), `.animate-starburst-spin` (`1339`), `.animate-ekg-line` (`1348`); ayrıca Tailwind yerleşik `animate-ping`/`animate-bounce`/`animate-spin`.
- **Tüketici kanıtı:** `AnomalyOverlay.vue:202`, `255`, `283`, `290`, `314,345`; `CommentTicker.vue:374`; `TrendReactor.vue:87,48,160`.
- **Neden OS'te kaçıyor:** `useNavigation.ts:329-333` root mühürlerini **yalnız settings**'ten türetir; OS tercihi root'a yazılmaz, dolayısıyla `.reduce-anim *` telafisi devreye girmez.
- **İhlal:** §9.4 "reduced/off + OS azaltılmış harekette style.css hepsini animation: none ile durdurur".
- **Önerilen düzeltme:** 5 global sınıfı `style.css:1584` listesine ekle; Tailwind sınıfları için `.animate-ping/.animate-bounce/.animate-spin` hedeflerini ekle (veya OS tercihini `useNavigation.syncEffectClasses()` içinde root sınıfına yansıt).

### B5 — YÜKSEK · Juice katmanları ölü: juice-bloom ve rise-float hiç uygulanmıyor

- **Kanıt:** `src/style.css:1775-1777` `.juice-bloom { animation: juice-bloom-anim 200ms ease-out 1 both; }` ve `1793-1796` `.rise-float { animation: rise-float-anim 600ms ease-out 1 both; }` — grep yalnız `style.css` satırlarını döndürür; **hiçbir .vue dosyası bu sınıfları eklemiyor.** Uygulanan tek katman `.juice-punch` (`Header.vue:361`, `FloatingThumbBar.vue:96`, `DimensionsTab.vue:235`).
- **İhlal:** §9.1 "Dokunma 5 katman (scale punch + haptik + bloom + yükselen +N)"; `style.css:1734-1741` yorumu üç katmanı (punch+bloom+rise) vaat eder.
- **Önerilen düzeltme:** ya sınıfları gerçek tüketiciye bağla, ya CSS+yorumu sil.

### B6 — ORTA · --crt-intensity (6 blok) ve --glitch-intensity (6 blok) sıfır tüketici

- **Kanıt:** grep `var(--crt-intensity)` → **0 eşleşme**; grep `var(--glitch-intensity)` → **0 eşleşme**. Beyanlar: `style.css:99` + `584/593/602/611/620/629` blokları.
- **İhlal:** ADR-0062 "CRT şiddet eğrisi" — Faz B O3 kazanımı tüketicisiz (B1'in sonucu).
- **Önerilen düzeltme:** B1 kararına bağlı olarak tüketici ekle ya tokenları sil; `style.css:579-580` "Tek taraflı değişim YASAK" kuralını yarım token setiyle bırakma.

### B7 — ORTA · PARTICLE_BUDGET.MAX_PARTICLES üretimde kullanılmıyor; tilt cap'i bütçenin 2 katı

- **Kanıt:** `src/core/particles.ts:164` `MAX_PARTICLES: 60`; tek tüketici `particles.test.ts:141`. Gerçek cap `JuiceLayer.vue:237` `const cap = mode === 'tilt' ? 120 : mode === 'calm' ? 30 : 60`. `MAX_SHOCKWAVES`/`MAX_SPARKS` doğru bağlı; `KNOCK_DOWN_MS` (`particles.ts:168`) hiç kullanılmıyor.
- **Sonuç:** test "metin 60" diye kilitliyor (`particles.test.ts:140-145`) ama üretim `tilt`'te 120'ye izin veriyor → yanlış güvence + §9.1 "havuz sabit + emisyon cap" belgesi ile kod ayrışmış.
- **Önerilen düzeltme:** cap'i `PARTICLE_BUDGET.MAX_PARTICLES` + açık mod çarpanından türet veya sabiti hizala; `KNOCK_DOWN_MS` ölü ise sil.

### B8 — ORTA · useCounterHeat boş bir 100 ms setInterval'ı uygulama ömrü boyunca çalıştırıyor

- **Kanıt:** `src/composables/useCounterHeat.ts:12-17` — `ensureDecayRunning()` içinde `window.setInterval(() => { /* Sayaç ısı sönümlenme döngüsü */ }, 100)`; gövde boş. `counterHeatClass` her zaman `""` (`useCounterHeat.ts:89-91`).
- **İhlal:** §9.1 "ortam sakin tutulur"; ADR-0049 Kural 1 ruhu — nabız kapalı ama saniyede 10 kez boşa uyanık timer kalmış.
- **Önerilen düzeltme:** `ensureDecayRunning`/`stopDecayIfUnused` ve `activeConsumers` sayacını kaldır.

### B9 — ORTA · Canvas sayısı ve GPU: 2 tam ekran canvas + bütçe dışı üçüncü (confetti)

- **Kanıt:** `AlgorithmicSwirl.vue:505` `<canvas>` (WebGL, z-0, rAF `390/397`); `JuiceLayer.vue:847-850` `<canvas class="layer-juice ...">` (2D, z-60, rAF `219/625`); üçüncü: `celebrate.ts:1` `import confetti from 'canvas-confetti'` — çağrı yerleri `AnomalyOverlay.vue:122` (`particleCount: 80/50`), `useCounterHeat.ts:111` (`40`).
- **Değerlendirme:** M4 "tek **partikül** canvas'ı" JuiceLayer tarafında **karşılanıyor**; AlgorithmicSwirl ADR-0049 Kural 1 istisnası. Ancak confetti yolu sabit emisyonlu ve **juice modu/emisyon cap'ine bağlı değil** (calm'da da 80 partikül) → §9.1 "ekonomi ∞ olsa da görsel boğulmaz" garantisi confetti için geçersiz.
- **Önerilen düzeltme:** confetti `particleCount`'unu tek noktadan juice modu + `shouldReduceMotion` ile ölçekle; canvas census'ini M4'e "3 canvas (2 + confetti, koşullu)" olarak yaz.

### B10 — ORTA · isMotionReduced() / useMotionReduced() ikiliği: OS tercihi JS'te 9+ dosyada kayıp

- **Kanıt:** `useMotion.ts:40-44` `isMotionReduced()` yalnız `classList` okur; `useMotion.ts:80-85` `useMotionReduced()` OS terimini ekler. `isMotionReduced()` kullanan karar noktaları: `HeartBurstLayer.vue:36`, `ScreenOverlay.vue:69`, `SequentialStrikeLayer.vue:46`, `DimensionRow.vue:31/66/85`, `useCounterHeat.ts:40`, `actions-neural.ts:41`, `JuiceLayer.vue:142`. `isMotionOff()`: `FloatingThumbBar.vue:93`, `Header.vue:358`, `DimensionsTab.vue`, `CounterDisplay.vue`.
- **Sonuç:** "kullanıcı OS'te hareketi azalttı, oyun ayarı full" senaryosunda bu bileşenler tam juici çalıştırır.
- **Önerilen düzeltme:** OS'i root sınıfına yaz (`useNavigation` içinde `matchMedia('(prefers-reduced-motion: reduce)')` → `reduce-anim`) ve `isMotionReduced()`i tek gerçek kaynak yap; ya da karar noktalarını `useMotionReduced()`e geçir.

### B11 — ORTA · useMotion dışı 3 doğrudan matchMedia okuyucusu (paralel kapı)

- **Kanıt:** `core/tilt.ts:38` `window.matchMedia('(prefers-reduced-motion: reduce)').matches`; `AlgorithmicSwirl.vue:445-446`; `JuiceLayer.vue:777-778`.
- **Ek:** `tilt.ts:36-41` `motionBlocked()` **battery-saver'ı bilmez** (yalnız `reduce-anim`/`motion-off` + OS).
- **İhlal:** ADR-0058 / `useMotion.ts:9-11` "tek kontrat, ikinci kaynak yok" iddiası.
- **Önerilen düzeltme:** mümkün olanı `useMotion` yardımcılarına bağla; canlı dinleme gereken ikisi için OS terimini ortak modül ref'ine taşı (`useMotion.ts:53` zaten var).

### B12 — ORTA · AnomalyOverlay tüm juice'ü @click (pointerup) anında salıyor

- **Kanıt:** `AnomalyOverlay.vue:178` `@click="handleAnomalyClick(...)"`; içerik `114-162`: `safeConfetti` (122), `doomscroll:shake` (131), `doomscroll:shockwave` (138), `doomscroll:tap` (150), ardından `store.clickAnomaly`. **pointerdown işleyicisi yok.**
- **İhlal:** §9.1 "Görsel tepki pointerdown'da (≤100 ms), state commit pointerup'ta" — burada görsel ve commit aynı ana bağlı.
- **Belirsiz:** anomali yakalama jesti pointerup gerektirebilir; sözleşme metni istisna tanımlamıyor. Öneri: kapsül için `@pointerdown` ile `juice-punch`/`juice-bloom` ekle, ağır şölen `@click`'te kalsın.

### B13 — ORTA · screen-shake.test.ts üretim kodunu test etmiyor

- **Kanıt:** `src/core/screen-shake.test.ts:31-59` ve `82-107` `triggerShake` fonksiyonunu **test içinde yeniden yazıyor**; import yalnız `vitest` (satır 1). Üretim mantığı `JuiceLayer.vue:652-717` `handleShakeEvent`'te. `src/core/screen-shake.ts` **yoktur** (`glob src/core/*shake*` → yalnız test).
- **Sonuç:** ADR-0044 anti-spam/upgrade mantığı için gerçek regresyon koruması yok.
- **Önerilen düzeltme:** `handleShakeEvent`'i `core/screen-shake.ts`'e saf fonksiyon olarak çıkar ve testi ona bağla.

### B14 — DÜŞÜK · z-index çift kaynağı ve sınıf/sayı karışıklığı

- **Kanıt:** `SideSnapHands.vue:93` `z-index: 45;` (scoped, `.layer-motif` yerine); `HeartBurstLayer.vue:143`/`SequentialStrikeLayer.vue:154` `z-50`; `ScreenOverlay.vue:94` `z-30`; `FloatingThumbBar.vue:105` `z-30`; `AchievementToast.vue:49` `layer-toast ... z-50`; `SettingsModal.vue:144` `layer-modal ... z-50`.
- **İhlal:** `style.css:486-488` "tek elden senkron" + ADR-0061 §2.4.
- **Önerilen düzeltme:** tüm katman kararlarını `layer-*` sınıfına indir; çift beyanları sil.

### B15 — DÜŞÜK · animate-fade-in 7 kez kullanılıyor, hiç tanımlı değil

- **Kanıt:** `AuthModal.vue:138,296,305,412,417`; `CloudSaveSection.vue:91,95`. `tailwind.config.js:48-57` yalnız `pulse-fast`/`glow` tanımlar; `style.css`'te `fade-in` `@keyframes` yok (grep 0).
- **Sonuç:** hata/başarı satırları animasyonsuz belirir (ölü sınıf). **Önerilen düzeltme:** sınıfı kaldır ya da `animation.fade-in` tanımla.

### B16 — DÜŞÜK · Ölü CSS seçicileri ve keyframe'ler

- **Kanıt (0 tüketici):** `.rate-warm`/`.rate-hot`/`.rate-supernova` (`1077-1090`) — `counterHeatClass` daima `""` (`useCounterHeat.ts:89-91`); `.decay-flicker`/`.decay-glitch`/`.decay-static` (`1688-1727`); `.crt-scanlines-removed` (`526-534`); `.crt-layer`/`.crt-scanlines`/`.crt-vignette`/`.crt-glow` (kapalı); `.layer-crt` (`495`).
- **Ölü @keyframes (7):** `rate-pulse-warm`, `rate-pulse-hot`, `rate-pulse-supernova`, `decay-flicker-anim`, `decay-glitch-anim`, `juice-bloom-anim`, `rise-float-anim`.
- **Önerilen düzeltme:** ölü blokları sil (B1/B5/B8 kararlarıyla birlikte).

### B17 — DÜŞÜK · corruption.ts yorumu CSS/test ile çelişiyor

- **Kanıt:** `src/game/corruption.ts:42` "O3 eğrisi: K0 %10, K1 %35, K2 %45" ama değerler `crtIntensity: 0.05 / 0.09 / 0.13` (`67/77/87`); `corruption.test.ts:73` doğru notu taşır ("kullanıcı geri bildirimiyle yumuşatıldı"). CSS blokları meta ile **senkron** (`style.css:585/594/603`).
- **Önerilen düzeltme:** yorumu güncelle (kod doğru; yalnız açıklama yanlış).

### B18 — DÜŞÜK · ADR-0061 §2.4 z-haritası stale ("9999 tooltip")

- **Kanıt:** `0061-...md:74` "70 toast   80 modaller   9999 tooltip"; tooltip katmanı 2026-10-18'de kaldırıldı (`visual-language.md:148-154` notu); repoda `9999` **0 eşleşme**.
- **Önerilen düzeltme:** haritayı güncelle; `.layer-crt` satırını B1 kararına göre düzelt.

### B19 — DÜŞÜK · punchTap yalnız isMotionOff() kontrol ediyor

- **Kanıt:** `Header.vue:357-363`, `FloatingThumbBar.vue:92-98`, `DimensionsTab.vue:230-236` — hepsi `if (isMotionOff()) return;`. `reduced` modda da `.juice-punch` eklenir; etki yalnız `.reduce-anim *` 0.001 s kuralıyla maskelenir.
- **Önerilen düzeltme:** `isMotionReduced()` ile hizala (veya OS'i root'a yaz, B10).

---

## 4. PARTİKÜL DİSİPLİNİ — SAHNE BAŞINA BÜTÇE TABLOSU

Kaynak: `src/core/particles.ts:57-160` (reçete) + `PARTICLE_BUDGET` (`163-169`) + `JuiceLayer` uygulaması.

| Sahne | sparks (istek) | halka katmanı | texts | shake | knockMs | suppressionMs | big | Emisyon cap kontrolü |
| :--- | ---: | ---: | ---: | :--- | ---: | ---: | :---: | :--- |
| `supernova` | 40 | 2 | 2 | medium | 140 | 400 | ✗ | `MAX_SPARKS` ✓ (`JuiceLayer:382`) |
| `mass_burst` | 64 | 2 | 2 | hard | 140 | 400 | ✗ | ✓ |
| `hawking` | 28 | 1 | 1 | soft | 0 | 0 | ✗ | ✓ |
| `resonance` | 96 | 4 | 3 | hard | 140 | 400 | ✓ | ✓ |
| `crunch` | 110 | 4 | 3 | hard | 200 | **600** | ✓ | ✓ (crunch suppression'ı deler, `421`) |
| `decade` | 24 | 1 | 1 | medium | 0 | 0 | ✗ | ✓ |
| `yut` | 4 | 0 | 0 | null | 0 | 0 | ✗ | ✓ |
| `time_warp` | 72 | 3 | 2 | hard | 140 | 400 | ✓ | ✓ |

- **Havuz sabit mi?** Kıvılcım (`MAX_SPARKS=220`, `clampEmission`) ve halka (`MAX_SHOCKWAVES=8`, `shift()`) **evet**. Metin **hayır**: cap `JuiceLayer.vue:237` sabit-kodlu (tilt 120 ≠ 60) → **B7**.
- **Suppression window:** `shouldSuppressFeast(now, lastFeastBigAt)` varsayılan 400 ms (`particles.ts:197`); `crunch` bilinçli deler (`JuiceLayer.vue:421`). Sözleşme §9.4 (400/600 ms) **karşılanıyor** ✓.
- **Background knock-down:** `pulseFeastKnockdown` (`JuiceLayer.vue:351-361`) + `shouldReduceMotion` kapısı; CSS `style.css:836-862` (media + forced-colors geri alma). **Karşılanıyor** ✓ (M3-safe, ADR-0044 PASS).
- **Reduced emisyon:** `scaleCountForMode(..., 'reduced')` → %35 (min 1), halka ≤1, shake/knock yok (`JuiceLayer.vue:417-484`) ✓; `off` → erken çıkış ✓.

---

## 5. WOBBLE / SQUISH / ROLL-UP / SPRING — YALNIZ ETKİLEŞİMDE Mİ?

| Efekt | Tanım | Tetik | Sürekli mi? | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `card-squash` / `card-released` / `card-push-*` | `style.css:934-954` | `DimensionRow.vue:453-456` pointerdown/up/leave | Etkileşim | OK (§1 "wobble yalnız etkileşimde") |
| `v-tilt` hover eğilmesi | `core/tilt.ts:65-174` | `pointermove` (touch hariç) | Hover | OK — hover tilt bilinçli; `motionBlocked` kapılı |
| `buy-bounce` | `style.css:922` | `DimensionRow.vue:341` (press taze değilse) | Olay | OK |
| `count-pop*` | `style.css:414-438` | tap/kaydırma | Olay | OK |
| `anomaly-wobble` | `style.css:1165` | Sürekli (∞ 3.2 s) | **Sürekli** | §1 ile **çelişiyor**, ama ADR-0049/0063 bilinçli istisna + `1592`'de kapılı → *belirsiz/kabul* |
| `toast-shrink` | `AchievementToast.vue:89` | Toast görünürken | Sonlu (4 s) | OK |
| `motif-drift` | `style.css:701` | Bant görünürken | Sürekli (38 s) | L3 gereği; kapılı |
| `snap-cycle` | `SideSnapHands.vue:134` | Sürekli (3.6 s) | Sürekli | Kapılı (media + `.static`) |
| `clock-ring-pulse` | `style.css:1922` | Saat görünürken | Sürekli | Kapılı |
| `rate-pulse-*` | `style.css:1077-1090` | — | **Ölü** | B16 |

**Temiz:** hover'da sürekli wobble **yok**; squish/spring yalnız bas-bırak döngüsünde ve `card-physics.ts` sabitleri CSS ile senkron (`CARD_RELEASE_MS 420` ↔ `style.css:939`, `CARD_PUSH_MS 240` ↔ `949/952`) ✓.
**Roll-up sayaç:** `CounterDisplay.vue:112,166` `smoothRaf = requestAnimationFrame(tickSmooth)` ile yumuşatma **var** ✓ (timestamp kullanımı kapsam dışı).

---

## 6. ÖNERİLEN DÜZELTME SIRASI

1. **B1** — CRT kararını netleştir (kod mu, sözleşme mi). B6/B16/B18'in kaynağı.
2. **B2** — 3 modali `.layer-modal`a çevir (tek satırlık, yüksek etkili).
3. **B4 + B10** — OS tercihini `syncEffectClasses()` içinde root sınıfına yaz; tek hamlede 8 animasyon sınıfı + 9 JS karar noktası kapıya girer.
4. **B3** — `JuiceLayer.loop`'u timestamp/delta tabanlı yap.
5. **B5 + B16** — ölü juice/CSS bloklarını ya bağla ya sil.
6. **B7 + B8** — bütçe sabitini otorite yap, no-op intervali kaldır.
7. **B9 + B12** — confetti emisyonunu ölçekle, anomali pointerdown katmanı ekle.
8. **B11 + B13** — paralel `matchMedia` okuyucularını ortaklaştır; shake testini üretim fonksiyonuna bağla.
9. **B14 + B15 + B17 + B18 + B19** — düşük maliyetli tutarlılık temizliği.

---

## 7. KAPSAM DIŞI / EMİN OLUNAMAYAN

- **Build/test çalıştırılmadı** (görev kuralı) — `particles.test.ts`/`screen-shake.test.ts` yeşil midir doğrulanmadı; B13 yalnız "test üretimi kapsamıyor" iddiasıdır.
- **Gerçek zamanlı davranış** (60 vs 120 Hz ömür farkı) ölçülmedi; B3 kod okumasına dayanır.
- **L2 substrat katmanının z-30'da olması** bilinçli optimizasyon olabilir → *belirsiz* (§1.3).
- **`anomaly-wobble` sürekli animasyonu** ADR-0049/0063 ile bilinçli istisna olabilir → *belirsiz*.
- **`AlgorithmicSwirl` GPU maliyeti** ölçülmedi (`harness:perf` yok); yalnız 2 rAF döngüsü + 1 WebGL bağlamı sayıldı.
- **`CounterDisplay` roll-up'unun timestamp-driven olup olmadığı** (`112/166`) okunmadı — ayrı inceleme gerekir.
- **Tailwind `animate-spin/ping/bounce`**'ın OS listesinde kasten dışarıda bırakılıp bırakılmadığı belirsiz (spinner işlevsel gösterge olabilir) → B4'te ayrı karar gerekir.
