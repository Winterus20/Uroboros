# Yapılacaklar Listesi (Backlog & Roadmap)

## ⚖️ YENİ: Tempo & Ekonomi Yeniden Tasarımı (2026-10-19 — TASARIM)
*(kullanıcı kararları: dikey/yatay denge + başarımla içerik açılımı + fiyat artışlarını kızıştır + shifti D8 sonrası hızlandırıcıya çevir · **Plan:** [`research/pacing-economy-shift-redesign-plan-2026-10.md`](../research/pacing-economy-shift-redesign-plan-2026-10.md))*

> **⚖️ KAYNAK HİYERARŞİSİ KANUNU (plan §11 — BAĞLAYICI):** oyunun ana artan sayısı HER ZAMAN **Yutulan Kütle (g)**'dir. İkincil birimler (SP = oyunun ikinci birimi, izotop, nap…) GERÇEK para birimleridir — kendi sayaçları ve döngüleri meşrudur; AMA kazanımı kütle kilometre taşından türetilir, harcaması kütle akışını GÜÇLENDİRİR, gösterimi ikincil yüzeydedir ve kazanım eğrisi asla kütleyle yarışamaz. Her yeni mekanik 'kütle/sn çarpanına nasıl bağlanır?' sorusuna cevap vermelidir; cevapsız mekanik kapsam dışıdır. Header kütle sayacı tek görsel yıldız kalır. **BESLEME MERDİVENİ (§11.1b):** katmanlar birbirini aşağı doğru besler — L3 (Faz 3 birimi) → SP (L1) → Yutulan Kütle (L0, tek yıldız); her katman yalnız bir altındakini besler, kazanım alt katmanın derinlik eşiğinden doğar, harcama alt akışı güçlendirir.
### Faz 0 — Hijyen & P0 Baseline ✅ (2026-10-19 · dalga 1: 5 paralel subagent, orchestrator doğruladı)
- [x] **H1 — İkiz ADR-0033 çözüldü:** cloud-sync → **ADR-0070** (kronoloji korundu) · `brain/decisions/README.md` indeksi (71 satır = 71 dosya) · 19 kaynak yorumu + 2 yanlış atıf (`ADR-0013`) düzeltildi
- [x] **H2 — Sim sabit drifti giderildi:** `simulate-economy.js` → `simulate-economy.ts`, sabitler gerçek `src/game/*`'ten import · `npm run harness:sim:verify` 6/6 geçti (eski sim: D1@50=3, gerçek 2)
- [x] **H3 — Ölü dosya silindi:** `harness/run.ts.broken-backup`
- [x] **P0 baseline:** [pacing-p0-baseline-2026-10.md](../research/pacing-p0-baseline-2026-10.md) + `harness/unlock-timeline.mjs` — ilk 8 dk'da **7 özellik kapısı** (teşhis doğrulandı), ölü bölge 26:27'de başlıyor
- [x] **§8A — Şafak merdiveni (ADR-0071):** kırılma öncesi SP `1` → `1 + singularities`; 4-SP duvarı 4 koşu → **3 koşu** (≈14 sa → 10.5 sa)
- [ ] **P0 — Ölçüm (kısmi ✅):** *(baseline + SP merdiveni alındı; kalan: ayar kollarının kilitlenmesi + `harness --dawns N` modu)* fiyat/shift ayar kolları smoke harness ile kilitlenir (kod yok) · **SP telemetrisi (§8E):** zaman-to-break / ilk-10-SP / derinlik-SP-saat eğrisi; §8 A-D kollarının sayıları ölçümle kilitlenir
- [ ] **P1 — Fiyat eğrisi:** B0 30→15-20, ivme 0.011→0.02-0.03, erken oranlar 55/42/32/28/24/20→75/55/40/34/28/24 bandı (ADR-0023 3s30d korunur)
- [ ] **P2 — Boyut açılış kapıları + shift rol değişimi:** D1-D8 açılımı sıçramadan kopar; sıçrama = D8 sonrası kalıcı hız çarpanı; corruption kaynağı + kayıt migrasyonu + yeni ADR (öneri 0070, ADR-0033 süperseeded)
- [ ] **P3 — Başarım kapısı & ilk 10 dk:** omurga deterministik kalır, opsiyonel dallar başarım aileleriyle açılır, aile bazlı kalıcı çarpan, silüet teaserlar, erken merdiven yeniden zamanlaması (ilk oturumda ≤4 sistem)
- [ ] **P4 — Görsel-öncelikli iletişim ("önce göster, gerekiyorsa yaz"):** iletişim kulesi T0-T4 kuralı; "ilk karşılaşmada anlat, sonrasında göster" öğretim geçişi; LabTab/AdminPanel/SettingsModal metin duvarları + veri korpusu (ipucu/başarım/challenge desc) kuleneye göre sökülür; CommentTicker muaf, okunabilirlik kanonu + aria-label koruması
- [ ] **P1 eki (M1 — cüzdan ikilemi):** bot hız çipleri/bulk artan mass fiyatı (cost × mult^lvl); bot ALIMLARI ucuz tek seferlik kalır (ADR-0032 idle kilidi geri dönmez); smoke ile çifte kıtlık testi zorunlu
- [ ] **P3 eki (M2 — meta ikilem):** nöral ağaçta Otomasyon Dalı vs Güç Dalı rekabeti (dal-başı dışlayıcılık ya da şafak dönemi başına tek dal); SP kıtlığı (§8) ikilemi besler
- [ ] **Faz 2 taslağı (M3 — Odak Bütçesi):** bot kanalı/duruş/büyü Odak tüketir, toplam Odak sınırlı + prestijle büyür; loadout sürgüsü; Uyku Baskısı Matrisi'nin mekanik prototipi (ayrı ADR)

