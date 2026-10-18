# Görsel Dil Uyum Denetimi ve Düzeltme Planı — "Her Tarafı" (2026-10-18)

> **Durum:** TAMAMLANDI (F0 + Dalga 1 + Dalga 2 — 2026-10-18).
> **Bağlayıcı sözleşme:** [visual-language.md](../context/visual-language.md) · ADR-0060
> (+ öncüller 0044/0049/0057/0058, faz ADR'leri 0061–0068)
> **Yöntem:** 6 paralel bağımsız denetim ajanı (salt-okunur) + orchestrator mekanik kapsam matrisi.
> **Alt raporlar (kanıt deposu):** [a1 renk/token](visual-audit-2026-10-18/a1-renk-token-sozlesmesi.md) ·
> [a2 tipografi](visual-audit-2026-10-18/a2-tipografi-sistemi.md) ·
> [a3 bozulma merdiveni](visual-audit-2026-10-18/a3-faz-temelli-gic-bozulma-merdiveni.md) ·
> [a4 katman/hareket](visual-audit-2026-10-18/a4-layer-mimari-ve-hareket-kapilari.md) ·
> [a5 GIC kimlik](visual-audit-2026-10-18/a5-gic-kimlik-doku-katmani.md) ·
> [a6 okunabilirlik/kapsam](visual-audit-2026-10-18/a6-okunabilirlik-yuzey-kapsamasi.md)

---

## 0. Yönetici özeti

**İstenen:** oyunun *her tarafının* görsel dil sözleşmesine uydurulması.
**Bulunan:** altyapı (Faz A–E + tipografi) gerçekten kurulu ve büyük ölçüde sözleşmeye uyuyor;
ancak **üç kırık halka** var ve retro turu 52 bileşenin **23'üne hiç uğramamış**.

| Ölçüm | Değer |
| :--- | :--- |
| Ham bulgu (6 rapor) | **138** (tekilleştirilmiş ≈110) |
| KRİTİK | **4** (CRT ölümü · `goz.svg` yasak token · `motifs.test` kilidi · `.planck-collage` tüketicisizliği) |
| YÜKSEK | **23** |
| ORTA | **65** |
| DÜŞÜK | **43** |
| Dokunulmamış yüzey | **23 / 52 bileşen** hiçbir görsel-dil retrofit izi taşımıyor |
| Ölü kod/token/ayar | **≈250 satır CSS** + **11 token** + `crtEffect` zombi ayarı |
| Uçuşta (commit edilmemiş) iş | v-tip tooltip sökümü (doğru ve tam) + 4/16 motif yeniden çizimi |

### Ciddiyet dağılımı (rapor bazında)

| Rapor | KRİTİK | YÜKSEK | ORTA | DÜŞÜK | Toplam |
| :--- | ---: | ---: | ---: | ---: | ---: |
| A1 renk/token | 0 | 3 | 17 | 6 | 26 |
| A2 tipografi | 0 | 4 | 1 | 4 (+2 bilgi) | 11 |
| A3 bozulma | 1 | 3 | 8 | 3 (+1 latent) | 16 |
| A4 katman/hareket | 1 | 4 | 8 | 6 | 19 |
| A5 GIC kimlik | 2 | 6 | 8 | 4 | 20 |
| A6 okunabilirlik | 0 | 3 | 23 | 20 | 46 |
| **TOPLAM** | **4** | **23** | **65** | **43** | **138** |

### Doğru çalışan çekirdek (kanıtlandı — dokunma)

- **K0–K5 türetmesi sözleşmeyle birebir** (`corruption.ts:154-167`, O1 K4 gate'i testli); kayıt formatına yeni alan eklenmemiş; mühür kökte/ilk render'da/reaktif (`App.vue:168`); monotonluk prestij+meydan okuma resetlerinde korunuyor.
- **CORRUPTION_META ↔ CSS paritesi** 6 seviye × 7 token tam (`corruption.ts:64` ↔ `style.css:584-637`).
- **ADR-0044 shake containment PASS:** shake yalnız `#game-main-content`e iner; tüm overlay/modal/dock/ThumbBar onun KARDEŞİ; köke filter/transform yok; iki teleport doğru.
- **Hero sayaç tipografisi** 36/54/72 ızgara + sentetik bold yok + `tabular-nums`; canvas 18/36, ağırlık 400; `font-hand` yalnız K3+ (K0'da `--substrate-opacity: 0` ile görünmez).
- **Eski font ailesi repoda sıfır referans:** Chakra Petch 0, JetBrains 0, TR'siz `m6x11` 0, `m6x11.woff2` yok; `.vue`'da hardcoded font-family 0. Google Fonts + preload + `display=swap` tutarlı.
- **`bg-black/*` 167/167 meşru translucent** (scrim/disabled/girinti) — opak zemin kaçağı yok.
- **3-state ramp + `progress-track` + `dim-glyph` + `LockedFeature`** sözleşmeye tam uyumlu; kilitli gösterimde gri dışı hue yok.
- **Motif ton disiplini:** kayıtta yalnız `feast/bone/ember` (16/16), SVG'ler `currentColor` (16/16), `id=`/`url(`/`<defs>`/gradient 0.
- **`tabular-nums` 140 kullanım / 36 dosya** — kritik tüm sayı yüzeyleri karşılanmış (tek onaylı eksik: `WelcomeBackModal:67`).
- **Substrat merdiveni kod olarak var** (K1 torn → K2 dama → K3 tape+scrawl → K4 floor), `[data-corruption]` eğrisiyle besleniyor.

---

## 1. Metod ve mevcut ağaç notu

- Denetim **commit edilmemiş uçuş ağacı** üzerinde yapıldı (doğru referans).
- Uçuşta iki bağımsız iş var:
  1. **v-tip tooltip sökümü** (23 dosyada 84 kullanım + `core/tooltip.ts` + `main.ts` kaydı) — temiz, doğru, sözleşme §8 notuyla kayıtlı.
  2. **GIC motif yeniden çizimi** — 16 motifin **4'ü** (`dama`,`gul`,`tekerlek`,`yirtik` = K2 "cosmic" grubu) yeniden çizildi; **12'si eski** tek-tip çizgi ikon seti.
- Orchestrator mekanik matrisi: 52 `.vue` × (semantik token, ramp, çubuk, `tabular-nums`, motion kapısı, glif, `bg-black/`, `font-display`, `font-hand`, `animate-*`, hex).

### 1.1 Uçuşun yol açtığı iki sessiz regresyon (bu denetimin en somut keşfi)

| # | Bulgu | Kanıt |
| :--- | :--- | :--- |
| R1 | **CRT katmanı öldürüldü** ama sözleşme hâlâ "HEP AÇIK" diyor | `style.css:516-524` beş sınıfı `display:none !important`; `useNavigation.ts:325-326` köke koşulsuz `crt-off`; `.crt-layer` taşıyan `.vue` **0**; `CrtOverlay.vue` git'ten silinmiş. `brain/` içinde bu karara dair **hiçbir kayıt yok** → §8 "sapma önce belgede yazılır" ihlali. |
| R2 | **`.planck-collage` tüketicisi silindi** | `DimensionsTab.vue`'dan "PLANCK YIRTILMASI / MİKRO KARADELİK" bariyer bloğu (ve `:class="{ 'planck-collage': ... }"`) bu uçuşta çıkarıldı; `style.css:794-808` 5 kural **0 tüketici**. K1 ritüel görseli (sözleşme §4 "Planck Aşınması" + ADR-0063 C5) kayıp. Gerekçe commit edilmediği için bilinmiyor. |

---

## 2. 🚨 TEK BLOKAJ KARARI — CRT katmanı (F1)

Sözleşme §3 L1: *"CRT KAPLAMA (Balatro): scanline + curvature vignette + hafif fosfor (HEP AÇIK, frenli)"*;
§4 ise K0'da "CRT ~%10", K1'de "~%35" diyor. Uygulamada CRT **tamamen kapalı** ve şu 4 token grubu tüketicisiz:

| Token grubu | Tanım | Tüketici |
| :--- | :--- | :--- |
| `--crt-intensity` | 7 yer (style.css:99, 585-630) | **0** |
| `--crt-scanline-alpha` / `-period` | 8 yer | **0** (yalnız `display:none` blokları) |
| `--crt-vignette-alpha` / `-glow-alpha` | 12 yer | **0** |
| `.crt-scanlines-removed` | style.css:526 | **0** |

**İki yol — biri seçilmeli (ADR gerekir, iki yol da §8'e uygun):**

- **Yol A — CRT'yi geri getir (sözleşmeye dön):** `CrtOverlay.vue` yeniden (kök kardeşi, `pointer-events-none`, `aria-hidden`, z=40), `crt-off` **koşullu** yap (`crtEffect` + motion `reduced/off` + `batterySaver`), K0–K5 `--crt-*` eğrisi canlanır, `crtEffect` ayar düğmesi geri gelir. K1–K5 için "ilk yırtık köşeler → damalı → tape → floor" ritüeli tamamlanır.
- **Yol B — CRT'yi resmen kaldır (kod doğru, belge yanlış):** `visual-language.md` §3 L1 + §4 CRT kolonları güncellenir, yeni ADR yazılır, `--crt-*` (5 token) + `.crt-*` (56 satır) + `crtEffect` (`models/settings.ts:26`, `state.ts:229`, `actions-save.ts:804`, `save.test.ts:73`) + `GameplaySettings` kalıntısı temizlenir. Bozulma merdiveni yalnız **substrat + motif bandı + glitch** üzerinden yaşar (L1 eksilir; §3 katman mimarisi 4 katmana iner).

> **Not:** Aynı karar zincirinde iki ölü ayak daha var: `--glitch-intensity` (7 tanım / **0 tüketici** → §4 K3 "bölgesel glitch" uygulanmamış) ve K4 "chromatic aberration" (repoda **0** eşleşme). Yol B'de bunlar da sözleşmeden düşürülür; Yol A'da gerçek tüketici kazanırlar.

---

## 3. Belge senkronu gereken noktalar (kod doğru, sözleşme bayat)

| # | Belge | Kod | Düzeltme |
| :--- | :--- | :--- | :--- |
| D1 | §4: K2 "tape yapışkanları", K3 "damalı şerit" | `ScreenOverlay.vue:120-145` K2=`collage-checker`, K3=`collage-tape` (ADR-0063 §2.2 sırayı yeniden yazdı) | §4 tablosunu ADR-0063 sırasıyla eşitle |
| D2 | §2 amber `#f59e0b → #ffbe45` | `#ffbe45` `src`'de **0 referans** | Ya amber'i ısıt (token + ramp + `quantum.amber`) ya sözleşmeyi "değişmedi" yap |
| D3 | §4 CRT yüzdeleri (%10/%35) | `CORRUPTION_META` 0.05/0.09/0.13; `style.css:579` yorumu hâlâ "O3: K0 %10/K1 %35/K2 %45" | Yorumu gerçek değerlere çek (A3 F14 / A5-19) |
| D4 | §5 "28 glif kopyası" | `MotifBand.vue:57,71` 2 yarım × **2 taraf** → normal **32**, dense **56** | Ya tek dizi paylaş (28) ya brief'i 56'ya güncelle |

---

## 4. Konsolide bulgular — tema bazlı

> Aşağısı öncelikli/tekil bulgular; tam dosya:satır tabloları alt raporlardadır.

### T1 — CRT / ölü bozulma katmanı (KRİTİK 1, YÜKSEK 3, ORTA 2)
- **[KRİTİK]** CRT tamamen kapalı (bkz. §2) — `style.css:516-524` + `useNavigation.ts:325-326`.
- **[YÜKSEK]** `--crt-intensity` 7 tanım / 0 tüketici; `--glitch-intensity` 7 tanım / 0 tüketici; K4 chromatic aberration 0 referans.
- **[YÜKSEK]** `.planck-collage` 0 tüketici (R2) — K1 Planck vinyeti yok.
- **[ORTA]** Motif bandı düzleşmesi: `style.css:650-655` `opacity: max(var(--motif-band-opacity), 0.45)` → K1/K2/K3 (0.08/0.25/0.45) fiilen **0.45**, rampa yalnız K4'te kırılıyor.
- **[ORTA]** K4 "motif bandı sürekli akar" yok: `MotifBand.vue:23-34` yalnız boost/buff anında tetikliyor (baff 25–120 sn sürünce bant dakikalarca akıyor, ömür/suppression yok).

### T2 — Zemin ve token kaçakları (YÜKSEK 3, ORTA 6)
- **[YÜKSEK]** Paralel `dark-*` ölçeği (`tailwind.config.js:19-26`): 24 sınıf / 4 dosya; `bg-dark-950` = `--ds-bg` kopyası, `dark-900/800/700` = panel tokenlarının ikinci ölçeği; `dark-900 #141016` soğuk eğilimli.
- **[YÜKSEK]** `--bicycle #c40f2e` **0 tüketici**; değeri `style.css:706` `motif-tone-ember` içinde literal kopya → pivotun ikinci rengi uygulanmamış.
- **[YÜKSEK]** 4 rezerve token (`--ds-prestige/locked/bonus/danger`) 0 tüketici; `ds-ramp-*` aynı değerleri literal tekrarlıyor.
- **[ORTA]** 11 satır `bg-[#hex]` (3 token değerine karşı 6 kopya — drift): `App.vue:220`, `ConfirmModal:47`, `WelcomeBackModal:59`, `FloatingThumbBar:108`, `CommentTicker:368/394/395`, `AchievementToast:54`, `AdminPanel:417`, `AnomalyOverlay:209`.
- **[ORTA]** `#0a0608` literal duplikasyonu: `style.css:1547` (scrollbar) + `AlgorithmicSwirl.vue:515` (`via-[#0a0608] to-[#07030a]` — ikinci tanımsız near-black).
- **[ORTA]** Feast iki kaynak: `--feast-rgb` ↔ `core/particles.ts:100,114` `'#ff3355'` literali.
- **[ORTA]** Soğuk zemin kaçakları: `.clock-chip-forecast/profit` (`style.css:1961,1966`), `.edition-negative` (`style.css:1483`), `TimeClockOverlay.vue:388`.
- **[ORTA]** `contrast.mjs` kapsam boşluğu: renkli-metin×renkli-yüzey, `*-200/300`, `bg-black/NN` kompozitleri, kaçak zeminler ve **UI 3:1** ölçülmüyor (mevcut 33 kapsam-dışı çiftte ihlal **yok**, min 4.74:1 — sorun koruma boşluğu).

### T3 — Rezerve renk semantiği / durum ≠ hue (ORTA 8)
- `CrisisTab.vue:91,99` — `sweet_spot`(bonus)=violet, `resonance`(bonus)=amber; aynı nesnede badge cyan → tek semantik iki hue.
- `RecordsPanel.vue:93-98` — Rezonans kombosu (bonus) **rose** ("kırmızı = tehlike").
- `SingularityButton.vue:47-48` — kilitli yüzeye `ds-ramp-partial` (amber) sabit; aynı yüzeyde iki durum kanalı.
- `AchievementsTab.vue:146` — arama odağı amber ("altın SADECE prestij").
- `AutobuyerCard.vue:313,138,294` — `blue` **durum** rengi (ADR-0058'de blue yalnız bölüm kimliği).
- `CommentTicker.vue:369,521-548` — `disco-mode` + `rainbow-text` hâlâ aktif (ADR-0049 Kural 3 bunları "kısılır/kaldırılır" sayıyor).
- `PastRunsPanel.vue:76` — tamamlanmış koşu rose rozet (belirsiz).
- `.crisis-collage-frame` (rose) + `SideSnapHands:185` (amber) + `.singularity-horizon` (amber+purple) dekoratif kaçaklar.

### T4 — Tipografi (YÜKSEK 4, ORTA 1)
- **[YÜKSEK]** `TimeClockOverlay.vue:486` `font-display text-4xl sm:text-6xl` — display rolü sözleşmede yalnız hero sayaç + canvas; ayrıca `60px` **18'in katı değil**.
- **[YÜKSEK]** `TimeClockOverlay.vue:502` `font-display text-[13px] sm:text-[15px]` — rol + ızgara ihlali.
- **[YÜKSEK]** `WelcomeBackModal.vue:67` — süre metni `tabular-nums`'sız (tek onaylı tabular eksiği).
- **[ORTA]** Canvas fallback (`JuiceLayer.vue:607` "Space Mono") ≠ token display fallback ("Space Grotesk"); `style.css:31` ile `tailwind.config.js:40` iki ayrı yığın listesi.
- **[BİLGİ]** 14 `font-extrabold/black` sınıfı ADR-0067'nin bilinçli 700 clamp'ine uygun (ihlal değil).

### T5 — Katman mimarisi & z-index (YÜKSEK 1, ORTA 3)
- **[YÜKSEK]** `AuthModal.vue:138`, `CloudConflictModal.vue:56`, `LabTab.vue:398` — `z-50` (=50), `.layer-juice`(60)/`.layer-clock`(55)/`.layer-toast`(70) **altında**; saat kadranı tıklama çalabilir → `.layer-modal`(80) olmalı.
- `style.css:495-501` z-index haritası tanımlı ama bileşenler paralel literal kullanıyor (kaçak taraması gerekli).
- `L2` substrat `z-30`'da (ScreenOverlay içi) — içerik z-10 ile ilişkisi doğrulanmalı.
- `SideSnapHands.vue:100-101` yorumu "içerik üstte" diyor ama `.snap-wrap z=45` içeriğin üstünde (yanlış yorum).

### T6 — Hareket/juice kapıları & partikül (YÜKSEK 3, ORTA 5)
- **[YÜKSEK]** OS `prefers-reduced-motion` kök mührüne yazılmıyor (`useNavigation.ts:329-333`); 13 dosya OS'siz `isMotionReduced()` ile karar veriyor; `tilt.ts:38`, `AlgorithmicSwirl:445`, `JuiceLayer:777` paralel `matchMedia` → "tek kapı" iddiası kırık.
- **[YÜKSEK]** `style.css:1584-1647` OS listesi 8 sonsuz animasyonu kapsamıyor: `.panic-pulse`, `.animate-flame-sub`, `.animate-cyber-heart`, `.animate-starburst-spin`, `.animate-ekg-line`, `animate-ping`(2), `animate-bounce`(2), `animate-spin`(6).
- **[YÜKSEK]** `JuiceLayer.vue:245,520,541,562,587` — `life++`/yarıçap **kare başına**; `loop()` timestamp/delta almıyor → 120 Hz'de ömür yarılanır (sözleşme §9.1 "timestamp-driven, frame-counted asla").
- **[ORTA]** `style.css:1775/1793` `.juice-bloom`/`.rise-float` **0 tüketici** → "5 katman dokunma" fiilen tek katman (`.juice-punch`).
- **[ORTA]** Partikül cap'i `JuiceLayer.vue:237` 120/30/60 hardcoded; `core/particles.ts:164 MAX_PARTICLES=60` yalnız testte → test yanlış güvence.
- **[ORTA]** `celebrate.ts:1` canvas-confetti **3. canvas** + cap'siz 80 partikül; `useCounterHeat.ts:12-17` boş 100 ms interval ömür boyu; `screen-shake.test.ts` üretimin kopyasını test ediyor.
- **[ORTA]** `animate-fade-in` 7 kullanım / **0 tanım** (`AuthModal`, `CloudSaveSection`).

### T7 — GIC motif kütüphanesi & bant (KRİTİK 2, YÜKSEK 3, ORTA 2)
- **[KRİTİK]** `assets/motifs/goz.svg:1` `fill="var(--ds-bg, #0a0608)"` — brief §1 açık yasağı + §5 "motifin içine renk gömülmez".
- **[KRİTİK]** `motifs.test.ts:48-57` yalnız `<svg` + `currentColor` kilidiyor; `id=`/`url(`/`<defs>`/`var(` taranmıyor → brief'in "ihlal = test kırılır" iddiası **yanlış**.
- **[YÜKSEK]** `motifs.ts:103-114` `buildMotifStrip` hep 0. indeksten başlıyor: K1'de `delik` **%50**; K2=K3 birebir aynı; normal bantta **9/16**, dense'te **3/16** motif hiç görünmüyor (`motif-preview.mjs` `spreadStrip` boşluğun farkında ama üretim düzeltilmemiş).
- **[YÜKSEK]** `delik.svg` `weight:2` + eşmerkezli `r=11`/`r=5.5` mükemmel daire, kütle/oyuk yok.
- **12 eski motif** brief kolaj reçetesini (`1 kütle + 1 oyuk + 1 kayma + 1 dikiş + serpinti`) sağlamıyor: tam sağlayan yalnız `dama` ve `yirtik` (2/16). `stroke-width="2.2"` 4/16; `evenodd` oyuk 2/16; §4 yasaklı-okuma (`vida`=nişangâh, `catlak`=şimşek, `ay`=krsant, `yildiz`=4 uçlu parıltı, `saat`=saat ikonu, `goz`=Lucide göz) 6 motifi kapsıyor.
- **[ORTA]** `MotifBand.vue:51` mobilde 28px şerit ↔ `App.vue:168` `p-3`(12px) → glif içerik kutusuyla ~10px çakışıyor.
- **[ORTA]** Wrinkler kaplaması jenerik (`style.css:776-791` + `DimensionsTab.vue:365`): yalnız feast radial + dotted border; motif asset'i/göz yok; `AnomalyOverlay`de hiç GIC katmanı yok.
- **[ORTA]** `motif-preview/*.png` bayat (dama/gul/tekerlek çiziminden önce üretildi) + bant opaklık tabanını modellemiyor.

### T8 — Substrat / K-seviyesi görünürlük (YÜKSEK 1)
- **[YÜKSEK]** K1 `.collage-torn` efektif α = 0.07 × 0.06 = **0.0042** → `#0a0608` üzerinde **≈1.07:1** → sözleşme §4 K1 "ilk yırtık-kâğıt köşeleri" **pratikte yok** (A3 "K1→K4 çalışıyor" hükmü bu noktada kabul edilmiyor).
- Diğer seviyeler 1.9–2.5:1 bandında çok soluk; `ember` tonlu motifler hiçbir seviyede 3:1'i geçmiyor (§8 squint testi riski).
- `CrisisTab.vue:155,454` kriz dama şeridi `--substrate-opacity` ile çiziliyor → K0/K1'de görünmez (sinyal karışması).
- K5 bloğu (9 satır) erişilemez (bilinçli tavan — `MAX_CORRUPTION_LEVEL=4`); hazır bekliyor.

### T9 — Okunabilirlik & bilgi görselleştirme (YÜKSEK 3, ORTA 23, DÜŞÜK 20)
- **[YÜKSEK]** `lab/LabSeedCard.vue:48` — uygunluk **yalnız metin rengi**; ramp/pulse yok (`ViralGrid:105` deseni uygulanmalı).
- **[YÜKSEK]** `DimensionRow.vue:98-176,391` — 9 tier `subtitle` lore **hiç render edilmiyor** (yorum hâlâ "tooltip'inde") → tooltip sökümünün tek somut bilgi kaybı.
- **[YÜKSEK]** `stats/MultipliersPanel.vue:138,122` — D1-D8 glifsiz + `DIM_NAMES` (dimension_identity'nin ikinci kopyası).
- **[ORTA]** **9 bespoke çubuk** kanonik `progress-track`/`progress-fill` yerine elle çizilmiş: `DimensionRow:480-484`, `Header:386,555`, `CrisisTab:234`, `AnomalyOverlay:404`, `OverviewPanel:108`, `BiometryPanel:158`, `TimeClockOverlay:516`, `TrendReactor:103,136`.
- **[ORTA]** Bar'sız "X / Y" oranları: `RecordsPanel:44`, `AutobuyersTab:59`, `MultipliersPanel:125`; ayrıca **9 `toLocaleString`** çağrısı `format()` yerine (`RecordsPanel` ×7, `OverviewPanel:58`, `BiometryPanel:40`).
- **[ORTA]** `ChallengesTab.vue:149,167` tamamlanma milestone'u `edition-holo`/pembe + "✔ HOLO MÜHÜR" — §9.4 "altın+ring = milestone" olmalı.
- **[ORTA]** 23 bileşende hiçbir retrofit izi yok (bkz. §5); alt-sekme nav dilinin (aktif ikon+yazı / pasif ikon-only) alt sekmelerde bağlayıcılığı belirsiz.
- **[ORTA]** `ColonyTab:144` tavansız prestij sayacı; `Header:89-96` nightPhase 5 hue (+ palet dışı orange); Crisis sekmesi cyan accent ↔ "cyan = bonus".

### T10 — Ölü kod / token / ayar temizliği (≈250 satır)
CRT 56 satır · decay-static/flicker/glitch 45 satır (0 tüketici, `.decay-glitch .text-slate-200` okunabilir metni hedefliyor) · `.planck-collage` 16 satır · K5 bloğu 9 satır · `.crt-scanlines-removed` · `layer-crt` · 13 ölü CSS + 7 ölü keyframe · `--bicycle`, `--feast`, `--ds-prestige/locked/bonus/danger`, `dark-850`, `quantum.*` (1 tüketici) · `crtEffect` (4 dosya) · `w-4.5`, `py-0.2` (tanımsız sınıflar) · 2 bayat "tooltip" yorumu.

---

## 5. Kapsam matrisi — hiç retrofit görmemiş 23 bileşen

Aşağıdaki bileşenlerde `ds-ramp-*`, `progress-track`, `.dim-glyph` veya motion kapısı **hiç yok** (çoğu `bg-black/*` + tailwind palet ile yaşıyor):

| Grup | Bileşenler |
| :--- | :--- |
| Modal/overlay | `AuthModal`, `CloudConflictModal`, `ConfirmModal`, `WelcomeBackModal`, `AchievementToast` |
| Ayarlar | `SettingsModal`, `settings/AudioSettings`, `settings/CloudSaveSection`, `settings/GameplaySettings`, `settings/ImportExport`, `settings/SaveSlots` |
| İstatistik | `StatsTab`, `stats/OverviewPanel`, `stats/MultipliersPanel`, `stats/RecordsPanel`, `stats/PastRunsPanel`, `stats/BiometryPanel`, `stats/TelemetryChart` |
| Lab | `lab/LabRecipeList`, `lab/LabSeedCard` |
| Kabuk/dev | `TabHero`, `AutobuyersTab`, `AdminPanel` |

**Kısmi retrofit (ramp/çubuk var, glif/motion/token eksik):** `StatsTab` alt panelleri, `lab/TrendReactor`, `lab/ViralGrid`, `autobuyers/AutobuyerCard`.

---

## 6. Uygulama planı

**Dalga yapısı:** F0 (karar/belge) ✅ → F1–F4 (altyapı, paralel) ✅ → F5–F7 (kimlik/okunabilirlik, paralel) ✅ → F8 (QA & kapanış) ✅.
**Tamamlanma Durumu:** F0 (Tamamlandı) · Dalga 1: F1, F2, F4, F5 (Tamamlandı) · Dalga 2: F3, F6, F7, F8 + T10 (Tamamlandı).
Her faz: `npm run typecheck` + `npm test` + `npm run build`; F8'de ayrıca `harness:smoke`, `harness:perf`, `harness:contrast`.

| Faz | Ad | Kapsam | Ana dosyalar | Dosya sahipliği (paralel ajan) |
| :--- | :--- | :--- | :--- | :--- |
| **F0** | Karar & sözleşme senkronu | CRT Yol A/B kararı + ADR; D1–D4 belge düzeltmeleri; O3/O5 yorumları | `visual-language.md`, yeni ADR, `style.css` yorumları | orchestrator |
| **F1** | Zemin & token tek kaynağı | T2: `dark-*` kaldır, 11 `bg-[#hex]` → `--ds-*`, `#0a0608` literalleri, `--bicycle` kararı, 4 rezerve token + ramp tek kaynak, feast tek kaynak, `quantum`/ölü sınıf temizliği | `tailwind.config.js`, `style.css`, `App.vue`, 10 `.vue`, `particles.ts` | 3 ajan (tailwind+style.css / modallar / lab-stats) |
| **F2** | Rezerve renk semantiği | T3: CrisisTab bonus fazları, RecordsPanel, SingularityButton, AchievementsTab, AutobuyerCard, CommentTicker disco/rainbow, PastRunsPanel, dekoratif kaçaklar | `CrisisTab`, `RecordsPanel`, `SingularityButton`, `AchievementsTab`, `AutobuyerCard`, `CommentTicker`, `SideSnapHands`, `style.css` | 2 ajan |
| **F3** | Katman & hareket kapıları | T5+T6: modal `z-50`→`layer-modal`; OS reduced-motion kök mührü + 8 animasyon; `JuiceLayer` delta/timestamp; `juice-bloom/rise-float` bağla/sil; partikül cap tek kaynak; boş interval; confetti cap; `animate-fade-in` | `useNavigation.ts`, `style.css`, `JuiceLayer.vue`, `particles.ts`, 3 modal, `celebrate.ts`, `useCounterHeat.ts` | 2 ajan (CSS kapıları / JuiceLayer) |
| **F4** | CRT & bozulma katmanı | §2 kararı uygula; `--glitch-intensity` tüketicisi (K3) + K4 chromatic (Yol A) veya sözleşmeden düşürme (Yol B); `.planck-collage` bağla/sil; band `max()` tabanı; K1 substrat tabanı; CrisisTab dama ayrı opaklık | `style.css`, `App.vue`, `ScreenOverlay.vue`, `MotifBand.vue`, `DimensionsTab.vue` | orchestrator + 1 ajan |
| **F5** | GIC motif kütüphanesi | T7: `motifs.test.ts` yasaklı-token+viewBox+marj kilidi; `buildMotifStrip` pencere; `goz.svg` düzeltme; P0 `delik/goz/vida/catlak/yildiz`, P1 `ay/saat/zincir/bant/karalama`, P2 `gul/tekerlek` rötuş + `dis/perde`; bant ömür/suppression; Wrinkler creepy-cute | `motifs.test.ts`, `motifs.ts`, `MotifBand.vue`, 12 `svg`, `style.css`, `DimensionsTab` | 4 ajan (motif başına 3'lü gruplar) + 1 kod ajanı |
| **F6** | Okunabilirlik & bilgi görselleştirme | T9: LabSeedCard ramp, DimensionRow subtitle, MultipliersPanel glif, 9 bespoke çubuk, bar'sız oranlar + `format()`, holo→altın+ring, nav alt-sekme dili, 23 bileşen retrofit turu | `LabSeedCard`, `DimensionRow`, `MultipliersPanel`, 9 çubuk dosyası, `ChallengesTab`, `useNavigation.ts`, 23 `.vue` | 4 ajan (settings/stats/lab/envter) |
| **F7** | Tipografi rötuşu | T4: `TimeClockOverlay` rol + 18px ızgara (60→54, 13/15→18), `WelcomeBackModal` tabular, fallback tek kaynak, `JuiceLayer` canvas fallback | `TimeClockOverlay.vue`, `WelcomeBackModal.vue`, `style.css`, `tailwind.config.js`, `JuiceLayer.vue` | 1 ajan |
| **F8** | QA & kapanış | `contrast.mjs` kapsam genişletme + AA turu; OS/reduced/off/batterySaver × mobil görsel tur; tüm kapılar; `completed.md` + ADR + commit | harness, brain | orchestrator + bağımsız QA ajanı |

### Kabul kriterleri (F8 sonu)
- `deriveCorruptionLevel` + mühür davranışı değişmedi (regresyon yok); kayıt formatı **hâlâ** yeni alan içermiyor.
- Bozulma katmanları K0→K4'te **ölçülebilir biçimde** kademeli (K1 substratı görünür; band rampası monoton).
- `data-corruption` dışındaki tüm ambient tokenların en az 1 tüketicisi var **veya** silinmiş.
- Okunabilirlik kanonu: sayı/etiket/ramp/glif katmanı bozulmadan; `tabular-nums` eksiksiz; bespoke çubuk 0.
- `v-tip` 0 (korunur); `font-display` yalnız hero+canvas; `font-display` boyutları 18'in katı.
- `npm run typecheck` 0 · `npm test` yeşil · `npm run build` 0 · `harness:smoke` baseline sabit · `harness:contrast` AA (genişletilmiş kapsam).

---

## 7. Kullanıcı kararları (uygulamadan ÖNCE kapatılacak)

| # | Karar | Seçenekler | Etki |
| :--- | :--- | :--- | :--- |
| K1 | **CRT** | (A) geri getir · (B) resmen kaldır | En büyük iş kalemi; §3 L1 + §4 tablosu + ~56 satır CSS + `crtEffect` |
| K2 | Motif yeniden çizim kapsamı | Yalnız P0 (5 motif) · P0+P1 (10) · 16'nın tamamı | "her tarafı" hedefi için öneri: **16/16** (4 zaten bitti → 12 kaldı) |
| K3 | Bant glif sayısı | 28'e indir (tek dizi) · brief'i 56'ya güncelle + DOM bütçesi | Performans vs. brief sadakati |
| K4 | K3/K4 eksik ayaklar | Gerçekten uygula (glitch + chromatic) · sözleşmeden düşür | Yol B ile tutarlılık |
| K5 | Feast ↔ rose ayrımı | Feast'i turuncuya kaydır · feast'i yalnız geniş yüzeye hapset | §2 "karışmaz" kuralı şu an ölçülebilir biçimde kurulamıyor |
| K6 | Amber tonu | `#ffbe45`'a ısıt · sözleşmeyi "değişmedi" yap | D2 |
| K7 | `AdminPanel` | Görsel dil dışı bırak (dev-only) · retrofit et | Kapsam sınırı netleşir |

---


### 7.1 Alınan kararlar (kullanıcı onayı — 2026-10-18)

| # | Karar | Kayıt |
| :--- | :--- | :--- |
| K1 | **CRT = Yol B** (resmen kaldır, sözleşme güncellenir) | [ADR-0069](../decisions/0069-crt-layer-removal.md) yazıldı; `visual-language.md` §1/§2/§3/§4/§6/§8 senkronlandı. Kod temizliği F3/F4'te. |
| K2 | **Motif yeniden çizim kapsamı = 16/16** (4 bitti → 12 kaldı) | F5: P0 `delik, goz, vida, catlak, yildiz`; P1 `ay, saat, zincir, bant, karalama`; P2 `gul, tekerlek` rötuş + `dis, perde`. |
| K3 | **Bant glif dizisi = tek paylaşılan dizi (28 kopya)** | F5 kod ajanı: `MotifBand.vue` sağ/sol aynı diziyi paylaşır; brief §1 DOM bütçesi korunur. |
| K4 | **K3 glitch + K4 chromatic gerçekten uygulanır** (sözleşmeden düşürülmez) | F4: `--glitch-intensity` tüketici kazanır; K4 chromatic aberration eklenir. |
| K5 | **Feast tonu `#ff3355` sabit; ayrım kullanım disipliniyle kurulur** | Feast yalnız geniş ambient/vinyet yüzeylerinde; rose yalnız ikaz işareti/ikon; bonus-semantiği cyan'a çekilir (F2). |
| K6 | **Amber tek ton `#f59e0b`; sözleşme düzeltildi** | §2 "→ #ffbe45" vaadi kaldırıldı (117 tailwind kullanımı token'a taşımak yerine ton sabitlendi). |
| K7 | **Kapsam = tam F0→F8** | Tüm 138 bulgu + 12 motif + 23 bileşen retrofit turu; dalga dalga, her fazda typecheck/test/build. |
| — | **Uygulama fazı** | **F0 + Dalga 1 (F1, F2, F4, F5) + Dalga 2 (F3, F6, F7, F8 + T10) TAMAMLANDI.** Tüm 6 kalite kapısı 0 hata ile doğrulandı. |

> **Açık kalan tek mikro-karar:** `AdminPanel` (dev-only) görsel dil retrofitine dahil mi —
> varsayılan: **dahil** (kapsam "her tarafı"), ancak en sona (F6 kuyruğu) bırakılır.

---

## 8. Doğrulama protokolü (her faz)

1. `npm run typecheck` → 0 hata.
2. `npm test` → yeşil (mevcut 380 test + yeni kilit testleri).
3. `npm run build` → 0 hata.
4. `npm run harness:smoke` → baseline `log10=90.72 shifts=8` **değişmemeli** (görsel iş dengeyi bozmaz).
5. `npm run harness:perf` (F3/F4 sonrası) → churn regresyonu yok.
6. `npm run harness:contrast` (genişletilmiş kapsam) → AA.
7. Görsel tur: `full/reduced/off` × `batterySaver` × mobil (K0–K4 zorlanmış mührüyle).
8. `brain/tasks/completed.md` + ADR + Conventional Commit (AGENTS.md §5).

---

## 9. Alt rapor dizini

| Rapor | Konu | Bulgu |
| :--- | :--- | :--- |
| [a1](visual-audit-2026-10-18/a1-renk-token-sozlesmesi.md) | Renk & token sözleşmesi | 26 |
| [a2](visual-audit-2026-10-18/a2-tipografi-sistemi.md) | Tipografi | 11 |
| [a3](visual-audit-2026-10-18/a3-faz-temelli-gic-bozulma-merdiveni.md) | Bozulma merdiveni K0–K5 | 16 |
| [a4](visual-audit-2026-10-18/a4-layer-mimari-ve-hareket-kapilari.md) | Katman & hareket kapıları | 19 |
| [a5](visual-audit-2026-10-18/a5-gic-kimlik-doku-katmani.md) | GIC kimlik/doku | 20 |
| [a6](visual-audit-2026-10-18/a6-okunabilirlik-yuzey-kapsamasi.md) | Okunabilirlik & yüzey kapsaması | 46 |
