# A6 — Okunabilirlik, Bilgiyi Görselleştirme ve Yüzey Kapsaması (SALT OKUNUR DENETİM)

- **Tarih:** 2026-10-18
- **Kapsam:** `src/components/**/*.vue` (52 dosya) · `src/style.css` · `src/game/dimension_identity.ts` · `src/core/format.ts`
- **Bağlayıcı sözleşme:** `brain/context/visual-language.md` §9.2 / §9.3 / §9.5 · ADR-0049 · ADR-0058 (öncül kurallar ezilmedi)
- **Mod:** hiçbir `src/` dosyası değiştirilmedi; build/test çalıştırılmadı. Tüm bulgular okuma + ripgrep kanıtlıdır.

---

## 1. Bağlam Doğrulama Turu (brief iddiaları)

| İddia | Sonuç | Kanıt |
| :--- | :--- | :--- |
| v-tip tooltip sistemi tamamen söküldü | **DOĞRU** | `v-tip`/`tooltip` canlı kullanım = **0**; `src/core/tooltip.ts` **yok** (glob `**/tooltip*` = 0 dosya). Kalan 8 "tooltip" referansının 6'sı sözleşme hatırlatması (style.css:578/642/827, particles.ts:12, corruption.ts:15/38), **2'si bayat bileşen yorumu** (§3.8). |
| `src/components/CrtOverlay.vue` silindi | **DOĞRU** | `CrtOverlay` repoda **1** referans, o da `style.css:907` ölü kod yorumu. |
| CRT artık `style.css` tarafında | **YANLIŞ — CRT kapalı** | `style.css:516-524`: `.crt-layer,.crt-scanlines,.crt-vignette,.crt-glow,.layer-crt { display:none !important }`; `useNavigation.ts:325-326` köke koşulsuz `crt-off` basıyor. Yani CRT yalnız `style.css`'te **tanımlı**, canlı değil (§3.9). |
| 16 motifin 4'ü yeniden çizildi | **KAPSAM DIŞI (A6 değil)** | Motif SVG içeriği incelenmedi; yalnız motif tüketim katmanı (`MotifBand.vue` motion kapısı) denetlendi. |

---

## 2. Kapsam Matrisi — 52 Bileşen

Sütunlar: **R** = `ds-ramp-*` 3-state ramp · **Ç** = `progress-track`/`progress-fill` (oran=çubuk) · **T** = `tabular-nums` · **M** = motion kapısı (`useMotion*` / `motion-off` / `reduce-anim` / `battery-saver`) · **C** = `data-corruption` tüketimi · **G** = `.dim-glyph`. `—` = yok. **Not** sütunu: `N/A` = bu eksen o yüzeyde anlamsız, `EKSİK` = ihtiyaç var ama yok.

