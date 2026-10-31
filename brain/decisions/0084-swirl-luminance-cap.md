# ADR-0084: Swirl Parlaklık Tavanı — Ortam Sayıyla Yarışmaz

## Durum

**Kabul edildi & uygulandı (2026-10-31).** Sözleşme: [`visual-language.md`](../context/visual-language.md) §2.4.
Üst karar: [ADR-0078](0078-pure-number-visual-language.md) `G2` (swirl kalır, tek ortam) — swirl
korunur, yalnız sesi kısılır.

---

## Bağlam

1. basamak oyun testinde `AlgorithmicSwirl` hero sayıyla yarışıyordu: yüksek kontrastlı, gözle
görülür pikselli ve basamak rengine (neon yeşil) güçlü boyanmış. Parlak girdap kolları zincir
satırlarının (`Notch`, `0 · 0/s`, `10 more Fingers`) arkasından geçerken metin okunmuyordu. Dar
(~370–470 px) ve masaüstü görünümde aynı.

Ölçüm (shader'ın JS portu + GPU `readPixels`, 1. basamak `#98e500`):

| | Eski | Yeni |
| :--- | --: | --: |
| En parlak piksel | `rgb(89,107,55)` · L 0,130 | `rgb(30,36,20)` · L 0,0159 |
| `--pn-text-dim` üzerinde | **1,69:1** | **4,62:1** |
| `--pn-text` | 5,26:1 | 14,41:1 |
| Hero (`#98e500`) | 3,76:1 | 10,30:1 |
| `dim` metnin AA altı kaldığı ekran payı | ~%10 | %0 |

8. basamak (`#5a78ff`) eski en parlak piksel `rgb(74,82,115)` → `dim` 2,22:1; yeni yine 4,62:1.

## Kök nedenler

1. **Işık terimi beyaz ekliyordu.** Balatro shader'ının `light` terimi kol tepelerinde tüm
   kanallara +0,3 ekliyordu; tint ne kadar koyu olursa olsun tepe parlaklığı sınırsızdı.
2. **Renk ölçülemez katmanlanıyordu.** `opacity-65` + `mix-blend-screen` → son piksel shader'da
   değil kompozitte belirleniyordu; tavan yazmak mümkün değildi (ve blend ek kompozit geçişi).
3. **Pikselleşme bilinçli Balatro mirasıydı:** shader'da `floor(gl_FragCoord / pixel_size)`
   (480 filtre) + `image-rendering: pixelated` en yakın komşu büyütme. Ayrıca `max(320, …)` /
   `max(240, …)` tabanı dar ekranda tamponu viewport'tan farklı en-boy oranına zorluyor,
   `object-cover` onu 2× kırpıp büyütüyordu (390 px'te ~2 CSS px'lik bloklar). Saf Sayı'da
   piksel estetiği ölü (`G4` piksel font, ADR-0069 retro/CRT).
4. **Fallback gradyandı:** `bg-radial-at-c from-purple-950/20 …` — §2.1'in yasakladığı gradyan
   dolgu (ve basamak rengi olmayan mor).

## Karar

- Shader son rengi üretir: `--pn-bg + tint × gölge`, gölge ∈ [0,1] (boya ayrışmasından türer,
  beyaz ışık yok). Opaklık/blend kaldırıldı.
- **Tavan: en parlak piksel L ≤ 0,016, tüm ekran.** Tint = basamak rengi doygunluğu %55'e
  çekilmiş; ölçeği JS'te WCAG göreli parlaklığına göre ikiye bölmeyle çözülür → 11 basamağın
  hepsinde aynı garanti. Basamak geçişinde iki tavanlı tint arasındaki lineer karışım da tavanın
  altındadır (sRGB→lineer konveks).
- Kuantizasyon ve `pixelated` kaldırıldı; tampon viewport ile aynı en-boy oranında
  (dengeli 0,5×, yüksek 0,75×, kısa kenar ≥ 200 px), tarayıcı bilinear büyütür.
- Kapalı / azaltılmış hareket / WebGL yok → düz `--pn-bg`.

## Reddedilen seçenekler

- **Satırların arkasına scrim/panel** — kart veya gradyan scrim §2.1/G3 yasağı; `backdrop-blur` yasak.
- **İçerik sütunu dışında daha parlak swirl (uzamsal düşüş)** — denendi: geniş ekranda sütun dışı
  bölgede girdap zaten koyu (ölçülen tepe L 0,008), yani ek kural görünür fark üretmiyordu; ayrıca
  sütunun çerçevesi örtük bir "panel" çizerdi. Tek ekran-geneli tavan daha basit.
- **`--pn-bg` tonunda 1px hairline'la ayrılmış düz içerik bölgesi** — swirl'ü pratikte
  ekranın kenarına iter (dar ekranda tamamen siler); `G2` kararını boşaltır.

## Sonuçlar

- Performans: fill-rate aynı (aynı tampon boyutu, kuantizasyon çıktı), `mix-blend-screen` +
  opaklık kompoziti gitti; tint yalnız basamak değişince hesaplanır.
- `--pn-text-faint` (2,5:1) ve `--pn-locked` (1,6:1) düz zeminde de AA altıdır; swirl tepesinde
  1,9:1 / 1,3:1. Bunlar pasif tonlardır; bilgi taşıyan metin bunlara düşürülmez (§2.4 Sınırlar).
- `style.css`'teki kullanılmayan `pn-swirl-breath` (`filter: brightness(1.32)`) bir yere bağlanırsa
  tavanı deler — bağlanmadan önce bu ADR'ye göre yeniden ayarlanmalı.

## Ek — 2026-10-31 (sahip kararı): tavan yükseltildi, menü zemini eklendi

Oyunda bakıldığında L ≤ 0,016 swirl'ü pratikte görünmez yaptı (ekran düz siyah okunuyordu; `G2`
fiilen boşaldı). Sahip iki değişiklik istedi:

- **Tavan 0,016 → 0,03, doygunluk %55 → %80.** Girdap tepelerinde `--pn-text-dim` 4,6:1 → **3,8:1**,
  `--pn-text` 14,4:1 → 11,8:1 (L* ≈ 13 → 20). AA (4,5:1) yalnız tepelerde, yalnız `dim` küçük
  metinde kaybedilir; menü metni artık swirl üstünde değil (aşağıda), kalan `dim` metin hero
  çevresindeki etiketler ve dock'tur.
- **Menü zemini:** "Reddedilen seçenekler"deki düz içerik bölgesi kısmen geri alındı — yalnız
  `.panel` (≤ 720 px sütun) düz `--pn-bg` + 1px `--pn-hairline` kenar alır. Swirl hero alanında ve
  geniş ekranda sütunun iki yanında yaşar; dar ekranda listenin arkasında kaybolur ama hero
  alanında kalır, bu yüzden `G2` boşalmaz. Ayrı yüzey rengi, gölge, köşe yok → §2.1 kart yasağı
  ihlal edilmez.
