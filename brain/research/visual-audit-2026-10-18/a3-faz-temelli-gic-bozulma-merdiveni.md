# A3 — Faz-Temelli GIC Bozulma Merdiveni Denetimi (S3, S4 · ADR-0062)

**Tarih:** 2026-10-18
**Kapsam:** `src/game/corruption.ts` + `corruption.test.ts`, `src/App.vue` (`data-corruption` mührü),
`src/style.css` (`[data-corruption]` token blokları + `--crt-intensity` tüketicileri),
`src/components/ScreenOverlay.vue`, `MotifBand.vue`, `src/game/motifs.ts`, `src/game/unlocks.ts`,
`src/stores/game/*` (özellikle `getters-misc.ts`, `getters-dimensions.ts`, `balance.ts`, `state.ts`)
**Yöntem:** SALT OKUNUR kod denetimi + `git diff` (commit edilmemiş uçuş) + repo geneli grep.
Kaynak değiştirilmedi; `npm build/test` çalıştırılmadı.
**Bağlayıcı belgeler:** `visual-language.md` §3 (S3 katman mimarisi) + §4 (S4 merdiven/okunabilirlik kanonu);
ADR-0060/0061/0062/0063/0064; öncüller ADR-0049/0058/0044/0035.

---

## 0. Özet (sayıyla)

| Metrik | Değer |
| :--- | :--- |
| İncelenen dosya | 12 (7 kaynak + 4 store/modül + 1 test) |
| `data-corruption` ham eşleşmesi (src) | **11** — 1 gerçek DOM mührü (App.vue:168), 6 CSS blok (K0..K5), 4 yorum |
| Ölü (tüketicisiz) tanım | `--crt-intensity` **7 tanım / 0 tüketici** · `--glitch-intensity` **7 / 0** · `decay-*` **0 / 45 satır** · `.planck-collage` **0 / 16 satır** |
| Erişilemez CSS | `[data-corruption="K5"]` bloğu **9 satır** (MAX_CORRUPTION_LEVEL=4) |
| Ölü CRT CSS | **≈129 satır** (blok bazında §7) |
| Zombi ayar | `crtEffect` — 4 dosyada tanımlı, 0 UI, 0 tüketici |
| Bulgu | **KRİTİK 1 · YÜKSEK 3 · ORTA 8 · DÜŞÜK 3** (+ 1 latent) = **15** (+1) |

**En kritik tek cümle:** `data-corruption` mührü doğru basılıyor, K0..K5 metadata kod ile birebir,
substrat merdiveni K1→K4 gerçekten çalışıyor — **ama CRT katmanı bu uçuşta tamamen öldürüldü
(`display:none !important`) ve `data-corruption`ın CRT ayağı (K0 %5 → K4 %21) hiçbir görsel
tüketiciye bağlı değil.** Sözleşme "CRT hep açık" derken kod "CRT hiç yok" diyor.

---

## 1. Türetme doğruluğu — K0..K5 eşlemesi sözleşmeyle birebir mi?

**SONUÇ: ✅ BİREBİR.** Plan §2.1 + O1 kararı + ADR-0062 §2.1 ile tam örtüşüyor.

| Seviye | Sözleşme §4 tetik | `deriveCorruptionLevel` (corruption.ts:154-167) | Karar |
| :--- | :--- | :--- | :--- |
| K0 | Faz 0 ilk yarısı, D5 kilitli | `unlocked < 5` → 0 | ✅ |
| K1 | Planck Yırtılması, D5 açılır | `unlocked >= 5` → 1 | ✅ |
| K2 | D6–D8 kozmik yutuş | `unlocked >= 6` → 2 | ✅ |
| K3 | Faz 1, ilk Big Crunch (SP) | `singularities >= 1` → 3 | ✅ |
| K4 | Faz 2 (`nightWatchUnlocked`) | `nightWatchUnlocked && singularities >= 1` → 4 | ✅ (O1) |
| K5 | Faz 3 (içerik yok) | gate yok; `Math.min(level, MAX_CORRUPTION_LEVEL=4)` | ⚪ tavan (bilinçli, ADR-0062 §2.1) |