| # | Bileşen | R | Ç | T | M | C | G | Not |
| --: | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :--- |
| 1 | Header.vue | ✓ | ✓ | ✓ | ✓ | — | — | Ramp+çubuk tam; nextGoal'da glifsiz `D{n}` (§3.4) |
| 2 | DimensionRow.vue | ✓ | — | ✓ | ✓ | — | ✓ | Kanonik; elle çizilmiş paket çubuğu (§3.3) |
| 3 | DimensionsTab.vue | ✓ | ✓ | ✓ | ✓ | — | ✓ | Tam retrofit |
| 4 | CommentTicker.vue | — | — | ✓ | ✓ | — | — | N/A; OS reduced-motion kapısı E3 ile kapandı |
| 5 | AchievementToast.vue | — | — | — | — | — | — | EKSİK: scoped animasyon OS kapısız (§3.9) |
| 6 | AchievementsTab.vue | — | ✓ | ✓ | — | — | — | Ramp eksik (satın alma değil); 1 bar'sız oran (§3.1) |
| 7 | AnomalyOverlay.vue | — | — | ✓ | — | — | — | Elle çizilmiş süre çubuğu (§3.3) |
| 8 | AutobuyersTab.vue | — | — | ✓ | — | — | — | Bar'sız filo oranı (§3.1); glifsiz D1–D8 başlığı (§3.4) |
| 9 | CloudConflictModal.vue | — | — | — | — | — | — | EKSİK: sayılar tabular değil (§3.7) |
| 10 | ColonyTab.vue | ✓ | ✓ | ✓ | — | — | — | Tam retrofit |
| 11 | ConfirmModal.vue | — | — | — | — | — | — | N/A; ölü `w-4.5 h-4.5` (§3.9) |
| 12 | CrisisTab.vue | ✓ | ✓ | ✓ | — | — | ✓ | Track bespoke, fill paylaşımlı (§3.3); bayat tooltip yorumu (§3.8) |
| 13 | FloatingThumbBar.vue | ✓ | — | ✓ | ✓ | — | — | Mobil "Tümü" hedef/ilerleme göstermiyor (§3.6) |
| 14 | Header/SingularityButton | ✓ | — | ✓ | — | — | — | N/A (Header çubuğu üstte) |
| 15 | header/CounterDisplay.vue | — | — | ✓ | ✓ | — | ✓ | Tavan bandı var (§3.6) |
| 16 | header/MusicControls.vue | — | — | — | ✓ | — | — | N/A |
| 17 | AchievementToast → bkz. #5 | — | — | — | — | — | — | — |
| 18 | LabTab.vue | ✓ | ✓ | ✓ | — | — | — | Modal içi kodeks oranı bar'sız (§3.1) |
| 19 | lab/ViralGrid.vue | ✓ | ✓ | ✓ | — | — | — | Tam retrofit (örnek yüzey) |
| 20 | lab/TrendReactor.vue | ✓ | ✓ | ✓ | — | — | — | 3 çubuktan 2'si bespoke fill (§3.3) |
| 21 | lab/LabSeedCard.vue | — | — | ✓ | — | — | — | **EKSİK: uygunluk yalnız metin rengi** (§3.2) |
| 22 | lab/LabRecipeList.vue | — | — | — | — | — | — | N/A; ölü `py-0.2` (§3.9) |
| 23 | NeuralTreeTab.vue | ✓ | ✓ | ✓ | — | — | — | Düğüm etkileri görünür — tooltip kaybı yok (§3.8) |
| 24 | StatsTab.vue | — | — | ✓ | — | — | — | Alt-sekme dili ana nav'dan sapıyor (§3.5) |
| 25 | stats/OverviewPanel.vue | — | — | ✓ | — | — | — | Bespoke dağılım çubuğu (§3.3); `toLocaleString` (§3.1) |
| 26 | stats/MultipliersPanel.vue | — | — | ✓ | — | — | — | Bar'sız "Açık: X / 8" + glifsiz D1–D8 (§3.1/§3.4) |
| 27 | stats/RecordsPanel.vue | — | — | ✓ | — | — | — | Bar'sız "X / 8" (§3.1); `toLocaleString` ×7 |
| 28 | stats/PastRunsPanel.vue | — | — | ✓ | — | — | — | N/A |
| 29 | stats/BiometryPanel.vue | — | — | ✓ | — | — | — | Bespoke kararlılık çubuğu, hue ile 3 kademe (§3.3/§3.7) |
| 30 | stats/TelemetryChart.vue | — | — | ✓ | — | — | — | Sparkline var (S9.3 hedefi) |
| 31 | ChallengesTab.vue | ✓ | ✓ | ✓ | — | — | — | Bar'sız hero oranı (§3.1); tamamlanma = holo/pembe (§3.7) |
| 32 | autobuyers/AutobuyerCard.vue | ✓ | ✓ | ✓ | — | — | ✓ | Tam retrofit |
| 33 | autobuyers/AutobuyerBulkControls.vue | ✓ | — | ✓ | — | — | — | N/A (ramp yeterli) |
| 34 | SettingsModal.vue | — | — | — | — | — | — | Aktif sekme 3 farklı hue (§3.7); alt paneller ham |
| 35 | settings/GameplaySettings.vue | — | — | ✓ | ✓ | — | — | `crtEffect` tüketicisi yok (§3.9) |
| 36 | settings/AudioSettings.vue | — | — | ✓ | — | — | — | N/A (native slider + % etiket) |
| 37 | settings/CloudSaveSection.vue | — | — | — | — | — | — | Ölü `animate-fade-in` ×2 (§3.9) |
| 38 | settings/ImportExport.vue | — | — | — | — | — | — | Sayılar tabular değil (§3.7) |
| 39 | settings/SaveSlots.vue | — | — | — | — | — | — | Sayılar tabular değil/slot kartı (§3.7) |
| 40 | AuthModal.vue | — | — | — | — | — | — | Ölü `animate-fade-in` ×5 (§3.9) |
| 41 | AdminPanel.vue | — | — | — | — | — | — | 9 hue dekoratif, dev-only (§3.7, DÜŞÜK) |
| 42 | WelcomeBackModal.vue | — | — | ✓ | — | — | — | Glifsiz "D6 pasifi" (§3.4) |
| 43 | ConfirmModal → bkz. #11 | — | — | — | — | — | — | — |
| 44 | LockedFeature.vue | ✓ | ✓ | ✓ | — | — | — | Örnek "metin→çubuk" deseni |
| 45 | TabHero.vue | — | — | — | — | — | — | Altyapı; sub-tab accent dili yok (§3.5) |
| 46 | TimeClockOverlay.vue | — | — | ✓ | ✓ | — | — | Bespoke gerginlik çubuğu (§3.3); chip okumaları tam |
| 47 | JuiceLayer.vue | — | — | — | ✓ | — | — | Canvas katmanı; N/A |
| 48 | ScreenOverlay.vue | — | — | — | ✓ | — | — | Ambient; N/A |
| 49 | MotifBand.vue | — | — | — | ✓ | — | — | Ambient; N/A |
| 50 | AlgorithmicSwirl.vue | — | — | — | ✓ | — | — | Ambient; N/A (ADR-0049 Kural 1 korunur) |
| 51 | SideSnapHands.vue | — | — | — | ✓ | — | — | Dekoratif; N/A |
| 52 | HeartBurstLayer.vue / SequentialStrikeLayer.vue | — | — | ✓ | ✓ | — | — | Efekt katmanı; N/A |

