# ADR-0060: Görsel Dil — GIC Kimlik Katmanı ve Faz-temelli Bozulma ("Aç Kumarhane")

- **Tarih:** 2026-10-16
- **Durum:** Kabul edildi (tasarım onaylı) — uygulama bekliyor
- **Kapsam:** Genel görsel dil, renk katmanları, CRT kaplama, olay şöleni (partikül), kolaj substrat, boost motif bandı, faz-temelli bozulma merdiveni
- **Önceller:** ADR-0040 (modern minimalist HUD) → ADR-0049 (Okunaklı Balatro) → ADR-0057 (kart fiziği) → ADR-0058 (Görsel Dil Yayılımı sözleşmesi). Bu ADR üçünün ÜSTÜNE yeni katmandır; önceki kurallar geçerli kalır.
- **Bağlayıcı kopya:** `brain/context/visual-language.md` (tek gerçek özet — her agent okur)

---

## 1. Bağlam

Kullanıcı oyunun görsel dilini üç referans arasında uzlaşmayla kurmak istedi:
Gekidan Inu Curry (Madoka cadı labirentleri, kâğıt kolaj + stop-motion, creepy-cute
masallar), Balatro (CRT siyah-kırmızı kumarhane, ölçülmüş juice) ve Vampire Survivors
(tutarlı fidelity + hipnotik olay overload'u). Detaylı web araştırması yapıldı; uzlaşma
aşağıdaki dağılımı verdi. Kullanıcının kritik iki iltifatı:

1. Boost/olay anında yanlarda GIC tarzı motifler ve glifler görünmeli (asset kullanılabilir).
2. Görsel bozulma BOYUTA değil FAZA bağlanmalı: her ilerleyen fazda oyun kâğıt-kolaj
   labirentine doğru kademeli "bozulur" (GIC estetiği ödül/ileri-gidiş hissi olarak işler).

## 2. Karar

### 2.1 Sentez Akıları
- **Zemin (Balatro):** ink black (#0a0608'a ısınan zemin) + sıcak kırmızı vinyet + CRT
  scanline kaplaması (her zaman hafif açık — Balatro kurgusu kabaca "scanline dünyanın
  parçasıdır"). Font tarafında m6x11 (Daniel Linssen, ücretsiz; lisans kontrol edilerek
  yüklenir) display rolü için değerlendirilir; mevcut Chakra Petch sayaç kontratı yerinde kalır.
- **Şölen (VS):** büyük olaylarda (Süpernova 7x, Kütle Patlaması 777x, Hawking, ilk Big
  Crunch) canvas tabanlı partikül şöleni + yüzen kütle sayıları + shake (ADR-0044
  containment korunur). Zemin desatürasyonu geçici.
- **Kimlik (GIC):** kolaj substrat katmanı — damalı şerit, tape, yırtık kâğıt köşeleri,
  el yazısı annotasyonlar, motif sistemi (diş/gül/tekerlek/göz/zincir) ve creepy-cute
  Wrinkler kaplaması. Her faz, labirent teması mantığında yeni motif grubu ekler.

### 2.2 Faz-temelli Bozulma Merdiveni (K0–K5)
Bozulma, boyut açılmasına değil prestij fazlarına bağlanır:

| Seviye | Tetik | Durum |
| :--- | :--- | :--- |
| K0 | Faz 0 ilk yarısı (D5 kilitli) | Steril: CRT ~%10, substrat yok |
| K1 | Planck Yırtılması (D5 açılır) | CRT ~%35 + yırtık-kâğıt vinyet başlangıcı |
| K2 | D6-D8 (kozmik yutuş) | Substrat ~%25, kenar motif bantları |
| K3 | Faz 1 (Big Crunch sonrası SP çağrısı) | El yazısı notlar, damalı vidaları, bölgesel glitch |
| K4 | Faz 2 (`nightWatchUnlocked`) | Damalı zemin fikri tam sürer, motif bandı sürekli |
| K5 | Faz 3 (içerik yok) | Tam labirent substrat |

**Okunabilirlik kanonu (zinciri kırılmaz):** bozulma yalnız ambient/dekoratif katmanda
yaşar; sayılar, etiketler, tabular-nums, 3-state ramp, rezerve renk anlamları ve
tooltip verileri asla bozulmaz. ADR-0049'un "zemin sakin, keyif anları vurucu" ölçüsü ve
"aynı anda en fazla 1 ambient + 1 aksiyon efektli" doz kuralı korunur; CRT, ADR-0058'in
motion kapısına (full/reduced/off) tam bağlıdır.

### 2.3 Renk Katmanı Ekleri (rezerve renkler korunur)
- `--feast` #ff3355: YENİ rezerve anlam — oburluk/olay enerjisi (zemin vinyeti, büyük
  patlama, boost şöleni). `rose` ikaz işareti olarak dokunulmaz, karışmaz.
- `--bicycle` #c40f2e: derin kırmızı yüzey rengi (durum anlatmayan dekoratif ağırlık).
- amber cyan sonuçları gibi mevcut semantik kayıtları sabit; zemin `#0a0608`,
  amber tonu `#ffbe45`'a ısınır.

### 2.4 Motif Bandı ve Asset Slot
- src/assets/motifs/ + src/game/motifs.ts: merkezi slot modülü. İlk dalga agent üretimi
  SVG motifler; dosya adı = motif adı kontratıyla ileride elle çizilen asset'lerin
  birebir değiştirilebilirliği garanti edilir.
- Boost duyuru kartı + kenarlardan süzülen motif bandı; rezonans kombosunda yoğunluk
  katlanır (Cookie Clicker golden-cookie kombo hissi, VS şöleni ile birleşir).

### 2.5 Türetme
`corruptionLevel` (K0..K5) kayıt formatına yeni alan eklemeden mevcut durumdan türetilir
(Planck/D5 eşikleri, prestij sayısı, nightWatchUnlocked). Planlanan modül:
`src/game/corruption.ts`. App root `data-corruption` mührü taşır; CSS bu mührü tüketir.

## 3. Sonuçlar
- Görsel işlerde bağlayıcı belge: brain/context/visual-language.md; AGENTS.md hydration
  listesine eklendi (her agent görsel işe başlarken okur).
- Uygulama dalgaları todo.md'ye işlendi: Faz A (zemin+CRT) → B (corruption altyapısı) →
  C (GIC motif kütüphanesi) → D (VS partikül şöleni) → E (retrofit + WCAG + kayıt).
- Uygulama her faz sonunda `npm run build`/`npm test` kanıtı ve conventional commit ile kapanır.
