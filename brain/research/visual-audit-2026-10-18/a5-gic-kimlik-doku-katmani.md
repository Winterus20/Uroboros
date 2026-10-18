# A5 — GIC Kimlik/Doku Katmanı Denetimi (S1, S3 L2/L3, S4, S5 · ADR-0060/0063)

- **Tarih:** 2026-10-18
- **Kapsam:** `src/assets/motifs/*.svg` (16), `src/game/motifs.ts` + `motifs.test.ts`, `src/components/MotifBand.vue`,
  `ScreenOverlay.vue` (substrat L2), `DimensionsTab.vue` (Wrinkler çipi), `CrisisTab.vue` (kriz kolajı),
  `AnomalyOverlay.vue` (parazit/anomali yüzeyi), `SideSnapHands.vue` (z=45 kolaj ailesi),
  `src/style.css` (Faz C kolaj bloğu + `[data-corruption]` tokenları), `brain/scratchpad/gic-motif-redraw-brief.md`,
  `brain/scratchpad/motif-preview.mjs` (+ `motif-preview/*.png`).
- **Yöntem:** SALT OKUNUR denetim. `src/` altında hiçbir dosya değiştirilmedi; `npm build/test` çalıştırılmadı.
  Ölçüm: 16 SVG'nin programatik taraması (yasaklı token / şiddet / eleman sayısı), grep envanteri,
  `git status/diff` (commit edilmemiş uçuş), WCAG bağıl-parlaklık **statik hesapları** ve mevcut
  `motif-preview/*.png` görsel incelemesi.
- **Bağlayıcı taban:** `visual-language.md` §1 (sentez), §3 (katman), §4 (merdiven + okunabilirlik kanonu),
  §5 (motif bandı/slot), §9.1–9.2 · `gic-motif-redraw-brief.md` §1–§6 · ADR-0060 §2.4 · ADR-0063 §2.1–2.3 ·
  öncüller ADR-0049 (doz), ADR-0058 (rezerve renk / motion kapısı), ADR-0044 (shake containment).
- **Çapraz referans:** A3 (bozulma merdiveni) ve A4 (katman/motion) ile örtüşen maddeler ilgili bulguda
  işaretlendi; A3'ün "substrat merdiveni K1→K4 gerçekten çalışıyor" hükmüyle **K1 için ayrışıyorum** (§5.1).

---

## 0. Özet (sayıyla)