**Özet sayılar:** 52 bileşen · `ds-ramp-*` **16 dosyada 63 kullanım** · `progress-fill` **13 dosyada 50 kullanım** · `tabular-nums` **34 dosyada 134 kullanım** · motion kapısı **16 dosya** · `data-corruption` **0 bileşen** · `dim-glyph` **5 dosya (CounterDisplay, DimensionRow, CrisisTab, DimensionsTab, AutobuyerCard)** · **23 bileşende hiçbir retrofit izi yok** (§4).

---

## 3. Kategori Bazlı İhlaller

### 3.1 Metin yığını → çubuk (S9.3: "Tüm X/Y gereksinimleri oransal çubuk + yanında küçük mutlak sayı")

Toplam **18** düz "X / Y" metni bulundu; **12'si** yakınındaki `progress-track`/`progress-fill` veya pip göstergesiyle eşleşiyor (uyumlu), **6'sı eşleşmiyor**:

| # | Kanıt | Alıntı | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-01 | `AutobuyersTab.vue:59` | `<span class="tabular-nums font-mono">{{ store.activeAutobuyersCount }}/{{ store.totalAutobuyersCount }} Bot</span>` | ORTA | stat-box altına `progress-track-mini` + `progress-fill-cyan` (oran = aktif/total) |
| A6-02 | `stats/RecordsPanel.vue:44` | `Tamamlanan: {{ store.completedChallenges.length }} / 8` | ORTA | başlık yanına mini çubuk; `totalCount` sabiti `CHALLENGES.length`'ten alınmalı (sabit "8" gelecekte kırılır) |
| A6-03 | `stats/MultipliersPanel.vue:125` | `Açık: {{ store.unlockedDimensionsCount }} / 8` | ORTA | mini çubuk (`progress-fill-purple`) |
| A6-04 | `AchievementsTab.vue:129` | `Ödüllü {{ rewardedUnlocked }}/{{ rewardedTotal }}` | DÜŞÜK | aynı stat-box'ta % var; oran çubuğu ekle veya yalnız %'i bırak |
| A6-05 | `LabTab.vue:410` | `Keşfedilen: {{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }} Formül` | DÜŞÜK | kodeks modal başlığına `progress-track-mini` (ana sekmede var, modal içinde kayboluyor) |
| A6-06 | `ChallengesTab.vue:114` | `<div class="stat-box-value text-rose-400 tabular-nums">{{ doneCount }}/{{ totalCount }}</div>` | DÜŞÜK | hero stat-box oranı bar'sız (alt bantta bar var) |

**Format sözleşmesi ihlali (S9.3 "<1000 kısa biçim, üstü sonek + precision — `src/core/format.ts`"):** `format()` yerine doğrudan `toLocaleString("tr-TR")` kullanan **9 çağrı** — Sayaçlar 1e308'e kadar çıkabildiği için bin üstü değerler kısaltılmaz, kullanıcı notasyon ayarı yok sayılır:

| Dosya:satır | Alıntı |
| :--- | :--- |
| `stats/RecordsPanel.vue:87,97,107,117,127,137,147` | `{{ store.stats.anomaliesClicked.toLocaleString("tr-TR") }}` (ve 6 kardeşi) |
| `stats/OverviewPanel.vue:58` | `value: store.stats.manualClicks.toLocaleString("tr-TR")` |
| `stats/BiometryPanel.vue:40` | `🌌 Manuel Yutma: ${store.stats.manualClicks.toLocaleString("tr-TR")} kez` |

