# Tipografi Araştırması — "Aç Kumarhane" Font Pivotu (2026-10-16)

> **Amaç:** Görsel dil sözleşmesi (`brain/context/visual-language.md`) ve ADR-0060 §2.1'in
> ertelediği font kararını (m6x11 display değerlendirmesi) araştırmak ve yeni görsel dile
> (Balatro zemin + VS şölen + GIC kimlik) uygun font sistemini belirlemek.
> **Yöntem:** fonttools ile aday font TTF'lerinin cmap tablosu indirilip programatik
> doğrulama (script: `brain/scratchpad/font-coverage-check.py`) + kaynak web araştırması.

---

## 1. Mevcut Tipografi (denetim)

| Rol (token) | Font | Nerede | Durum |
| :--- | :--- | :--- | :--- |
| `font-sans` | Inter (400–900) | tüm UI metni (body + App root) | TR-OK (cmap doğrulandı) |
| `font-mono` | JetBrains Mono (400–700) | sayılar, telemetri, rozet, çoğu buton etiketi (`tabular-nums`) | TR-OK |
| `font-display` | Chakra Petch (600/700) | **yalnız** hero sayaç (`CounterDisplay.vue`) + canvas yüzen sayılar (`JuiceLayer.vue` ctx.font) | TR-OK |

- Fontlar `index.html` Google Fonts linkinden yükleniyor; `tailwind.config.js` tek token kaynağı.
- `.vue` dosyalarında hardcoded `font-family` **yok** (tek istisna: `JuiceLayer.vue:604` canvas `ctx.font`).
- `public/fonts/m6x11.woff2` Faz E'de silinmişti (sıfır referans); ADR-0060 m6x11'i
  "display rolü için değerlendirilecek" olarak ertelemişti. **Bu rapor o değerlendirmedir.**

## 2. Programatik Kapsam Doğrulaması (cmap, ğşıİöçü + ĞŞ)

| Font | Kapsam | Karar |
| :--- | :--- | :--- |
| Inter, JetBrains Mono, Chakra Petch (mevcut) | **TR-OK** | temiz |
| **m6x11 (orijinal, 12 KB)** | ❌ Ğ-Ş-ı-İ-ş-ğ **ve ç-ö-ü dahil** (127 glif, basic latin) | **kullanılamaz** |
| **m6x11plus (17 KB, adı font adında doğrulandı)** | ✅ **TR-OK** (228 glif; ğĞıİşŞçöü tam) | display adayı |
| Caveat (el yazısı) | ✅ TR-OK | hand adayı |
| Permanent Marker | ❌ Ğ-İ-ş-Ğ-Ş eksik | elendi |
| Gochi Hand | ❌ aynı eksikler | elendi |
| Space Mono (retro mono) | ✅ TR-OK | mono alternatifi |
| Ultra (vintaj slab) | ✅ TR-OK | display alternatifi |
| Alfa Slab One | ✅ TR-OK | display alternatifi |
| Bowlby One | ❌ Latin-ext eksik | elendi |
| Rye (saloon) | ❌ Latin-ext eksik | elendi |
| Special Elite (daktilo) | ✅ TR-OK | kolaj/tape alternatifi |
| Bungee (tabela) | ✅ TR-OK | opsiyonel |

### m6x11plus için ek bulgular
- **Lisans:** Daniel Linssen — "free to use with attribution" (managore.itch.io/m6x11).
 → Kullanılırsa **atıf zorunlu**: `public/fonts/ATTRIBUTION.md` (SideSnapHands el asset'
indeki aynı desen — asset yanında ATTRIBUTION.md) + @font-face yanına yorum satırı.
- **Tabular güven:** tüm rakamlar tek advance (448/1152 upm) → `tabular-nums` zaten doğuştan
  sabit; layout jitter riski yok.
- **Izgaralı piksel font:** resmi kılavuz "font size 18, 36, 54…" (m6x11plus için 18 katları).
  Mevcut sayaç boyutları 36/48/60 px → 48 ve 60 ızgaraya uymaz (bulanık/kirli ölçek).
  Net sonuç için **36 / 54 / 72 px**'e ayarlanmalı (Tailwind custom text boyutu).