**doğru davranış kanıtı:** K4 naive gate'i (`nightWatchUnlocked` tek başına) reddedilmiş; test
`corruption.test.ts:34` ile kilitli (nightWatch tek başına → K2 kalır). "SP çağrısı" sinyali
`this.singularities++` yalnız `actions-prestige.ts:22`'de artar; `actions-save.ts:415` 0..1e6'ya clamp eder.

**Metadata ↔ CSS değer paritesi:** ADR-0062 §2.2 "tek taraflı değişim yasak" kuralı için 6 seviyenin
7 token'ı karşılaştırıldı → **tamamı eşit** (corruption.ts:64-125 ↔ style.css:584-637). ✅

---

## 2. Monotoniklik garantisi gerçekten sağlanıyor mu?

**SONUÇ: ✅ Bugünkü eşiklerde EVET · ⚠️ Latent risk var (bkz. L-1).**

| Sinyal | Kaynak | Monoton mu? | Kanıt |
| :--- | :--- | :--- | :--- |
| `unlockedDimensionsCount` | `resolvedUnlockedDimensionCount` (`getters-misc.ts:456`) | ⚠️ koşullu | `balance.ts:117-123` `lifetimePeakShifts` tabanlı (ADR-0035) **ama** challenge cap ile `Math.min` |
| `singularities` | `state.singularities` | ✅ | Yalnız `++` (actions-prestige.ts:22); hard reset (`$reset`, SettingsModal.vue:119) tam silme |
| `nightWatchUnlocked` | `state.nightWatchUnlocked` | ✅ | Tek yönlü `= true` (actions-misc.ts:872-873), load'da boolean geri yüklenir |

- **Prestij/sıçrama reseti:** `buyGalaxy()`/`shift` koşu sayacını sıfırlar ama `lifetimePeakShifts`
  (`actions-misc.ts:345-346`) ve `singularities` kalır → seviye düşmez. ✅
- **L-1 (latent):** `resolvedUnlockedDimensionCount` teknik olarak monotonik **değildir**:
  `balance.ts:122-123` `cap = challengeDimensionCap(state); return Math.min(base, cap)`.
  Aktif C7 `maxDimensions: 6` (`challenges.ts:147`) iken base 8 → 6'ya düşer. Bugün K1/K2
  eşikleri (5 ve 6) ≤ 6 olduğu için **gözlemlenebilir seviye düşmesi yok**; ancak garanti
  "cap ≥ 6" varsayımına bağlı. Gelecekte daha düşük capli bir challenge K1/K2'yi geriye düşürür.
  *Belirsiz değil, ölçülmüş bir tasarım kırılganlığı.* Öneri: corruption getter'ı challenge
  cap'inden bağımsız `dimensionCapFloor`/peak değerini kullansın.
- **Hard reset:** `store.$reset()` (SettingsModal.vue:119, AdminPanel.vue:398) hem `singularities`
  hem `lifetimePeakShifts`'i sıfırlar → K0'a düşer. Bu **tam silme**dir, prestij reseti değil; ihlal sayılmaz.

---

## 3. Kayıt formatı

**SONUÇ: ✅ YENİ ALAN EKLENMEDİ.**

- `corruptionLevel` bir **Pinia getter**'dır (`getters-misc.ts:454`), state değil; `state.ts`'te
  corruption alanı yok. `store-api.ts:159` yalnız tip beyanı.
- Yeni uçuşta `models/save.ts` / `actions-save.ts`'e corruption alanı eklenmemiş (`git diff --stat`:
  save dosyaları değişmemiş).
- ⚠️ Ancak eski **`crtEffect`** alanı format içinde durmaya devam ediyor (bkz. D-1).

---

## 4. Mührün tüketimi — App root / ilk render / reaktivite

