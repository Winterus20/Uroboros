# Yan Şıklatan Eller — Asset Atıf & Üretim Notu

## Kaynak (CC0 — Public Domain)

- **Dosya:** `Finger snapping impact frame.gif` (800×800 · 6 kare · ~1000ms döngü)
- **Yazar:** Boing747Ha — "Finger snapping impact frame"
- **Sayfa:** https://commons.wikimedia.org/wiki/File:Finger_snapping_impact_frame.gif
- **Lisans:** Creative Commons Zero v1.0 Universal (Public Domain Dedication).
  Özgürce kopyalanabilir, değiştirilebilir, ticari kullanılabilir — atıf zorunlu
  değildir (bu dosya gönüllü kayıttır).

## Kare seçimi (4 karelik şıklatma yayı)

| Sprite | Kaynak kare | Rol | Kaynak gecikme |
| :--- | :--- | :--- | :--- |
| 1 | f0 | hazır | 250ms |
| 2 | f1 | gerilim | 250ms |
| 3 | f4 | vuruş | 250ms |
| 4 | f5 | oturma | 250ms |

Kaynak GIF'in f2/f3 kareleri el karesi değil, stilize "vuruş flaşı"dır;
sprite'a alınmadı — oyunda bu an CSS parlaması (`burst` filtresi) olarak yaşar.

## Boru hattı (yeniden üretilebilir)

Tek seferlik Node betiği (`omggif` + `pngjs`, uygulama paketine girmez):

1. Kroma anahtarı (duvar grisi düşük kromalı) → kenar flood fill ile zemin.
2. Despeckle (900px altı adacıklar düşer).
3. Mesafe-alanı (chamfer 3-4) imzalı alfa → ~1.6px feather.
4. El alanına göre kare başına uniform ölçek (kaynakta kamera mesafesi oynuyor:
   f4/f5 ~1.3× büyütülerek hizalanır) → ortak pencere (570×762 kaynak px).
5. Sıcak sepya derecelendirme (ink-black zeminde parlasın diye) → 344×460 PNG.
6. Çıktı: `snap-hand-sheet.png` (1376×460, 4 sütun) — tek HTTP isteği,
   sağ şerit CSS `scaleX(-1)` ile aynalanır.

Orijinal GIF ve ara çıktılar repoya girmez (türetilmiş sprite + bu not yeterlidir).