- **Tek ağırlık (Regular):** `font-bold` sentetik kalınlaşma piksel ızgarasını bozar →
  sayaçta `font-bold` kaldırılır (pixel font'un kendi gövdesi yeterli ağırlıktadır).
- **Sayaç formatları ASCII:** `format.ts` e-notation (`1.23e45`) + suffix; superscript/fancy
  karakter yok → m6x11plus kapsaması sayaç için yeterli (`×`, `.`, `,`, `e`, harf suffixler ✓).
  (`·`, `⁰¹²`, `∞` gibi karakterler display'de geçmez; rozetler zaten `font-mono`.)
- **Kanıt (indirme kaynakları):** orijinal m6x11 `rust-bevy-examples` kopyası (12 KB) ile
  Balatro wiki dosyası (`balatrowiki.org/images/M6x11.ttf`, 17 KB, name table = "m6x11plus")
  karşılaştırıldı. m6x11'in TR'siz olduğu bu iki örnekle doğrulandı.
- **Web kanıtı:** LocalThunk — "m6x11plus is an extended version of m6x11 that includes
  special characters for Dutch, French, German, Italian, Norwegian, Polish, Portuguese…";
  Balatro'un resmi dilleri arasında Türkçe **yok** (topluluk çevirisi var) → orijinal/plus
  kaynaklarda TR güveni **fonttools ile çapraz doğrulanan wiki kopyasında** teyit edildi.

## 3. Görsel Dil ile Eşleme (neden hangi font)

| Sözleşme katmanı | İhtiyaç | Aday |
| :--- | :--- | :--- |
| L0/Zemin (Balatro) — "Font: m6x11… display rolü için değerlendirilir" | imza sayaç + büyük olay sayıları | **m6x11plus** (autentik, TR-OK, atıflı) |
| L2/Substrat (GIC) — "el yazısı notu", K3 "el yazısı annotasyonlar" | kolaj tape/not etiketleri, motif bandı yazısı | **Caveat** (TR-OK, Google, hafif woff2) |
| L4 Şölen (VS) — yüzen kütle sayıları | canvas display ile aynı kimlik | m6x11plus (ctx.font) |
| Okunabilirlik kanonu — sayı/etiket asla bozulmaz | telemetri, tabular | JetBrains Mono **korunur** (ADR-0049) |
| ADR-0049 — "Inter tüm metin" | gövde metni | Inter **korunur** (sözleşme) veya sıcak alternatifi |

## 4. Önerilen Paketler (karar bekliyor)

**Paket A — Sadık Kumarhane (ÖNERİLEN):**
- `display` → **m6x11plus** (self-host 17 KB, atıf dosyası, sayaç 36/54/72 ızgarası, bold kaldır)
- `hand` (YENİ) → **Caveat** (kolaj tape etiketleri + motif bandı yazısı + K3 annotasyon kanca)
- `sans` Inter + `mono` JetBrains Mono korunur (ADR-0049/kanon)

**Paket B — Kumarhane Klasik (pixel değil):**
- `display` → **Ultra** veya **Alfa Slab One** (vintaj slab afiş, Google, TR-OK; atıf yok)
- `hand` → Caveat; sans/mono korunur.

**Paket C — Paket A + sıcak sans:** Inter → sıcak humanist (ör. Figtree/DM Sans/Outfit),
mono korunur. (ADR-0049 "Inter" kontratını güncelleme gerektirir.)

## 5. Entegrasyon Planı (hangi dosya)

1. `public/fonts/m6x11plus.ttf` (17 KB) + `public/fonts/ATTRIBUTION.md` — self-host.
2. `src/style.css` — `@font-face` (font-display: swap, preload) + display ızgara yardımcıları.
3. `index.html` — Google Fonts linki: Chakra Petch çıkar, Caveat ekle (latin+latin-ext otomatik).
4. `tailwind.config.js` — `display: ['m6x11plus', …]`, `hand: ['Caveat', …]` tokenleri.
5. `CounterDisplay.vue` — 36/54/72 text boyutları, `font-bold` kaldır.
6. `JuiceLayer.vue:604` — `ctx.font = 400 …px "m6x11plus"`.
7. Hand tüketimleri: `ScreenOverlay` tape/annotasyon yazısı + `MotifBand` yazısı (GIC katmanı).
8. Doğrulama: `npm test`, `npm run build`, `harness:contrast`, `harness:smoke`.

## 6. Riskler

- Piksel font sentetik bold/ölçek kayması → ızgara boyutu + bold kaldırma ile kapanır.
- Atıf unutulursa lisans ihlali → ATTRIBUTION.md + ADR'de zorunlu madde.
- Google Fonts'a eklenen Caveat payload'ı → latin-ext woff2 yalnız ihtiyar subseti çeker (~30 KB).
- Kontrast: font değişimi WCAG oranını değiştirmez (renk bazlı harness korunur).

---

## 7. İKİNCİ DALGA — UI (menü/tüm yazılar) fontları (ADR-0067)

**Tetik:** Kullanıcı ADR-0066 sonrası "sadece sayaç değişmiş, menüler ve yazılar aynı —
onlar için de düzgün fontlar bul ve yap" dedi; yön sorulunca "en stilistik + görsel dile
yakışır" dedi.

**Yöntem:** aynı fonttools cmap hattı ile 13 adayın tamamı doğrulandı:

| Aday | Rol | TR | Sonuç |
| :--- | :--- | :--- | :--- |
| Rubik · Figtree · DM Sans · Outfit · Chivo · Archivo · Sora | sans | ✅ hepsi | elendi (stil/görsel dil uyumu) |
| **Space Grotesk** | sans | ✅ | **SEÇİLDİ** — retro-teknik, hafif tuhaf; Space Mono ailesi; CRT/dijital kimlik |
| **Space Mono** | mono | ✅ | **SEÇİLDİ** — retro terminal/CRT; Balatro diline en yakın mono |
| IBM Plex Mono · DM Mono · Azeret Mono · Martian Mono | mono | ✅ hepsi | elendi (karakter/aile uyumu) |

**Uygulama:** token swap (`sans`/`display` fallback) + hardcoded yığın hizası
(`style.css` body/section-label/hint → Space Grotesk; `.dim-glyph/.stat-box-*/.ds-badge/
.btn-primary/.balatro-chip-*/sticker` + `tooltip.ts` + `JuiceLayer` fallback → `Space Mono`
önüne). Ağırlık eşlemeleri bilinçli: Space Grotesk 700 maks (800/900→700), Space Mono
400/700 (500→400, 600/800/900→700).

**Doğrulama:** test exit 0 (314/314) · build exit 0 · contrast AA · smoke 90.7/8 shift ·
dist: `.font-sans→Space Grotesk`, `.font-mono→Space Mono`, Inter/JetBrains referansı **0** ·
Google Fonts yanıtında latin-ext blokları ✓.