| Soru | Cevap | Kanıt |
| :--- | :--- | :--- |
| App root'ta mı? | ✅ Evet, tek kök `<div>` | `App.vue:168` ` :data-corruption="corruptionStamp(store.corruptionLevel)"` |
| İlk render'da mı? | ✅ Evet, K0 ile basılır | Getter default K0; `onMounted` deserialize sonrası reaktif güncellenir (App.vue:98-109) |
| Reaktif mi? | ✅ Evet | Getter `state.singularities`, `state.nightWatchUnlocked`, `resolvedUnlockedDimensionCount(state)` okur |
| `data-corruption` dışı ikinci sinyal kaçağı? | ⚠️ 3 kaçak | `--glitch-intensity` (0 tüketici), `decay-*` (0 tüketici), `.collage-checker` CrisisTab'da substrat tokenıyla çiziliyor |

**Tek mühür kaynağı doğru:** tüm bozulma durumu tek kök niteliğinden akıyor; bant/substrat
şiddeti CSS token'ından, varlığı TS `v-if`'ten (ADR-0063 §2.2 ile uyumlu).

---

## 5. K-Seviyesi × Görsel Katman Matrisi (asıl çıktı)

`var` = katman o seviyede gerçekten render ediliyor · `kısmi` = var ama koşullu/ezilmiş ·
`yok` = o seviyede çalışmıyor · `ölü` = tanımlı ama 0 tüketici (her seviyede yok).

| Katman | K0 | K1 | K2 | K3 | K4 | K5 | Kanıt (CSS satırı / dosya) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CRT scanline+vinyet+fosfor** | ölü | ölü | ölü | ölü | ölü | ölü | `style.css:516-524` `display:none !important`; tokenlar `585/594/603/612/621/630` |
| **Substrat yoğunluğu** | var (0) | var (0.06) | var (0.25) | var (0.32) | var (0.40) | erişilemez (0.55) | `style.css:589-634` → `728,735,742,755,768` |
| **Yırtık-kâğıt vinyet köşeleri** | yok | var | var | var | var | erişilemez | `ScreenOverlay.vue:120-125`; `style.css:737-747` |
| **Damalı şerit (üst/alt)** | yok | yok | var | var | var | erişilemez | `ScreenOverlay.vue:126-129`; `style.css:725-729` |
| **Tape yapışkanları** | yok | yok | **yok** (sözleşme K2 der) | var (4 adet) | var | erişilemez | `ScreenOverlay.vue:130-134`; `style.css:748-756` |
| **El yazısı `.collage-scrawl`** | yok | yok | yok | var (3 not) | var | erişilemez | `ScreenOverlay.vue:137-139`; `style.css:760-770` |
| **Glitch bölgesi** | ölü | ölü | ölü | **ölü** | ölü | ölü | token `style.css:102,591,600,609,618,627,636`; **0 `var(--glitch-intensity)`** |
| **Motif bandı — süreklilik** | yok | kısmi (yalnız boost) | kısmi | kısmi | **kısmi** (sözleşme "sürekli akar") | erişilemez | `MotifBand.vue:23-34` `hasBoost` gate |
| **Motif bandı — opaklık eğrisi** | — | kısmi (0.08→0.45 ezik) | kısmi (0.25→0.45) | kısmi (0.45) | var (0.85) | erişilemez (1.0) | `style.css:650-655` `max(var(...), 0.45)` |
| **Chromatic aberration (K4)** | yok | yok | yok | yok | **yok** | yok | 0 referans (`chromatic/aberration/kromatik` yalnız yorum) |
| **Damalı zemin (K4)** | yok | yok | yok | yok | var | erişilemez | `ScreenOverlay.vue:141-145`; `style.css:730-736` |

**K-ladder'ı gerçekten taşıyan tek eksen:** `--substrate-opacity` (K1 0.06 → K4 0.40) + substrat
katmanlarının TS `v-if` basamakları. Diğer üç knob (`--crt-*`, `--glitch-*`, `--motif-*`) ya ölü
ya ezik.

---

## 6. CRT katmanı — CrtOverlay silindi, CRT gerçekten çalışıyor mu?

