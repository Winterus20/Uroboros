# A2 — TİPOGRAFİ SİSTEMİ DENETİMİ (S7 · ADR-0066 + ADR-0067)

**Tarih:** 2026-10-18
**Denetçi:** A2 alt-ajanı (salt okunur)
**Kapsam:** `tailwind.config.js` (fontFamily) · `src/style.css` · `index.html` · `public/fonts/` ·
`src/components/**/*.vue` (52 dosya) · `src/core/particles.ts` · `src/components/JuiceLayer.vue` · `src/core/format.ts`
**Öncül sözleşme:** `brain/context/visual-language.md` §7 (Tipografi Sistemi) · ADR-0066 · ADR-0067 · ADR-0049 · ADR-0068
**Yöntem:** statik kod taraması (grep/read), `dist/assets/index-CA9OT3P-.css` son derleme çıktısıyla çapraz kontrol.
**Yasaklar:** `src/` altında hiçbir dosya değiştirilmedi; `npm build/test` çalıştırılmadı.

---

## 0. Özet Sayılar

| Ölçüm | Değer | Kaynak |
| :--- | :--- | :--- |
| `font-display` rolü kullanan yüzey | **3 şablon + 1 canvas** (CounterDisplay 1, TimeClockOverlay 2, JuiceLayer `ctx.font` 1) | grep |
| `font-display` ızgara ihlali | **2 yüzey / 3 farklı boyut** (`sm:text-6xl`=60px, `text-[13px]`, `text-[15px]`) | TimeClockOverlay:486,502 |
| `font-hand` kullanımı | **3 span**, tamamı `corruptionLevel >= 3` (K3+) kapılı | ScreenOverlay:137-139 |
| K0'da görünür `font-hand` | **0** | ScreenOverlay:130 + style.css:589 |
| TR'siz `m6x11` kod referansı | **0** (yalnız `m6x11plus`) | grep `m6x11[^p]` |
| `m6x11.woff2` repo geneli | **0 dosya** (`**/*.woff2` = 0) | glob |
| `public/fonts/` içeriği | **2 dosya**: `m6x11plus.ttf` + `ATTRIBUTION.md` | glob |
| Chakra Petch / JetBrains referansı | **0 / 0** | grep |
| Tek başına `Inter` (kelime sınırı) | **1** (yalnız yorum satırı) | style.css:29 |
| Hardcoded `font-family` bildirimi | **13**, tamamı güncel aile | style.css |
| Eski aile içeren `font-family` | **0** (src + dist) | grep |
| `tabular-nums` kullanımı | **140 eşleşme / 36 dosya** (hedef ~134/34) | grep |
| Onaylı `tabular-nums` eksiği | **1** (WelcomeBackModal:67) | tablo §6 |
| 800/900 ağırlık sınıfı | **14** (`font-extrabold` 6 + `font-black` 8) — hiçbiri display ile birlikte değil | grep |

---

## 1. ROL DİSİPLİNİ (S7 §7 Rol Tablosu + Kırılmaz Kural 5)

**Sözleşme cümlesi (visual-language.md:121,133,138):** `font-display` = *"hero sayaç + yüzen olay sayıları (canvas)"*;
`font-hand` = *"GIC el yazısı annotasyonlar (K3+ `.collage-scrawl`)"* ve *"K0'da görünmez"*.

### 1.1 Rol ihlalleri

| # | Konum | Kanıt (kısa alıntı) | İhlal edilen madde | Şiddet | Önerilen düzeltme |
| :-- | :--- | :--- | :--- | :--- | :--- |
| R1 | `src/components/TimeClockOverlay.vue:486` | `class="font-display text-4xl sm:text-6xl text-white counter-glow tabular-nums leading-none"` | §7 rol tablosu — display yalnız **hero sayaç + canvas yüzen sayı**; bu bir **DOM okuması** (`%{{ tensionPct }}`) | **YÜKSEK** | Ya `font-mono`'ya düşür (okuma = telemetri), ya da sözleşmeye "zaman yayı kadran okuması" istisnası ekleyip ADR yaz. ADR-0068 tipografiden hiç söz etmiyor → bu kullanım sözleşmeye karşı denetlenmemiş. |
| R2 | `src/components/TimeClockOverlay.vue:502` | `class="font-display text-[13px] sm:text-[15px] text-quantum-blue counter-glow tabular-nums leading-none"` | §7 rol tablosu (aynı gerekçe, `×{{ speedLabel }}`) | **YÜKSEK** | R1 ile aynı karar; ikisi birlikte çözülmeli. |