→ **Düzeltme:** hepsi `formatNumber(store.stats.*, store.settings.notation)` olmalı. Ciddiyet: **ORTA**.

### 3.2 3-state ramp disiplini (S9.2 "Uygunluk rampa ile kodlanır… hue kimlik verir, durum vermez" + ADR-0058 §2.2)

| # | Kanıt | Alıntı | İhlal | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- | :--- |
| A6-07 | `lab/LabSeedCard.vue:48` | `class="text-[10px] font-mono tabular-nums" :class="affordable ? 'text-slate-100' : 'text-slate-500'"` | Uygunluk **yalnız metin rengi**yle kodlanıyor: ne `ds-ramp-partial`, ne border/zemin değişimi, ne pulse. Kartın kendisi (§29-34) yalnız "seçili/seçili değil" durumunu cyan ile anlatıyor. ADR-0058 §1.1'deki "24 satın alma yüzeyi ikili durumdaydı" bulgusunun kapanmamış tek örneği. | **YÜKSEK** | `ViralGrid.vue:105-111` desenini uygula: `bulkPlantRampClass` benzeri 3 durumlu sınıf + `affordance-pulse` (ready). |
| A6-08 | `stats/MultipliersPanel.vue:134` | `:class="{ 'opacity-40': d.tier > store.unlockedDimensionsCount }"` | Kilitli boyut `opacity-40` ad-hoc; kanon `ds-ramp-locked` (opacity 0.5 + gri kenarlık + zemin). | ORTA | `ds-ramp-locked` ile değiştir. |
| A6-09 | `stats/BiometryPanel.vue:161-167` | `bio.mentalBatteryPct > 50 ? 'bg-cyan-500' : … > 20 ? 'bg-slate-500' : 'bg-rose-500 animate-pulse'` | Tek eşik göstergesinde durum **hue ile** (cyan/slate/rose) kodlanıyor — S9.2 "durum ≠ hue". (Rose = tehlike meşru; kademelendirme hue ile.) | ORTA | Dolum rengi sabit kimlik + eşik işaretçisi (tick/threshold çizgisi) ile anlatılmalı. |

### 3.3 progress-fill taban tutarlılığı (ADR-0058 §2.7 + ADR-0065 E2 NIT kapanışı)

`progress-fill` tabanını **kullanmayan** elle çizilmiş çubuk: **9 yüzey**. `TrendReactor` ve `CrisisTab` `progress-track`'i kullanıp dolumunu bespoke bıraktığı için E2 düzeltmesi yarım kalmış:

| # | Kanıt | Alıntı (kısaltıldı) | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-10 | `lab/TrendReactor.vue:101-105` | `<div class="progress-track progress-track-md"><div class="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 …">` | ORTA | dolum `progress-fill progress-fill-rose` (gradient gerekiyorsa token) |
| A6-11 | `lab/TrendReactor.vue:133-138` | `<div class="h-full transition-all duration-200" :class="isHypeFull ? 'bg-gradient-to-r …' : 'bg-cyan-500'">` | ORTA | `progress-fill progress-fill-cyan` |
| A6-12 | `DimensionRow.vue:480-484` | `<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40"><div class="h-full bg-purple-400/80…">` | ORTA | kanonik dosya bespoke çubuk kullanıyor; `progress-track-mini` + `progress-fill-purple` |
| A6-13 | `CrisisTab.vue:234` | `<div class="relative w-full h-4 bg-black/60 rounded-full overflow-hidden …">` (E2 yalnız `progress-fill` ekledi, track bespoke kaldı, `progress-track` yok) | ORTA | track'i `progress-track` tabanına al (dilim bölgeleri iç katman olarak kalır) |
| A6-14 | `AnomalyOverlay.vue:404-412` | `<div class="absolute bottom-0 … h-1 bg-black/60"><div class="h-full transition-all …">` | ORTA | `progress-track-mini` + `progress-fill-cyan|purple` |
| A6-15 | `stats/OverviewPanel.vue:108-117` | `<div class="w-full h-3 rounded-full bg-black/50 overflow-hidden flex …">` | ORTA | 2-segmentli dağılım: `progress-track` + iki `progress-fill-*` |
| A6-16 | `stats/BiometryPanel.vue:158-169` | `<div class="w-full h-3 rounded-full bg-black/50 overflow-hidden …">` | ORTA | `progress-track` + `progress-fill-*` |
| A6-17 | `Header.vue:386-393` | inline `background: 'linear-gradient(to right, #00f0ff, #a855f7, #f59e0b)'` — token/çubuk dili dışı | DÜŞÜK | `progress-fill-dawn` (aynı gradyan zaten `style.css:293`) |
| A6-18 | `Header.vue:555-560` | `<div class="w-full h-1 rounded-full bg-black/50 overflow-hidden">` (kombo drain) | DÜŞÜK | `progress-track-mini` |
| A6-19 | `TimeClockOverlay.vue:516-521` | `<div class="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/70">` | DÜŞÜK | `progress-track` (saat katmanı istisnası ise yorumla gerekçele) |

