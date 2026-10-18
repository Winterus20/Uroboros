# GÖRSEL DİL SÖZLEŞMESİ — "AÇ KUMARHANE" (The Hungry Parlor)

> **BAĞLAYICI BELGE — HER AGENT GÖRSEL/STİL İŞİNE BAŞLAMADAN ÖNCE OKUR.**
> Bu belge, 2026-10-16'da kullanıcıyla yapılan detaylı stil araştırması ve uzlaşmasının
> tek gerçek kaydıdır. ADR: [`brain/decisions/0060-gic-phase-corruption-visual-pivot.md`](../decisions/0060-gic-phase-corruption-visual-pivot.md)
> **Öncüllerle ilişki:** ADR-0049 (Okunaklı Balatro) ve ADR-0058 (Görsel Dil Yayılımı:
> 3-state ramp, rezerve renk, glif, oran=çubuk, motion kapısı) geçerliliğini korur.
> Bu belge onların ÜSTÜNE yeni katman ekler; hiçbir mevcut kuralı ezmez.

---

## 1. Uzlaşılan Sentez — Üç Kaynak Stilin Görev Dağılımı

| Katman | Kaynak Stil | Oyundaki Rolü |
| :--- | :--- | :--- |
| Zemin & UI dili | Balatro | Ink black zemin + sıcak vinyet, wobble/squish, roll-up sayaç, "her sayının tavanı görünür" disiplini (CRT scanline: **iptal** — ADR-0069) |
| Anlık şölen | Vampire Survivors | Süpernova / Kütle Patlaması / Hawking anlarında partikül kaosu, yüzen kütle sayıları, ekran sarsıntısı, desatüre zeminde neon patlama |
| Kimlik & lore | Gekidan Inu Curry | Cadı labirenti mantığıyla kolaj substrat: motif sistemi (diş, gül, tekerlek, göz, zincir, damalı şerit, tape, yırtık kâğıt), creepy-cute Wrinkler'lar, kriz/Planck kolaj vinyeti |
| Kaos bütçesi | Frenli | Fullscreen doku YOK (CRT iptal — ADR-0069); wobble yalnız etkileşimde; partikül şöleni yalnız büyük olaylarda |

İlham araştırması (kaynak notlar, silinmez):
- GIC, Madoka Magica'daki cadı labirentlerinin tasarımcısı ikilidir (2shiroinu + Doroinu).
  Teknik: kâğıt kolaj + stop-motion; etkiler: Rus/Çek animasyonu (Svankmajer, Trnka) ve
  Terry Gilliam. İmza: "dikkatlice bakınca çürüyen sevimli masal". Labirent kuralı:
  her cadının tek bir teması vardır ve motifleri kendi hafızasından çekip yeniden mikslar.
  Tekrar eden korku kökü: delik (karadelik temasıyla doğal uyum).
- Balatro (LocalThunk): CRT kimliği kısıtlamadan doğdu — scanline her zaman açıktır,
  dünya filtrenin değil. Ölçülmüş juice: skor kademeleri ~83-124 ms arayla; sadece olay
  anındaki patlama okunur. Font: m6x11 (Daniel Linssen, ücretsiz). Disiplin: tavanı
  görünmeyen sayı yok, kural tam karar anında konuşulur.
- Vampire Survivors (poncle): tüm katmanlar aynı fidelity'de ve aynı yöne bakar; tutarlı
  orta seviye, tek parlak kahraman asset'ten güçlüdür. Geç oyun dövmesi hipnotik
  overload'dır; okunabilirlik desatüre zeminden gelir.

---

## 2. Renk Sözlüğü — Pivot (Mevcut Rezerve Renkler Korunur)

| Token | Değer | Anlam | Not |
| :--- | :--- | :--- | :--- |
| --ds-bg | #0a0608 (pivot) | Ink black, sıcak tonlu siyah | #07090d soğuk gövde ölçek bozulmadan ısınır |
| --feast (YENİ) | #ff3355 | Oburluk/olay enerjisi: zemin vinyeti, büyük patlama, boost şöleni | Rezerve renk ailesine yeni üye. rose (tehlike/küçük ikaz) ile karışmaz: rose ikaz işaretidir, feast kalabalık enerjidir |
| --bicycle (YENİ) | #c40f2e | Derin kırmızı; buton/joker yüzeyleri | Yalnız yüzey/ağırlık verir, durum anlatmaz |
| amber/altın | #f59e0b (tek ton) | Prestij/milestone | **Düzeltme (2026-10-18 denetimi):** vaat edilen #ffbe45 uygulanmadı; amber tailwind sınıflarıyla (117 kullanım) yaşıyor — geçerli ton #f59e0b |
| cyan | #00f0ff | Telemetri/bonus | Değişmedi |
| violet | #a855f7 | Kütle katmanları | Değişmedi |
| rose | #f43f5e | Kriz/parazit | Değişmedi |

