# AD fiyatlandırması ve zincir matematiği (2026-10-23)

İstek: *"Fingers her saniye 1 üretmeli, diğer halkalar da kendisinin altındakinden her saniye
bir üretmeli. Bir de satın alımda 10 tane alınca fiyat artsın, Antimatter Dimensions'daki gibi
olsun — onu araştır."*

Bu belge üç şeyi yapar: (1) AD'nin gerçek fiyat tablosunu kaydeder, (2) isteğin matematiksel
sonucunu ölçer, (3) seçenekleri sayılarıyla ortaya koyar. **Hiçbir sabit değiştirilmedi.**

---

## 1. Antimatter Dimensions gerçekte nasıl fiyatlıyor

Kaynak: [AD Wiki — Dimensions](https://antimatter-dimensions.fandom.com/wiki/Dimensions).

| # | Baz maliyet (AM) | **10'luk çarpan** | Birim başına çarpan |
| :-- | --: | --: | --: |
| 1 | 10 | 1e3 | ×2,00 |
| 2 | 100 | 1e4 | ×2,51 |
| 3 | 1e4 | 1e5 | ×3,16 |
| 4 | 1e6 | 1e6 | ×3,98 |
| 5 | 1e9 | 1e8 | ×6,31 |
| 6 | 1e13 | 1e10 | ×10,0 |
| 7 | 1e18 | 1e12 | ×15,8 |
| 8 | 1e24 | 1e15 | ×31,6 |

Üç kritik gözlem:

1. **Üretim 1/sn.** 1. boyut saniyede 1 antimadde üretir; her boyut kendinden bir öncekini
   saniyede 1 adet üretir. Yani istenen "her saniye 1" AD'nin tam kuralıdır.
2. **Fiyat 10'lu blokla ölçülür.** AD'de "birim başına çarpan" diye bir şey yok; tablo
   "10 alımda fiyat kaç katına çıkar" diye yazılır. Birim çarpanı bunun 10. köküdür
   (`1e3^(1/10) = 2,00`). Oyuncu bu yüzden 10'lu alır: **Buy 10 = 10 birimin geometrik toplamı**,
   yani ≈ (10'luk çarpan) × tek birim fiyatı. AD arayüzünde ×1 / ×10 / ×100 / Max düğmeleri var.
3. **AD'nin freni: üst boyutların fiyatı daha dik artıyor.** 1. boyut her 10 alımda ×1 000,
   8. boyut ×1e15. Zincir aşağıdan yukarı beslendiği için üst halkaların sayısı patlamaya
   eğilimlidir; AD bunu üst halkaların fiyatını dikleştirerek dizginler.

**AD'nin sayıları bize olduğu gibi taşınmıyor.** Ölçüm: AD tablosu birebir alındığında
oyun 240 dakikada `1e19`'da tıkanıyor (7. ve 8. halka hiç açılmıyor). Sebep: AD o tabloyu
*Dimension Boost* (her boyuta kalıcı ×2, boyut sayıları **sıfırlanmaz**) ve *Tickspeed* ile
birlikte dengeliyor. Bizde boost halkaları 1 birime indiriyor (D3) — aynı tablo çalışmıyor.

---

## 2. İsteğin matematiği: zincir 7 katlı bir integraldir

Zincir modeli (halka 0 = Fingers):

```
dA[0]/dt = A[1] · p₁        (halka 2 → halka 1)
dA[i]/dt = A[i+1] · p[i+1]  (i = 1..6)
dN/dt    = A[0] · p₀ · M    (halka 1 → sayı)
```

Ardışık integraller zinciri `t⁷` verir; boost çarpanı `M` de sayıya girdiği için:

```
N(t) ≈ M · (∏p) · t⁸ / 8!
```

**Tek bir çarpım her şeyi belirliyor: ∏p.** Mevcut oyun `p = 0,08` (sekiz halka):
`∏p = 0,08⁸ = 1,7e-9` — iki saatlik koşuyu veren sayı tam olarak budur, keyfî değil.

İstenen `p = 1` ise `∏p = 1`, yani zincir **`(1/0,08)⁷ ≈ 48 000 000` kat** daha güçlü.
"Saniyede 1" 12,5 kat değil, 48 milyon kat hızlı demek. Fiyat merdiveni bu farkı ancak
halka fiyat oranını 3,2'den ~80'e çıkararak emebiliyor — ve o zaman da sayaçlar patlıyor.

### Ölçüm (gerçek motorun aynası, K5 oyuncu politikası)

Harness mevcut sabitleri **120,6 dk / 23 boost** ile yeniden üretiyor (K5 testi: 122 dk / 23),
yani karşılaştırma kalibre edilmiş. `×N` = halkalar arası fiyat oranı; `p` = üretim/sn.

| Varyant | Kapı | Boost | 8. halka | 10. dk parmak sayısı |
| :--- | --: | --: | --: | --: |
| **Bugünkü** p=0,08 · ×3,2 | 120,6 dk | 23 | 15,1 dk | 1 166 |
| AD birebir p=1 · ×20 | **43,3 dk** | 19 | 9,0 dk | 1,3e10 |
| p=1 · ×40 | 76,3 dk | 18 | 16,9 dk | 1,5e6 |
| p=1 · ×60 | 104,5 dk | 17 | 24,6 dk | 6,9e4 |
| Parmak 1/sn, zincir 0,12 · ×8 | 118,0 dk | 20 | 13,0 dk | 8,1e4 |
| Parmak 1/sn, zincir 0,08 · ×6 | 127,9 dk | 21 | 12,2 dk | 3,6e4 |

`×20` satırı dikkate değer: `log(20)/log(1,4) = 9,4` → **halka başına ~10 birim**, yani
"Buy 10" tam AD'deki ritmi yakalıyor. Ama koşu 43 dakikaya iniyor ve 10. dakikada
1,3e10 parmak oluyor.

### Neden sayaçlar patlıyor

`p = 1` iken `A[0] ≈ A[1] · t`: 30. dakikada çentik sayısı 1e7 ise parmak sayısı 1e10 olur.
Bu bir hata değil, zincirin doğası. AD'de aynı şey olur (milyonlarca 1. boyut) ve AD bunu
*sorun etmez* çünkü ekranın kahramanı antimadde, boyut sayısı değil. Bizde ChainList
halka sayılarını gösteriyor — "Fingers 1,3e10" okunur ama `Saf Sayı` estetiğinde gürültü.

---

## 3. Üç yol (hepsi ölçülmüş)

### A — "Bir parmak = saniyede 1 sayı" (kimlik korunur, önerilen)
```
p    = [1, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]
c    = 25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 · 52 428 800   (×8)
```
Kapı **118,0 dk** · 20 boost · 8. halka 13,0 dk. `+1` gerçekten 1'dir; bir parmak gerçekten
saniyede 1 sayı üretir; bir çentik 8 saniyede bir parmak üretir ("her 8 saniyede bir parmak").
Fiyatlar 8'in kuvvetleri olduğu için okunur. Halka başına ~6 birim → 10'lu blok nadiren
alınabilir (blok ancak halkanın sonunda mantıklı).

### B — AD birebir ("Buy 10" ritmi, kısa koşu)
```
p = 1 (sekiz halka)   ·   c = 25 · 20^i   ·   10'lu blok fiyatlaması
```
Kapı **43,3 dk** · 19 boost · halka başına ~9,4 birim → **Buy 10 tam oturuyor**.
Bedeli: 10. dakikada 1,3e10 parmak; ilk koşu 43 dakika (11 basamaklık yayda ilk basamak
için kısa ama öğretici basamak olarak savunulabilir).

### C — Ara yol: parmak 1/sn, zincir 0,08, ×6 merdiven
Kapı **127,9 dk** · 21 boost · halka başına 5,1 birim. Buy 10 pratikte hiç kullanılmaz.

---

## 4. Karar bekleyen tek şey

Üçü de aynı motorla, aynı politikayla, aynı harness'la ölçüldü. Fark oyunun kimliğinde:

- **A** → "bir parmak saniyede bir sayı" kimliği + 2 saat + makul sayaçlar. Buy 10 süs kalır.
- **B** → AD'nin tam ritmi (10'lu bloklar) + 43 dakika + astronomik sayaçlar.
- **C** → 2 saat + 1/sn kimliği, ama ne Buy 10 ne de dik bir merdiven.

Hiçbiri "1/sn + 2 saat + 10'lu blok + küçük sayaçlar" dördünü birden veremiyor;
`∏p` kuralı buna izin vermiyor. Bu bir zevk tercihi değil, `t⁸` mertebesinin sonucu.

---

## 5. Ölçüm dosyaları

`brain/scratchpad/balance-2026-10-23/` altında: `ad-chain.mjs` (blok fiyatlamalı, buy-max
politikalı ilk deneme), `k5-sim.mjs` (K5 politikasının aynası — kalibrasyon: 120,6 dk),
`k5-run*.mjs` (yukarıdaki tabloların tamamı), `ad-run*.mjs` (AD tablosu ve boost üssü
taraması).

---

## 6. EK ÖLÇÜM — blok ritmi A'ya bedava ekleniyor (2026-10-23, aynı gün)

"10'lu blok mu, A mı" sorusu yanlış bir ikilem çıktı: **halka başına kaç birim alındığı**
merdiven oranı ile birim başına büyümenin oranıdır, kapı süresi ise bunlardan neredeyse
bağımsız. A tabanında (`p = [1, 0,12×7]`, merdiven ×8) yalnız büyümeyi düşürmek yeterli:

| Birim başına büyüme | Halka başına birim | Kapı | Boost | 8. halka | 10. dk parmak |
| --: | --: | --: | --: | --: | --: |
| 1,20 | **11,4** | 117,8 dk | 20 | 12,7 dk | 94 455 |
| 1,25 | 9,3 | 119,9 dk | 20 | 12,8 dk | 90 257 |
| 1,30 | 7,9 | 118,1 dk | 20 | 12,9 dk | 86 830 |
| 1,40 | 6,2 | 118,0 dk | 20 | 13,0 dk | 80 919 |

Yani `g = 1,20` seçildiğinde bir halka tam **11,4 birim** alıyor: **10'lu blok = bir halka**.
"Buy 10" AD'deki ritmi birebir yakalıyor, kilit eşiği (10 birim) zaten tek blok, kapı süresi
ve sayaç mertebesi A'nınkiyle aynı kalıyor. B'ye (p=1) göre parmak sayısı 10. dakikada
**1,3e10 yerine 9,4e4** — beş mertebe daha okunur.

### Önerilen sabitler (A+)
```
p        = [1, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]      # parmak 1 sayı/sn, zincir 0.12/sn
c        = 25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 · 52 428 800   # ×8
growth   = 1.20        # halka başına 11,4 birim → 10'lu blok = bir halka
blok     = 10 birim, fiyat = c_i · g^bought · (g^10 − 1)/(g − 1)   # AD formülü
unlock   = 10 birim (tek blok) — mevcut mandal aynen kalır
```
Ölçüm: **kapı 117,8 dk · 20 boost · 8. halka 12,7 dk**.

Not: birim başına büyüme 1,4 → 1,2 düşünce tek birim fiyatları da düşer (25 → 25·1,2^b),
yani ilk parmak hâlâ 25 ve açılış 15 tık — `P1` kararı etkilenmiyor.
