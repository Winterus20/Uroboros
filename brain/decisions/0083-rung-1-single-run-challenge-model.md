# ADR-0083: 1. Basamak — Tek Koşu, 190 Dakika ve Sıfırlamasız Mücadele Modeli

## Durum

**Kabul edildi (2026-10-27)** — proje sahibinin kararı; uygulama dalgası başladı.

- **Süre:** 1. basamak **190 dk** (3 sa 10 dk). Toplam oyun varsayılan **135 saat** (×1.25);
  85 saatte kalmak istenirse basamak çarpanı **×1.165**.
- **Sıfırlama:** 1,79e308 kapısına kadar **yok**. Tek sıfırlama kapıdaki prestijdir.
- **Blok Çarpanı:** B = 5.5 sabit (kalibrasyon aralığı 5.4–5.6).
- **8 mücadele:** sıfırlamasız overlay; girişte sayı/halkalar/B korunur, ceza üstüne biner.
- **C8 ödülü:** üretim **×2** (eski fiyat tabanı 1.15 değil).

Bağlayıcı kaynaklar: [plan v2](../research/rung-1-plan-2026-10-27.md) ·
[kalibrasyon raporu](../research/rung-1-190-calibration-2026-10-27.md) ·
[uygulama sözleşmesi](../scratchpad/rung-1-implementation-contract.md).

---

## Bağlam

ADR-0082 zincir-only dilimi bıraktı; sıradaki iş boost/güçlendirme döngüsünün yeniden
tasarımıydı. v1 planı (4 öğrenme sıfırlaması + 6 Math sıfırlaması + 8 mücadele reseti,
120 dk) deterministik görünen ama gerçekte **zaman çizelgesi** olan bir betikle
"doğrulanmıştı": sayı 10^interpolasyon ile hedefe oturtuluyor, cezalar/ödüller hiç
çalışmıyordu. Gerçek motorla ölçüm v1 sayılarını çürüttü:

| B | 1e40 | 1e55 | Kapı (C8 yok) |
| --: | --: | --: | --: |
| 2.0 (v1) | 493 dk | 96 saatte yok | 96 saatte yok |
| 2.6 (v1 sonrası) | 122 dk | 785 dk | 96 saatte yok |
| 5.5 | 15 dk | 16 dk | 190–196 dk |

B=5.5 tek başına 190 dk veriyor ama son 33 basamak 81 dk sürüyor (oyun sonu tıkanması).
C8 fiyat tabanı 1.15 ise 1e275 de tek tick te kapıya atlıyor. Çözüm: C8 üretim çarpanı.

---

## Karar

### 1. Tek koşu

Sayı, halkalar, alımlar, B ve mücadele ödülleri 1,79e308 e kadar kalıcıdır.
Mücadeleye giriş/çıkış hiçbir şeyi sıfırlamaz. Kapıda +1 Tanım ve 2. basamak açılır.

### 2. Zincir ve blok çarpanı

- 8 halka, c_i = 25·8^i, g = 1,20, tek havuz (ADR-0079/0081 aynen).
- B = 5.5; her halkada B^floor(bought/10). **Yalnız Fingers taban üretimine ve doğrudan
  katkıya** uygulanır; zincir beslemesine uygulanmaz.
- Max All: en derin halkadan başlayarak blok blok alım.

### 3. Mücadeleler (kalibre)

| # | Halka | Kilit | Hedef | Ceza | Ödül | Süre |
| :- | :--- | --: | --: | :--- | :--- | --: |
| C1 | Fingers | 1e10 | 1e33.242 | Fingers <=10 alım + fiyat 1.22 | Tam El: Fingers ×10, besleme ×1.5 | 21,1 dk |
| C2 | Notch | 1e33.242 | 1e37.376 | fiyat 1.45 | Beşli Çentik: tüm halkalar ×5 | 21,0 dk |
| C3 | Abacus | 1e37.376 | 1e95.157 | doğrudan katkı kapalı + fiyat 1.22 | Basamak Taşması: tüm halkalar ×3 | 21,0 dk |
| C4 | Pencil | 1e95.157 | 1e104.688 | çürüme (tau 20 sn, taban %10) + fiyat 1.22 | Uzun Çarpma: ilk 3 halka ×5 | 22,0 dk |
| C5 | Calculator | 1e104.688 | 1e119.334 | yalnız ilk 5 halka + fiyat 1.22 | Anlık Sonuç: doğrudan ×5, besleme ×1.5 | 21,0 dk |
| C6 | Computer | 1e119.334 | 1e122.271 | besleme /5 + fiyat 1.22 | Overclock: besleme ×1.5 | 21,1 dk |
| C7 | Supercomputer | 1e122.271 | 1e125.573 | yalnız son alınan halka %100 + fiyat 1.22 | Paralel Küme: tüm halkalar ×4 | 22,0 dk |
| C8 | Mathematician | 1e125.573 | 1e128.967 | fiyat 1.35 + besleme /2 | Teorem: üretim ×2 (bitirici) | 22,0 dk |

- Mücadele sırasında **global besleme ×0,2**; açılış ve final itişte tam besleme.
- Hedef: max(tablo hedefi, giriş + 2 basamak) — hedefe yaklaş, sonra gir istismarını kapatır.
- Ödüller sabit ve okunur; B ye/alım sayısına bağlı üs yok (B=5.5 te patlıyordu).

### 4. Ölçülen sonuç

| Politika | Toplam | Son itiş | Mücadele süreleri |
| :--- | --: | --: | --: |
| Max All | **188,8 dk** | 9,2 dk | 21,0–22,0 dk |
| Idle | **189,1 dk** | 9,4 dk | 21,0–22,3 dk |

C8 ×100 alternatifi 181,7 dk / 2,1 dk final veriyor; 8–12 dk final kuralını ihlal ettiği için
reddedildi. C8 ×2, 9,2 dk final ile kurala giriyor.

### 5. Kayıt

SAVE_VERSION = 23; MIN_SUPPORTED_SAVE_VERSION = 20. v22 kayıtları açılır; challenges,
gateReached, tanim alanları varsayılanla gelir.

---

## Sonuçlar

- v1 in 120 dk, 4 öğrenme sıfırlaması, 6 Math sıfırlaması modeli **geçersiz**; D6/D9/D10
  değişti.
- Oyun 190 dk tek koşu; 8 mücadele 21–22 dk lık bloklar; final 9 dk.
- Toplam oyun 135 saat (×1.25) ya da 85 saat (×1.165) — seçim proje sahibinde.
- **Açık:** sahibin boost u alınca sayı sıfırlansın açıklaması bu modelle çelişiyor. Boost
  reseti ayrı bir karar olarak duruyor; seçilirse bu ADR nin kalibrasyonu yenilenir.
- **Açık:** C5 ödülü en zayıf (+7,7%); C3 58 basamaklık sıçrama; final 9 dk da 179 basamak.
  Oyun içi his testi gerekli.
