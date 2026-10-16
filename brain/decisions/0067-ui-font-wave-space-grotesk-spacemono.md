# ADR-0067: Tipografi 2. Dalga — UI Fontları: Space Grotesk (sans) + Space Mono (mono)

- **Tarih:** 2026-10-16
- **Durum:** Kabul edildi ve uygulandı
- **Kapsam:** `font-sans` (tüm menü/gövde metni) ve `font-mono` (telemetri/rozet/buton) ailelerinin değişimi — yani arayüzün tamamına görünür font değişimi
- **Önceller:** ADR-0049 (rol dağılımı: Inter=metin, Mono=sayı) → ADR-0066 (display=m6x11plus, hand=Caveat; **o an sans/mono korunmuştu**) → **bu ADR o "korunur" kararını kullanıcı talebiyle değiştirir** (rol dağılımı değil, aileler değişir).
- **Bağlayıcı kopya:** `brain/context/visual-language.md` §7 · **Araştırma:** [`typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md) §7

## 1. Bağlam

ADR-0066 sonrası kullanıcı sayaç fontunun değiştiğini gördü; **menüler ve tüm yazıların
aynı kaldığını** belirterek "onlar için de düzgün fontlar bul ve yap" dedi. Sonraki turda
yön sorulduğunda: *"en iyi ve en stilistik hangisi olacaksa ve görsel dile yakışır olsun."*

Arayüz metinleri iki token üzerinden yürür (`font-sans` + `font-mono`; nav, bölüm
başlıkları, buton etiketleri, rozetlerin çoğu `font-mono`'dur) — bu iki aileyi değiştirmek
tüm menü/yazı yüzeyini tek hamlede dönüştürür.

## 2. Araştırma (fonttools cmap — adayların tamamı TR doğrulandı)

| Aday | Rol | TR | Not |
| :--- | :--- | :--- | :--- |
| Rubik | sans | ✅ | oyuncu/kumarhane; sıcak ama daha yaygın/neytral |
| Figtree | sans | ✅ | sıcak okunabilir; en muhafazakâr |
| DM Sans / Outfit / Chivo / Archivo / Sora | sans | ✅ | elendi (karakter/görsel dil uyumu düşük) |
| **Space Grotesk** | **sans** | ✅ | **seçildi** — retro-teknik, hafif tuhaf; Space Mono ailesi; CRT/dijital kimlik |
| **Space Mono** | **mono** | ✅ | **seçildi** — retro terminal/CRT; Balatro/CRT diline en yakın |
| IBM Plex Mono | mono | ✅ | profesyonel ama daha az stilistik |
| DM Mono / Azeret Mono / Martian Mono | mono | ✅ | elendi (karakter veya aile uyumu) |

**Kullanıcı seçimi:** stil + görsel dil uyumu önceliğiyle **Space Grotesk + Space Mono**
(Retro CRT paketi) uygulandı.

## 3. Karar (değişen tek şey aileler; roller aynı)

| Token | Önce | Sonra |
| :--- | :--- | :--- |
| `font-sans` | Inter | **Space Grotesk** (400–700) |
| `font-mono` | JetBrains Mono | **Space Mono** (400/700) |
| `font-display` | m6x11plus, Inter fallback | m6x11plus, **Space Grotesk** fallback |
| `font-hand` | Caveat | değişmedi (ADR-0066) |

Hardcoded aileler de hizalandı (aksi hâlde eski font cebinde kalırdı):
`style.css` body + `.section-label/.section-hint` (Inter → Space Grotesk);
`.dim-glyph`, `.stat-box-*`, `.ds-badge`, `.btn-primary`, `.balatro-chip-*`, sticker-chip
(`ui-monospace` → başına `Space Mono`); `tooltip.ts` font stack; `JuiceLayer` canvas fallback.

### Ağırlık eşlemeleri (bilinçli)
- Space Grotesk maks. 700 → `font-extrabold(800)` / `font-black(900)` kullanımları CSS
  ağırlık eşleşme algoritmasıyla **700'e** düşer (sentetik kalın yok — ızgara bozulmaz).
- Space Mono yalnız 400/700 → 500→400, 600→700, 800/900→700 eşleşir; `tabular-nums`
  monospace olduğu için zaten garantilidir.

## 4. Reddedilenler
- **Rubik + Space Mono:** sıcak/oyuncu ama Space Grotesk kadar "stilistik" ve CRT ile
  akraba değil (kullanıcı "en stilistik + görsel dil" dedi).
- **Figtree + IBM Plex Mono:** en okunabilir fakat en az karakter — pivotun amacı
  görünür kimlik değişimi.
- **Inter'in kısmen korunması:** kullanıcının şikâyeti tam olarak bunu hedefliyordu;
  yarım değişim şikâyeti çözmez.

## 5. Sonuçlar & Doğrulama
- `npm test`: **exit 0** (314/314) · `npm run build`: **exit 0** ·
  `harness:contrast`: **WCAG AA (exit 0)** · `harness:smoke`: **log10=90.7 / 8 shift (exit 0)**.
- dist: `.font-sans → Space Grotesk`, `.font-mono → Space Mono`, `.font-display → m6x11plus+Space Grotesk`;
  **JetBrains/Inter referansı = 0**; Google Fonts yanıtında **latin-ext** blokları var.
- **Ortam kısıtı:** Playwright/Chromium kurulamadı → ekran görüntülü görsel onay kullanıcıdadır.
