# "Aç Kumarhane" — Fazlı Uygulama Planı (Görsel Dil Pivotu)

**Tarih:** 2026-10-16
**Durum:** Plan onaylandı (kullanıcı: "faz faz gideceğiz") — Faz A başlangıcı bekliyor
**Okuyucu:** Orchestrator agent + her fazda görev alacak subagent'lar
**Zorunlu ön okuma:** [`brain/context/visual-language.md`](../context/visual-language.md) (bağlayıcı sözleşme) ·
[`0060-gic-phase-corruption-visual-pivot.md`](../decisions/0060-gic-phase-corruption-visual-pivot.md) (ADR)
**Öncül kurallar (geçerli, ezilmez):** ADR-0049 (okunaklı Balatro) · ADR-0057 (kart fiziği/motion) ·
ADR-0058 (rezerve renk, 3-state ramp, glif, oran=çubuk, motion kapısı) · ADR-0044 (shake containment)

> Bu belge **uygulama sözleşmesidir**: her fazın kapsamı, dosya sahipliği, adımları, kabul
> kriterleri ve doğrulama yöntemi burada tanımlıdır. Faz faz ilerlenir; her faz bitiminde
> `npm test` + `npm run build` kanıtı, brain reconciliation ve conventional commit zorunludur.
>
> **Derinleştirme kuralı:** Bir faz başlamadan hemen önce, o fazın adımları ayrı bir
> derinleştirme turunda (alt-madde, kesin sınıf/değişken adları, satır hedefleri) açılır ve
> bu belge güncellenir. Bu belge yaşayan plandır; fazlar sırayla ele alınır.

---

## 0. Dalga Haritası (kuş bakışı)

| Faz | Ad | Çıktı | Renk/Katman | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **A** | Zemin & CRT | Palet ısınması + statik CRT kaplaması + ölü `crtEffect` ayarının canlanması | L0 + L1 | Düşük (altyapı var) |
| **B** | Bozulma altyapısı | `corruption.ts` (K0–K5 türetme) + `data-corruption` mührü + CSS token tahsisi | Altyapı | Düşük (saf mantık, testli) |
| **C** | GIC kimlik kütüphanesi | Motif slot sistemi + boost motif bandı + Wrinkler kaplaması + kolaj vinyetleri | L2 + L3 | Orta (asset/yeni bileşen) |
| **D** | VS şöleni | Partikül şöleni + yutma kıvılcımları + olay saldırıları | L4 | Orta (perf) |
| **E** | Retrofit & QA | Tüm yüzey retrosu + WCAG AA kontrast turu + kapanış | Tümü | Düşük ama geniş |

**Bağımlılık zinciri:** A → (B, A'nın CRT bileşenine `--crt-intensity` besler) → C (B'nin `data-corruption`
mührünü tüketir) → D (bağımsız, C ile paralel yürüyebilir) → E (hepsinin üstüne QA).

---

## 1. Kod Denetimi (2026-10-16 anı)

| Parça | Durum | Kanıt / Dosya |
| :--- | :--- | :--- |
| `ds-ramp-*`, `dim-glyph`, rezerve renkler, `progress-*` | ✅ Var | `src/style.css:41-88` |
| 3-state motion kapısı + kök sınıf mührü | ✅ Var | `src/composables/useMotion.ts`, `useNavigation.ts:321-333` |
| `crtEffect` ayarı + `crt-off` kök sınıfı + ayarlar toggle | ⚠️ **Ölü** | `settings/GameplaySettings.vue:352-363`, `style.css:477` (`body::before/after { display:none }`) |
| `--ds-bg` ısınması | ❌ | `style.css:42` = `#07090e` (hedef `#0a0608`) |
| `--feast` / `--bicycle` | ❌ | yok |
| Tek zemin kaynağı | ❌ | `App.vue:164` `bg-[#08090d]` hardcoded; panellerde `#0c1017`/`#0d1117` dağınık |
| `src/game/corruption.ts` | ❌ | yok |
| `data-corruption` mührü | ❌ | yok |
| `src/assets/` klasörü | ❌ | **hiç yok** |
| `src/game/motifs.ts` | ❌ | yok |
| `core/particles.ts` | ❌ | yok — ama `JuiceLayer.vue` çalışan canvas partikül sistemi (particles/shockwaves/sparks + havuz + motion kapısı) |
| `AlgorithmicSwirl` (L0 istisnası) | ✅ Var, korunur | `components/AlgorithmicSwirl.vue` (ADR-0049 Kural 1) |
| Shake containment / fixed UI izolasyonu | ✅ Var, korunur | ADR-0044, `JuiceLayer.vue` shake coalescing |