---

## 3. Katman Mimarisi (Alt Tan Üste)

```
L4 — OLAY ŞÖLENİ (VS): canvas partikül + yüzen kütle sayıları + shake (yalnız büyük olaylarda)
L3 — BOOST MOTİF BANDI (GIC): olay tetiklenince yanlardan süzülen motif/glif bandı
L2 — SUBSTRAT (GIC): kolaj dokular, damalı şerit, tape, yırtık kenar, el yazısı notu (FAZLA DERİNLEŞİR, bkz. §4)
L1 — (İPTAL — ADR-0069, 2026-10-18) CRT KAPLAMA kaldırıldı: fullscreen scanline/curvature/fosfor yoktur.
     Numaralar geriye dönük uyum için korunur; L2/L3/L4 referansları geçerlidir.
L0 — PANEL DÜNYASI: obsidian + sıcak vinyet + AlgorithmicSwirl (ADR-0049 Kural 1: korunur)
```

---

## 4. FAZ-TEMELLİ GIC BOZULMA MERDİVENİ (kullanıcı kararı — 2026-10-16)

Bozulma BOYUTA değil FAZA bağlanır: oyuncu her prestij fazına ilerledikçe dünya adım
adım bir GIC labirentine dönüşür. D1-D8 boyut glifleri/kimliği SABİT kalır; derinleşen
şey ortamdır (substrat + CRT + motifleme).

| Seviye | Tetik (oyun durumu) | Görsel Durum |
| :--- | :--- | :--- |
| K0 — Steril Kumarhane | Faz 0 ilk yarısı (D5 kilitli) | Substrat yok; kusursuz obsidian; bant kapalı (CRT yok — ADR-0069) |
| K1 — Planck Aşınması | Planck Yırtılması: mikro-karadelik doğar (D5 açılır) | **Görünür tabanlı** ilk yırtık-kâğıt köşeleri; Planck bariyeri kolajı (tape köşeleri); kenar süzülmesi başlar |
| K2 — Kozmik Yutuş | D6-D8 (Dünya → Güneş → Samanyolu yutuluyor) | Substrat ~%25; **damalı şerit** (checker) kenarlarda; motif bandı kenar bantlarında |
| K3 — Çöküş Sonrası | Faz 1 (ilk Big Crunch, SP çağrıları) | **Tape yapışkanları** panel köşelerinde; el yazısı annotasyonlar; bölgesel glitch ateşleri (`--glitch-intensity`) |
| K4 — Gece Nöbeti Substratı | Faz 2 (nightWatchUnlocked) | Damalı zemin fikri yayılır (`collage-floor`); chromatic aberration artışı; motif bandı sürekli akar |
| K5 — Kadim Oburluk | Faz 3 (içerik henüz yok) | Tam labirent dokusu: substrat diplerde, bant yoğunluğu mak |

OKUNABİLİRLİK KANONU (kırılmaz kural): bozulma yalnız ambient/dekoratif katmanda
yaşar. Sayılar, buton etiketleri, tabular-nums, 3-state ramp sınıfları, rezerve renk
anlamları ve tooltip verileri asla bozulmaz.

Türetme kuralı: corruptionLevel kayıt formatına YENİ ALAN EKLEMEZ; mevcut faz/durum
sinyallerinden hesaplanır (planlanan modül: src/game/corruption.ts). App root'una
data-corruption mührü düşer (K0..K5); CSS ve bileşenler bu mührü tüketir.

---

## 5. Boost/Olay Anı — Motif Bandı ve Asset Slot Yapısı

Kullanıcı kararı: boost alınca yanlarda GIC tarzı motifler ve glifler belirsin.

- src/assets/motifs/ + src/game/motifs.ts: merkezi asset-slot modülü. İlk dalga:
  agent üretimi SVG motifler. Slot API ileride elle çizilen PNG/SVG asset'lerin birebir
  değiştirilmesine izin verir (motif adı = dosya adı kontratı).
- Olay anı: Kozmik Dalgalanma tetiklendiğinde duyuru kartı + kenarlardan süzülen motif
  bandı; rezonans kombosunda (7x + 777x aynı anda) bant yoğunluğu katlanır.

---

## 6. Uygulama Fazları

