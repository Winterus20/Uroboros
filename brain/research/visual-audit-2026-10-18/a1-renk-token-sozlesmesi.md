# A1 — RENK & TOKEN SÖZLEŞMESİ DENETİMİ (S2 · S9.2)

- **Tarih:** 2026-10-18
- **Kapsam:** `src/style.css` (2050 satır) · `tailwind.config.js` · `src/App.vue` · 53 `src/components/**/*.vue` · `src/composables/**` · `src/game/motifs.ts` · `brain/scratchpad/harness/contrast.mjs`
- **Referans sözleşme:** `brain/context/visual-language.md` §2 (renk sözlüğü), §3 (katman), §4 (okunabilirlik kanonu), §9.2 (rezerve renk) · ADR-0060/0061/0062/0063/0065 · öncül ADR-0049 (Kural 2/3), ADR-0058 (kural 2/3), ADR-0044
- **Yöntem:** salt-okunur; her bulgu `dosya:satır` + kısa alıntı + ihlal edilen madde ile. Kontrast ölçümleri WCAG 2.x relatif parlaklık formülüyle, yarı saydam yüzeyler zemine kompozitlenerek yeniden hesaplandı. `npm build/test` çalıştırılmadı; `src/` altında hiçbir dosya değiştirilmedi.
- **Güncel ağaç notu:** görev brief'indeki sayılar (≈106 hex / 15 dosya, ≈158 bg-black / 40 dosya) bu ağaçta sürüklenmiş durumda: **131 hex / 16 dosya**, **167 bg-black / 41 dosya**. Fark büyük ölçüde yeni/değişen `TimeClockOverlay.vue` (18 hex) ve `AnomalyOverlay.vue` (41 hex) kaynaklıdır.

## 0. Özet sayılar

| Ölçüm | Değer |
| :--- | :--- |
| `src/` dosya | 188 (53 `.vue`, 118 `.ts`, 1 `.css`, 16 motif `.svg`) |
| `.vue` içinde hardcoded hex | **131 kullanım / 16 dosya / 47 farklı literal** |
| `style.css` içinde hardcoded hex | **88 kullanım / 56 farklı literal** |
| Tailwind palet renk sınıfı (`text-rose-500` vb.) | **1890 kullanım** (slate 704 · cyan 500 · purple 199 · rose 180 · amber 117 · blue 65 · emerald 36 · violet 32 · sky 17 · fuchsia 15 · indigo 11 · teal 10 · orange 3 · green 1) |
| `bg-black/*` | **167 kullanım / 41 dosya** (15 scrim · 19 disabled · 2 input · 131 girinti yüzeyi) |
| `var(--…)` kullanan `.vue` | **3 dosya**; `--ds-*` renk tokenı kullanan `.vue`: **yalnız 1** (`ScreenOverlay.vue`) |
| Ölü ilan edilen token | `--bicycle`, `--ds-prestige`, `--ds-locked`, `--ds-bonus`, `--ds-danger`, `--ds-bg`(yalnız 1 tüketici), `--feast`(0 tüketici), `--crt-*` (5 token) → **toplam 11 token 0/dolaylı-sıfır tüketici** |
| Bulgu | **KRİTİK 0 · YÜKSEK 3 · ORTA 17 · DÜŞÜK 6** |

---

## 1. Semantik token envanteri ve tüketicileri

| Token | Tanım | `var()` tüketici | Durum |
| :--- | :--- | :--- | :--- |
| `--ds-bg: #0a0608` | style.css:69 | `style.css:28` (base) — **tek** | ⚠️ Sözleşme §2/A2 "tek zemin kaynağı": sayfa tabanı doğru, ama literal 3 yerde tekrar ediyor (bkz. §4) |
| `--ds-panel* / --ds-card* / --ds-hero` | 70-74 | style.css:151,160,168,175,186 | ✅ Panel ailesinde tek kaynak; ancak 11 `.vue` zemin kaçağı var (§4) |
| `--ds-border / --ds-track` | 75-77 | 154,161,274 | ✅ |
| `--feast-rgb: 255 51 85` | 84 | 6 yer (540, 704, 734, 778, 814 + 90) | ✅ CSS içinde tek kaynak |
| `--feast: rgb(var(--feast-rgb))` | 85 | **0** | ⚠️ Takma ad hiç tüketilmiyor (zararsız ama ölü) |
| `--bicycle: #c40f2e` | 86 | **0** | ❌ Bkz. Y-2 |
| `--ds-prestige / --ds-locked / --ds-bonus / --ds-danger` | 106-109 | **0** | ❌ Bkz. O-1 |
| `--ds-vignette-core / -warm` | 89-90 | `ScreenOverlay.vue:157` + `style.css:1672` | ✅ Tek `.vue` tüketicisi |
| `--crt-*` (5 token) | 93-99 | yalnız `.crt-layer` türevi (hepsi `display:none`) | ❌ Bkz. Y-1 |
| `--substrate-opacity / --motif-band-opacity` | 100-101 | `.collage-*` (728,735,742,755,768), `.motif-band` (651,654) | ✅ [data-corruption] eğrisiyle besleniyor |