**Sonuç:** Tüm altyapı katmanı hazır; eksik olan **görsel tüketici katmanı** (CRT, substrat, motif, partikül)
ve bunları besleyen **`corruption.ts` türetme modülü**. Bu plan tam olarak o boşluğu doldurur.

---

## 2. Bozulma Türetme Sinyalleri (Faz B'nin temeli)

`corruptionLevel` **kayıt formatına yeni alan EKLEMEZ**. Aşağıdaki mevcut ve **monotonik** sinyallerden
türetilir (prestij/meydan okuma resetlerinde geriye DÜŞMEZ):

| Sinyal | Kaynak | Monotonik? | Neden |
| :--- | :--- | :--- | :--- |
| `unlockedDimensionsCount` | `getters-dimensions.ts:20` → `resolvedUnlockedDimensionCount()` | ✅ | `balance.ts:117-120` `lifetimePeakShifts` kullanır — "bir kez açılan boyut kapanmaz" (ADR-0035) |
| `singularities` | `state.singularities` (kalıcı sayaç) | ✅ | Prestij sayacı asla azalmaz |
| `nightWatchUnlocked` | `state.nightWatchUnlocked` (kalıcı boolean) | ✅ | `actions-misc.ts:828` bir kez `true` olur |

### 2.1 Merdiven (önerilen eşleme)

| Seviye | Tetik (mevcut sinyal) | Sözleşmedeki karşılığı |
| :--- | :--- | :--- |
| K0 — Steril Kumarhane | `unlockedDimensionsCount < 5` | Faz 0 ilk yarısı (D5 kilitli) |
| K1 — Planck Aşınması | `unlockedDimensionsCount >= 5` | D5 açılır (mikro-karadelik doğar) |
| K2 — Kozmik Yutuş | `unlockedDimensionsCount >= 6` | D6–D8 (Dünya→Güneş→Samanyolu) |
| K3 — Çöküş Sonrası | `singularities >= 1` | Faz 1 (ilk Big Crunch, SP çağrıları) |
| K4 — Gece Nöbeti Substratı | `nightWatchUnlocked && singularities >= 1` | Faz 2 (`nightWatchUnlocked`) |
| K5 — Kadim Oburluk | — (**içerik yok**) | Faz 3; şimdilik tavan K4 |

### 2.2 ⚠️ Bilinen çakışma (karar gerekiyor)

`NIGHT_WATCH_THRESHOLD = 1e308` (`balance.ts:152`), `canSingularity = matter >= D_INFINITY = 1.79e308`
(`getters-dimensions.ts:286`, `math.ts`). Yani **nightWatch ilk tekillikten ~önce** tetiklenir.

- Naive eşleme (`K4 = nightWatchUnlocked`) K4'ü K3'ten **önce** doğurur → hatalı sıra.
- **Öneri (uygulanacak):** `K3 = singularities >= 1` ve `K4 = nightWatchUnlocked && singularities >= 1`.
  Böylece ilk koşuda `1e308`'de hiçbir şey değişmez, ilk Big Crunch'ta K3 → hemen ardından K4 gelir (monotonik).
- **Alternatif (ayrıştırma istenirse):** `K4 = singularities >= 2` → K3/K4 arası bir tam koşu boşluğu.
- Karar Faz B başında verilecek ve `corruption.test.ts`'e kilitle yazılacak.