| Metrik | Değer |
| :--- | :--- |
| İncelenen SVG motif | **16** (4'ü bu uçuşta yeniden çizildi: `dama`,`gul`,`tekerlek`,`yirtik` — `git status` ile doğrulandı) |
| Yasaklı token ham eşleşmesi (16 dosya) | **1** — `var(--ds-bg, #0a0608)` yalnız `goz.svg` içinde |
| Diğer yasaklı tokenlar (`id=`, `url(`, `<defs>`, `<style>`, `<filter>`, gradient, `mask`, `clipPath`, `<text>`, `<image>`, `<script>`) | **0** ✅ |
| Kök şablon `stroke-width="2.2"` taşıyan | **4/16** — kalan **12** hâlâ `stroke-width="2"` |
| `fill-rule="evenodd"` (gerçek oyuk) taşıyan | **2/16** (`dama`, `yirtik`) |
| `fill="currentColor"` (dolu kütle) taşıyan | **7/16** (`delik`,`goz`,`gul`,`dama`,`yirtik`,`ay`,`yildiz`) |
| `stroke-dasharray` (dikiş izi adayı) | **5/16** (`delik`,`tekerlek`,`dama`,`yirtik`,`bant`) |
| Brief §4 yasaklı-okuma listesindeki motif | **7/16** (`goz`,`tekerlek`,`vida`,`catlak`,`ay`,`yildiz`,`saat`) — bunlardan **6'sı hiç yeniden çizilmedi** |
| Bantta **hiç görünmeyen** motif | `buildMotifStrip` normal (8 glif): **9/16** · rezonans (14 glif): **3/16** |
| Ölü/erişilemez dekoratif tanım | `.planck-collage` **0 tüketici** · `--glitch-intensity` **7 tanım / 0 tüketici** (A3/A4 ile örtüşür) |
| Rezerve hue dekoratif kaçağı | **3 yüzey** (`crisis-collage-frame` rose · `SideSnapHands` bant amber · `singularity-horizon` amber+purple) |
| Bulgu | **KRİTİK 2 · YÜKSEK 6 · ORTA 8 · DÜŞÜK 4 = 20** |

**Tek cümle:** 4 yeniden çizilen motif (`dama`,`yirtik` güçlü; `gul`,`tekerlek` kısmi) brief'e yaklaşıyor,
**ama 12 eski motif değişmemiş ve motif kitaplığının tek güçlü tüketicisi olan bant, havuzun yalnız ilk
8–14 elemanını gösterdiği için 16 motifin 9'u oyuncu tarafından hiç görülmüyor.**

---

## 1. Bulgu tablosu (önem sırasına göre)

| # | Önem | Dosya:satır | İhlal edilen madde | Kanıt (kısa alıntı) | Önerilen düzeltme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A5-01 | **KRİTİK** | `src/assets/motifs/goz.svg:1` | brief §1 "**YASAK:** `var(--ds-bg)` gibi arka plan rengi hilesi" + §5 "motifin içine renk gömülmez" | `<circle cx="17.5" cy="14.5" r="1.2" fill="var(--ds-bg, #0a0608)" stroke="none"/>` | Bebeği `fill-rule="evenodd"` + `fill="currentColor"` alt-path ile oy; `var()`/`#0a0608` tamamen kaldır |
| A5-02 | **KRİTİK** | `src/game/motifs.test.ts:48-57` | brief §1 başlığı "KESİN TEKNİK KONTRAT (ihlal = test/build kırılır)" | Test yalnız `toContain('<svg')` + `toContain('currentColor')` + `weight` bakıyor; `id=`/`url(`/`<defs>`/`var(` **hiç taranmıyor** | Teste yasaklı-token döngüsü ekle (`['id=','url(','<defs','<style','<filter','gradient','mask','clip','<text','<image','<script','var(']` her motif için `not.toContain`) |
| A5-03 | **YÜKSEK** | `src/style.css:794-808` + `src/components/DimensionsTab.vue` (git diff) | ADR-0063 §2.3 "Planck bariyeri K1+ bant köşeleri" (C5) | `.planck-collage` **5 CSS kuralı / 0 tüketici**; `git diff` DimensionsTab'tan Planck bariyeri bloğunu (ve `:class="{ 'planck-collage': ... }"` satırını) **sildiğini** gösteriyor | Sınıfı yeni bir Planck bariyeri bileşenine bağla **veya** ölü CSS'i sil + ADR-0063'ü düzelt |
| A5-04 | **YÜKSEK** | `src/assets/motifs/delik.svg:1` + `src/game/motifs.ts:70` | brief §3.1 "mükemmel daire ve tam simetri YASAK", §3.3 oyuk, §3.2 kütle | `<circle cx="16" cy="16" r="11" .../><circle cx="16" cy="16" r="5.5" fill="currentColor"/>` — eşmerkezli `r=11`/`r=5.5`; `motifs.ts:70` `weight: 2` | En yüksek frekanslı motif: elle kesilmiş, kaçık, oyuklu yeniden çizim; oyuk gerçek `evenodd` ile |
| A5-05 | **YÜKSEK** | `src/game/motifs.ts:103-114` + `src/components/MotifBand.vue:36-41` | `visual-language.md` §5 "motif bandı"; ADR-0063 §2.2; brief §2 (28 kopya) | `strip.push(weighted[i % weighted.length])` **her zaman 0. indeksten** başlar → normal (8): `delik,delik,goz,dis,zincir,tekerlek,gul,dama`; dense (14): 3 motif eksik | Bandı rastgele/sarmal bir pencere ile kaydır (preview'daki `spreadStrip` fikri) veya `count`'u havuz uzunluğuna göre türet |
| A5-06 | **YÜKSEK** | `src/style.css:102,591-636` (tüketici yok) | `visual-language.md` §4 K3 "glitch bölgesel ateşler"; K4 "chromatic aberration artışı" | `--glitch-intensity` **7 tanım / 0 tüketici**; `grep -i chromatic src` → **0 eşleşme** | K3 glitch'ini dekoratif kenara bağla; K4 chromatic'i ekle **veya** sözleşme maddelerini düşür (bkz. A3 F…) |
| A5-07 | **YÜKSEK** | `src/style.css:737-747` + `src/components/ScreenOverlay.vue:120-125` | `visual-language.md` §4 K1 "ilk yırtık-kâğıt vinyet köşeleri" | `.collage-torn` zemin alfası `0.07` × `--substrate-opacity` K1=0.06 → **efektif α=0.0042** → `#0a0608` üzerinde **~1.07:1** | Yırtık kâğıda kendi opaklık tabanını ver (ör. `opacity: max(var(--substrate-opacity), 0.35)`) veya K1 seviyesini meta tablosunda yükselt |
| A5-08 | **YÜKSEK** | `src/style.css:776-791` + `src/components/DimensionsTab.vue:365` | ADR-0063 §2.3 (C4) "Wrinkler chipleri: delik-göz ışıması + noktalı 'diş' çizgisi" | Yalnız `radial-gradient(...feast...)` + `border-top-style: dotted !important` + 3px noktalı çizgi; **motif asset'i / kolaj dokusu / göz yok**, Lucide `EyeOff` ikonu | `delik`/`goz` motifini veya kesik-kâğıt kenarını çipe bağla; creep-cute yüz ögesi (fazla büyük bebek) ekle |
| A5-09 | ORTA | `src/style.css:650-655` | `visual-language.md` §4 merdiven (K1→K4 kademeli yoğunlaşma) | `.motif-band{opacity:max(var(--motif-band-opacity),0.45)}` → K1 0.08, K2 0.25, K3 0.45 **hepsi fiilen 0.45**; rampa yalnız K4'te (0.85) kırılır | Tabanı kaldır (0.45 → 0) **veya** K1–K3 token değerlerini 0.45 üstüne taşı |
| A5-10 | ORTA | `src/components/MotifBand.vue:57,71` (2 half × 2 side) | brief §1 "aynı glif DOM'da **28 kez** tekrarlanıyor"; §2 "8–14 glif × 2 yarım" | `v-for="half in 2"` **iki tarafta da** çalışır → normal **32**, dense **56** glif (brief 28 diyor). `id=` yasağının gerekçesi ve DOM bütçesi yarı yarıya hafife alınmış | Ya sağ/sol şerit aynı glif dizisini paylaşsın (tek dizi), ya brief'i 56'ya güncelle |
| A5-11 | ORTA | `src/components/MotifBand.vue:51` + `src/style.css:660,670` + `src/App.vue:168` | `visual-language.md` §4 okunabilirlik kanonu ("bozulma yalnız ambient/dekoratif katmanda") | Mobilde `.motif-side{width:28px;left:0}`, kök `p-3`=12px → glif (17px, 5.5–22.5px bandı) içerik kutusunun **12–22.5px**'iyle çakışır (~10px) | İçerik padding'ini ≥ şerit genişliğine çıkar `(p-8)` veya bandı içerik kolonunun **dışına** konumla |
| A5-12 | ORTA | `src/components/MotifBand.vue:23-34` | ADR-0049 doz kuralı ("aynı anda en fazla 1 ambient + 1 aksiyon") + §9.1 "ortam sakin tutulur" | `hasBoost = floatingAnomalies.length>0 \|\| activeBuffs.length>0`; baff süreleri 25–120 s (`crisis-reactor.test.ts:78,300`) → suppression/ömür penceresi yok, bant dakikalarca akar | `MotifBand`'e ~6–10 s ömür + yeniden tetikleme için 400–600 ms suppression ekle (partikül deseni) |
| A5-13 | ORTA | `src/style.css:813` · `src/components/SideSnapHands.vue:185` · `src/components/ScreenOverlay.vue:163-164` | brief §5 "Rezerve durum hue'ları (rose/cyan/amber/purple) dekorasyonda kullanılmaz" | `.crisis-collage-frame{border-color:rgba(244,63,94,0.45)}` (rose) · `SideSnapHands` bandı `rgba(255,190,69,0.26)` (amber) · `.singularity-horizon` `rgba(245,158,11,.16)`+ `rgba(168,85,247,.08)` | Dekoratif yüzeyleri bone/feast ailesine çek; rose'u yalnız durum sinyaline bırak (ADR-0063'ün rose istisnası sözleşmeye yazılmadan geçerli olmamalı) |
| A5-14 | ORTA | `brain/context/visual-language.md:73-75` ↔ `src/components/ScreenOverlay.vue:120-145` | §8 "Görsel işler buradan sapan değişiklik yapmaz; sapma gerekiyorsa **önce bu belge güncellenir**" | Sözleşme: K2 "tape yapışkanları", K3 "damalı şerit vidaları". Uygulama: K2 `.collage-checker`, K3 `.collage-tape`. ADR-0063 §2.2 sırayı yeniden yazdı ama **bağlayıcı belge güncellenmedi** | `visual-language.md` §4 tablosunu ADR-0063 sırasıyla eşitle |
| A5-15 | ORTA | `vida.svg:1`, `catlak.svg:1`, `ay.svg:1`, `yildiz.svg:1`, `saat.svg:1`, `goz.svg:1`; `gul.svg:1` | brief §4 "YASAKLI OKUMA (semantik çakışma)"; §3.2 parça bütçesi | 6 motif hâlâ UI ikonu (`vida`=çember+artı+8 ışın, `catlak`=şimşek, `ay`=krsant, `yildiz`=4 uçlu parıltı, `saat`=çember+akrep, `goz`=Lucide göz); `gul` **8 parça** (brief üst sınırı 5–6) ve oyuğu yok | §9'daki öncelik sırasıyla yeniden çiz |
| A5-16 | ORTA | `brain/scratchpad/motif-preview.mjs:57-58,144-150,163-208` + `motif-preview/*.png` | brief §2 "render bağlamı" + §6 self-check | (a) PNG'ler 18/10 **00:49:25**'te üretildi, `dama/gul/tekerlek` **00:50:56**'da çizildi → 3 motifin önizlemesi **bayat**; (b) `buildStrip` `.motif-band` opaklık tabanını (0.45/0.8) modellemiyor → önizleme gerçekte olduğundan parlak; (c) `MOTIFS` kaydı elle kopyalanmış (drift riski) | Önizlemeyi `motifs.ts`'ten import ederek üret, bant opaklığını uygula, çizim sonrası yeniden koştur |
| A5-17 | DÜŞÜK | `delik,zincir,karalama,vida,saat,perde` `.svg:1` (6 dosya) | brief §1 kök etiket şablonu | `stroke-linejoin="round"` yok (yalnız `stroke-linecap="round"`) | Şablon özniteliğini ekle |
| A5-18 | DÜŞÜK | 12 eski SVG (`delik…perde`) `:1` | brief §1 kök şablonu `stroke-width="2.2"` | `stroke-width="2"` | Yeniden çizimle birlikte 2.2'ye çek |
| A5-19 | DÜŞÜK | `src/game/corruption.ts:42` + `src/style.css:579-580` | A3 F14 ile örtüşür | Yorum "K0 %10, K1 %35, K2 %45" der; gerçek `crtIntensity` 0.05/0.09/0.13 (ADR-0063 yumuşatması) | Yorumu güncel değerlere çek |
| A5-20 | DÜŞÜK | `src/components/SideSnapHands.vue:100-101` | `visual-language.md` §4 okunabilirlik kanonu | Yorum: "İçerik kolonu (z=10) **üstte** olduğu için okunabilirlik korunur" — oysa `.snap-wrap{z-index:45}` içeriğin **üstünde** | Yorumu düzelt; mobilde 64px ray + içerik z-10 çakışmasını ölç |

---

## 2. 16 motif × brief uyum matrisi

Kolonya başlıklar brief maddeleridir. `✓`=karşılıyor · `~`=kısmi · `✗`=yok/ihlal.
`S`=sürüm (Y=yeni yeniden çizim, E=eski), `sw`=kök stroke-width, `P`=parça sayısı (brief üst sınır 5–6).

| # | Motif | S | sw | Kütle (§3.2) | Oyuk (§3.3) | Kayma (§3.5) | Dikiş (§3.6) | Doku (§3.7) | Serpinti (§3.8) | P | §4 UI-ikon riski |
| :-- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :--- |
| 1 | `delik` | E | 2.0 ✗ | ~ (dolu **disk**, kütle değil) | ✗ (eşmerkezli `r11/r5.5`) | ✗ | ~ (`dasharray 3 2.5` halkada) | ✗ | ✗ | 2 | **YÜKSEK** — "dolu top" okunuyor |
| 2 | `goz` | E | 2.0 ✗ | ✓ (pupil) | ✗ (**var(--ds-bg) hilesi**) | ~ (highlight) | ✗ | ✗ | ✗ | 3 | **YÜKSEK** — Lucide göz |
| 3 | `dis` | E | 2.0 ✗ | ✗ (kapalı kontur) | ✗ | ✗ | ✗ | ✗ | ✗ | 1 | düşük (organik diş ✓) |
| 4 | `zincir` | E | 2.0 ✗ | ✗ | ~ (halka içi) | ✗ (iki halka **aynı** `rx=4`/`-18°`) | ✗ | ✗ | ✗ | 2 | okunmuyor (4× katalogda **leke**) |
| 5 | `tekerlek` | **Y** | 2.2 ✓ | ✗ (**halka**, dolu kütle yok) | ~ (spoke boşluğu) | ✓ (göbek kaçık) | ✓ (`dasharray 1.5 1.2`) | ✗ | ✓ (3 not) | 4 | ORTA — hâlâ "6 kollu teker", §4 "halka yerine **kütle**" karşılanmadı |
| 6 | `gul` | **Y** | 2.2 ✓ | ✓ (pentagon) | ✗ (kapalı halkalar) | ✓ (eşmerkezli değil) | ✗ | ✗ | ✓ (spray) | **8 ✗** | ORTA — halka roset |
| 7 | `dama` | **Y** | 2.2 ✓ | ✓ (4 kare) | ✓ (`evenodd` alt-path) | ✓ (kaçık kare) | ✓ (`1.4 1.2`) | ✓ (dama) | ✓ (serbest rect) | 6 ~ | ✓ temiz |
| 8 | `yirtik` | **Y** | 2.2 ✓ | ✓ | ✓ (`evenodd` delik) | ✓ | ✓ (`1.6 1.3`) | ~ | ✗ | 3 | ✓ temiz |
| 9 | `bant` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✓ (orta çizgi) | ✗ | ✗ | 3 | düşük (bant okunur) |
| 10 | `karalama` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 2 | düşük (ama zayıf) |
| 11 | `vida` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 3 | **YÜKSEK** — nişangâh/hedef |
| 12 | `catlak` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ~ (3 dal) | 2 | **YÜKSEK** — şimşek ikonu |
| 13 | `ay` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 2 | **YÜKSEK** — krsant |
| 14 | `yildiz` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (2 nokta) | 3 | **YÜKSEK** — 4 uçlu parıltı |
| 15 | `saat` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ~ (3 tırnak) | 3 | **YÜKSEK** — saat ikonu |
| 16 | `perde` | E | 2.0 ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 2 | düşük (perde okunur) |

**Matris toplamları:** Kütle ✓ **3**/16 (dama,gul,yirtik) · Oyuk ✓ **2**/16 · Kayma ✓ **4**/16 · Dikiş ✓ **3**/16 ·
Doku ✓ **1**/16 · Serpinti ✓ **5**/16 (çoğu zayıf). Brief'in "kolaj reçetesi" (`1 kütle + 1 oyuk + 1 kayma +
1 dikiş + serpinti`) **tam olarak yalnız `yirtik` ve `dama`'da** sağlanıyor (2/16).

### 2.1 Yeniden çizilen 4 motif — brief denetimi
- **`dama` — GEÇTİ (en iyi).** Kütle ✓, `evenodd` oyuk ✓ (`transform="translate(1.05 -0.8) rotate(14 ...)"` ile kasten kaçık), dikiş ✓, dama dokusu ✓, serbest `rect` serpintisi ✓, 2.2/1.5 şiddet hiyerarşisi ✓. Tek itiraz: 6 parça üst sınıra dayanıyor; 4× katalogda "damalı bayrak" gibi okunuyor (kabul edilebilir).
- **`yirtik` — GEÇTİ.** Açık/kapalı iki yırtık kenar + `fill-rule="evenodd"` gerçek delik + `1.4` dikiş çizgileri; 2.3/1.4 hiyerarşisi brief aralığında.
- **`gul` — KISMİ.** Kütle (dolu pentagon) ve kaçıklık var; **oyuk yok**, **dikiş yok**, **doku yok** ve **8 parça** (brief "5–6'dan fazlasına çıkma" ihlali). İç içe halkalar "sarmal gül" değil üst üste halka okunuyor (§4'ün "halka yerine kütle" ruhu yalnız dış kabukta karşılanmış).
- **`tekerlek` — KISMİ.** 11–12 köşeli eşit-olmayan çokgen, kaçık göbek, dikiş kümesi ve serpinti ile **iyileşti**; ancak **hiç `fill` kütlesi yok** → §4'ün "`tekerlek` … halka yerine kütle" maddesi karşılanmadı; 6 eşit kollu jant hâlâ "tekerlek ikonu" okumasını sürdürüyor.

### 2.2 Eski 12 motif — madde madde ortak ihlaller
| İhlal edilen brief maddesi | Etkilenen dosya sayısı | Dosyalar |
| :--- | :--- | :--- |
| §1 kök şablon `stroke-width="2.2"` | **12** | delik, goz, dis, zincir, bant, karalama, vida, catlak, ay, yildiz, saat, perde |
| §3.2 kütle hiyerarşisi (dolu kütle + ince çizgi) | **10** (fill taşımayanlar) | dis, zincir, bant, karalama, vida, catlak, ay, yildiz*, saat, perde (*yildiz/ay yalnız dekoratif nokta dolduruyor) |
| §3.3 oyuk (`evenodd` / açık path) | **12 (tümü)** | — |
| §3.5 kayma (0.8–2 birim) | **9** | delik, dis, zincir, bant, karalama, vida, catlak, ay, saat, perde (dama/gul/tekerlek/yirtik/goz hariç) |
| §3.6 dikiş izi (`dasharray 1.5–2.6`) | **11** | tekerlek/dama/yirtik/bant/delik dışındakiler |
| §3.7 mikro doku (dama/tarama/nokta) | **12 (tümü)** | — |
| §3.8 kırıntı & serpinti | **9** | yildiz/saat/tekerlek/gul/dama dışındakiler |
| §4 yasaklı-okuma | **6** | goz, vida, catlak, ay, yildiz, saat |

---

## 3. Slot kontratı ve test boşlukları

### 3.1 Kontrat envanteri (16/16 dosya)
| Kontrol | Beklenen | Bulgu | Karar |
| :--- | :--- | :--- | :--- |
| `viewBox="0 0 32 32"` | 16/16 | **16/16** | ✅ |
| `<svg` (`?raw`) | 16/16 | **16/16** | ✅ |
| `currentColor` | 16/16 | **16/16** (`goz` 2, `dama` 4 …) | ✅ |
| `aria-hidden="true"` | 16/16 | **16/16** | ✅ |
| `id=`, `url(`, `<defs>`, `<style>`, `<filter>`, gradient, `mask`, `clipPath`, `<text>`, `<image>`, `<script>` | 0 | **0** | ✅ |
| Harici/arka plan rengi hilesi (`var(...)`, gömülü hex) | 0 | **1 dosya** — `goz.svg` `var(--ds-bg, #0a0608)` | ❌ **A5-01** |
| Ad = dosya adı | 16/16 | **16/16** (`motifs.test.ts:19-22` kilitli) | ✅ |
| Ton ∈ {feast,bone,ember} | 16/16 | **16/16** (`motifs.test.ts:59-63`) | ✅ |
| `delik` ağırlığı >1 | ✓ | ✓ (`weight: 2`) | ✅ |
| Kök şablon `stroke-linejoin="round"` | 16/16 | **10/16** (6 eksik) | ❌ A5-17 |
| Kök şablon `stroke-width="2.2"` | 16/16 | **4/16** | ❌ A5-18 |
| İçerik 2 birim marj içinde | 16/16 | Örneklenen ekstrem noktalar marj içinde (ör. `tekerlek` min x≈4.12, `yirtik` max y≈29.4, `dama` döndürülmüş köşe min y≈3.89) — **otomatik test yok** | ~ |

### 3.2 `motifs.test.ts` gerçekten neyi kilitliyor?
| Kilit var mı? | Test satırı | Açıklama |
| :--- | :--- | :--- |
| ✅ id = dosya adı (sabit liste) | `motifs.test.ts:19-22` | `EXPECTED_IDS` sabit; disk adlarıyla **eşleştirilmiyor** (yalnız import edilen string) |
| ✅ grup bütçesi 4–6 | `:24-30` | |
| ✅ eşik hizası K1–K4 | `:32-37` | |
| ✅ K0 steril + kümülatif | `:39-46` | |
| ✅ `<svg` + `currentColor` + `weight>=1` | `:48-57` | **Yalnız bunlar** |
| ✅ ton ∈ 3 değer | `:59-63` | İçerikte **renk yok** kontrolü yok |
| ✅ strip determinizmi | `:65-75` | |
| ❌ **Yasaklı token taraması** | — | `goz`'un `var(--ds-bg)`'i bu yüzden geçti (**A5-02**) |
| ❌ `viewBox="0 0 32 32"` kilidi | — | Self-check maddesi (`brief:128`) test edilmiyor |
| ❌ şiddet hiyerarşisi / parça bütçesi | — | brief §3.2/§3.10 test edilmiyor |
| ❌ 2 birim marj | — | brief §6 test edilmiyor |

**Net:** brief §1 "ihlal = test/build kırılır" iddiası **yalnız `currentColor`/`<svg` için** doğru; yasaklı-token listesi fiilen hiçbir kapıya bağlı değil.

---

## 4. MotifBand durum tablosu

| Eksen | Uygulama (kanıt) | Sözleşme beklentisi | Karar |
| :--- | :--- | :--- | :--- |
| Tetik | `floatingAnomalies.length>0 \|\| activeBuffs.length>0` (`MotifBand.vue:23-25`) | §5 "Kozmik Dalgalanma tetiklendiğinde" | ✅ (+ buff'lar; kapsam geniş) |
| K0 | `corruptionLevel<1 → false` (`:29`) | §4 K0 steril | ✅ |
| Rezonans yoğunluğu | `isDense → 14` (8 yerine) `MotifBand.vue:36-41`; `.motif-band-dense opacity max(...,0.8)` (`style.css:653-654`) | §5 "bant yoğunluğu katlanır" | ✅ (×1.75; "×~2") |
| Bant ömrü / suppression | **yok** — buff 120 s sürerse bant 120 s akar | ADR-0049 doz + §9.1 sakin ortam | ❌ **A5-12** |
| Motion `off` | TS `visible=false` (`:31`) + CSS `display:none` (`style.css:709-712`) | ADR-0063 §2.2 | ✅ |
| Motion `reduced` (uygulama) | `.reduce-anim .motif-track{animation:none}` (`:713-715`) → statik görünür | ADR-0063 §2.2 "reduced'da statik" | ✅ |
| OS `prefers-reduced-motion` | `@media … .motif-band{display:none !important}` (`:716-719`) | "statik" | ⚠️ **Daha katı** — aynı z=45 ailesindeki `SideSnapHands` statik kalır (`SideSnapHands.vue:247-251`); iki kolaj katmanı farklı davranıyor |
| `batterySaver` / `forced-colors` | `display:none` (`:710-712,720-722`) | §4/ADR-0058 | ✅ |
| Ton opaklık rampası | `max(..., 0.45)` tabanı K1–K3'ü düzler (`:651`) | §4 kademeli | ❌ **A5-09** |
| İçerik çakışması | Mobil 28px şerit vs 12px kök padding (`App.vue:168`) | Okunabilirlik kanonu | ❌ **A5-11** |
| Glif sayısı | 2 half × 2 side → **32/56** | brief "28 kopya" | ⚠️ **A5-10** |

### 4.1 Bant dizilimi — hangi motif gerçekten görünüyor?
`buildMotifStrip` deterministik ağırlıklı dizinin **ilk `count`** elemanını alır (`motifs.ts:111-112`):

| Seviye | count | Dizilim (id) | Hiç görünmeyen motif |
| :--- | ---: | :--- | :--- |
| K1 | 8 | `delik delik goz dis zincir delik delik goz` (**delik=%50**) | `tekerlek`…`perde` (11 motif havuzda yok) |
| K2 | 8 | `delik delik goz dis zincir tekerlek gul dama` | `yirtik` + 8 |
| K3 | 8 | **K2 ile birebir aynı** (`yirtik` yine yok) | 9/16 (yirtik, bant, karalama, vida, catlak, ay, yildiz, saat, perde) |
| K4 | 8 | K3 ile aynı | 9/16 |
| K4 | 14 (dense) | `… ay` ile biter | **yildiz, saat, perde** (3/16) |

`motif-preview.mjs:152-157` `spreadStrip` fonksiyonu tam da bunu "öneri" olarak çiziyor → **yazar boşluğun farkında ama üretim kodu düzeltilmemiş.**

---

## 5. Substrat merdiveni (L2) — seviyeler gerçekten ayrı mı?

| K | Bileşen (dosya:satır) | Zemin alfası | × `--substrate-opacity` | Efektif α | #0a0608 üzerinde kontrast | Karar |
| :-: | :--- | ---: | :-: | ---: | ---: | :--- |
| K1 | `.collage-torn` ×4 (`ScreenOverlay.vue:121-124`; `style.css:737-747`) | 0.07 | 0.06 | **0.0042** | **≈1.07:1** | ❌ **pratikte yok** (A5-07) |
| K2 | `.collage-checker` ×2 (`:127-128`; `style.css:725-729`) | 0.22 | 0.25 | 0.055 | ≈1.94:1 | ~ okunur (faint) |
| K3 | `.collage-tape` ×4 (`:131-134`; `:748-756`) | 0.16 | 0.32 | 0.051 | ≈1.88:1 | ~ |
| K3 | `.collage-scrawl` ×3 (`:137-139`; `:760-770`) | 0.55 | 0.32×0.85 | 0.150 | ≈3.56:1 | ~ (dekoratif, aria-hidden) |
| K4 | `.collage-floor` (`:142-145`; `:730-736`) | 0.13 | 0.40 | 0.052 | ≈1.89:1 (+feast 0.024) | ~ |
| K4 | `chromatic aberration` | — | — | **yok** | — | ❌ **A5-06** |
| K3 | `glitch` bölgesel ateş | — | — | **yok** (`--glitch-intensity` 0 tüketici) | — | ❌ **A5-06** |

**Sonuç:** dört seviye kod olarak **var ve TS ile ayrı ayrı açılıyor** (K1 torn → K2 checker → K3 tape+scrawl → K4 floor) ✅;
ancak **K1 seviyesi efektif olarak ölü** ve tüm seviyeler 1.9–2.5:1 bandında çok soluk. K3'ün sözleşmedeki
"glitch bölgesel ateşler", K4'ün "chromatic aberration" ayakları **hiç uygulanmamış**.

### 5.1 K1 hükmünde A3 ile ayrışma
A3 §0 "substrat merdiveni K1→K4 gerçekten çalışıyor" diyor. Benim hesabım: K1'de tek substrat ögesi
`.collage-torn`'un efektif alfası **0.0042** (`style.css:741` `rgba(255,240,230,0.07)` × `style.css:598` `--substrate-opacity:0.06`)
→ zemin üzerinde **~1.07:1**. Bu, "var ama görünmez" durumudur; kabul kriteri "K1 yırtık köşeler" **karşılanmıyor kabul edilmeli**.
(Diğer seviyeler A3 ile aynı: kod var.)

### 5.2 CrisisTab'ın substrat tokenına bağlılığı (A3 F9 ile örtüşür)
`CrisisTab.vue:155,454` `.collage-checker` kullanır; `style.css:728` `opacity: var(--substrate-opacity)` →
**K0/K1'de çerçevenin iç şeridi görünmez** (K1'de α=0.0132 → ≈1.2:1). Kriz kolajı çerçevesi (`.crisis-collage-frame`)
kendisi her zaman görünür (rose border), yalnız damalı şerit kaybolur.

---

## 6. Wrinkler, kriz ve Planck kolaj durumu

| Yüzey | Sözleşme (ADR-0063 §2.3) | Uygulama | Karar |
| :--- | :--- | :--- | :--- |
| Wrinkler/parazit çipi | "delik-göz ışıması + noktalı **diş** çizgisi" | `DimensionsTab.vue:365` `.wrinkler-chip`; `style.css:776-791` → feast radial + `border-top dotted` + 3px noktalı bone çizgi. **Motif asset'i yok**, Lucide `EyeOff` | ⚠️ jenerik/ minimal (**A5-08**) |
| Wrinkler kaplama kapsamı | "creepy-cute" kaplama | **1 yüzey** (slacker butonları). `AnomalyOverlay.vue` (452 satır; gradient'li holo kapsüller + Lucide ikonlar) ve `CrisisTab.vue` müdahale butonlarında GIC katmanı yok | ⚠️ kapsam dar |
| Kriz kolaj vinyeti | "kriz anında (challenge/backfire/meltdown) `CrisisTab` kolaj çerçevesi" | `CrisisTab.vue:27-32` `hasCrisisCollage`; `:154` `.crisis-collage-frame`; `:155,454` `.collage-checker` | ✅ **var** (rose border — §5 istisnası A5-13) |
| Planck kolaj vinyeti | "Planck bariyeri K1+ bant köşeleri" | `.planck-collage` (`style.css:794-808`) **0 tüketici**; `git diff` Planck bariyeri JSX'ini DimensionsTab'tan sildi | ❌ **YOK** (**A5-03**) |
| Motif sistemiyle tutarlılık | GIC kolaj dili | Kriz çerçevesi/çek/floor **bone+feast** (motif tonlarıyla aynı aile) ✅; ancak hiçbiri motif asset'i kullanmıyor, hepsi CSS taklidi | ~ kısmi |

---

## 7. Ton paleti ve rezerve hue taraması

| Kural | Bulgu | Kanıt |
| :--- | :--- | :--- |
| Motif tonları yalnız `feast/bone/ember` | ✅ 16/16 | `motifs.ts:70-88`; `.motif-tone-feast/bone/ember` `style.css:704-706` |
| `ember` = bicycle (#c40f2e), feast = #ff3355, bone = sıcak nötr | ✅ | `style.css:705-706`, `motif-preview.mjs:57` |
| Dekoratif substratta rezerve hue yok | ❌ **3 kaçak** | `.crisis-collage-frame` rose `rgba(244,63,94,0.45)` (`style.css:813`) · `SideSnapHands` bantı amber `rgba(255,190,69,0.26)` (`SideSnapHands.vue:185`) · `.singularity-horizon` amber `rgba(245,158,11,.16)` + purple `rgba(168,85,247,.08)` (`ScreenOverlay.vue:163-164`) |
| Motif bandında rezerve hue yok | ✅ | `.motif-tone-*` yalnız feast/bone/ember |
| Durum-semantik kullanımlar (kaçak sayılmaz) | ⚠️ belirsiz | `.crisis-aura-rose/cyan/amber/purple/void/combo` (`style.css:1286-1311`) ve `.anomaly-glow-*` — event tipine bağlı, "dekorasyon" değil "sinyal" okunabilir |

---

## 8. Renk okunabilirliği — motif glifleri gerçekten "24px'te silüetten tanınıyor" mu?

`.motif-band` konteyner opaklığı ile ton alfası **çarpılır**; zemin `#0a0608` (WCAG bağıl parlaklık hesabı):

| Ton | Renk alfası | Bant opaklığı | Efektif α | Kontrast | Etkilenen motif |
| :--- | ---: | ---: | ---: | ---: | :--- |
| `ember` | 0.85 | **0.45** (K1–K3 tabanı) | 0.383 | **≈1.89:1** | zincir, yirtik, vida, saat |
| `ember` | 0.85 | 0.85 (K4) | 0.723 | ≈2.67:1 | ″ |
| `ember` | 0.85 | 1.00 (K5) | 0.850 | ≈2.97:1 | ″ |
| `feast` | 0.80 | 0.45 | 0.360 | ≈2.66:1 | delik, gul, karalama, catlak, yildiz |
| `feast` | 0.80 | 0.85 | 0.680 | ≈4.14:1 | ″ |
| `bone` | 0.55 | 0.45 | 0.248 | ≈5.23:1 | goz, dis, tekerlek, dama, bant, ay, perde |

**Yorum:** glifler `aria-hidden` dekoratif olduğu için WCAG 1.4.3 doğrudan uygulanmaz; kıyas **1.4.11 UI bileşeni
3:1** eşiğiyle yapıldı. Buna göre **`ember` tonlu 4 motif hiçbir seviyede 3:1'i geçmiyor** (max 2.97:1) ve
K1–K3'te **feast de 2.66:1**'de kalıyor → brief §2 "squint testi" bu gliflerde büyük olasılıkla **başarısız**.
(Kaynak: hesap; tarayıcıda algısal doğrulama önerilir — bkz. §9 "belirsiz".)

---

## 9. Yeniden çizim önceliği

Sıralama = **görünme sıklığı × ihlal ağırlığı × brief §4 yasaklı okuma**.

| Pri | Motif(ler) | Gerekçe | Zorunlu brief maddeleri |
| :--- | :--- | :--- | :--- |
| **P0** | `delik` | `weight:2` → K1'de gliflerin **%50'si**; en kötü ihlal (eşmerkezli daire, oyuk yok, kütle yok, "dolu top" okunuyor) | §3.1, §3.2, §3.3, §3.5 |
| **P0** | `goz` | **Yasaklı `var(--ds-bg)`** (A5-01) + Lucide göz; §4 listesinde | §1 (temiz), §3.3, §4 |
| **P0** | `vida`, `catlak`, `yildiz` | Brief §4'ün açıkça saydığı 3 yasaklı okuma | §4, §3.2, §3.3, §3.6 |
| **P1** | `ay`, `saat` | §4 yasaklı okuma (krsant/saat), düşük frekans | §4, §3.2, §3.3 |
| **P1** | `zincir`, `bant`, `karalama` | 4× katalogda **leke** okunuyor; bandın ilk 8'inde sürekli görünürler | §3.2, §3.3, §3.5, §3.6 |
| **P2** | `gul` (rötuş), `tekerlek` (rötuş) | Parça bütçesi 8→≤6; oyuk+doku+gerçek kütle ekle (`tekerlek` "halka yerine kütle") | §3.2, §3.3, §3.6, §3.7 |
| **P2** | `dis`, `perde` | En az ihlalli eski motifler (tek parça / organik okuma) | §3.2, §3.3, §3.5 |

**Paralel (kod) önceliği:** A5-02 (test kilidi) → A5-05 (bant dizilimi) → A5-07/A5-09 (substrat+bant
opaklık tabanları) → A5-03/A5-06 (ölü Planck/glitch) → A5-08 (Wrinkler) → A5-13/A5-14 (rezerve hue + belge).

---

## 10. Belirsiz / kapsam dışı / doğrulanamayan

1. **Algısal doğrulama yok:** Kontrast ve "silüetten tanınma" hükümleri WCAG bağıl-parlaklık hesabı + mevcut
   PNG incelemesine dayanır. Tarayıcı turu (`full/reduced/off/batterySaver` × mobil) yapılmadı — özellikle
   `ember` ve `feast` okunurluğu ve `.collage-torn` görünürlüğü **cihazda teyit edilmeli**.
2. **Bayat önizleme:** `motif-preview/*.png` (18/10 00:49) `dama/gul/tekerlek` (00:50:56) öncesinde üretildi;
   bu 3 motifin görsel değerlendirmesi **yalnız SVG kaynağından** yapıldı. `yirtik` aynı saniyede → belirsiz.
3. **`.planck-collage` tüketicisinin silinmesi bilinçli mi?** `git diff` silmeyi gösteriyor ama commit
   mesajı/gerekçe bu uçuşta commit edilmediği için **bilinmiyor** (A3 de aynı soruyu açık bırakmış).
4. **Kapsam dışı (A3/A4 ile örtüşür, tekrar edilmedi):** CRT katmanının `display:none` ile öldürülmesi,
   `--crt-intensity`/`decay-*` ölü tanımları, `[data-corruption="K5"]` erişilemezliği, `crtEffect` zombi ayarı,
   genel z-index haritası. Bu raporda yalnız GIC kimlik katmanını (L2/L3) doğrudan etkileyen kesişimler
   (A5-06, A5-07) alındı.
5. **SideSnapHands kapsamı:** GIC kolaj ailesinin (z=45) bir üyesi olduğu için amber bant kaçağı ve yanlış
   z-index yorumu alındı; kendi motion/juice denetimi A4'ün alanıdır.
6. **`AnomalyOverlay` inline SVG'leri** (`<defs>`/`linearGradient`/`id=`/`url(#…)`) motif kontratına **girmez**
   (kontrat yalnız `src/assets/motifs/*.svg`); kimlikler `safeId(anomaly.id)` ile tekil. Ancak bu yüzey
   GIC kolajı değil, ADR-0049 holo kapsül dilidir → C4/C5 dil bütünlüğü açısından **tutarsız** (A5-08 kapsamı).
7. **`gul` oyuğu:** İç içe halkaların arasındaki gerçek boşluk "oyuk" sayılabilir; brief §3.3 ise iki teknik
   (`evenodd` / açık path) istiyor. Bu yüzden "✗" verdim — **yorum farkı olabilir**.