**Yapısal tespit:** 53 Vue bileşeninin **52'si** hiçbir `--ds-*` renk tokenı tüketmiyor; renk yalnız Tailwind palet sınıfları (1890 kullanım) ve hardcoded hex (131) üzerinden geliyor. Token katmanı fiilen "CSS-only" bir sistemdir; bileşenler sözleşmeyi token adıyla değil, sınıf adıyla konuşuyor.

---

## 2. Hardcoded hex envanteri — sınıflandırma

`.vue` içindeki 131 kullanımın dağılımı (otomatik sınıflandırma):

| Sınıf | Kullanım | Dosyalar | Karar |
| :--- | :--- | :--- | :--- |
| Inline SVG / gradient (`stop-color`, `stroke=`, `fill=`) | **50** | AnomalyOverlay, TimeClockOverlay, AuthModal (Google logosu) | ✅ Meşru dekoratif — **dokunma** (renk tonları için bkz. D-2/D-3) |
| JS renk haritası (canvas/ikon) | **57** | AnomalyOverlay, JuiceLayer, TimeClockOverlay, CrisisTab, DimensionsTab, HeartBurstLayer, FloatingThumbBar | ✅ Meşru; **ancak feast rengi burada token'ı atlıyor** (§3, O-2) |
| Tailwind arbitrary zemin/yüzey (`bg-[#…]`, `from-[#…]`, `via-[#…]`) | **12 (11 satır)** | App, AchievementToast, AdminPanel, AlgorithmicSwirl, AnomalyOverlay, CommentTicker×3, ConfirmModal, FloatingThumbBar, WelcomeBackModal | ❌ **Zemin kaçağı** — bkz. O-5, O-6 |
| Diğer (JS/palet) | **12** | — | ✅ |

Tam liste (zemin kaçağı olan 11 satır):

| Dosya:satır | Alıntı | Sorun |
| :--- | :--- | :--- |
| `App.vue:220` | `bg-[#130f14]/80` | `--ds-panel` yerine literal |
| `AchievementToast.vue:54` | `bg-[#141017]/95` | aynı |
| `AdminPanel.vue:417` | `bg-[#140c12]` | aynı |
| `AnomalyOverlay.vue:209` | `bg-[#110d12]` | aynı |
| `CommentTicker.vue:368` | `bg-[#130f14]/85` | aynı |
| `CommentTicker.vue:394-395` | `from-[#130f14]` / `to-…` | aynı (maske gradyanı) |
| `ConfirmModal.vue:47` | `bg-[#120e13]/95` | `--ds-panel-strong` yerine literal |
| `WelcomeBackModal.vue:59` | `bg-[#120e13]/95` | aynı |
| `FloatingThumbBar.vue:108` | `bg-[#100c11]/90` | `--ds-hero` yerine literal |
| `AlgorithmicSwirl.vue:515` | `via-[#0a0608] to-[#07030a]` | `--ds-bg` **birebir** duplikasyonu |

**Karşılaştırma:** tokenlar sırasıyla `rgba(19,14,19,.78)`, `rgba(20,15,20,.90)`, `rgba(19,14,18,.88)`, `rgba(19,13,17,.90)`; kaçaklar `#130f14`=(19,15,20), `#120e13`=(18,14,19), `#110d12`=(17,13,18), `#100c11`=(16,12,17), `#141017`=(20,16,23), `#140c12`=(20,12,18). Yani **3 token değerine karşı 6 farklı kopya** → sessiz renk sürüklenmesi (drift).

---

## 3. Rezerve renk semantiği (§9.2) ihlalleri