Checklist brain/tasks/todo.md içinde tutulur:
- Faz A — Zemin & CRT: palet ısınması (--feast), CRT kaplama katmanı *(CRT ayağı ADR-0069 ile
  iptal — zemin/vinyet/motion kazanımları korunur)*, useMotion kontratı tam uyumu, AlgorithmicSwirl korunur
- Faz B — Bozulma altyapısı: src/game/corruption.ts türetme modülü + data-corruption mührü + CSS token tahsisi
- Faz C — GIC kimlik kütüphanesi: motif slot'ları + motif bandı + Wrinkler creepy-cute
  kaplaması + kriz/Planck kolaj vinyetleri
- Faz D — VS şöleni: core/particles.ts canvas overlay + yutma kıvılcımları + olay
  saldırıları (ADR-0044 shake bariyer korunur)
- Faz E — Retrofit & QA: Header/DimensionRow/DimensionsTab/ticker/modal dili + WCAG AA
  kontrast turu (yeni sıcak paletle) + npm test + npm run build + kayıt/commit

## 7. TİPOGRAFİ SİSTEMİ (ADR-0066 + ADR-0067 · 2026-10-16 — uygulandı)

> Araştırma raporu: [`brain/research/typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md)
> · ADR'ler: [`0066`](../decisions/0066-hungry-parlor-typography-pivot.md) (display/hand) +
> [`0067`](../decisions/0067-ui-font-wave-space-grotesk-spacemono.md) (sans/mono — 2. dalga)

| Rol (token) | Font | Kullanım | Kaynak |
| :--- | :--- | :--- | :--- |
| `font-display` | **m6x11plus** (Balatro piksel) | hero sayaç + yüzen olay sayıları (canvas) | self-host `public/fonts/` · **atıf zorunlu** (`ATTRIBUTION.md`) |
| `font-sans` | **Space Grotesk** (400–700) | tüm menü/gövde metni, nav, başlıklar | Google Fonts (latin-ext ✓) |
| `font-mono` | **Space Mono** (400/700) | sayı / telemetri / rozet / buton (`tabular-nums` kanonu) | Google Fonts (latin-ext ✓) |
| `font-hand` | Caveat | GIC el yazısı annotasyonlar (K3+ `.collage-scrawl`) | Google Fonts |

2. dalga notu (ADR-0067): ağırlık eşlemeleri bilinçli — Space Grotesk maks 700
(`font-extrabold/black` → 700), Space Mono yalnız 400/700 (500→400, 600→700);
Inter/JetBrains hardcoded yığınları da aileyi taşır (`style.css`, `tooltip.ts`,
`JuiceLayer` canvas fallback) — **eski font ailesi repoda sıfır referanstır**.

**Kırılmaz kurallar:**
1. m6x11plus **ızgara** = font-size 18'in katları (18/36/54/72); **sentetik bold yasak**
   (tek ağırlık Regular; `font-bold` ızgarayı bozar). `tracking` elle düzeltmez.
2. **m6x11 orijinali TÜRKÇE DEĞİL** (ğşıİöçü eksik) — yalnız `m6x11plus` (228 glif, TR tam) kullanılır.
3. `public/fonts/ATTRIBUTION.md` **silinemez** (lisans zorunluluğu).
4. Chakra Petch repodandır (pivot sonrası sıfır referans).
5. Sayı/etiket/ramp katmanları el yazısına devredilmez (okunabilirlik kanonu);
   hand rolü yalnız ambient kolaj katmanında yaşar (K0'da görünmez — bozulma fazlara bağlıdır).

---

## 8. Bu Belge Ne Zaman Değişir?

Yeni görsel karar alındığında ya da bir stil katmanı değiştiğinde bu dosya ve kendi
ADR'si güncellenir. Görsel işler buradan sapan değişiklik yapmaz; sapma gerekiyorsa
önce bu belge güncellenir.

> **2026-10-18 notu (kullanıcı kararı):** `v-tip` tooltip sistemi uygulamadan tamamen
> kaldırıldı (23 dosyada 84 kullanım + `src/core/tooltip.ts` + `main.ts` kaydı; tek native
> `title` `aria-label`'a çevrildi). Bu belgedeki "tooltip verileri asla bozulmaz"
> (okunabilirlik kanonu, §4) ve "kural tam karar anında konuşulur" (Balatro disiplini,
> §1) maddeleri o güne kadarki tasarımın tarihsel kaydı olarak kalır; güncel uygulamada
> tooltip katmanı yoktur, karar bilgisi buton üzerindeki kısa rozet + kilit ilerleme
> çubuğundadır. Tooltip katmanı geri getirilirse bu not kaldırılır.

> **2026-10-18 notu 2 (ADR-0069):** CRT kaplaması (eski §3 L1) **resmen kaldırıldı**.
> Fullscreen scanline/curvature/fosfor katmanı geri gelmez; `--crt-*` tokenları, `.crt-*`
> sınıfları ve `crtEffect` ayarı temizlenir. §4 merdiveni yalnız substrat (L2) + motif
> bandı (L3) + bölgesel glitch üzerinden derinleşir; K1 görünürlüğü substrat tabanıyla
> telafi edilir. Faz A'nın zemin/vinyet/motion kazanımları korunur.

---

## 9. Görsel-Öncelikli Anlatım — "Yazı Yığınından Oyun Diline" (2026-10-18 eklendi)

> Kaynak araştırma: [`brain/research/visual-language-over-text-research-2026-10.md`](../research/visual-language-over-text-research-2026-10.md)
> (2026-10-15; teemo.dev juice/art-direction, hayao Design Codex, SEELE Clicker UI,
> Signal Decay, AD glyph sistemi). İlke: bilgi yazı/tooltip yığınıyla değil **renk,
> ikon, çubuk, animasyon ve ritimle** anlatılır. 2026-10-18'de tooltip katmanı tamamen
> kaldırıldığı için bu bölüm artık sözleşmenin bağlayıcı çekirdeğidir.

### 9.1 Juice Bütçesi Kanunu
- Görsel tepki **pointerdown'da** (≤100 ms), state commit pointerup'ta; hareketler
  timestamp-driven (frame-counted asla).
- Dokunma 5 katman (scale punch + haptik + bloom + yükselen "+N"); set-piece anlar
  (günde ~1) 9 katman alır. Ortam sakin tutulur — ortamı juiclemek idle oyunu yorar.
- Parçacık havuzu sabit + emisyon cap: ekonomi sonsuza büyüse de görsel boğulmaz
  (mevcut karşılık: `core/particles.ts` reçete/bütçe/suppression).

### 9.2 Rezerve Renk Sözleşmesi (durum ≠ hue)
- altın = SADECE progression/prestij/milestone; kırmızı = tehlike; gri = kilitli;
  cyan = telemetri/bonus. Geleceğe boş hue bırakılır.
- Uygunluk **rampa** ile kodlanır (parlak → kısmi/sarı → gri); hue kimlik verir, durum
  vermez (mevcut karşılık: 3-state ramp + `progress-track`).
- Renk körü ikinci kanalı **(hedef, uygulanmadı):** pip/çerçeve/köşe glifi + bitişik tier
  arası ≥15 L* adımı. Uygulanan kısım: D1-D8'e sabit glif (`src/game/dimension_identity.ts`,
  AD dizgi taktiği: Ω ∞ Ξ Δ Ψ — sıfır art saati; `.dim-glyph` rozetleri).

### 9.3 Metin → Çubuk / Bir Bakışta
- Tüm X/Y gereksinimleri oransal **çubuk + yanında küçük mutlak sayı** (`tabular-nums`
  zorunlu; kısaltma: <1000 yerelleştirilmiş kısa biçim, üstü sonek + precision —
  `src/core/format.ts`). Oranlara mini **sparkline hedeftir (uygulanmadı;** yalnız üretim
  geçmişi örnekleniyor: `state.ts` Rapor sparkline).
- Kural: her bilgi biriminin **görsel karşılığı** olur; yazı yalnız nüansı taşır.
  Tooltip katmanı kaldırıldığından (bkz. §8 notu) karar bilgisi buton üstü kısa
  rozet + kilit ilerleme çubuğundadır.
- Sekme/section renk-lengüajı: sekmelere sol kenarlık rengi; aktif sekme ikon+yazı,
  pasif ikon-only (Signal Decay deseni).

### 9.4 Meşgul Kare & Flash Güvenliği
- Suppression window (sahne başına 400/600 ms — kare sessizleşir; `core/particles.ts`),
  background knock-down, kritik anlarda impuls + decay. Tekrarlayan pulse'lar
  (`animate-pulse`, `affordance-pulse`) **motion kapısı arkasındadır:** reduced/off + OS
  azaltılmış harekette `style.css` hepsini `animation: none` ile durdurur (WCAG 2.3.1
  karşılığı). Bir semantik = bir görsel (beyaz tick = kazanç, cyan+kıvılcım =
  bonus, altın+ring = milestone).

### 9.5 Uygulama Önceliği (araştırmadan)
A (rezerve renk) → B (metni çubuğa) → C (tooltip→bir bakışta — **tamamlandı
2026-10-18**) → E (section renk-lengüajı) → D (juice standardı) → F (prestige ritüeli).