## 🎭 YENİ: Görsel Dil — "Aç Kumarhane" (Balatro zemin + VS şöleni + GIC kimlik) & Faz-temelli Bozulma
*(2026-10-16 · tasarım kullanıcıyla uzlaşıldı · **Fazlı uygulama planı:** [`brain/research/visual-language-hungry-parlor-implementation-plan-2026-10.md`](../research/visual-language-hungry-parlor-implementation-plan-2026-10.md) · Sözleşme: [`brain/context/visual-language.md`](../context/visual-language.md) · ADR: [`0060-gic-phase-corruption-visual-pivot.md`](../decisions/0060-gic-phase-corruption-visual-pivot.md) · Öncüller: ADR-0049/0057/0058 geçerli)*

> **Uygulama faz faz ilerler** — her fazın kapsamı, dosya sahipliği, adımları, kabul kriterleri
> ve doğrulama yöntemi plan dokümanındadır. Faz başlamadan önce plan §11'deki açık kararlar kapatılır.

**Uzlaşma özeti:** ink black + hot red + altın palet; CRT scanline hep hafif açık (frenli);
wobble/roll-up/bounce etkileşimde; büyük olaylarda VS partikül şöleni; GIC kolaj substrat
+ boost anında yanlardan süzülen motif/glif bandı; creepy-cute Wrinkler. **Bozulma
BOYUTA değil FAZA bağlı** (K0→K5); okunabilirlik kanonu (sayı/etiket/ramp asla bozulmaz) kırılmaz.