| # | Dosya:satır | Alıntı | İhlal | Ciddiyet |
| :--- | :--- | :--- | :--- | :--- |
| O-7 | `CrisisTab.vue:91,99` | `sweet_spot… color: '#a855f7'` · `resonance… color: '#f59e0b'` | §9.2 "cyan = bonus", "altın = **SADECE** progression/prestij/milestone". `sweet_spot` (8× akış, +%100 anomali) ve `resonance` (+%50 Hz) **bonus** fazlarıdır; biri violet (kütle katmanı), biri amber (prestij) ile boyanıyor. Aynı nesnede `badgeClass` cyan iken `color` farklı hue → tek semantik iki hue | ORTA |
| O-8 | `RecordsPanel.vue:93-98` | `<Flame class="w-4 h-4 text-rose-400" />…Rezonans Hipnozları … text-rose-300` | §9.2 "kırmızı = tehlike". Rezonans kombosu (bonus olay) rose ile gösteriliyor; aynı panelde anomali/tekillik sayaçları cyan (§9.2 doğrusu). Bonus = cyan olmalıydı (veya feast) | ORTA |
| O-16 | `AchievementsTab.vue:146` | `focus:border-amber-500/50` (arama girdisi) | Amber'in **prestij dışı** kullanımı (genel odak vurgusu). §9.2 "altın SADECE…" | ORTA |
| O-13 | `AutobuyerCard.vue:313` (+138, 294) | `Açılış Maliyeti: <span class="text-blue-300">` · `bot.enabled ? 'text-blue-400' : 'text-slate-600'` | `blue` §9.2 rezerve listesinde yok; ADR-0058 §2.3 blue'yu "yalnız bölüm kimliği"ne atar. Burada **durum** (aktif maliyet / etkin) rengi olarak kullanılıyor → "durum ≠ hue" | ORTA |
| O-3 | `style.css:84` vs `style.css:106`/palet | `--feast-rgb: 255 51 85` ↔ rose-500 `#f43f5e` | Ölçüm: feast **h=350° s=100 l=60**, rose **h=350° s=89 l=60** → **aynı hue, aynı açıklık, 11 puan doygunluk farkı**. §2 "feast … rose ile karışmaz: rose ikaz işaretidir, feast kalabalık enerjidir" ayrımı bu değerlerle ekranda kurulamaz | ORTA |
| D-5 | `PastRunsPanel.vue:76` | `bg-rose-500/20 text-rose-300 …Meydan Okuma: C1` | Başarıyla **tamamlanmış** koşuyu (aynı satırda `Tamamlandı` cyan) rose rozetle işaretliyor; "tehlike" değil kimlik | belirsiz / DÜŞÜK |
| — | `style.css:813-814` | `border-color: rgba(244,63,94,.45)` + `box-shadow: …rgb(var(--feast-rgb)…)` | Aynı yüzeyde rose **ve** feast → §2 ayrımına aykırı; ADR-0063 §2.3 bunu bilinçli kabul etmiş ("çerçeve dekoratiftir") | bilinçli sapma / DÜŞÜK |