> **Belirsizlik notu:** "Yüzen olay sayıları" ifadesi TCO'nun doğuş anındaki okuması için *savunulabilir*;
> ancak sözleşme bu rolü parantez içinde **(canvas)** ile sınırlıyor ve TCO DOM'dur. İki okuma da mümkün —
> bu yüzden "kesin ihlal" değil, **sözleşme yorumu gerektiren YÜKSEK uyumsuzluk** olarak kaydediyorum.

### 1.2 Rol disiplini TEMİZ alanlar (kanıtlı)

| Yüzey | Kanıt | Sonuç |
| :--- | :--- | :--- |
| Hero sayaç | `CounterDisplay.vue:221` `font-display text-[36px] sm:text-[54px] lg:text-[72px] tabular-nums` — `font-bold`/`tracking` **yok** | ✅ Sözleşmeye birebir uygun |
| Yüzen olay sayıları | `JuiceLayer.vue:607` `ctx.font = \`400 ${p.size}px "m6x11plus", …\`` | ✅ Tek ağırlık 400, canvas |
| `font-hand` K3+ kapısı | `ScreenOverlay.vue:130` `<template v-if="corruptionLevel >= 3">` → 137-139 üç `font-hand` span'ı `aria-hidden` | ✅ K2 ve altında DOM'a hiç girmez |
| K0 çift güvence | `style.css:589` `--substrate-opacity: 0` (K0) + `.collage-scrawl` `opacity: calc(var(--substrate-opacity) * 0.85)` (style.css:768) | ✅ K0'da görünmez |
| forced-colors | `style.css:772` `.collage-scrawl { display: none !important }` | ✅ Susar |
| Diğer tüm `font-hand` kullanımı | Tüm repoda **yalnız 3 span** (ScreenOverlay) | ✅ Sayı/etiket katmanına sızmamış |
| `font-display` başka yerde | Repoda başka **0** kullanım (style.css:19 `font-display: swap` bir özellik, sınıf değil) | ✅ Tek merkez |

---

## 2. 18px IZGARA (S7 Kırılmaz Kural 1)

**Kural (visual-language.md:132-134):** *"m6x11plus ızgarası = font-size 18'in katları (18/36/54/72);
sentetik bold yasak; `tracking` elle düzeltmez."*

### 2.1 Izgara ihlalleri

| # | Konum | Kanıt | Hesaplanan px | Beklenen (18k) | Şiddet | Önerilen düzeltme |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- |
| G1 | `TimeClockOverlay.vue:486` | `sm:text-6xl` | **60px** (3.75rem) | 54 veya 72 | **YÜKSEK** | `sm:text-[54px]` (veya `lg:text-[72px]`) ile değiştir |
| G2 | `TimeClockOverlay.vue:502` | `text-[13px] sm:text-[15px]` | **13px / 15px** | 18 (veya 36) | **YÜKSEK** | `text-[18px]` — küçük okuma zaten 36'ın yanında; 13/15 piksel fontta bulanıklaşır |
| G3 | `TimeClockOverlay.vue:486` | `text-4xl` | 36px | 36 ✅ | — | Dokunma (temiz) |

**Izgara dışı boyut = piksel fontun bulanıklaşması.** m6x11plus 1152 upm ve sabit advance olduğundan
18'in katı olmayan boyutlar tarayıcı alt-piksel ölçeklemesine girer (ADR-0066 §2.5).

### 2.2 Sentetik bold / tracking denetimi