**SONUÇ: ❌ HAYIR. CRT tamamen devre dışı; "style.css tarafına taşındı" doğru değil.**

Kanıt zinciri (commit edilmemiş uçuş):

1. `src/components/CrtOverlay.vue` **silindi** (`git diff`: `-31 satır`); App.vue'dan import + render kaldırıldı (`App.vue` diff, satır 196 civarı boş kaldı).
2. `style.css:516-524` (yeni):
   ```css
   /* CRT KALDIRILDI: fullscreen şerit dokusu istenmiyor — tüm crt katmanları susar. */
   .crt-layer, .crt-scanlines, .crt-vignette, .crt-glow, .layer-crt {
     display: none !important;
     background: none !important;
   }
   ```
   Eski `.crt-scanlines` kuralı `.crt-scanlines-removed` olarak yeniden adlandırıldı (`526`) — **hiçbir DOM bu sınıfı taşımıyor**.
3. `useNavigation.ts:325-326` (yeni): `document.documentElement.classList.add("crt-off")` — kök **her zaman** `crt-off`; ayar/motion artık hesaba katılmıyor.
   ```ts
   // CRT katmanı kaldırıldı: kök her zaman crt-off taşır (eski kayıt uyumu).
   document.documentElement.classList.add("crt-off");
   ```
4. `GameplaySettings.vue`'den "Kozmik CRT Scanline & Vinyet" toggle'ı silindi (`git diff: -20 satır`), ancak `crtEffect` alanı model/state/kayıt migrasyonunda duruyor.
5. `src` genelinde `.crt-layer` taşıyan **0 Vue bileşeni** var (`grep crt src --include *.vue` = 0 eşleşme; kalan yalnız yorumlar).
6. `index.html` temiz (CRT/scanline referansı yok; `theme-color #0a0608` ✅).

**İhlaller:** S3 §3 L1 "CRT KAPLAMA … HEP AÇIK, frenli" · S4 §4 K0–K5 CRT yüzdeleri ·
ADR-0060 §2.2 · ADR-0061 §2.3–2.5 · ADR-0062 §2.2 ("CRT şiddeti seviyeyle değişiyor" kabul kriteri).

**Karar gerekiyor (tek taraflı düzeltme yasak):** ya CRT geri getirilir (CrtOverlay veya
`body::before` üzerinden `--crt-intensity` tüketilir), **ya da** sözleşme + yeni ADR ile
"CRT kaldırıldı" yazılıp `--crt-*`/`--crt-intensity`/`crtEffect`/`crt-off`/ölü CSS temizlenir.
Mevcut durum "sessiz sapma"dır.

---

## 7. Erişilemez / ölü CSS envanteri