**Kilitli durumu (gri) — PASS:** `text-slate-600` ile 34 satırda kilitli metin; `LockedFeature.vue:39-58` = `ds-ramp-locked` + `progress-fill-slate` + `bg-black/20` → sözleşmeye tam uyumlu. Kilitli gösterimde gri dışı hue kullanan örnek bulunamadı (tek istisna O-13'ün maliyet metni).

**Amber denetimi (117 kullanım):** örneklenen tamamı prestij/progression/milestone (SP, tekillik, başarım, galaksi, `arcPercent>=100`, D8) → tek sapma O-16. **Cyan denetimi (500 kullanım):** telemetri/bonus ağırlıklı; tehlike için cyan kullanımı bulunamadı.

---

## 4. Tek zemin kaynağı kuralı (A2 / ADR-0061 §2.1-2.2)

- `body { background-color: var(--ds-bg) }` (**style.css:28**) tek gerçek kaynak ✅; `App.vue:168` kök div'de zemin sınıfı **yok** ✅; `index.html:7 theme-color #0a0608` literal (ADR gereği zorunlu) ✅; `tailwind.config.js:21 dark.950 = #0a0608` ✅ hizalı.
- **Ancak `--ds-bg` değeri 3 yerde literal tekrar ediyor:**
  - `style.css:1547` → `::-webkit-scrollbar-track { background: #0a0608; }` (token yerine literal)
  - `AlgorithmicSwirl.vue:515` → `via-[#0a0608] to-[#07030a]` (birebir duplikasyon + ikinci bir near-black)
  - `tailwind.config.js:21` (kabul edilebilir; ⚠️ `dark-950` sınıfı da ayrıca tüketiliyor → Y-3)
- **`bg-black/*` (167/41) — hepsi meşru translucent katman:** 15 scrim/overlay (`inset-0|fixed|z`), 19 disabled yüzey, 2 input girintisi, 131 girinti (inset well). En yüksek opaklıklar `bg-black/85` (2), `/80` (5). Opak zemin kaçağı **yok**; ADR-0065'in "162/162 translucent" tespiti güncel ağaçta da geçerli (167/167). → **dokunma.**
- **Gerçek kaçaklar:** §2'deki 11 `bg-[#hex]` satırı + `bg-dark-*` ailesi (Y-3).

---

## 5. Katmanlı tone türetimi (motifs.ts)

- `MotifTone = 'feast' | 'bone' | 'ember'` (`motifs.ts:53`) — **yalnız bu üçü** ✅.
- 16 motif dağılımı: feast 5 (`delik, gul, karalama, catlak, yildiz`), bone 7, ember 4. Rezerve durum hue'ları (rose/cyan/amber/purple) kayıtta **yok** ✅ ADR-0063 §2.1 uyumlu.
- Ton CSS'ten gelir (`motif-tone-*`, style.css:704-706), SVG'ler `currentColor` kullanır (16 dosyada 26 `currentColor` referansı) ✅.
- **Tek kusur:** `motif-tone-ember { color: rgba(196, 15, 46, 0.85) }` (**style.css:706**) = `#c40f2e` = `--bicycle` değerinin **literal kopyası**. Yani `--bicycle` tokenı hiç tüketilmiyor ama değeri elle yazılmış (bkz. Y-2).
- **Brief ihlali:** `src/assets/motifs/goz.svg` (satır 1) → `fill="var(--ds-bg, #0a0608)"`; `gic-motif-redraw-brief.md:37-38` bunu açıkça **yasaklıyor** ("harici referans, `var(--ds-bg)` gibi arka plan rengi hilesi"). `motifs.test.ts` yalnız `<svg` + `currentColor` kilitlediği için test yeşil kalır → test boşluğu. (goz, yeniden çizilmemiş 12 eski motiftendir; stroke-width 2.) — **O-14**

---

## 6. WCAG AA kontrast (harness kapsamı + yeni sıcak palet)

**`contrast.mjs` neyi kapsıyor:** 3 zemin (sayfa + `--ds-panel/.78` + `--ds-card/.88` + `--ds-hero/.90`) × 13 metin tokenı (slate-100…700 override'ları, cyan-300, amber-300, purple-400, rose-400, emerald-400, `--feast`) · eşik 4.5:1 · `--bicycle` bilinçli olarak "yüzey" sayılıp eşik dışı (kontrast.mjs:68-69) · `--feast` sayfa zemininde 5.62:1 (style.css:80 yorumuyla tutarlı, doğrulandı).

**Kapsamadığı (ölçülmemiş) sınıflar:**
1. Renkli metin × **renkli yarı saydam yüzey** (ör. `text-rose-200` on `bg-rose-950/40`, `text-amber-200` on `bg-amber-500/20`) — kod tabanında onlarca kez var.
2. `*-200 / *-300 / *-100` opaklık varyantları (yalnız cyan-300/amber-300/purple-400/rose-400 ölçülü).
3. `slate-500/600` üzerine `bg-black/40` kompozisyonu (input/girinti yüzeyleri).
4. Kaçak zeminler (`#130f14`, `#120e13`, `#100c11` …).
5. `text-black`/`text-slate-950` **dolu amber buton** üzerinde (`SingularityButton.vue:49`, `SingularityTab.vue:103`).
6. Rezerve dışı aileler (violet/indigo/sky/teal/fuchsia/emerald-200).
7. UI bileşeni 3:1 eşiği hiç ölçülmüyor (yalnız normal metin 4.5:1).

**Tarafımca hesaplanan 33 kapsam-dışı çift:** **0 ihlal**, en düşük oran `slate-600 on --ds-panel` = **4.74:1**. En yakın takip: `slate-600 on sayfa` 4.93 · `slate-500 on --ds-card` 5.05 · `slate-500 on #130f14/80` 5.06 · `purple-400 on bg-purple-950/30` 6.99. → **Yeni sıcak palet + yeni bileşen katmanlarında WCAG AA riski tespit edilmedi**; bulgu, harness'ın bu sınıfları **hiç ölçmemesi**dir (O-17, regresyon koruması boşluğu — mevcut ihlal değil).

---

## 7. Bulgu tablosu (dosya bazlı)

| # | Dosya:satır | Alıntı | İhlal | Ciddiyet | Önerilen düzeltme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Y-1 | `style.css:516-524` + `useNavigation.ts:325-326` | `.crt-layer, .crt-scanlines, .crt-vignette, .crt-glow, .layer-crt { display:none !important }` · `document.documentElement.classList.add("crt-off")` | Sözleşme §3 L1 "CRT KAPLAMA … **HEP AÇIK** (frenli)" + ADR-0061 §2.3/§2.5 + ADR-0062 §2.2 (K0→K4 CRT şiddet eğrisi). CRT DOM tüketicisi **0** (`.crt-layer` hiçbir `.vue`'da basılmıyor); köke `crt-off` sabit; K1-K4 `--crt-*` ezmeleri tüketicisiz. Doğrulama sonucu: CRT **style.css'te tanımlı ama tamamen kapalı** | **YÜKSEK** | Karar kullanıcıya ait görünüyor (`CrtOverlay.vue` silinmiş). İki yol: (a) katmanı geri getir (App kök kardeşi, z-index 40, `pointer-events-none`) + `crt-off` koşullu yap, (b) katmanı kalıcı kaldır: ADR + `visual-language.md` §3/§4 güncelle (sapma önce sözleşmede yazılmalı, §8) ve `--crt-*` + K1-K4 CRT satırlarını ölü kod olarak temizle |
| Y-2 | `style.css:86` (+706) | `--bicycle: #c40f2e;` — tüm `src`'de başka referans **0**; aynı RGB `rgba(196,15,46,.85)` olarak `motif-tone-ember`'da literal | Sözleşme §2 "bicycle … buton/joker yüzeyleri"; ADR-0060 §2.3. Token tanımlı, hiçbir yüzey tüketmiyor → pivotun ikinci rengi **uygulanmamış**; değeri de elle kopyalanmış | **YÜKSEK** | Ya `--bicycle-rgb: 196 15 46` kanal tokenı aç ve `.motif-tone-ember` + `--ds-danger` derin varyantları + kriz/edition yüzeylerinde tüket; ya da tokenı sil ve ADR'de "bicycle kullanılmadı" diye kayda geçir |
| Y-3 | `tailwind.config.js:19-26` + `AuthModal.vue:145,149,189,222,234,240,285,335,339,368,395,460` · `CloudConflictModal.vue:63,83,133` · `CloudSaveSection.vue:54,82` · `CrisisTab.vue:304` | `dark: {950:'#0a0608', 900:'#141016', 850:'#1b151b', 800:'#241b22', 700:'#33262e'}` · `bg-dark-900`, `bg-dark-950/80` | Sözleşme §2 + ADR-0061 §2.1-2.2 "tek kaynak zemin / panel yüzeyleri tokenleşir". `bg-dark-950` = `--ds-bg` literal duplikasyonu; `dark-900/800/700` = `--ds-panel/--ds-card/--ds-hero` ailesinin **paralel** ikinci ölçeği. 24 sınıf kullanımı / 4 dosya. `dark.900 #141016` soğuk-eğilimli (R20 G16 B22) → sıcak zemin kuralından sapıyor | **YÜKSEK** | `dark-*` ölçeğini kaldır; modal yüzeylerini `--ds-panel-strong`/`--ds-hero` (veya `.modal-glass` utility'si) üzerinden ver; `.modal-glass` zaten tanımlı (style.css:490) |
| O-1 | `style.css:106-109` vs `119-127` | `--ds-prestige:#f59e0b; --ds-locked:#64748b; --ds-bonus:#06b6d2; --ds-danger:#f43f5e;` / `.ds-ramp-locked{border-color: rgba(100,116,139,.32)}` `.ds-ramp-partial{border-color: rgba(245,158,11,.45)}` | 4 rezerve renk tokenı **0 tüketici**; ramp sınıfları aynı değerleri literal tekrar ediyor → iki kaynak, drift riski (§9.2 "durum ≠ hue" altyapısı) | ORTA | `.ds-ramp-locked{ border-color: color-mix(in srgb, var(--ds-locked) 32%, transparent) }` benzeri tek kaynak; ya da kullanılmayan 4 tokenı sil |
| O-2 | `style.css:84-85` vs `src/core/particles.ts:100,114` | `--feast-rgb: 255 51 85` ↔ `{ color: '#ff3355', maxRadius: 260 }` (crunch sahnesi, iki satır) | Feast rengi iki kaynakta: CSS token + JS literali. `--feast-rgb` değişse canvas şöleni değişmez (§2 "tek kaynak ilkesi" + ADR-0064) | ORTA | `particles.ts` içine `export const FEAST_HEX = '#ff3355'` + `particles.test.ts:33` beyaz listesini bu sabitten türet; ideali CSS'ten okumak (gerekirse `getComputedStyle`) |
| O-3 | `style.css:84` / palet | feast `#ff3355` (h350 s100 l60) ↔ rose-500 `#f43f5e` (h350 s89 l60) | §2 "feast … rose ile **karışmaz**" — aynı hue/açıklık, 11 puan doygunluk farkı | ORTA | Feast'i turuncuya kaydır (ör. ~h=345-352 → 5-8° sapma + daha yüksek doygunluk) veya feast'i yalnız geniş yüzey/vinyetlerde tutup ikaz metnini rose'da sabitle |
| O-4 | `brain/context/visual-language.md:44` / tüm `src` | Sözleşme: "amber `#f59e0b → #ffbe45`" — `#ffbe45` `src`'de **0 referans** | Sözleşmede vaat edilen sıcak amber tonu hiç uygulanmamış; tek amber `#f59e0b` (style.css:106, 121/127 literalleri, `quantum.amber`) | ORTA | Ya amber'i `#ffbe45`'a ısıt (token + ramp + `quantum.amber`) ya da sözleşme satırını "değişmedi" olarak düzelt |
| O-5 | §2 tablosu (11 satır / 8 dosya) | `bg-[#130f14]/80` vb. | A2 "panellerdeki zeminler `--ds-*` tokenleriyle hizala"; sözleşme §2 tek zemin | ORTA | 11 literal → `bg-[var(--ds-panel)]`, `bg-[var(--ds-hero)]`, `from-[var(--ds-panel)]`; `App.vue:220` ve `CommentTicker.vue:368` öncelikli |
| O-6 | `style.css:1547` / `AlgorithmicSwirl.vue:515` | `background: #0a0608;` · `via-[#0a0608] to-[#07030a]` | A2 tek kaynak zemin; `--ds-bg` literal duplikasyonu (+ ikinci near-black `#07030a` sözleşmede tanımsız) | ORTA | `var(--ds-bg)`; `#07030a` gradyan ucunu tokenla veya kaldır |
| O-9 | `SingularityButton.vue:47-48` | `inChallenge && !singularityReady ? 'bg-black/30 text-slate-600 … ds-ramp-partial'` | ADR-0058 kural 2 / §9.2: `ds-ramp-partial` amber kenar (style.css:126) **kısmi** durum içindir; burada kilitli (gri metin) yüzeye sabit uygulanıyor → tek yüzeyde iki durum kanalı | ORTA | `ds-ramp-locked` (veya ilerleme varsa koşullu partial); `SingularityTab.vue:37-39` bunu doğru yapıyor — kanonik örnek o |
| O-10 | `CommentTicker.vue:369, 521-548` (+269, 426) | `.disco-mode { animation: disco-border .5s linear infinite }` · `.rainbow-text { linear-gradient(#ef4444,#f59e0b,#10b981,#38bdf8,#8b5cf6,#ec4899) }` | ADR-0049 Kural 3: "**kısılır/kaldırılır: … disco-mode, rainbow-text**" — hâlâ aktif; ayrıca tek yüzeyde 7 aile-dışı hue (§9.2 "geleceğe boş hue bırakılır") | ORTA | `disco-mode`/`rainbow-text` kaldır veya motion kapısına + feast/amber/rose ailesine indir; haber yazar renklerini (`#38bdf8`, `#facc15`) nötr slate + cyan bonus ile sınırla |
| O-11 | `style.css:1961, 1966` | `.clock-chip-forecast { background: rgba(3, 20, 30, .7) }` · `.clock-chip-profit { background: rgba(24, 10, 38, .7) }` | ADR-0061 §2.2: panel ailesi "R≈B, G en düşük" sıcak aile; bu iki çip **soğuk lacivert/mor** (G>R) → sıcak zemin kuralı | ORTA | `--ds-panel-strong` + tonu belirleyen kenarlık (`--ds-bonus` cyan) kullan; zemin sıcak kalsın |
| O-12 | `style.css:1483` | `.edition-negative { background: rgba(3, 5, 12, 0.96) !important; border: 2px solid #c084fc }` | Soğuk zemin kaçağı (R3 G5 B12); tek zemin kaynağı + sıcak palet. Ayrıca `#c084fc` `--ds-bonus`/`violet` ailesinin literal kopyası | ORTA | "Negative" kimliğini sıcak siyah (`--ds-bg` tabanlı) + violet kenarla ver; ya da ADR-0049 Kural 1 istisnası olarak sözleşmeye yaz |
| O-14 | `src/assets/motifs/goz.svg:1` | `fill="var(--ds-bg, #0a0608)"` | `gic-motif-redraw-brief.md:37-38` açık yasak ("`var(--ds-bg)` gibi arka plan rengi hilesi"); §5 "motifin içine renk gömülmez". `motifs.test.ts` bunu yakalamıyor | ORTA | Oyuk için `fill-rule="evenodd"` alt-path kullan (brief §3.3b); testi `var(|url\(|id=` yasağı ile genişlet |
| O-15 | `tailwind.config.js:27-33` · `style.css:526` | `quantum: {blue,violet,amber,emerald,crimson}` (5 renk, **1** tüketici: `TimeClockOverlay.vue:502`) · `.crt-scanlines-removed` (**0** tüketici) · `dark.850` (**0**) | Ölü token/sınıf katmanı; `quantum.*` semantik tokenların (`--ds-bonus`, `--ds-prestige`) paralel kopyası | ORTA | `quantum` paletini kaldırıp tailwind tarafında `var(--ds-*)` referanslı tek palet kur; ölü sınıfları sil |
| O-17 | `brain/scratchpad/harness/contrast.mjs:43-69` | `BACKGROUNDS = {sayfa, --ds-panel, --ds-card, --ds-hero}` · `TEXT = {slate-100…700, cyan-300, amber-300, purple-400, rose-400, emerald-400, --feast}` | Faz E "WCAG AA turu" kapsamı: renkli-metin×renkli-yüzey, `*-200/*-300` varyantları, `bg-black/40` girintileri, kaçak zeminler ve tüm UI 3:1 çiftleri ölçülmüyor → gelecekteki palet regresyonu sessiz geçer | ORTA | Harness'e (a) kaçak zeminleri + `--ds-locked/prestige/bonus/danger`, (b) `*-200/300` metin ailelerini, (c) `--ds-bg` üstü `bg-black/NN` kompozitlerini, (d) 3:1 UI eşiğini ekle |
| D-1 | `HeartBurstLayer.vue:27-31` | `'#00f0ff' … '#38bdf8' // Sky plasma … '#f59e0b'` | §9.2 rezerve listesi dışı `sky`; palet karma | DÜŞÜK | `sky` → `--ds-bonus` cyan ailesi |
| D-2 | `AnomalyOverlay.vue:259-362` (41 hex) | `#9333ea, #581c87, #f472b6, #e11d48, #0891b2, #0e7490, #164e63, #7c3aed, #f0abfc, #020617` | Inline SVG dekoratif olarak **meşru**, ancak 13+ aile-dışı ton ve `#020617` (soğuk lacivert) içeriyor; feast ailesine çekilmemiş | DÜŞÜK | Anomali ikon gradyanlarını feast/bone/ember + cyan/rose uçlarına indir |
| D-3 | `TimeClockOverlay.vue:388` | `<stop offset="62%" stop-color="#141a2b" />` | Soğuk lacivert gradyan durağı | DÜŞÜK | `var(--ds-panel-strong)`/sıcak nötr |
| D-4 | `App.vue:235` · `Header.vue:391` | `linear-gradient(to right, #00f0ff, #a855f7, #f59e0b)` (iki kopya) | Üç semantik renk literal; tekrarlı | DÜŞÜK | Ortak token/utility (`--quantum-ladder` veya sınıf) |
| D-6 | `style.css:196-203, 263-270, 293-316, 392-405` | `.hero-accent-* / .ds-badge-* / .progress-fill-* / .tab-dot-* / .btn-primary-*` | 88 hex literali; hepsi değer olarak tokenlarla örtüşüyor (`#f59e0b`, `#f43f5e`, `#06b6d4`…) ama adla değil | DÜŞÜK | Aşamalı olarak `var(--ds-*)`'a bağla; öncelik ramp ile çakışan `ds-badge-amber/rose/cyan` |

---

## 8. "Meşru, dokunma" listesi

| Öğe | Kanıt | Neden meşru |
| :--- | :--- | :--- |
| `bg-black/*` — 167 kullanım / 41 dosya | §4 sınıflandırması | Hepsi translucent katman: scrim, disabled yüzey, girinti, ilerleme yuvası. Opak zemin yok (ADR-0065 tespiti doğrulandı) |
| Inline SVG renkleri — AnomalyOverlay, TimeClockOverlay, AuthModal (Google logosu) | §2 tablosu | Dekoratif/ikon katmanı; marka renkleri (Google) zorunlu |
| Canvas paleti — `JuiceLayer.vue:373-378`, `particles.ts:57-170` | `particles.test.ts:32-33` beyaz listesi | Sözleşme paleti (mor/cyan/amber/feast/beyaz) testle kilitli |
| `.edition-poly` gökkuşağı konik gradyanı | `style.css:1452-1466` | ADR-0049 Kural 1: "karakter sadece kartlarda (Shift foil, Galaxy poly, D8 negative)"; Kural 2'nin yasakladığı **tier** gökkuşağı değil, edition kimliği |
| `.ds-ramp-*`, `.progress-*`, `.dim-glyph`, `LockedFeature.vue` | style.css:112-133, 272-300; LockedFeature:39-58 | 3-state ramp + glif + oran=çubuk sözleşmesine tam uyum |
| `motif-tone-*` + `currentColor` motifler | style.css:704-706; 26 `currentColor` referansı | ADR-0063 §2.1 ton disiplini (yalnız feast/bone/ember) |
| `--ds-vignette-*` + `ScreenOverlay` scoped kopyası | `ScreenOverlay.vue:150-158`, `style.css:1666-1673` | Tek kaynak token, senkron notu ile |
| `index.html:7 theme-color` ve `tailwind.config.js:21 dark.950` | ADR-0061 §2.1 | Literal zorunlu / hizalanmış (ama `bg-dark-950` **kullanımı** Y-3) |
| `goz.svg` dışındaki 15 motif | — | `currentColor`, gömülü renk yok |

---

## 9. Önerilen token eşlemesi

| Mevcut (literal/sınıf) | Önerilen | Gerekçe |
| :--- | :--- | :--- |
| `bg-[#130f14]/80`, `bg-[#110d12]`, `bg-[#100c11]/90` | `bg-[var(--ds-panel)]` / `bg-[var(--ds-hero)]` | O-5, O-6 |
| `bg-[#120e13]/95`, `bg-[#141017]/95`, `bg-[#140c12]` | `bg-[var(--ds-panel-strong)]` | O-5 (modal + toast ailesi) |
| `bg-dark-950 / dark-900 / dark-800 / dark-700` | `var(--ds-bg)` / `var(--ds-panel)` / `var(--ds-card)` / `var(--ds-card-hover)` | Y-3 |
| `background:#0a0608` (scrollbar), `via-[#0a0608]` | `var(--ds-bg)` | O-6 |
| `#ff3355` (particles.ts:100,114) | `FEAST_HEX` sabiti (veya `var(--feast-rgb)`'den türetme) | O-2 |
| `rgba(196,15,46,.85)` (motif-tone-ember) | `rgb(var(--bicycle-rgb) / .85)` veya tokenı sil | Y-2 |
| `rgba(100,116,139,.32)` / `rgba(245,158,11,.45)` (ramp) | `var(--ds-locked)` / `var(--ds-prestige)` türevleri | O-1 |
| `text-blue-300/400` (AutobuyerCard), `text-rose-300` (rezonans sayacı), `color:'#f59e0b'/'#a855f7'` (CrisisTab bonus fazları), `focus:border-amber-500/50` | Durum için `.ds-ramp-*`; bonus için `--ds-bonus` (cyan); tehlike için `--ds-danger`; prestij için `--ds-prestige` | O-7, O-8, O-13, O-16 |
| `rgba(3,20,30,.7)`, `rgba(24,10,38,.7)`, `rgba(3,5,12,.96)` | `--ds-panel-strong` + kenarlık hue'su | O-11, O-12 |
| `#ffbe45` | Sözleşmede söz verilen amber tonu: `--ds-prestige` + `quantum.amber` + `ds-badge-amber` | O-4 |
| `.crt-*` / `--crt-*` / `crt-scanlines-removed` | Karar sonrası: geri bağla **veya** tamamen kaldır | Y-1, O-15 |

---

## 10. Kapsam dışı / belirsiz

- **Karar gerektiren (A1 kapsamı dışı, raporlanıyor):** CRT'nin kaldırılması kullanıcı kararı olabilir; sözleşme hâlâ "hep açık" diyor. Kod mu sözleşme mi güncellenecek — bu bir ADR kararıdır (Y-1).
- **Belirsiz:** `PastRunsPanel.vue:76` rose rozeti (tamamlanmış meydan okuma kimliği) — "tehlike" mi "kriz kimliği" mi sayıldığı sözleşmede net değil.
- **Belirsiz:** `AnomalyOverlay` anomali tonları (`fyp`=violet, `void`=cyan) — violet "kütle katmanı", cyan "telemetri/bonus" olarak rezerve; anomali ikonları için hangi ailenin kullanılacağı sözleşmede tanımsız.
- **Doğrulanamayan:** Görsel/algısal karşılaştırma (ΔE, ekran görüntüsü) yapılmadı; feast↔rose ayrımı yalnız HSL farkıyla nicelendi. Gerçek monitörde ayrım için görsel tur gerekir (Faz E kriteri).
- **Kapsam dışı bırakıldı:** motion/animasyon kapı denetimi (A1 renk/ton; yalnız `disco-mode`/`rainbow-text` renk boyutuyla anıldı), tipografi (A2), katman/z-index (A4), motif stroke redraw kalitesi (ilgili brief), denge/ekonomi.
- **Çalıştırılmayan doğrulama (görev kuralı):** `npm test`, `npm run build`, `harness:contrast` çalıştırılmadı; `contrast.mjs` yalnız kaynak olarak okundu ve formülü bağımsız yeniden uygulandı.
