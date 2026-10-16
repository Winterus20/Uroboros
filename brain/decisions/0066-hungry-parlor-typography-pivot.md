# ADR-0066: "Aç Kumarhane" Tipografi Pivotu — m6x11plus Display + Caveat El Yazısı

- **Tarih:** 2026-10-16
- **Durum:** Kabul edildi ve uygulandı
- **Kapsam:** Font sistemi (display/sans/mono/hand rolleri), font asset paketleme, sayaç/canvas ızgarası, GIC el yazısı annotasyonları
- **Önceller:** ADR-0049 (Inter=metin, Mono=sayı, Display=ana sayaç) → ADR-0058 (görsel dil yayılımı) → ADR-0060 §2.1 ("m6x11 display rolü için değerlendirilir" ertelemesi) → ADR-0065 M7 (`m6x11.woff2` silindi — sıfır referans).
- **Bağlayıcı kopya:** `brain/context/visual-language.md` §8 · **Araştırma raporu:** [`brain/research/typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md)

---

## 1. Bağlam

Kullanıcı fontların yeni görsel dile (Balatro zemin + VS şölen + GIC kimlik) göre
değiştirilmesini istedi. Sözleşme m6x11'i display rolü için ertelemiş, Faz E ise
bağlanmamış `m6x11.woff2`'yi temizlemişti. Bu ADR ertelenen font kararını kapatır.

**Yöntem:** fonttools ile aday font TTF'lerinin cmap tablosu indirilip programatik
doğrulama (`brain/scratchpad/font-coverage-check.py`) + lisans/web araştırması.

## 2. Bulgular (kritik)

1. **`m6x11` orijinal (12 KB, 127 glif): Türkçe DEĞİL** — yalnız basic latin;
   ç-ö-ü bile yok (rust-bevy-examples kopyası ile doğrulandı). **Elendi.**
2. **`m6x11plus` (17 KB, 228 glif, name table ile teyitli): TÜRKÇE TAM**
   (ğĞıİşŞçöü). Rakamlar sabit advance (448/1152) → `tabular-nums` doğuştan güvenli;
   e-notation sayaç karakterleri (`. , e E × %` + harf suffixler) mevcut.
   Balatro wiki aynasından indirildi (itch.io doğrudan erişime kapalı); fontTools
   name tablosu "m6x11plus Regular" olarak doğrulandı.
3. **Lisans:** Daniel Linssen — "free to use with **attribution**" →
   `public/fonts/ATTRIBUTION.md` zorunlu (hands asset'indeki aynı desen).
4. **TR elenleri:** Permanent Marker, Gochi Hand, Bowlby One, Rye → Ğ/İ/ş eksik.
   **TR geçenler:** Caveat, Space Mono, Ultra, Alfa Slab One, Special Elite, Bungee.
5. **Izgara:** m6x11plus piksel font → net render için font-size **18'in katları**
   (18/36/54/72); sentetik bold ızgarayı bozar (tek ağırlık Regular).

## 3. Karar

| Rol | Font | Kaynak | Karar gerekçesi |
| :--- | :--- | :--- | :--- |
| **display** (hero sayaç + yüzen olay sayıları) | **m6x11plus** (self-host 17 KB) | managore.itch.io/atıf | Balatro autentik; ADR-0060 ertelemesi kapandı; TR + tabular doğrulandı |
| **sans** (tüm metin) | **Inter** (DEĞİŞMEDİ) | Google | ADR-0049 kontratı; sıcaklık Faz A paletinden gelir; kaos bütçesi |
| **mono** (sayı/telemetri) | **JetBrains Mono** (DEĞİŞMEDİ) | Google | Okunabilirlik kanonu + tabular disiplin |
| **hand** (YENİ — GIC kolaj) | **Caveat** | Google (latin-ext) | "El yazısı notu" katmanının fontu; hafif; TR tam |

Uygulanmış değişiklikler:
- `public/fonts/m6x11plus.ttf` + `ATTRIBUTION.md`; `style.css` `@font-face`
  (`font-display: swap`, preload `index.html`'de).
- `tailwind.config.js`: `display: m6x11plus…`, **yeni token** `hand: Caveat…`.
- `CounterDisplay.vue`: `text-[36px] sm:text-[54px] lg:text-[72px]` (18 ızgarası),
  `font-bold` + `tracking-tight` kaldırıldı (sentetik bold/kerning ızgarayı bozar).
- `JuiceLayer.vue`: canvas sayıları `400 …px "m6x11plus"`; boyutlar 18/36
  (eski 15/20/24 → ızgara); kontur kalınlığı boyutla ölçeklenir (`max(3.5, size*0.18)`).
- `ScreenOverlay.vue` + `.collage-scrawl`: **K3+ el yazısı annotasyonlar**
  (visual-language.md §4 sözleşmesinde vardı, uygulanmamıştı) — ambient, aria-hidden,
  `--substrate-opacity` eğrisine bağlı, forced-colors'ta susar.

## 4. Reddedilenler

- **m6x11 orijinal:** TR kapsamı yok (yukarıda kanıt).
- **Ultra / Alfa Slab One display:** TR-OK ve uygundu; kullanıcı "Sadık Balatro"
  (m6x11plus) yönünü seçti.
- **Space Mono (mono) + sıcak sans dönüşü:** ADR-0049 kontratı + frenli kaos bütçesi;
  üç sesli tipografi (piksel + mono + el yazısı) yeterince yüksek karakter taşıyor.
- **Permanent Marker / Gochi Hand:** Türkçe glif eksikleri nedeniyle elendi.

## 5. Sonuçlar & Doğrulama

- `npm test`: **314/314** · `npm run build`: **0 hata** ·
  `harness:contrast`: **WCAG AA** · `harness:smoke`: log10=90.7 / 8 shift (baseline sabit).
- dist artifact kontrolleri: `.font-hand`, `@font-face m6x11plus`, `.font-display`,
  `.text-[36px]/[54px]/[72px]`, preload + `dist/fonts/` paketleme ✓; Chakra Petch
  referansı kalmadı (0 eşleşme) ✓; preview sunucusu üzerinden font HTTP 200 ✓.
- **Ortam kısıtı:** bu ortamda (Termux) Playwright/Chromium kurulamadı → ekran
  görüntülü görsel doğrulama YAPILAMADI; görsel onay kullanıcıdadır.
- Atıf: `public/fonts/ATTRIBUTION.md` (lisans zorunluluğu kalıcı olarak karşılanır).