> Not: `style.css:293` `progress-fill-dawn` gradyanı Header:391 ile **birebir aynı** — tek kaynak zaten var, kullanılmıyor.

### 3.4 Glif kimliği (S9.2 "D1-D8'e sabit glif"; `.dim-glyph`)

`.dim-glyph` yalnız **5 dosyada**: `DimensionRow`, `DimensionsTab`, `CrisisTab`, `CounterDisplay`, `AutobuyerCard`. Kullanıcıya görünen **glifsiz** boyut gösterimleri:

| # | Kanıt | Alıntı | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-20 | `stats/MultipliersPanel.vue:138` (+ başlık :122) | `D{{ d.tier }}: {{ d.name }}` — 8 kartın hiçbirinde glif yok; ayrıca `DIM_NAMES` (`:9-18`) `dimension_identity.ts` `TIER_IDENTITIES`'in **ikinci kopyası** | **YÜKSEK** | `getTierGlyph/getTierAccent` + `.dim-glyph`; `DIM_NAMES` silinip `getTierIdentity().label` kullanılmalı |
| A6-21 | `Header.vue:138,148` | `label: "D${i} alınabilir"` / `label: "D${i} için kalan"` | ORTA | "Sıradaki hamle" çipinde glif + D etiketi (CounterDisplay:256 deseni) |
| A6-22 | `WelcomeBackModal.vue:84` | `D6 pasifi çevrimdışı üretimi ×1.02 güçlendirdi.` | ORTA | glif + D6 (`getTierGlyph(6)`); ayrıca ×1.02 değeri hardcoded — store'dan alınmalı |
| A6-23 | `AutobuyersTab.vue:92` | `Kuantum Boyut Botları (D1 – D8)` | DÜŞÜK | bölüm başlığında glif dizisi (`ϱ ϵ Ω χ…`) |
| A6-24 | `DimensionsTab.vue:515` | `D1 birikimini D8 tekillik gücüne çevir` | DÜŞÜK | glifli kısa etiket |

### 3.5 Nav/section renk-lengüajı (S9.3: "sekmelere sol kenarlık; aktif ikon+yazı, pasif ikon-only")

**Ana nav uyumlu (PASS):** `useNavigation.ts:40-50` her sekmeye `border-l-2 border-l-<hue>` veriyor (hem aktif hem pasif durumda), `:74-79` `navLabelClass` pasifte `max-w-0 opacity-0` ile etiketi kapatıyor. `App.vue:270-330` tüm sekmeler bu sözleşmeden geçiyor. **9 sekme / 9 sol kenarlık — eksik yok.**

| # | Kanıt | Alıntı | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-25 | `StatsTab.vue:83-105` | Alt-sekme barı: `:class="activeSubTab === tab.id ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 …'"` — sol kenarlık yok, pasifte etiket gizlenmiyor, hero accent `slate` iken aktif renk purple | ORTA | nav dilini alt-sekmeye de uygula (`border-l-2` + ikon-only pasif) veya sözleşmede "alt-sekme istisnası" olarak açıkça yaz |
| A6-26 | `SettingsModal.vue:196-249` | Aynı "aktif sekme" anlamı 3 farklı hue: gameplay=`purple`, visuals=`cyan`, audio=`purple`, save=`cyan`, about=`slate` | ORTA | tek aktif dili (bg + `border-l-2`) — §3.7 ile aynı bulgu |
| A6-27 | `App.vue:40-50` (nav accent) | `crisis: border-l-cyan-400` — Kriz bölümü (risk/parazit) cyan ile kodlanıyor; aynı sekmenin uyarı noktası `tab-dot-rose` (`App.vue:287`) | DÜŞÜK / belirsiz | Kimlik hue'su serbest bırakılabilir; ancak S9.2 "cyan = telemetri/bonus" ile gerilim var — sözleşme notu eklenmeli |

