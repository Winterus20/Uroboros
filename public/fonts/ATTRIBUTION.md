# m6x11plus — Font Atıf & Lisans

## Kaynak

- **Font:** m6x11plus (m6x11 ailesinin geniş karakterli sürümü)
- **Yazar:** Daniel Linssen — **"free to use with attribution"** (atıf zorunludur)
- **Sayfa:** https://managore.itch.io/m6x11
- **Gerekli atıf:** `m6x11 by Daniel Linssen`

Bu dosya (ATTRIBUTION.md), repoda `public/fonts/m6x11plus.ttf` olarak bulunan fontun
atıf zorunluluğunu karşılar. Font, oyunun **display** rolünü taşır (hero sayaç +
yüken kütle sayıları); ADR-0066 ("Aç Kumarhane" tipografi pivotu) kapsamında alınmıştır.

## Paketlenmiş dosya hakkında

- **Dosya:** `m6x11plus.ttf` (18,192 bayt · name table: "m6x11plus Regular" · 228 glif · 1152 upm)
- **Edinim:** Balatro wiki aynası (`balatrowiki.org/images/M6x11.ttf`) — itch.io'nun
  resmi indirmesi doğrudan script erişimine kapalı olduğu için ayna kullanıldı; dosya
  fontTools name tablosuyla **m6x11plus** olarak doğrulandı (orijinal `m6x11` 12 KB /
  127 gliftir ve Türkçe kapsaması YOKTUR).
- **Doğrulamalar (fonttools cmap):** Türkçe glifleri tam (ğ Ğ ı İ ş Ş ç ö ü);
  tüm rakamlar sabit advance (448/1152) → `tabular-nums` doğuştan güvenli;
  e-notation sayaç karakterleri (`. , e E × %` ve harf suffixler) mevcut.
- **Izgara:** piksel font; net render için font-size 18'in katları
  (18 / 36 / 54 / 72). Sayaç ve canvas boyutları bu ızgaraya bağlıdır.