### 2.3 Geleceğe dönük not

Faz 3 gelince K5 için gate eklenecek (aday: `singularityPoints >= 1e4000` ya da Faz 3'e özel kalıcı bayrak).
`deriveCorruptionLevel` son dönüşü `Math.min(level, 4)`; K5 açıldığında bu tavan kaldırılır.

---

## 3. Mimari Kararlar (faz-üstü, kilitli varsayılanlar)

| # | Karar | Gerekçe |
| :--- | :--- | :--- |
| M1 | **CRT statiktir.** Flicker/itiraz animasyonu yok; "scanline dünyanın parçası" (Balatro) | Idle oyunda sonsuz flicker yorucu + WCAG 2.3.1 riski; `repeating-linear-gradient` + `background-size` tek statik katman = sıfır CPU |
| M2 | **CRT kök seviyede bağımsız `<div>`**, `pointer-events-none`, `aria-hidden`, **modal katmanının ALTINDA** z-index | ADR-0044: transform/filter'lı bir ataya konursa fixed UI silinir. Modal metni okunaklı kalmalı |
| M3 | **Köke asla `filter`/`backdrop-filter` uygulanmaz** | ADR-0044 containing-block tuzağı (mobil dock + FloatingThumbBar) |
| M4 | **Tek canvas partikül** (`JuiceLayer` genişletilir), ikinci tam ekran canvas açılmaz | 2× overdraw; mevcut havuz/motion kapıları yeniden kullanılır |
| M5 | **Bozulma yalnız ambient/dekoratif katmanda** | Okunabilirlik kanonu: sayı/etiket/ramp/tooltip asla bozulmaz |
| M6 | **Motif kontratı: motif adı = dosya adı** (`src/assets/motifs/<ad>.svg`) | İleride elle çizilen asset'lerin birebir değiştirilebilirliği |
| M7 | **`m6x11` font ertelenir** (opsiyonel, bloklamaz) | Lisans + bundle maliyeti; mevcut Chakra Petch/Inter/Mono kontratı yeterli |

> M1–M4 sözleşmeden sapma değil, **detaylandırmadır**. Herhangi biri değişirse yeni ADR (0061+) açılır.

---

## 4. FAZ A — Zemin & CRT

**Hedef:** Oyunun zeminini "steril kuantum HUD"dan "sıcak ink-black kumarhane"ye çevir ve
halihazırda ölü olan CRT ayarını gerçek, okunaklı, performanslı bir kaplamaya bağla.

**Kapsam dosyaları (yalnız bunlar):**
`src/style.css` · `src/App.vue` · `src/components/CrtOverlay.vue` (**yeni**) ·
`src/components/settings/GameplaySettings.vue` · (gerekirse) `src/components/ScreenOverlay.vue`

### Adımlar
- **A1 — Token tur:** `--ds-bg: #0a0608`; `--feast: #ff3355`; `--bicycle: #c40f2e`; `--ds-vignette-warm`.
  Rezerve renk anlamları **değişmez** (rose ikaz, amber prestij, cyan bonus, purple katman).
- **A2 — Tek zemin kaynağı:** `App.vue:164` `bg-[#08090d]` → `bg-[var(--ds-bg)]`; panellerdeki
  `#0c1017`/`#0d1117` zeminleri `--ds-panel*` tokenleriyle hizala (hardcoded hex avı).
- **A3 — Sıcak vinyet:** `ScreenOverlay`'daki `cosmic-vignette`'e sıcak `--feast` tonu ekle
  (soğuk cyan merkez korunur; yalnız dış halka ısınır).
- **A4 — `CrtOverlay.vue` (yeni):** tek `div`; `repeating-linear-gradient` scanline
  (`background-size: 100% 2-3px`) + curvature vignette + hafif fosfor ışıması.
  Kapı: `.crt-off`, `.reduce-anim`, `.motion-off`, `.battery-saver` → gizle/sadeleş.
  `body::before/after { display:none }` kuralı **kalır** (tema dışı sızıntı engeli).
- **A5 — Ayarı canlandır:** `GameplaySettings` CRT toggle'ı artık gerçekten `CrtOverlay`'ı kontrol eder;
  etiket metni davranışa uyar.
- **A6 — (Opsiyonel) m6x11 değerlendirme notu:** lisans + bundle; karar M7'de ertelendi.

### Kabul Kriterleri
- [ ] Görsel: zemin sıcak ink-black; scanline `full` modda hafif ama görünür; `off`/`reduced`'de yok/sade.
- [ ] Okunabilirlik: gövde metni (`text-slate-*`) ve sayaç (`tabular-nums`) kontrastı **düşmez** (WCAG AA).
- [ ] ADR-0044: shake anında mobil dock + FloatingThumbBar **hiç titremez/silinmez**.
- [ ] Performans: CRT katmanı statik; sürekli `animation` yok; `harness:perf` regresyonu yok.
- [ ] `crtEffect` ayarı gerçekten çalışıyor (aç/kapa anında etki).

### Doğrulama
`npm run typecheck` + `npm test` + `npm run build` + `npm run harness:perf` (regresyon yok) + görsel tur (dev).

---

## 5. FAZ B — Bozulma Altyapısı

**Hedef:** `corruptionLevel` (K0–K5) mevcut durumdan türeten saf, testli modül + App kök `data-corruption`
mührü + CSS token tahsisi. Görsel tüketici (substrat/motif) Faz C'de gelir; **CRT şiddeti hemen bağlanır.**

**Kapsam dosyaları (yalnız bunlar):**
`src/game/corruption.ts` (**yeni**) · `src/game/corruption.test.ts` (**yeni**) ·
`src/stores/game/getters-misc.ts` (veya `getters-dimensions.ts`) · `src/App.vue` · `src/style.css`

### Planlanan API (isim taslağı — Faz B'de donacak)
```ts
export type CorruptionLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface CorruptionInput {
  unlockedDimensionsCount: number // monotonik (lifetimePeakShifts tabanlı)
  singularities: number
  nightWatchUnlocked: boolean
}

export function deriveCorruptionLevel(i: CorruptionInput): CorruptionLevel
export function corruptionStamp(level: CorruptionLevel): string // 'K0'..'K5'
export const CORRUPTION_META: Record<CorruptionLevel, {
  label: string          // 'Steril Kumarhane', 'Planck Aşınması', ...
  crtIntensity: number   // 0.10 → 1.00 (CSS var)
  substrateOpacity: number
  motifBandOpacity: number
  glitchIntensity: number
}>
```

### Adımlar
- **B1 — `corruption.ts`:** yukarıdaki API + §2.1 merdiveni + §2.2 kararı. Saf fonksiyon, `any` yok,
  `dec.isNan()` deseni yalnız gerekiyorsa (burada Decimal yok → sade sayılar).
- **B2 — `corruption.test.ts`:** sınır vakaları (D4/D5/D6 geçişleri, ilk tekillik, nightWatch sırası,
  monotonluk: reset senaryosunda seviye düşmez, K5 tavanı).
- **B3 — Store getter:** `corruptionLevel` (mevcut sinyallerden) — store'a **yeni state alanı eklenmez**.
- **B4 — App kök mührü:** `:data-corruption="corruptionStamp(store.corruptionLevel)"`.
- **B5 — CSS token tahsisi:** `[data-corruption="K1"] { --crt-intensity: .35; ... }` …
  Faz A'nın `CrtOverlay`'i `--crt-intensity`'i tüketir → K0'da %10, K1'de %35, K2'de ısınır.

### Kabul Kriterleri
- [ ] `deriveCorruptionLevel` deterministik ve monotonik; tüm sınır geçişleri testli.
- [ ] Kayıt formatı değişmedi (save version bump **yok**); eski kayıtlar sorunsuz yüklenir.
- [ ] `data-corruption` kökte doğru mührü basıyor; CRT şiddeti seviyeyle değişiyor.
- [ ] Okunabilirlik kanonu: hiçbir metin/ramp/tooltip bozulmuyor.

### Doğrulama
`npm test` (yeni test dosyası yeşil) + `npm run build` + eski kayıt yükleme smoke + `harness:smoke`
(baseline log10 değişmemeli — denge dokunulmadı).

---

## 6. FAZ C — GIC Kimlik Kütüphanesi

**Hedef:** Gekidan Inu Curry kolaj substratı + boost motif bandı + creepy-cute Wrinkler kaplaması +
kriz/Planck kolaj vinyetleri. Her faz kendi motif grubunu açar (labirent mantığı).

**Kapsam dosyaları:**
`src/assets/motifs/*.svg` (**yeni**) · `src/game/motifs.ts` (**yeni**) ·
`src/components/MotifBand.vue` (**yeni**) · `src/components/AnomalyOverlay.vue` ·
`src/components/CrisisTab.vue` (kolaj vinyeti tüketicisi) · `src/style.css` (substrat tokenleri)

### Motif slot kontratı
- Dosya: `src/assets/motifs/<ad>.svg` — Vite `?raw` ile import edilir.
- `MOTIFS: MotifSlot[]` → `{ id, name, group, tone, svg, weight }`.
- **Grup (labirent teması):** `planck` (K1), `cosmic` (K2), `collapse` (K3), `nightwatch` (K4).
- **Motif paleti (sözleşme §1):** diş · gül · tekerlek · göz · zincir · damalı şerit · tape ·
  yırtık kâğıt · **delik** (karadelik teması, "tekrar eden korku kökü").
- Kontrat: **motif adı = dosya adı**; ilk dalga agent üretimi SVG, ileride elle çizimle birebir değiştirilebilir.

### Adımlar
- **C1 — Slot modülü:** `motifs.ts` + ilk dalga SVG'ler (faz başına 4–6 motif).
- **C2 — Substrat katmanı (L2):** K2+'da kenar bantlarında damalı şerit / yırtık kâğıt köşeleri;
  K3'te tape yapışkanları + el yazısı annotasyon çipi; K4'te damalı zemin fikri yaygınlaşır.
- **C3 — Boost motif bandı (L3):** Kozmik Dalgalanma tetiklendiğinde duyuru kartı + yanlardan
  süzülen motif/glif bandı; **rezonans kombosunda (7x + 777x) yoğunluk katlanır**.
  Kapı: motion 3-state + `--feast` enerjisi.
- **C4 — Wrinkler creepy-cute kaplaması:** mevcut parazit görseline GIC kolaj dokusu; delik/göz motifleri.
- **C5 — Kriz/Planck kolaj vinyetleri:** kriz aktifken (rose) ve Planck yırtılması anında (K1+)
  sıcak kolaj çerçevesi; **yalnız dekoratif kenarda**, metne dokunmaz.

### Kabul Kriterleri
- [ ] Boost anında kenarlardan motif süzülüyor; rezonans kombosunda yoğunluk belirgin artıyor.
- [ ] K2+ seviyelerde substrat görünür; K0/K1'de yok (steril kalma korunur).
- [ ] Tüm motif efektleri `data-corruption` + motion kapısına bağlı; `off` modda sadeleşir/gizlenir.
- [ ] Motif ekleme **kod değişikliği gerektirmez** (yalnız yeni `.svg` + `motifs.ts` kaydı).

### Doğrulama
`npm test` + `npm run build` + `harness:perf` (canvas/DOM artışı tick'i etkilememeli) + görsel tur.

---

## 7. FAZ D — VS Şöleni (Vampire Survivors anı)

**Hedef:** Büyük olaylarda partikül kaosu, yüzen kütle sayıları, desatüre zeminde neon patlama;
zemin geçici desatürasyon + suppression penceresi. **Tek canvas** (M4).

**Kapsam dosyaları:**
`src/core/particles.ts` (**yeni**, paylaşılan fizik/havuz) · `src/components/JuiceLayer.vue` (genişletme) ·
`src/stores/game/actions-misc.ts` (olay tetikleyicilerine sahne çağrısı) · `src/style.css` (zemin knock-down)

### Olay şöleni tetikleyicileri
| Olay | Şölen |
| :--- | :--- |
| Süpernova Patlaması (7×) | Orta sahne: kıvılcım + yüzen sayı + hafif knock-down |
| Kütle Patlaması (777×) | Büyük sahne: tam şölen + desatürasyon + shake (mevcut kademe) |
| Hawking Işıması | İnce ışıma + kıvılcım hüzmesi |
| Rezonans Kombosu | Katmanlı şölen (7× + 777× üst üste) |
| İlk Big Crunch / dekad atlama | İmza sahnesi (yüksek öncelik, günde bir hissi) |

### Bütçe disiplini (Cookie Clicker/teemo.dev)
- Sabit havuz (mevcut `JuiceLayer` cap'i), emisyon tavanı; ekonomi ∞ olsa bile partikül sayısı tavanlı.
- Bas → görünür değişim ≤100 ms, `pointerdown`'da; impulse + decay, tekrarlayan pulse yok.
- Suppression window (≈400 ms): büyük sahnede sayı/ışın üretimi kuyruğa alınır (kare sessizleşir).
- Zemin knock-down: ~120 ms'de %40 desatürasyon, sonra geri.
- **ADR-0044:** shake containment + fixed UI izolasyonu birebir korunur; `offsetWidth` zorlaması yok.

### Kabul Kriterleri
- [ ] Büyük olaylarda şölen okunur; normal satın almalarda ambient sakin kalır (doz kuralı).
- [ ] Emission cap + havuz tavanı testli; `harness:perf` churn/wall regresyonu yok.
- [ ] `reduced`/`off`/`batterySaver` modlarında şölen sadeleşir/gizlenir (mevcut kapılar).
- [ ] Mobilde shake sırasında dock/parmak çubuğu titremiyor.

### Doğrulama
`npm test` + `npm run build` + `harness:perf` (churn mean/p95 baseline) + mobil görsel tur.

---

## 8. FAZ E — Retrofit & QA

**Hedef:** Yeni dilin tüm yüzeylere yayılması + WCAG AA kontrast turu (yeni sıcak paletle) + kapanış.

**Kapsam dosyaları:** `Header.vue` · `DimensionRow.vue` · `DimensionsTab.vue` ·
`CommentTicker.vue` · modal ailesi (`SettingsModal`, `ConfirmModal`, `AchievementToast`, `WelcomeBackModal`,
`CloudConflictModal`, `AuthModal`) · `StatsTab.vue` + `stats/*` — **yalnız sunum**, davranış değişikliği yok.

### Adımlar
- **E1 — Retrofit:** Yeni `--feast`/`--bicycle` ve `data-corruption` farkındalığı; sapmış yerlerde
  rezerve renk sözleşmesine dönüş (amber yalnız prestij, cyan bonus, rose risk, slate kilitli).
- **E2 — WCAG AA kontrast turu:** Sıcak zemin (#0a0608) + sıcak vinyet altında tüm metin çiftleri
  ölçülür; `<4.5:1` (küçük metin) ve `<3:1` (büyük/UI) ihlalleri listelenir ve düzeltilir.
- **E3 — Motion kapısı denetimi:** Yeni bileşenlerin (`CrtOverlay`, `MotifBand`, partikül) `full/reduced/off`
  davranışı tek `useMotion` kapısından geçtiği doğrulanır.
- **E4 — Devralınan NIT'ler:** ADR-0058'de bilinçli bırakılanlar (CommentTicker/MusicControls kök-sınıf
  tek kaynak, `progress-track-lg` tanımsızlığı) bu turda değerlendirilir.
- **E5 — Kapanış:** `npm test` + `npm run build` + `harness:smoke` + `harness:perf` + completed.md
  reconciliation + conventional commit.

### Kabul Kriterleri
- [ ] WCAG AA: rapor edilen ihlal = 0.
- [ ] Tüm yeni katmanlar tek motion kapısından geçiyor.
- [ ] `harness:smoke` baseline (log10) sabit — **denge regresyonu yok**.
- [ ] Görsel dil sözleşmesi (`visual-language.md`) ile kod birebir uyuşuyor.

---

## 9. Ortak Doğrulama Protokolü (her faz)

1. `npm run typecheck` → 0 hata (`vue-tsc`).
2. `npm test` → tüm testler yeşil (mevcut taban + yeni).
3. `npm run build` → 0 tip/derleme hatası.
4. Denge dokunulduysa (dokunulmaması esastır): `npm run harness:smoke` baseline karşılaştırması.
5. Performans dokunulduysa: `npm run harness:perf` (churn mean/p95, wall).
6. Görsel tur: `full` + `reduced` + `off` + `batterySaver` + mobil (<768px).
7. brain reconciliation: `completed.md` kaydı (tarih, sürüm, diff özeti).
8. Conventional commit + push (`feat:`/`refactor:`/`fix:`).

---

## 10. Riskler ve Tuzaklar

| Risk | Etki | Önlem |
| :--- | :--- | :--- |
| CRT'yi köke `filter`/`transform` ile uygulamak | ADR-0044: mobil fixed UI kaybolur | M2/M3: bağımsız `<div>`, köke filter yok |
| CRT okunabilirliği bozması | WCAG AA ihlali + "yazıları bozmamak" notu | Statik düşük opaklık + Faz E kontrast turu |
| Bozulmanın sayı/etiketlere sızması | Okunabilirlik kanonu ihlali | M5: yalnız ambient/dekoratif seçiciler |
| K3/K4 sıra çakışması | Yanlış seviye atlaması | §2.2 kararı + test kilidi |
| Prestijde seviyenin geriye düşmesi | Görsel regresyon | §2 monotonik sinyaller + monotonluk testi |
| İki tam ekran canvas | 2× overdraw, FPS düşüşü | M4: tek canvas |
| Motif/asset sayısının şişmesi | Bundle + bakım | Slot kontratı, tema başına 4–6 motif |
| Sonsuz flicker/animasyon | Yorucu + WCAG riski + CPU | M1: CRT statik; efekt impulse+decay |

---

## 11. Açık Kararlar (faz başında kapatılacak)

| # | Karar | Faz | Öneri |
| :--- | :--- | :--- | :--- |
| O1 | K3/K4 tetik sırası | B | `K3 = singularities>=1`, `K4 = nightWatchUnlocked && singularities>=1` |
| O2 | K4 ayrıştırması | B | K3/K4 arasına tam koşu boşluğu istenirse `K4 = singularities>=2` |
| O3 | CRT şiddet eğrisi (K0→K1→K2) | A/B | K0 %10, K1 %35, K2 %45 (tunable token) |
| O4 | CRT modal üstü mü altı mı | A | Modal **altı** (okunabilirlik) |
| O5 | Substrat yoğunluk tavanı | C | K2 %25, K4 %40 (okunabilirlik tavanı) |
| O6 | m6x11 font | A | Ertele (M7) |

---

## 12. Kayıt Akışı

Her faz kapanışında:
- `brain/tasks/completed.md` → faz girişi (tarih, sürüm, dosya listesi, doğrulama çıktıları, diff özeti).
- `brain/tasks/todo.md` → ilgili faz kutusu `[x]`.
- `brain/tasks/in-progress.md` → sıradaki faz taşınır.
- Sözleşmeden sapma olduysa: `brain/decisions/` altına yeni ADR + `visual-language.md` güncellemesi.