- [x] **Faz A — Zemin & CRT:** *(✅ tamamlandı 2026-10-16 — ADR-0061 · derin spec: [`research/phase-a-ground-crt-deep-spec-2026-10.md`](../research/phase-a-ground-crt-deep-spec-2026-10.md))* `--ds-bg` #0a0608 ısınması; YENİ tokenler `--feast` #ff3355 (oburluk/olay enerjisi) + `--bicycle` #c40f2e; sıcak vinyet; tek zemin kaynağı (`bg-[var(--ds-bg)]`); `CrtOverlay.vue` (**statik** scanline + curvature, `useMotion` full/reduced/off + `crt-off` + `battery-saver` kapısı, kök seviyede, modal altı z-index, ADR-0044 güvenli); ölü `crtEffect` ayarını canlandır; `AlgorithmicSwirl` korunur (ADR-0049 Kural 1); m6x11 font lisans kontrolü (ertelendi)
- [x] **Faz B — Bozulma altyapısı:** *(✅ tamamlandı 2026-10-16 — ADR-0062 · derin spec: [`research/phase-b-corruption-deep-spec-2026-10.md`](../research/phase-b-corruption-deep-spec-2026-10.md))* `src/game/corruption.ts` + `corruption.test.ts` (11 test) — K0..K5 fazdan türetilir (`unlockedDimensionsCount` [monotonik, `lifetimePeakShifts`], `singularities`, `nightWatchUnlocked`; O1: K4 = nightWatch && singularities>=1; K5 tavanı); App root `data-corruption` mührü; CSS token tahsisi (`--crt-intensity` + scanline/vignette/glow + substrate/motif/glitch; Faz A'nın CRT'sini besler); kayıt formatına yeni alan EKLENMEDİ
- [x] **Faz C — GIC kimlik kütüphanesi:** *(✅ tamamlandı 2026-10-16 — ADR-0063 · derin spec: [`research/phase-c-motif-substrate-deep-spec-2026-10.md`](../research/phase-c-motif-substrate-deep-spec-2026-10.md))* `src/assets/motifs/` (16 SVG) + `src/game/motifs.ts` (slot kontratı: ad=dosya adı; tonlar yalnız feast/bone/ember) + `MotifBand.vue` boost duyuru bandı (rezonans kombosunda yoğunluk kabarır) + substrat katmanı (K1 yırtık → K2 dama → K3 bant → K4 zemin) + Wrinkler creepy-cute kaplaması + Kriz/Planck kolaj vinyetleri
- [x] **Faz D — VS şöleni:** *(✅ tamamlandı 2026-10-16 — ADR-0064 · derin spec: [`research/phase-d-feast-shower-deep-spec-2026-10.md`](../research/phase-d-feast-shower-deep-spec-2026-10.md) · internet araştırması: [`research/phase-d-internet-research-2026-10.md`](../research/phase-d-internet-research-2026-10.md))* `core/particles.ts` (paylaşılan reçete/bütçe/suppression, saf + 13 test) + `JuiceLayer` genişletmesi (**tek canvas**, `doomscroll:feast-scene`, suppression + knock-down + YUT kıvılcımı + yüzen kütle sayıları); tetikleyiciler (`clickAnomaly`, `singularityReset`/`break_singularity`, dekad); ADR-0044 shake containment + M3 (köke filter yok) korunur
- [x] **Faz E — Retrofit & QA:** *(✅ tamamlandı 2026-10-16 — ADR-0065 · derin spec: [`research/phase-e-retrofit-qa-deep-spec-2026-10.md`](../research/phase-e-retrofit-qa-deep-spec-2026-10.md) · internet araştırması: [`research/phase-e-internet-research-2026-10.md`](../research/phase-e-internet-research-2026-10.md))* K-2 `:where()` (ölü aksanlar canlandı; etkileşim > state > yüzey) + `progress-track-lg` (12px; hype barı görünür) + `useMotionReduced` tek kapı (CommentTicker/MusicControls; OS boşluğu kapandı) + CrisisTab `progress-fill` tabanı + `m6x11.woff2` silindi; `bg-black/*` (162, translucent) + renk sözleşmesi + `data-corruption` verdict'leri (değişiklik yok); `npm test` + `npm run build` + `harness:smoke` + `harness:perf` + `harness:contrast` (AA) + completed.md kaydı + conventional commit
- [x] **Tipografi Pivotu — "Aç Kumarhane" fontları:** *(✅ tamamlandı 2026-10-16 — ADR-0066 · rapor: [`research/typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md))* `font-display` → **m6x11plus** (Balatro piksel, self-host + `ATTRIBUTION.md`; ADR-0060 ertelemesi kapandı; **m6x11 orijinalin TR'siz olduğu fonttools ile kanıtlandı**, m6x11plus TR-tam) · YENİ `font-hand` = **Caveat** (K3+ `.collage-scrawl` el yazısı annotasyonları — §4 sözleşmesi uygulanmış oldu) · sans/mono korunuldu (ADR-0049 + frenli kaos bütçesi) · 18-px piksel ızgarası (sayaç 36/54/72 · canvas 18/36, sentetik bold yok) · Chakra Petch repodandır · kanıt: test 314/314 · build 0 · contrast AA · smoke log10=90.7/8 shift · dist artifact ✓ (Playwright bu ortamda kurulamadı → ekran görüntülü onay kullanıcıda)
- [x] **Tipografi 2. Dalga — UI fontları (menüler/tüm yazılar):** *(✅ tamamlandı 2026-10-16 — ADR-0067 · rapora §7 eklendi)* kullanıcı talebi: "menüler aynı kalmış" → 13 aday fonttools ile TR-doğrulandı, yön "en stilistik + görsel dil" → **sans: Space Grotesk · mono: Space Mono** (ayna aile, CRT/retro kimlik) token swap + hardcoded yığın hizası (`style.css` body/section/badge/btn/chip, `tooltip.ts`, `JuiceLayer` fallback) + ağırlık eşlemeleri (SG maks 700, SM 400/700); Inter/JetBrains repoda **0 referans** · kanıt: test exit 0 (314) · build 0 · contrast AA · smoke 90.7/8 shift · dist `.font-sans/.font-mono` ✓
- [x] **(F0 ✅ · Dalga 1 ✅ · Dalga 2 ✅ — TAMAMLANDI)** **Görsel Dil Uyum Turu — "Her Tarafı" (2026-10-18):** *(araştırma ✅ TAMAM · uygulama ✅ TAMAMLANDI · master rapor: [`research/visual-language-compliance-audit-2026-10-18.md`](../research/visual-language-compliance-audit-2026-10-18.md))* 6 paralel denetim ajanı → **138 bulgu** (KRİTİK 4 · YÜKSEK 23 · ORTA 65 · DÜŞÜK 43); **23/52 bileşen retrofit turu tamamlandı**. Uygulama fazları: **F0** karar & sözleşme senkronu (CRT Yol B + D1–D4) → **F1** zemin/token tek kaynağı (`dark-*`, 11 `bg-[#hex]`, `--bicycle`, rezerve tokenlar) → **F2** rezerve renk semantiği → **F3** katman/motion kapıları (modal z, OS reduced-motion kök mührü, JuiceLayer delta) → **F4** CRT sökümü & bozulma katmanı (glitch/chromatic/planck/band ramp) → **F5** GIC motif kütüphanesi (16/16 motif + test kilidi + bant dizilimi) → **F6** okunabilirlik (ramp/çubuk/glif/nav + 23 bileşen turu) → **F7** tipografi rötuşu (18px grid, tabular-nums) → **F8** QA (243 çift WCAG AA contrast + smoke/perf + commit). Doğrulama: 6/6 kapı hatasız geçti.

---

## 🎨 Balatro Taktil UI/UX ve Görsel Matematik Girişimi (5 Sütun)
*(Referans: `brain/research/balatro-uiux-synthesis-roadmap.md`)*
- [x] **Sütun 1: Canlı GLSL Arka Plan Girdabı (AlgorithmicSwirl.vue)** ✅ *(v0.27.0)*
  - [x] WebGL2/WebGL1 Canvas tabanlı prosedürel Balatro Paint Swirl shader'ı.
  - [x] Algoritma Frekansı (Hz), Kombo, Kriz ve Şafak durumlarına göre dinamik renk/hız reaksiyonu.
  - [x] 0.5x buffer, batterySaver/reduceAnimations uyumu, ayarlar menüsü entegrasyonu.
- [x] **Sütun 2: Balatro Sıralı Nedensellik (Sequential Triggering) ile Reels Vuruşu** ✅ *(v0.28.0)*
  - [x] Çift Hızlı Mimari (Tier A: Mikro-kaskad 180-240ms, Tier B: Makro-surge bar, Tier C: Anti-lag coalescing).
  - [x] Web Audio Lydian polifonik yükselen arpej (C4, E4, G4, C5 + 50Hz sub-bass slam + CRIT parlaması).
  - [x] GPU hızlandırmalı yaylanan rozet katmanı (`SequentialStrikeLayer.vue`).
  - [x] Ayarlar modalında "Sıralı Reels Vuruşu" toggle anahtarı ve reduceAnimations entegrasyonu.
  - [x] 5 yeni birim testi (162/162 yeşil) ve Playwright canlı tarayıcı doğrulaması.
- [x] **Sütun 3: Taktil 3D Kart Fiziği & Gerçek "Reels Yukarı İtme" (Spring Damping)** ✅ *(ADR-0057)*
  - [x] v-tilt sertleştirme: canlı `disabled` (updated kancası), dokunmatik koruması, yay bırakışı (spring overshoot), `motionMode` kontratı.
  - [x] Bas-bırak lastik gerilmesi: pointerdown → squash `scale3d(1.04, 0.92, 1)`, bırakınca 420ms spring release; hold-spam'de eski bounce bastırılır.
  - [x] Push Dynamics: manuel satın almada ±1 tier komşu satır 2.5px açılır (`doomscroll:dimension-buy` + `core/card-physics.ts`).
- [ ] **Sütun 4: Dört Özel Format Sürümü (Foil, Holo, Poly, Negative)**
- [x] **Sütun 5: Mekanik Slot Odometresi & Veri Kanalı Olarak Screen Shake** ✅ *(v0.29.0)*
  - [x] Hız-reaktif sayaç: 250ms throttle, logaritmik ısı kademesi, basamak rulo, dekad flaşı (`Header.vue` + `style.css`).
- [x] **Sütun 5.1: Dopamin Nabzı 2.0 (log-hız ısısı + büyüklük pop + tally tick)** ✅
- [x] **Sütun 5.2: Sayaç Okunabilirliği (sonek rozeti + keskin gölge + hover netleşme)** ✅
- [x] **Sütun 5.3: Çerçevesiz Sayaç (plaka kaldırma)** ✅
- [x] **Sütun 5.4: Alev Efekti (hızlı artışta tutuşma, yavaşlayınca sönme)** ✅
- [x] **Sütun 5.5: Alev Okunabilirlik Düzeltmesi (gradyan sökümü + çekirdek renk)** ✅

---

## 🎨 Görsel Dil Yayılımı — Tüm Proje (2026-10-15, TAMAMLANDI ✅ — ADR-0058)
*(Sözleşme: [`brain/research/visual-language-adoption-spec-2026-10.md`](../research/visual-language-adoption-spec-2026-10.md); kaynak pass `dfa4dce`)*
- [x] **A** — Rezerve renk + 3-state ramp: tüm satın alma yüzeyleri (`DimensionsTab`, `Header`, `AutobuyersTab`, `LabTab`, `CrisisTab`, `ColonyTab`, `SingularityTab`, `NeuralTreeTab`, `ChallengesTab`, `LockedFeature`)
- [x] **B** — Metin→çubuk: gereksinim/oran göstergeleri `progress-track` çubuklaşır + `tabular-nums`
- [x] **C** — Tooltip→bir bakışta: Header ve NeuralTreeTab'daki v-tip bağımlılığı görsel karşılıklara indirilir (B ile birleşik)
- [x] **D** — Motion 3-state (JS tüketicileri) + juice standardı: `juice-punch`, `rise-float`, tek `useMotion` kapısı
- [x] **E** — Nav renk-lengüajı ✅ *(dfa4dce ile tamamlandı; yayılım boyunca korunur)*

**Kalan (kapsam dışı):** F — Prestige ritüeli (iki ekran kuralı, sıfırlama anı) — ayrı iş.

---

## ⚡ Aktif & Taktil Çekirdek (Cookie Clicker & Trimps - Tamamlandı ✅)

---

## ✅ ÇÖZÜLDÜ: İçerik 0→1e308 boyunca yayılıyor (ADR-0032 + ADR-0033)

Ölçüm: 13 özellik kilidinin tamamı 60. dakikada açılıyordu; kalan **%81'de (257 dk)
sıfır yeni içerik**; 1e30–1e308 arası 278 dekad boştu. **Çözüldü:**
- `src/game/pacing.ts` — 9 dekad bandı (0→308) + 13 basamaklı Dekad Yükselişi (+36× koşu içi çarpan).
- `unlocks.ts` — 16 basamaklı dekad merdiveni (1e3 → 1e308).
- `App.vue` — **"Sonraki Açılacak" bandı** + Şafak Yolu ilerlemesi + sıradaki prim rozeti.
- Başarımlar — 11 ölçek basamağı (1e50→1e308) + 5 yeni kalıcı ödül; 68 → 75 başarım.
- Meydan okumalar — artan zorluk eğrisi (1e40 → 1e1000).
- SP periyodu 308 → 45; Dekad basamakları ile kalıcı güçlendirme tüm koşuya yayıldı.
- **ADR-0034:** SP artık **yalnızca şafakta** kazanılır; Dekad Primi sistemi koşu içi
  **Dekad Yükselişi** çarpanına çevrildi (şafakta sıfırlanır, SP üretmez).
- Idle ölü kilidi kaldırıldı (6 saatte log10=100.55; önce 12 saatte 12.41).
- **ADR-0033:** `BASE_UNLOCKED_DIMENSIONS` 2 → 3, **D4 artık 1. sıçramada açılıyor**;
  D3/D4 yumuşak maliyet merdiveni; erken sıçrama gereksinimi 25 → 20.
  **Milyar→trilyon geçişi ~40 dakikadan ~1 dakikaya indi.**
- Doğrulama: 134/134 test, 0 tip hatası, harness ölçümü.
- Kayıtlar: [ADR-0032](../decisions/0032-decade-pacing-ladder-and-bounties.md) ·
  [ADR-0033](../decisions/0033-three-dimension-start-and-early-ladder.md)

**Kalan iş:** ADR-0033 §3 — active koşu 2:28'e indi (hedef band 3–4 sa). Eğer
hedef band korunacaksa tek telafi kolu: `DIM_PER_TEN_MULT` 1.58 → 1.60.

**ADR-0034 sonrası açık denge sorusu:** SP artık yalnızca şafakta geldiği için 1. koşu
yalnızca **1 SP** verir (kök düğüm `insomnia_heart`); ağacın ilk 15–20 düğümü boşta kalıyor.
Seçenekler: (a) birinci şafak taban SP'sini yükselt (`singularityGain` tabanı), (b) ağacın
erken kademesinin maliyetlerini düşür, (c) mevcut hâliyle kabul et (prestij döngüsü sağlam).

**Sıradaki büyük iş:** Faz 2 içeriği (Corruptions / Talismans) — aşağıdaki madde.

---

## 🔴 EN ÖNCELİKLİ: Faz 2 ve Faz 3 içeriği yok (ADR-0031)

GDD (`GAME_DESIGN.md` §7) dört prestij katmanı vaat ediyor. Gerçekte:

| Faz | Durum |
| :--- | :--- |
| Faz 0 — Yatak & Telefon | ✅ Çalışıyor |
| Faz 1 — Sabah 06:00 Çöküşü | ✅ Çalışıyor (SP, Nöral Ağaç, botlar, krizler, 8 meydan okuma) |
| **Faz 2 — Kolektif Gece Nöbeti** | ❌ **Tek bayrak**: `nightWatchUnlocked` 1e308'de (kod: `NIGHT_WATCH_THRESHOLD`; alttaki 1e4000 notu bayattı) `true` olur, `SingularityTab` "FAZ 2 AÇIK" rozeti basar — arkasında hiçbir şey yok |
| **Faz 3 — Evrensel Doomscroll** | ❌ **Hiç yok** |

`singularityGain = 10^((log10 - 308) / 308)` sayısal bir sonsuz döngü verir, ama
arkasında yeni mekanik yok. Oyuncu 1e4000'e gelip **aynı 9 sekmeyle** tekrar oynar.

**Yapılacaklar:**
- [ ] Uyku Baskısı Matrisi (**Corruptions** — 12 sürgülü ceza, Synergism'ten).
      `challenges.ts` altyapısına en yakın aday; prestij döngüsüne doğal oturur.
- [ ] Gece Ekipmanları (**Talismans** — donanım soketleri). Daha görsel, daha hızlı.
- [ ] Kadim Gece Varlıkları (**Celestials**) + The Script Engine (Faz 3).
- [x] ~~**"Sonraki Açılacak" bandını gerçekten uygula** (altyapısı hazır, yüzeyi eksik)~~
      **DÜZELTME (2026-10-15):** Uygulanmış durumda — `useNavigation.ts` `nextLocked()` +
      `unlockProgressFraction()` → `App.vue` içinde "Sonraki Açılacak" bandı
      (`nextUnlockLabel` + `nextUnlockPercent`) olarak canlı; ADR-0032 sırasında
      tamamlanmıştı, bu satır bayat kalmıştı.

- [x] **Gece Krizleri & Viral Bildirimler (Altın Kurabiye Mekaniği):**
  - [x] Ekranda süzülen ışıltılı anomaliler (RNG spawn, 3 farklı etki).
  - [x] **Rezonans Hipnozu (Combo Stacking):** Gece 3 (7x) ve Başparmak Histerisi (777x) aynı andayken 5,439x süper dopamin patlaması.
- [x] **Taktiksel Gece Duruşları (Trimps Stance Sistemi):**
  - [x] *🛌 Yorgan Altı Modu:* Pasif üretime +100% odak (2x).
  - [x] *⚡ Çılgın Kaydırma:* Manuel kaydırmaya +300% (4x) ve Gece Krizi sıklığına +50%.
  - [x] *🕶️ Düşük Parlaklık:* Algoritma Frekansı maliyetlerinde %15 indirim.
- [x] **Vicdan Azabı & Göz Batması (Wrinklers Mekaniği):**
  - [x] Üretimin %3'ünü emen 5 adet vicdan azabı.
  - [x] 3 tıklamayla susturulduğunda %120-%165 primli dopamin iadesi.

---

## 🔒 Özellik Merdiveni (Progressive Unlock — v0.11.0 Tamamlandı ✅)
- [x] Tek kaynaklı unlock registry'si (`src/game/unlocks.ts`): `UnlockReq` tipleri + `FEATURE_UNLOCKS` listesi (15 unlock) + `checkUnlock` / `unlockProgress` / `nextLocked`.
- [x] Store getter'larını registry'e bağla (`isFeatureUnlocked`, `syncUnlocks`; lab/crisis/autobuyers getter'ları tek yerden üretiliyor — kritik `unlockedDimensionsCount` bug'ı fixlendi).
- [x] Sekme içi kademeli açılmalar: Lab tohumları (Kedi→Kaşar→Subway→Phonk), Kriz büyüleri (Şarj→Espresso→Kulaklık→Yalan), Algoritma Yamaları + Akışı Yenile.
- [x] Kilitli kart UX: `LockedFeature.vue` (kilit simgesi + şart metni + slate mini ilerleme çubuğu + v-tip).
- [ ] ~~"Sonraki Açılacak" bandı~~ **DÜZELTME (ADR-0031):** Bu satır v0.11.0'da
  "tamamlandı" işaretlenmiş ama **kodda hiçbir yerde yok**. `Header.vue:472` yorumu
  bile bandın varlığını varsayıyordu. Gerçekte yalnızca `DimensionsTab.vue` içinde
  TEK bir sonraki boyut ipucu ("D3 ASMR — 1. Akış Sıçraması ile açılır") var.
  Altyapı hazır (`unlocks.ts:nextLocked()` 20 rungsuzluk merdiveni + hazır Türkçe
  ipuçları + `LockedFeature.vue`), **yüzey eksik**. Bkz. aşağıdaki Faz 2 maddesi.
- [x] Eşik ince ayarı: Lab (100 Dopamin → D2×25), Botlar (1e4 → 1e6), Anomali (başlangıç → 100 Dopamin), stances (Çılgın/Düşük Parlaklık → D1×50). ADR: `brain/decisions/0009-feature-unlock-ladder.md`.
- Plan: `brain/research/feature-unlock-ladder-plan.md`

---

## 🎯 Katman 1: Tekillik, Mini-Oyunlar & Botlar (v0.4.0 Tamamlandı ✅)
- [x] **Otomatik Kaydırma Botları (Autobuyers - Antimatter Dimensions):**
  - [x] 1-8 İstasyon, Algoritma Frekansı, Akış Sıçraması ve Kümeler için 11 bağımsız bot.
  - [x] Aç/kapa kontrolleri ve master "Tümünü Aç / Kapat" butonu.
  - [x] Otonom Kaydırma Çipi ile 1.5x - 7.5x hız ivmesi.
- [x] **Tesis Tabanlı Mini-Oyunlar (Cookie Clicker Minigames):**
  - [x] *Algoritma Stüdyosu (Viral Matris & Trend Reaktörü - Hibrit Model v0.12.0):* Çürümesiz 3x3 sinerji matrisi, 8 meme/ses formatı, komşuluk sentezi, kalıcı Viral Kodeks (+%3/keşif), 3 FYP zemin modu ve canlı "Akışa Fırlat!" Trend Reaktörü.
  - [x] *Gece Yarısı Kriz Yönetimi (The Grimoire - D4 ile açılır):* 100 birimlik Kafein Enerjisiyle çalışan 4 riskli gece kararı (Şarj kablosu tak, espresso shot, kulaklık tak, yalan söyle + Backfire riskleri).
- [x] **Sabah 06:00 Çöküşü & Kalıcı Uykusuzluk Dükkanı (Singularity & SP Upgrades):**
  - [x] 1.79e308 Dopamin tekilliği ve Uykusuzluk Puanı (SP) kazanımı.
  - [x] 6 kalıcı dükkan yükseltmesi (Göz Damlası, Sessize Alınmış Bildirimler, GaN Adaptör, Kafein Serumu, Otonom Çip, Vicdan Uyuşturucu).
- [x] **Hibrit Rapor & Gece Telemetrisi Mimarisi (v0.21.0 - Stats Tab Evolution):**
  - [x] 5 alt sekmeli kontrol paneli (Genel Bakış, Çarpan Lab, Son 10 Gece SP/dk, Kriz Rekorları, Biyometri).
  - [x] İnteraktif SVG zaman çizelgesi grafiği (hover, peak DPS çizgisi, zaman aralıkları).
  - [x] Fastest Singularity bug fix ve son 10 koşunun hafızada saklanması.
  - [x] Tek tıkla Discord/sosyal medya karne paylaşımı.
- [ ] **Otonom İzleme Botları & Toplu Uyku (Ant Sacrifice - Synergism):**
  - [ ] Arka planda kendi kendine üreyen nöral alt-bot kolonisi.
  - [ ] "Toplu Uyku (Power Nap)" ile botları feda edip kalıcı kök dopamin çarpanı katlama.
- [ ] **Gece Kriz Meydan Okumaları (Normal Challenges):** → `in-progress.md`'ye taşındı (Faz 1 Motor implementasyonu başladı, plan v2).

---

## 🚀 Katman 2: Kolektif Gece Nöbeti & Uyku Baskısı Matrisi (Faz 2)
- [ ] Kolektif Gece Nöbeti (2. Büyük Prestij Katmanı - 1e4000 Dopamin).
- [ ] Mavi Işık Gözlükleri ve Gece Ekipmanları Soketleme (Talisman & Runes).
- [ ] **12 Sürgülü Uyku Baskısı Matrisi (Corruptions):**
  - [ ] 12 adet ayarlanabilir ceza sürgüsü (Ekran Parlaklığı, Şarj, Göz Kuruluğu vb.).
  - [ ] Yüksek baskıda tamamlanan nöbetlerden "Zombi Bakışı Plaketi" kazanımı.
- [ ] Gece Kuşları Panteonu (The Pantheon).
- [ ] Uykusuzluk Yetenek Ağacı (Tree of Studies).

---

## 🌌 Katman 3: Evrensel Doomscroll & Sonsuz Akış (Faz 3)
- [ ] Uzay-zamanın 9:16 dikey formata gerilmesi (1e100000+ Dopamin).
- [ ] The Automator (Oyun içi makro/kodlama motoru).
- [ ] Kadim Gece Varlıkları (Celestials).
- [ ] Evrenin Yukarı Kaydırılması (Nihai Kozmik Çöküş).