| Blok | Satır aralığı | Satır | Neden ölü |
| :--- | :--- | ---: | :--- |
| `.layer-crt { z-index: 40 }` | `495` | 1 | CRT DOM katmanı yok |
| CRT tüp bloğu (display:none + scanline + vignette + glow + kapılar) | `516-571` | 56 | Kök her zaman `crt-off`; eleman yok |
| `[data-corruption="K5"]` | `629-637` | 9 | `MAX_CORRUPTION_LEVEL=4` (corruption.ts:32,166) → mühür max K4 |
| `.planck-collage` (`::before/::after`) | `793-808` | 16 | Tek tüketicisi (DimensionsTab Planck barı) bu uçuşta silindi |
| `.decay-static` | `1687-1705` | 19 | 0 tüketici (HEAD'de de yok) |
| `.decay-flicker` + keyframes | `1707-1718` | 12 | 0 tüketici |
| `.decay-glitch` + keyframes + `.text-slate-200` | `1720-1731` | 12 | 0 tüketici; ayrıca okunabilir metni hedefliyor (⚠) |
| `.decay-*` reduced-motion liste kayıtları | `1620-1621` | 2 | Yukarıdaki ölü sınıflara referans |
| `body::before/after { display:none }` | `910-913` | 4 | Belgeli emniyet ağı (bilinçli) |
| **Toplam (body emniyet ağı hariç)** | | **≈129** | |

**Tüketicisiz tokenlar:** `--crt-intensity` (99,585,594,603,612,621,630 = 7 tanım, **0 tüketici**),
`--glitch-intensity` (102,591,600,609,618,627,636 = 7 tanım, **0 tüketici**),
`--crt-scanline-alpha/period/vignette-alpha/glow-alpha` yalnız ölü CRT kurallarında tüketiliyor.

---

## 8. Okunabilirlik kanonu denetimi (S4 §4 "kırılmaz kural")

| Kontrol | Sonuç | Kanıt |
| :--- | :--- | :--- |
| Bozulma ambient/dekoratif katmanda mı? | ✅ Evet | `[data-corruption]` bloklarında yalnız `--crt-*`, `--substrate-*`, `--motif-*`, `--glitch-*` (style.css:577-578) |
| Sayı/etiket/tabular-nums seçicisi var mı? | ✅ Yok | `[data-corruption]` altında metin seçicisi yok; `.collage-scrawl` yalnız ambient |
| Substratın metin üstüne binmesi | ⚠️ Risk (ORTA) | `ScreenOverlay.vue:94` `z-30` overlay > `App.vue:208` içerik `z-10`. `.collage-tape` `top:12px` (ScreenOverlay:131-132) ticker üstüne; `.collage-scrawl` `left/right:14px` (137-139) mobilde içerik `p-3`=12px iken metin üstüne |
| Glitch okunabilir veriyi bulanıklaştırıyor mu? | ✅ Bugün hayır | `.decay-glitch .text-slate-200 { text-shadow: … }` (style.css:1729-1731) okunabilir metni hedefliyor **ama sınıf hiç uygulanmıyor** → diriltilirse kanon ihlali |
| z-index çakışması | ⚠️ Küçük | ScreenOverlay `z-30` = FloatingThumbBar `z-30` (FloatingThumbBar.vue:105); DOM sırası çözer ama aynı katman |
| Motion kapısı (S4/ADR-0058) | ✅ Bantta tam | `style.css:709-722` (`.motion-off`, `.battery-saver`, reduced-motion, forced-colors); substrat statik olduğu için kapı gerekmez |
| `forced-colors` | ✅ | `style.css:771-773` tüm `.collage-*` gizlenir |

---

## 9. Bulgu Tablosu

| # | Ciddiyet | Bulgu | Kanıt (dosya:satır + alıntı) | İhlal | Önerilen düzeltme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F1** | **KRİTİK** | CRT katmanı tamamen devre dışı; K0..K5 CRT şiddet eğrisi hiç uygulanmıyor | `style.css:517-523` `display:none !important`; `useNavigation.ts:326` `classList.add("crt-off")`; `src`'de `.crt-layer` taşıyan Vue = 0 | S3 §3 L1 · S4 §4 · ADR-0060 §2.2 · ADR-0061 §2.3-2.5 · ADR-0062 §2.2 | Karar ver: CRT'yi `CrtOverlay`/pseudo-element ile geri getir **veya** yeni ADR ile "CRT kaldırıldı" deyip tüm CRT kodunu/tokenını sil |
| **F2** | YÜKSEK | `--crt-intensity` 7 yerde tanımlı, 0 tüketici (ölü knob) | `style.css:99,585,594,603,612,621,630`; `grep var(--crt-intensity)` = 0 | ADR-0062 §2.2 · plan §B5 | Tüketici ekle veya tokenı kaldır |
| **F3** | YÜKSEK | K3 "glitch bölgesel ateşler" ve K5 glitch yok | `--glitch-intensity` `style.css:102,591,600,609,618,627,636`; 0 `var()` | S4 §4 (K3 satırı) | Dekoratif kenarda gerçek glitch katmanı bağla veya tokenı kaldır |
| **F4** | YÜKSEK | K4 "motif bandı sürekli akar" yok; bant yalnız boost anında | `MotifBand.vue:23-34`: `hasBoost = floatingAnomalies>0 || activeBuffs>0`, `visible` bunu şart koşuyor | S4 §4 (K4 satırı) · ADR-0063 §2.2 | K4'te `hasBoost` şartını kaldır (sürekli akış) veya sözleşmeyi düzelt |
| **F5** | ORTA | Motif bandı opaklık eğrisi CSS tabanıyla eziliyor: K1/K2/K3 hepsi 0.45 render ediliyor | `style.css:650-655` `opacity: max(var(--motif-band-opacity), 0.45)`; meta 0.08/0.25/0.45 | ADR-0062 §2.2 (meta↔CSS tek taraflı değişim yasağı) | Tabanı kaldır ya da meta değerlerini tabanla hizala |
| **F6** | ORTA | `.planck-collage` ölü CSS; K1 Planck bariyeri görseli bu uçuşta silindi | `style.css:793-808` (16 satır); `git diff` DimensionsTab'tan `:class="{ 'planck-collage': … }"` bloğu silinmiş | S4 §4 (K1 ısınması) · ADR-0063 §2.3 | Bloğu geri getir veya ölü CSS'i sil |
| **F7** | ORTA | `.decay-static/.decay-flicker/.decay-glitch` (D4-D8) 0 tüketici — hiç çalışmamış | `style.css:1687-1731` (45 satır), `1620-1621`; `grep decay src --include *.vue` = 0 | S4 okunabilirlik kanonu (hedef metin) + ölü kod | Sil veya yeni bozulma mimarisine bağla; `.decay-glitch .text-slate-200` kuralı kaldırılmalı |
| **F8** | ORTA | K4 "chromatic aberration artışı" hiç uygulanmamış | `chromatic`/`aberration`/`var(--chromatic*)` için 0 referans; yalnız yorumlar (style.css:900,1085,1720) | S4 §4 (K4 satırı) | Uygula veya sözleşmeden çıkar |
| **F9** | ORTA | CrisisTab kriz kolaj şeridi substrat tokenıyla çiziliyor → K0'da görünmez | `style.css:728` `.collage-checker{opacity:var(--substrate-opacity)}` + `CrisisTab.vue:155,454` | S4 kanon (sinyal ayrımı) · ADR-0063 §2.3 | Kriz şeridine ayrı opaklık sınıfı ver |
| **F10** | ORTA | Bozulma katmanı ilgisiz `screenOverlayEffects` toggle'ına bağlı | `ScreenOverlay.vue:24-27` `isEnabled`; etiket "Laboratuvar Ekran Dokuları (Optik/Çatlak)" `GameplaySettings.vue:370` | S4 §4 merdiveni + §6 kabul (K2+ substrat) | Toggle'ı ayır (substrat ayrı kapı) veya etiketi güncelle |
| **F11** | ORTA | Substrat overlay (z-30) metin üzerinde; tape/scrawl mobilde içerik üstüne binebilir | `ScreenOverlay.vue:94` `fixed inset-0 z-30`; `131-134` `top:12px`; `137-139` `left/right:14px` vs `App.vue:208` `z-10` | S4 kanon "sayı/etiket asla bozulmaz" | Ölçüm yap; scrawl/tape'i yalnız dış bantlara (`min-width` guard veya `calc()`) sabitle |
| **F12** | ORTA | K5 CSS bloğu erişilemez (mühür max K4) | `style.css:629-637` (9 satır) vs `corruption.ts:32` `MAX_CORRUPTION_LEVEL=4` | S4 §4 (K5 "içerik yok") | Erişilemez blok bilinçli hazırlık; yorumla "Faz 3 bekliyor" işaretle veya çıkar |
| **F13** | DÜŞÜK | `crtEffect` zombi ayar: kayıtta duruyor, UI ve tüketici yok | `models/settings.ts:26`, `state.ts:229`, `actions-save.ts:804`, `save.test.ts:73` | S3/ADR-0061 §2.5 (ölü ayar canlandırıldı) | CRT kararına bağlı olarak alanı kaldır veya UI'yı geri getir |
| **F14** | DÜŞÜK | Bayat yorum/değer sapmaları | `corruption.ts:42` "K0 %10, K1 %35, K2 %45" (gerçek 0.05/0.09/0.13); `style.css:579` aynı; `style.css:92,99` "Faz A baseline" `--crt-intensity: 0.10` vs K0 meta 0.05; `style.css:905-909` silinen CrtOverlay.vue'ya atıf | ADR-0062 §2.2 · sözleşme §8 | Yorumları güncelle |
| **F15** | DÜŞÜK | CrtOverlay silinince kalan artıklar | `App.vue:193-195` boş satırlar; `App.vue:187,197` ve `SideSnapHands.vue:13` "CRT (40) ÜSTÜNE" anlatıyor; `style.css:1645-1646` eski seçici notu | Temizlik | Ölü yorum/satırları temizle |
| **L-1** | Latent | `resolvedUnlockedDimensionCount` challenge cap'i ile `Math.min` → teknik olarak monotonik değil; bugün eşikler ≤ 6 olduğu için düşme gözlenmiyor | `balance.ts:117-123`; `challenges.ts:147` `maxDimensions: 6` | S4 §4 monotoniklik + plan §2 | Getter'ı cap'siz taban/tepe sinyaline bağla (`dimensionCapFloor`/`lifetimePeakShifts`) |

---

## 10. Kapsam dışı kalan / emin olunamayan noktalar

- **Görsel tur yapılmadı** (SALT OKUNUR): F11 okunabilirlik taşması ve K-seviyesi algısı
  tarayıcıda ölçülmedi; koordinatlar statik analizden. `harness:contrast`/`harness:perf`
  çalıştırılamadı (görev kuralı).
- **`dist/` bayat:** `git status` `dist/index.html` değişmiş; `src` ile `dist` arasındaki
  farklılık bu denetimin kapsamı dışında (build çalıştırılmadı).
- **Motif SVG redraw'ı (dama/gül/tekerlek/yırtık):** başka agent'ın kapsamı (A-blok);
  `brain/scratchpad/gic-motif-redraw-brief.md` incelenmedi.
- **K5 tavanının kaldırılması** Faz 3 işi; bugünkü erişilemezlik bilinçli (ADR-0062 §3).
- `.planck-collage` tüketicisinin neden silindiği (bilinçli mi, kaza mı) commit mesajı
  olmadığı için **belirsiz**.
- ADR-0061 §2.5 ile kod arasındaki `--crt-scanline-alpha` 0.10 → 0.05 farkı
  ADR-0062 §2.2'nin "kullanıcı geri bildirimiyle yumuşatıldı" notuyla açıklanıyor;
  ADR-0061 güncellenmemiş — doküman sapması.

---

## 11. Önerilen düzeltme sırası

1. **F1** — CRT kararını kapat (geri getir veya ADR ile resmen kaldır). Bu karar F2, F13, F15 ve
   §7 envanterinin yarısını doğrudan çözer.
2. **F3 + F5 + F4** — `--glitch-intensity` ve motif bandı eğrisi/gate'ini gerçek davranışla hizala;
   K3/K4 sözleşme satırları böylece karşılanır.
3. **F6 + F7 + F12** — ölü CSS temizliği (`.planck-collage`, `decay-*`; K5 bloğunu yorumla işaretle).
4. **F9 + F10 + F11** — sinyal ayrımı ve okunabilirlik: kriz şeridine ayrı opaklık, substrat için
   ayrı kapı, scrawl/tape yerleşimine taşma koruması.
5. **F8** — K4 chromatic aberration: uygula ya da sözleşmeden çıkar.
6. **L-1** — corruption getter'ını challenge cap'inden bağımsızlaştır + monotonluk testine
   "cap'li challenge" vakası ekle.
7. **F14 + F15 + F13** — doküman/yorum senkronu ve zombi ayar temizliği.