### 3.6 Her sayının tavanı görünür mü (ADR-0049 "tavanı görünmeyen sayı yok")

**Güçlü örnekler (PASS):** `Header.vue:395` "Hedef: 1.79e308 g" + `:386` ilerleme şeridi; `CounterDisplay.vue:198-208` tavan/hazır bandı; `CrisisTab.vue:236-262` bölge dilimleri + eşik etiketleri (%0-30 / %31-60 / %61-90 / %100); `LockedFeature.vue:53-60`; `NeuralTreeTab.vue:205` "Seviye: X / Max" + çubuk; `DimensionRow.vue:473-484` "paket X/10" + çubuk.

| # | Kanıt | Alıntı | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-28 | `FloatingThumbBar.vue:136-152` | Mobil "Tümü / Maks" butonu yalnız `Maks` yazıyor; hedef fiyat, kalan oran veya çubuk yok (masaüstü Header'da `nextGoal` var) | DÜŞÜK | mini oran çubuğu veya "hedefe %N" rozeti |
| A6-29 | `ColonyTab.vue:144` | `Toplu Çöküş: {{ store.napCount }}×` — kalıcı sayaç, tavan/ilerleme yok | DÜŞÜK / belirsiz | Bu bir prestij sayacı; tavan tanımsız olabilir → **belirsiz**, sözleşme kararı gerekir |

### 3.7 Bir semantik = bir görsel (S9.4)

| # | Kanıt | Alıntı | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-30 | `SettingsModal.vue:199-245` | Aynı "aktif sekme" durumu `bg-purple-500/20` / `bg-cyan-500/20` / `bg-slate-500/20` ile üç kez farklı renk | ORTA | tek aktif görsel dil (A6-26 ile aynı iş) |
| A6-31 | `ChallengesTab.vue:149,167` | Tamamlanan meydan okuma `'edition-holo bg-cyan-950/40 border-cyan-500/40'` + `✔ HOLO MÜHÜR` — **milestone pembe/prismatik** ile; `edition-holo` (`style.css:1400-1438`) Balatro "kart edisyonu" (nadirlik), ilerleme durumu değil. Aktif durum `edition-poly` (:151) | ORTA | tamamlanma = `altın + ring` (S9.4); edisyon sınıfları yalnız kart nadirliği için |
| A6-32 | `AchievementsTab.vue:262` | `{{ isUnlocked(ach.id) ? '✔ ' : '' }}{{ ach.reward.desc }}` — kazanç işareti `ds-badge-amber` içinde | DÜŞÜK | beyaz tick kazancı taşımalı; altın çerçeve milestone'da kalmalı |
| A6-33 | `Header.vue:89-96` | `nightPhase`: 5 kademe için 5 ayrı hue (`blue/cyan/purple/orange/amber`) — **orange** rezerve palete (S9.2) dahil değil | ORTA / belirsiz | Faz merdiveni tek ailede (amber tonları) veya sözleşmeye "faz kimliği" istisnası eklenmeli |
| A6-34 | `CloudConflictModal.vue:104-106,163-165` | `{{ conflict.localMeta.singularities }} kez` — `font-mono` ama `tabular-nums` yok | DÜŞÜK | `tabular-nums` ekle |
| A6-35 | `settings/SaveSlots.vue:72,85` · `settings/ImportExport.vue:263-265` | Slot/çöküş/sürüm sayıları `tabular-nums` değil | DÜŞÜK | `tabular-nums` |
| A6-36 | `AdminPanel.vue:443-556` | 9 farklı hue (purple/cyan/rose/emerald/teal/amber/violet/fuchsia/blue) dekoratif; ramp/çubuk/tabular yok | DÜŞÜK | Dev-only (GODMODE) — sözleşme dışı bırakılması önerilir; en azından sayısal +N butonları `tabular-nums` |

### 3.8 Tooltip sokumu sonrası boşluk (S9.3: "her bilgi biriminin görsel karşılığı olur")