| Kontrol | Sonuç | Kanıt |
| :--- | :--- | :--- |
| `font-display` + `font-bold/extrabold/black` birlikte | **0 eşleşme** | grep `font-display` → 3 şablon satırı, hiçbirinde ağırlık sınıfı yok |
| `font-display` + `tracking-*` birlikte | **0 eşleşme** | aynı |
| `font-display` + CSS `font-weight`/`letter-spacing` | **0** | `@font-face` `font-weight: 400` (style.css:17); kullanılan `.counter-glow/`.counter-gold`/`.flame-text` yalnız `text-shadow`/renk/animasyon (style.css:1056-1104) |
| Canvas ağırlığı | `400` sabit | JuiceLayer.vue:607 |
| Ara değer (clamp/vw/rem) display üzerinde | **0** (tek rem kaynaklı ihlal G1'de) | grep `clamp(\`/`\\dvw` → display ile kesişim yok |

### 2.3 Izgara TEMİZ alanlar (kanıtlı)

| Yüzey | Kanıt |
| :--- | :--- |
| Hero sayaç | `CounterDisplay.vue:221` → `36 / 54 / 72` (üçü de 18k, üstelik responsive kırılım da ızgarada) |
| Canvas partikül | `JuiceLayer.vue:251` `size: big ? 36 : 18`; yorum 249-250 eski 15/20/24 → 18/36 geçişini belgeler |
| Kontur ölçeği | `JuiceLayer.vue:612` `Math.max(3.5, p.size * 0.18)` — boyutla orantılı, ızgarayı bozmaz |

---

## 3. TR'SİZ `m6x11` REFERANS TARAMASI (S7 Kural 2 + ADR-0065 M7)

| Kontrol | Sonuç | Kanıt |
| :--- | :--- | :--- |
| `public/fonts/m6x11.woff2` var mı? | **YOK** (silinmiş olması gerekiyordu) | glob `**/*m6x11*` → yalnız `m6x11plus.ttf` (public + dist) |
| Repo geneli `.woff2` | **0 dosya** | glob `**/*.woff2` |
| `public/fonts/` içeriği | `m6x11plus.ttf` (18.192 bayt) + `ATTRIBUTION.md` | glob |
| Kodda `m6x11` (plus'suz) | **0** — `m6x11[^p]` regex'i yalnız `ATTRIBUTION.md` satırlarında eşleşiyor (dokümantasyon gerekçesi, kod değil) | grep |
| `@font-face` | `style.css:14-20` `font-family: "m6x11plus"` · `src: url("/fonts/m6x11plus.ttf")` · `font-weight: 400` · `font-display: swap` | ✅ |
| Tailwind token | `tailwind.config.js:44` `display: ['m6x11plus', 'Space Grotesk', 'system-ui', 'sans-serif']` | ✅ |
| Canvas fallback | `JuiceLayer.vue:607` `"m6x11plus", "Space Mono", monospace` | ⚠️ bkz. §7.2 (DÜŞÜK) |
| `ATTRIBUTION.md` (silinemez) | Mevcut, 25 satır, lisans + TR glif doğrulaması + ızgara notu içeriyor | ✅ S7 Kural 3 karşılandı |

**Sonuç:** TR'siz orijinal `m6x11` repoda **sıfır kod referansı**; kural 2 tam karşılanmış.

---

## 4. ESKİ FONT YIĞINI SIZINTISI (S7 Kural 4 + ADR-0067 §3)

| Aranan | src | dist CSS | Not |
| :--- | :--- | :--- | :--- |
| `Chakra Petch` | **0** | **0** | S7 Kural 4 ✅ |
| `JetBrains` | **0** | **0** | ADR-0067 ✅ |
| `\bInter\b` (kelime sınırı) | **1** — `style.css:29` yorum: *"ADR-0067: sans = Space Grotesk (…; Inter cv02-cv11 özellikleri bu aileye ait değildi, kaldırıldı)"* | **0** (dist'teki 13 "Inter" eşleşmesi minify edilmiş JS içinde `constructor/interval/internal` alt-dizeleri — **font değil**) | ✅ Kod referansı yok, yalnız tarihsel yorum |
| Hardcoded `font-family` | **13**, tamamı `Space Mono` / `Space Grotesk` / `m6x11plus` | 9 benzersiz yığın, tamamı güncel | ✅ Sızıntı yok |
| `.vue` içi `font-family` | **0** (tüm bildirim `style.css`'te merkezî) | — | ✅ Tek kaynak disiplini |
| `ui-monospace` / generic fallback | Yalnız gerçek generic fallback olarak | — | ✅ Kabul edilebilir |
| `dist/fonts/` | `m6x11plus.ttf` + `ATTRIBUTION.md` paketlenmiş | `m6x11plus` 9 eşleşme | ✅ Son derleme de temiz |

**Ek kanıt — son derleme çıktısı (`dist/assets/index-CA9OT3P-.css`) tüm font yığınları:**
`Space Grotesk,system-ui,sans-serif` · `Space Mono,ui-monospace,…` · `m6x11plus,Space Grotesk,system-ui,sans-serif` · `Caveat,Segoe Print,cursive` · `m6x11plus` · `inherit`

---

## 5. AĞIRLIK EŞLEMELERİ (ADR-0067 §3)

| Sınıf | Adet | Display ile birlikte? | Değerlendirme |
| :--- | ---: | :--- | :--- |
| `font-bold` (700) | 318 | Hayır | ✅ Tam destekli |
| `font-semibold` (600) | 54 | Hayır | ✅ ADR-0067 bilinçli: mono'da 600→700 |
| `font-medium` (500) | 32 | Hayır | ✅ ADR-0067 bilinçli: mono'da 500→400 |
| `font-extrabold` (800) | 6 | **Hayır** | ⚠️ Space Grotesk'te 700'e clamp (sentetik bold yok — değişken font aralığı 300-700) |
| `font-black` (900) | 8 | **Hayır** | ⚠️ Aynı; hiçbiri m6x11plus üzerinde değil |

**800/900 kullanan 14 yüzey (hiçbiri display değil):**
`TabHero.vue:39` · `SettingsModal.vue:160` · `AuthModal.vue:155` · `CloudConflictModal.vue:72` ·
`AnomalyOverlay.vue:442` · `FloatingThumbBar.vue:167` · `SingularityButton.vue:54` · `BiometryPanel.vue:90,139,184` ·
`AdminPanel.vue:423` · `Header.vue:554` · `SequentialStrikeLayer.vue:177` · `getters-misc.ts:126` (rankColor → BiometryPanel:197 `font-mono`)

**Karar:** ADR-0067 §3 bunları *"bilinçli eşleme"* olarak kabul ediyor ve sentetik kalın oluşmuyor
(Space Mono tek ağırlık eşleşmesi + Space Grotesk değişken font tavanı). **İhlal değil**;
ancak sınıf adları 800/900 vaat edip 700 render ettiği için **DÜŞÜK** önemde okunabilirlik/bakım notu
(ileride `font-bold`'a sadeleştirilebilir). **Kritik olan tek risk** (display + ağırlık) repoda **0**.

---

## 6. `tabular-nums` KAPSAMI

**Ölçüm:** `src` genelinde **140 eşleşme / 36 dosya** (görevdeki ~134/34 beklentisinin üzerinde).
**Kritik teknik gerçek (ADR-0067 §3):** `font-mono` = Space Mono, **monospace** → rakam advance'i zaten eşit,
dolayısıyla mono bir atada olan her sayı `tabular-nums` olmadan da sıfır jitter üretir. Denetim bu yüzden
"atasında `font-mono`/`tabular-nums`/monospace CSS sınıfı var mı" ekseninde yapıldı.

### 6.1 Onaylı eksikler

| # | Konum | Kanıt | Bağlam | Şiddet | Önerilen düzeltme |
| :-- | :--- | :--- | :--- | :--- | :--- |
| T1 | `src/components/WelcomeBackModal.vue:67` | `<p class="text-xs text-slate-400">Uzakta {{ awayText }} geçirdin — akış durmadı.</p>` | `awayText` = `report.seconds`'tan türeyen **saat/dakika sayacı** (satır 14-23). Ata zincirinde `font-mono` **yok** (modal kökü sans). | **ORTA** | `tabular-nums` ekle (veya `font-mono`'ya al — bu modalın diğer okumaları zaten mono: 76/79) |
| T2 | `src/components/stats/BiometryPanel.vue:125` | `{{ bio.cosmicPrey.summaryText }}` | `cosmic-scale.ts:200` → `currentTier.desc` = **düz açıklama cümlesi**, sayı okuması değil | **DÜŞÜK (belirsiz)** | Gerekmez; kayıt amaçlı listelendi (içerik metin) |

**Toplam onaylı işlevsel eksik: 1 (T1).**

### 6.2 İsim verilen tüm kritik yüzeyler — kanıtlı TEMİZ

| Yüzey | `tabular-nums` (dosya) | Sayı okumaları nasıl karşılanıyor | Kanıt |
| :--- | ---: | :--- | :--- |
| **Header** | 13 | Tüm sayılar kendi `tabular-nums`'ı veya `font-mono` atası | 383, 452, 505, 530, 554, 602, 604, 661; 569 buton `font-sans` ama 579 `font-mono tabular-nums`; 592 buton `font-mono` → 605 |
| **DimensionRow** | 6 | Çarpan, miktar, akış, maliyet, paket ilerlemesi | 416, 424, 435 (`font-mono tabular-nums` kapsayıcı → 437/445), 469, 472 |
| **CounterDisplay** (hero) | 3 | Sayaç 221; /s satırı 240 `tabular-nums`; buff 254 | 221, 240, 254 |
| **Sekmeler** | — | CrisisTab 12, NeuralTreeTab 7, ChallengesTab 6, DimensionsTab 5, AchievementsTab 5, SingularityTab 5, ColonyTab 4, AutobuyersTab 3, LabTab 1 | CrisisTab:171,174,176,199,204,216,282,286,332 vb.; NeuralTreeTab:148,217; ChallengesTab:190,199,235 |
| **Modallar** | — | AuthModal, CloudConflictModal, CloudSaveSection, ImportExport, SaveSlots, SettingsModal: **tüm sayı okumaları `font-mono` atasında** | AuthModal:236; CloudConflictModal:98,104,110,157,163,169; CloudSaveSection:63; ImportExport:256; SaveSlots:81; SettingsModal:166 |
| **İstatistik panelleri** | — | RecordsPanel 8, MultipliersPanel 7, BiometryPanel 5, PastRunsPanel 5, OverviewPanel 1, TelemetryChart 2 | RecordsPanel:69; PastRunsPanel:34,41,48; BiometryPanel:90,93,139,153; TelemetryChart:89,92; MultipliersPanel:124; OverviewPanel:119 |
| **Ticker** | 1 | Aktif metin düz haber; hız göstergesi `font-mono` butonda | CommentTicker:458 (`font-mono`) → 463 |
| **Canvas** | — | `tabular-nums` uygulanamaz; m6x11plus rakamları sabit advance (ADR-0066 §2) | JuiceLayer:607 |

**Ek tarama kanıtı:** Repodaki **67 `toFixed()` çağrısının** tamamı ve **14 `{{ Math.* }}` render'ının** tamamı
atadaki `font-mono`/`tabular-nums`/`.ds-badge`/`.stat-box-value` (CSS mono) ile karşılanıyor;
yalnız yukarıdaki T1 sans bağlamında kaldı. `.stat-box-value` → `style.css:222-227` `font-family: "Space Mono"`.

---

## 7. FONT YÜKLEME STRATEJİSİ (S7 + ADR-0066 §3)

### 7.1 Doğrulanan yapı (TEMİZ)

| Kontrol | Kanıt | Sonuç |
| :--- | :--- | :--- |
| Self-host display | `public/fonts/m6x11plus.ttf` + `style.css:14-20` `@font-face` | ✅ |
| `preload` | `index.html:19` `<link rel="preload" href="/fonts/m6x11plus.ttf" as="font" type="font/ttf" crossorigin>` | ✅ `as`+`type`+`crossorigin` üçü de doğru |
| `font-display: swap` | `style.css:19` `font-display: swap;` (m6x11plus) | ✅ FOUT kabul, preload telafi eder |
| Google Fonts tek istek | `index.html:18` `family=Caveat:wght@400..700&family=Space+Grotesk:wght@400..700&family=Space+Mono:wght@400;700&display=swap` | ✅ `display=swap` var; **4 rol ailesinin tamamı bildirilmiş** (eksik aile yok) |
| Preconnect | `index.html:13-14` `fonts.googleapis.com` + `fonts.gstatic.com crossorigin` | ✅ |
| Tailwind token tutarlılığı | `tailwind.config.js:39-46` mono/sans/display/hand = Space Mono/Space Grotesk/m6x11plus/Caveat | ✅ |
| `src` içi ikinci font import | **0** (`@import`/`googleapis` yok) | ✅ Çift yükleme yok |
| dist paketleme | `dist/fonts/m6x11plus.ttf` + `ATTRIBUTION.md` | ✅ |

### 7.2 Bilinçli/önemsiz sapmalar

| # | Konum | Bulgu | Şiddet | Not |
| :-- | :--- | :--- | :--- | :--- |
| L1 | `JuiceLayer.vue:607` vs `tailwind.config.js:44` | Canvas fallback `"Space Mono", monospace`; token fallback `Space Grotesk, system-ui, sans-serif` | **DÜŞÜK** | Canvas sayı çiziyor → mono fallback **savunulabilir** (tabular); ancak ADR-0067 §3 `JuiceLayer` fallback'ini "hizalandı" diye sayıyor → ya yorum netleştirilmeli ya `Space Grotesk`'e çekilmeli |
| L2 | `style.css:31` vs `tailwind.config.js:40` | Gövde fallback'i `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`; token yalnız `system-ui, sans-serif` | **DÜŞÜK** | İki ayrı fallback listesi — tek kaynak ilkesi (A2/tek zemin kaynağı ruhu) ile uyumsuz |
| L3 | `style.css:19` | `font-display: swap` → hero sayaç ilk karede Space Grotesk fallback ile çizilir | **BİLGİ** | Preload nedeniyle FOUT penceresi çok kısa; sözleşme swap'ı açıkça istiyor |
| L4 | `public/fonts/m6x11plus.ttf` | `woff2` yok, `ttf` servis ediliyor (18 KB) | **BİLGİ** | Kapsam gereği `m6x11.woff2` **silinmiş**; m6x11plus için woff2 dönüşümü bundle kazancı sağlar ama lisans/atıf aynı kalır |
| L5 | `index.html:18` | URL'de `subset=latin-ext` parametresi yok | **BELİRSİZ** | Google Fonts `unicode-range` ile latin-ext'i otomatik sunar ve ADR-0067 §5 "latin-ext blokları var" diye doğrulamış; bu ortamda **ağ doğrulaması yapılamadı** |

---

## 8. TEMİZ OLDUĞU KANITLANAN ALANLAR (özet)

1. **Hero sayaç ızgarası:** `CounterDisplay.vue:221` — 36/54/72, sentetik bold yok, tracking yok, `tabular-nums` var.
2. **Canvas partikül:** `JuiceLayer.vue:251,607,612` — 18/36, ağırlık 400, kontur ölçekli.
3. **`font-hand` disiplini:** Tüm repoda 3 span, K3+ kapılı, `aria-hidden`, K0'da matematiksel olarak görünmez (`--substrate-opacity: 0`).
4. **TR'siz `m6x11`:** Sıfır kod referansı; `m6x11.woff2` repo genelinde yok; `ATTRIBUTION.md` yerinde.
5. **Eski aile temizliği:** Chakra Petch 0, JetBrains 0, `Inter` yalnız 1 yorum satırı; 13 hardcoded bildirimin tamamı güncel; `.vue` içinde sıfır hardcoded font.
6. **Izgara-dışı/sentetik-bold riski:** `font-display` ile `font-bold/extrabold/black` veya `tracking-*` kesişimi **0**.
7. **`tabular-nums` yayılımı:** 140/36; Header, DimensionRow, tüm sekmeler, tüm modallar, tüm istatistik panelleri ve ticker sayı okumaları mono/`tabular-nums` ile karşılanıyor.
8. **Yükleme tutarlılığı:** preload + swap + tek Google isteği + Tailwind token üçlüsü uyumlu; src'de çift import yok.

---

## 9. KAPSAM DIŞI / EMİN OLUNAMAYAN NOKTALAR

| Konu | Durum |
| :--- | :--- |
| CRT şiddet eğrisi | `style.css:584-637` K0 `--crt-intensity: 0.05` (sözleşme/plan O3: K0 %10, K1 %35, K2 %45). **A2 konusu değil** (Faz A/B), ama plan-la kod arasında sapma var — A1 denetçisine not. `style.css:516-524` tüm CRT katmanları `display:none !important` ile kapalı. |
| Görsel doğrulama | Bu ortamda Chromium/Playwright yok → render/FOUT/font yüklenmesi **ekran görüntüsüyle doğrulanamadı** (ADR-0066 §5 aynı kısıtı kaydediyor). Tüm bulgular statiktir. |
| Google Fonts ağ yanıtı | `latin-ext` subset'inin gerçekten servis edildiği **test edilemedi**. |
| `dist/` | Yalnız son derleme kanıtı olarak kullanıldı; güncel çalışma ağacı kaynağı değildir (repo notu: commit edilmemiş uçuş var). |
| Diğer görsel eksenler | Rezerve renk, ramp, glif, shake, motif (dama/gül/tekerlek/yırtık yeniden çizimi) **A2 kapsamı dışı**. |
| `text-[15px]` (CounterDisplay:240) ve `text-[13px]` (244) | Mono bağlamda oldukları için **18 ızgarası kuralı bunlara uygulanmaz** (kural yalnız display içindir) — ihlal sayılmadı. |

---

## 10. ÖNERİLEN DÜZELTME SIRASI

| Sıra | Eylem | Gerekçe | Dosya |
| ---: | :--- | :--- | :--- |
| 1 | `TimeClockOverlay` display kullanımını karara bağla (mono'ya düş **veya** sözleşmeye "kadran okuması" istisnası ekle + ADR-0068'i güncelle) | R1/R2 tek gerçek rol ihlali; sözleşme yorumu karara bağlanmadan ızgara düzeltmesi de anlamsız | `visual-language.md` §7 + `TimeClockOverlay.vue` |
| 2 | `sm:text-6xl` → `sm:text-[54px]`; `text-[13px] sm:text-[15px]` → `text-[18px]` | G1/G2 — piksel font bulanıklığı; düzeltme tek satır | `TimeClockOverlay.vue:486,502` |
| 3 | `WelcomeBackModal.vue:67`'ye `tabular-nums` (veya `font-mono`) ekle | T1 — tek onaylı jitter eksiği | `WelcomeBackModal.vue` |
| 4 | Canvas fallback'ini token ile hizala veya neden mono olduğunu yorumla; `style.css` gövde fallback'ini Tailwind `sans` ile eşle | L1/L2 — bakım/tek kaynak | `JuiceLayer.vue:607`, `style.css:31`, `tailwind.config.js:40` |
| 5 | (Opsiyonel) `font-extrabold/font-black` sınıflarını `font-bold`'a sadeleştir | 800/900 zaten 700'e düşüyor; sınıf adı yanıltıyor | 14 satır (§5) |
| 6 | `m6x11plus.woff2` dönüşümü değerlendir (lisans/atıf aynı) | 18 KB ttf → daha küçük transfer | `public/fonts/` |