| # | Kanıt | Bulgu | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-37 | `DimensionRow.vue:95-182` + `:391` | `formatConfigs` içinde **9 adet `subtitle`** (D1…D8 lore metni + fallback, ör. `:108` "Su damlasındaki kovalent bağları ayrıştırma") tanımlı; şablonda yalnız `tierConfig.symbol` (:388) ve `tierConfig.shortName` (:397) kullanılıyor → **`subtitle` hiç render edilmiyor**. Yorum hâlâ `(alt yazı kaldırıldı — açıklama ismin tooltip'inde)` diyor ama tooltip katmanı yok → **9 lore metni bilgi kaybı** | **YÜKSEK** | Ya satırda ikincil metin olarak göster (S9.3 "yazı yalnız nüansı taşır"), ya da ölü veriyi sil. Bayat yorum kaldırılmalı |
| A6-38 | `CrisisTab.vue:35` | `// Arayüzde "D4" yerine katman glifi gösterilir; teknik kimlik tooltip nüansında kalır.` — tooltip yok; bilgi glifle taşınıyor (kayıp yok) ama YORUM yanlış | DÜŞÜK | yorumu güncelle |
| A6-39 | `NeuralTreeTab.vue:200,286` | Düğüm etkileri (`getNode(id).desc`) artık **görünür metin** olarak basılıyor — ADR-0058 §2.8 sözü tutulmuş, kayıp **yok** | — | (boş bulgu — geçerli sonuç) |

### 3.9 Ölü referans / ölü utility (S9.3'ün "görsel karşılık" ilkesinin sessiz ihlalleri)

| # | Kanıt | Bulgu | Ciddiyet | Önerilen düzeltme |
| --: | :--- | :--- | :--- | :--- |
| A6-40 | `src/models/settings.ts:26`, `stores/game/state.ts:229`, `stores/game/actions-save.ts:804` | `crtEffect: boolean` — **3 kod noktasında tanımlı, 0 UI, 0 tüketici** (`grep crtEffect src/components` = 0). CRT katmanları `style.css:517-524` ile `display:none !important`; kök her zaman `crt-off` (`useNavigation.ts:326`). Faz A kabul kriteri "crtEffect ayarı gerçekten çalışıyor" **artık sağlanmıyor** | ORTA | Alanı kaldır (save migrasyonu ile) veya CRT'yi gerçekten canlandır; ölü ayar kullanıcıya yalan söylüyor |
| A6-41 | `src/style.css:93-96, 584-637` | `--crt-intensity`, `--crt-scanline-alpha`, `--crt-vignette-alpha`, `--crt-glow-alpha`: 4 token × 6 seviye = **24 ölü bildirim** (tek tüketici `display:none` katman) | DÜŞÜK | CRT geri gelmeyecekse tokenları sil; `--substrate-*`/`--motif-band-*` **canlı** (ScreenOverlay/MotifBand), onlar kalır |
| A6-42 | `src/style.css:526-534` | `.crt-scanlines-removed` sınıfı **0 tüketici** (adı "removed" ama gradyan tanımlıyor) | DÜŞÜK | sil |
| A6-43 | `settings/AuthModal.vue:138,296,305,412,417` + `settings/CloudSaveSection.vue:91,95` | `animate-fade-in` — **7 kullanım**, `tailwind.config.js:48-51` yalnız `pulse-fast`/`glow` tanımlıyor, `style.css`'te 0 eşleşme → **tanımsız utility, animasyon yok** | ORTA | `animate-fade-in`'i tailwind config'e ekle veya sınıfları kaldır |
| A6-44 | `ConfirmModal.vue:54` | `class="w-4.5 h-4.5"` — Tailwind 3.4 spacing ölçeğinde **4.5 yok** → ölü sınıf (ikon varsayılan 24px) | DÜŞÜK | `w-4 h-4` |
| A6-45 | `lab/LabRecipeList.vue:42`, `lab/ViralGrid.vue:240` | `py-0.2` — ölçekte **0.2 yok** → dikey dolgu uygulanmıyor | DÜŞÜK | `py-0.5` |
| A6-46 | `AchievementToast.vue:81-96` | `.toast-progress` scoped `animation: toast-shrink 4s linear forwards`; `style.css:1584-1624` OS `prefers-reduced-motion` listesinde **yok** (yalnız `.reduce-anim *` ayar kapısı kapsıyor) | ORTA | ADR-0065 E3 çizgisinde `useMotionReduced` veya OS media query listesine ekle |
| A6-47 | `src/components/**` | Ölü referans taraması: 2 bayat "tooltip" yorumu (A6-37/A6-38) + 1 ölü ayar + 24 ölü token + 1 tüketicisiz sınıf + 2 tanımsız utility sınıfı (3 kullanım) | — | Yukarıdaki satırlar |

---

## 4. Hiç Retrofit Görmemiş Yüzeyler

`ds-ramp` + `progress-*` + `.dim-glyph` + `data-corruption` + motion kapısının **hiçbirine** sahip olmayan **23/52 bileşen**:

| Öncelik | Bileşen(ler) | Değerlendirme |
| :--- | :--- | :--- |
| **Gerçek iş var** | `lab/LabSeedCard` (§3.2) · `stats/MultipliersPanel` (§3.1/§3.4) · `stats/RecordsPanel` (§3.1) · `stats/BiometryPanel` (§3.3) · `stats/OverviewPanel` (§3.3) · `AutobuyersTab` (§3.1/§3.4) · `ChallengesTab` (ramp var — hariç) · `AnomalyOverlay` (§3.3) · `CloudConflictModal` (§3.7) · `WelcomeBackModal` (§3.4) · `AchievementToast` (§3.9) · `AuthModal` (§3.9) · `settings/CloudSaveSection` (§3.9) · `settings/SaveSlots` (§3.7) · `settings/ImportExport` (§3.7) | Brief'te "hiç retrofit görmemiş" diye sayılan **SettingsModal alt panelleri, AdminPanel, AuthModal, stats/*, lab/*, FloatingThumbBar, WelcomeBackModal, CloudConflictModal, ConfirmModal** listesi doğrulandı; ancak: `FloatingThumbBar` ramp+motion **içeriyor** (retrofit görmüş), `LabTab/ViralGrid/TrendReactor` de kısmen görmüş, `ConfirmModal/TabHero` altyapı olduğu için ramp N/A. Gerçek boşluk: **lab/LabSeedCard + stats/* + modal geri bildirimleri**. |
| **N/A (altyapı/dekoratif/efekt)** | `TabHero` · `ConfirmModal` · `AlgorithmicSwirl` · `HeartBurstLayer` · `JuiceLayer` · `MotifBand` · `ScreenOverlay` · `SideSnapHands` · `header/MusicControls` · `settings/GameplaySettings` · `settings/AudioSettings` · `lab/LabRecipeList` | Sayı/oran yüzeyi yok; ramp veya çubuk gerekmez. |
| **Dev-only** | `AdminPanel` | Sözleşme dışı bırakılması önerilir (A6-36). |

---

## 5. Önerilen Düzeltme Sırası

1. **A6-07** `LabSeedCard` uygunluk rampası (tek gerçek "durum yok" satın alma yüzeyi).
2. **A6-37** `DimensionRow` 9 ölü `subtitle` — ya göster ya sil (tooltip bilgi kaybının tek somut örneği).
3. **A6-20** `stats/MultipliersPanel` glif + `DIM_NAMES` ikinci kaynağının kaldırılması (kimlik tek kaynak).
4. **A6-10…A6-19** 9 elle çizilmiş çubuğun `progress-track`/`progress-fill` tabanına taşınması (önce TrendReactor/CrisisTab — E2 yarım işi).
5. **A6-01…A6-06 + ORTA `toLocaleString`** kalan oranların çubuğa bağlanması ve 9 format çağrısının `formatNumber`'a çevrilmesi.
6. **A6-43 / A6-46** tanımsız `animate-fade-in` + kapısız toast animasyonu (motion sözleşmesi).
7. **A6-30/A6-31/A6-33** semantik tekrar (SettingsModal aktif hue, ChallengesTab holo milestone, nightPhase 6. hue).
8. **A6-25/A6-26** alt-sekme nav dilinin ana nav'a hizalanması.
9. **A6-40…A6-45** ölü ayar/token/utility temizliği.

---

## 6. Kapsam Dışı ve Belirsiz

- **Kapsam dışı:** motif SVG içerikleri (A6 değil) · CRT/bozulma estetiği (B/C/D fazları) · WCAG kontrast ölçümü (E2 ayrı harness) · denge/sayısal davranış (hiç dokunulmadı).
- **Belirsiz:** (a) `ColonyTab.vue:144` `napCount` gibi tavansız prestij sayaçları sözleşme kapsamına girer mi; (b) `Header.vue:89-96` faz merdiveninin 5 hue'su "kimlik" mi "durum" mu; (c) `App.vue:43` Crisis sekmesinin cyan accent'i ile S9.2 "cyan=bonus" gerilimi; (d) `StatsTab`/nav dışındaki alt-sekmeler için "pasif ikon-only" kuralının bağlayıcılığı; (e) `AdminPanel` dev-only yüzeyin sözleşme dışı sayılıp sayılmayacağı.
- **Doğrulanamadı:** `harness:contrast` çalıştırılmadı (görev kuralı: build/test yasak) → WCAG AA iddiası bu raporda **ölçülmedi**.
