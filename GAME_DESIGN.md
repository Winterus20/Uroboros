# HOLD THAT NUMBER — Oyun Tasarım Dokümanı (GDD)

> **Sürüm:** 0.40.0 · **Tarih:** 2026-10-31 · **Durum:** 1. basamak **boost + sıfırlamalı mücadele döngüsü** (ADR-0086) oynanabilir; 2–11 tasarlanmadı
> **Bu belge 2026-10-23'te BAŞTAN YAZILDI.** Eski "Kozmik Oburluk / UROBOROS" içeriği
> (kütle ekonomisi, D1–D8 boyutları, Lab, Crisis, Neural, Time Clock, Colony, Singularity,
> başarımlar, meydan okumalar) **tamamen kaldırıldı** — kod da, bu belge de.
>
> **Bağlayıcı kaynaklar:**
> [`brain/research/theme-pivot-grilling-2026-10-23.md`](brain/research/theme-pivot-grilling-2026-10-23.md) (50 karar) ·
> [`brain/context/narrative-voice.md`](brain/context/narrative-voice.md) (ses) ·
> [`brain/context/visual-language.md`](brain/context/visual-language.md) (görsel dil) ·
> ADR-0077 (pivot) · ADR-0078 (görsel dil) · ADR-0079 (sayı ekonomisi dikey dilimi) · ADR-0082 (zincir-only) · **ADR-0086 (boost + sıfırlamalı koşu — güncel model)**
>
> **Güncel model (ADR-0086, 2026-10-31):** Boost güç kaynağıdır ve mücadelelerden **önce** açılır.
> Mücadele girişi ve boost alımı sayıyı (`10`) ve zinciri (tüm halkalar 0, kilitler yalnız
> Fingers) sıfırlar; **boost sayacı, tamamlanan mücadeleler ve ödülleri kalır**. Boost sayacı
> yalnız `1,79e308` kapısında/prestijde sıfırlanır. Her mücadele global zincir beslemesini
> **×0,2** yapar. 8 halka + blok çarpanı `B = 5.3`; mücadele kilidi **`bestNumber`** (ömür boyu
> zirve) **ve en az 4 boost** ile ölçülür (ADR-0087). **Kalibre edildi (2026-10-31, gerçek motor):**
> intended **181,0 dk** (11 boost, 8/8); boost-only 672,6 dk (3,72×); base 1031,9 dk (5,70×).
> Hedefler log10 10,5 → 78,0. Bağlayıcı özet §8'dedir.
>
> **Arşiv:** ADR-0082 (2026-10-25) mini boost'u ve `Tanım` yükseltmelerini kaldırmıştı; ADR-0086
> boost'u sıfırlamalı bir güç kaynağı olarak geri getirdi. Aşağıdaki §5.4–§5.6, §6 ve §11
> **tasarım arşividir** — eski formüller (`Birikim`, `log10(1+A)`, `(zirve/başlangıç)^0,2`)
> uygulanmıyor.

---

## 1. Tek cümle

Tek bir sayı var. Oyuncu onu büyütür, 11 basamaklık bir notasyon merdiveninde yukarı taşır ve
merdivenin sonunda (`LNGN`) oyun biter.

**Tür:** sayı odaklı incremental / idle — *Antimatter Dimensions* zinciri; her basamak kendi
sıfırlama döngüsüyle oynanır, kapıda prestij (ADR-0086). **Süre:** 1. basamak **181 dk**;
11 basamak projeksiyonu **79,6 sa** (×1,165) ve 85 saat hedefi için eğri **×1,176**; kuyruk yok,
NG+ yok (`S4`).

---

## 2. Tasarım tezi

1. **Ekranın tek kahramanı sayıdır** (`S1`, ADR-0078 `G1`). Sayı ayrı bir kutuya veya para
   birimine taşınmaz; yalnız boost/mücadele sıfırması onu `10`a indirir (ADR-0086).
2. **Cüzdan sayının kendisidir** (`E1`). Alım sayıyı düşürür; kilitler **koşu içinde**
   mandallıdır (`S3`), boost veya mücadele sıfırması zinciri yeniden kurar (ADR-0086).
3. **Jeneratörler zincirdir** (`E3`, `E6`). Halka *n+1* halka *n*'i üretir; halka 1 sayıyı
   üretir. `+1` zincirin köküne dokunur — 85. saatte de.
4. **Ses = oyunun kendisi** (`V1`), sessiz meta (`V2`), gerçek "sen" (`V3`). Mizah dünyada
   değil, oyun ile oyuncu arasındaki ilişkide.
5. **Görsel dil "Laboratuvar"** (ADR-0085): sakin ölçüm aleti kabuğu, vurgu = basamak rengi.
   Kart, blur, yuvarlak köşe, gölge, neon süs yok.

---

## 3. 11 basamak (notasyon merdiveni)

Süre eğrisi **×1,176** geometrik artış; 1. basamak **181 dk** (ADR-0086 kalibrasyonu,
2026-10-31). 181 dk × 26,4 = **79,6 sa** (×1,165 eğrisi); 85 saat hedefi için eğri **×1,176**'ya
çekildi → 181 dk × 28,1 ≈ **84,8 sa**. Eski 190 dk / ×1,165 tablosu tarihsel referanstır ve
kullanılmaz.

| # | Basamak adı (kod: `rungs.ts`) | Gösterim | Süre | Kümülatif |
| --: | :--- | :--- | ---: | ---: |
| 1 | I thought it was a wall | `1.79e308` | 3,02 sa | 3,02 |
| 2 | The end of the shelf | `1e(9e15)` | 3,55 sa | 6,56 |
| 3 | The tower is done | `10^^1.79e308` | 4,17 sa | 10,74 |
| 4 | The arrows are done | `6 arrows` (ekranda `↑⁶`) | 4,91 sa | 15,64 |
| 5 | It did not write it. It showed it. | `G` | 5,77 sa | 21,41 |
| 6 | We do not know | `TREE(3)` | 6,79 sa | 28,20 |
| 7 | The room | `SSCG(3)` | 7,98 sa | 36,18 |
| 8 | *Untitled* (geçici ad) | `Rayo` | 9,38 sa | 45,56 |
| 9 | The door | `Fish 7` | 11,04 sa | 56,60 |
| 10 | Does it count? | `BIG FOOT` | 12,98 sa | 69,57 |
| 11 | *Last* (geçici ad — final sahnesi `A5`) | `LNGN` | 15,26 sa | **84,84** |

**Dağılım:** 1–5 ≈ 21,4 sa (%25) · 6–11 ≈ 63,4 sa (%75). Oran v1 ile aynıdır; taban 181 dakika
ve eğri ×1,176 ile 85 saat hedefi korunur.

> **Kalibrasyon (ADR-0086, 2026-10-31):** 1. basamak **181 dk**; 181 × 26,4 = 79,6 sa (×1,165).
> 85 saat hedefi için eğri ×1,176 (84,8 sa). Eski 190 dk tabanlı tablo geçersizdir.

**Kadran (basamak 5+):** `rank` (ok seviyesi) + `mag ∈ [2.00, 10.00)`. `mag` asla büyümez,
her hücrede döner; hücreler `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a` özdeşliğiyle kusursuz birleşir (`T2`).
Kadran bölgesi 7 çapa × 6 hücre = **42 hücre · 336 mag adımı**; 69,2 saat ÷ 42 ≈ **1 sa 39 dk/hücre**.

**Motorlar (`T1`):** 1–3 `break_eternity` gerçek aritmetik · 4 için `OmegaNum` adaptörü
(henüz yazılmadı) · 5–11 kadran.

---

## 4. 1. basamak — 8 halkalı zincir (`E6`)

Ekranda liste **yukarıdan aşağı** `Fingers → … → Mathematician` okunur; üretim **aşağıdan
yukarı** akar. Yani halka 8 (en pahalı) halka 7'yi besler; **halka 1 sayının kendisini üretir**.

**Halka 2–8 ayrıca sayıya doğrudan yazar** (2026-10-23): bir altındakine verdiği miktarı
(`0,11/sn`) sayının kendisine de ekler (`RING_DIRECT_SHARE = 1`). Böylece satın alınan her halka
`/s` okumasını **anında** büyütür — zincirin integralini beklemez. Halka 1 bu katkıyı almaz:
o zaten sayının kendisidir, "1 parmak = 1 sayı/sn" bozulmaz.

| # | Halka | Taban maliyet | Taban üretim | 10 birimlik blok (kilit) | Geri ödeme | İlk açılış |
| --: | :--- | ---: | ---: | ---: | ---: | ---: |
| 1 | **Fingers** | **25** | **1 /sn** (sayı) | 649 | **25 sn** | 0,0 dk |
| 2 | Notch | **200** | 0,11 /sn | 5 192 | 73 sn | 1,6 dk |
| 3 | Abacus | **1 600** | 0,11 /sn | 41 534 | 73 sn | 4,2 dk |
| 4 | Pencil | **12 800** | 0,11 /sn | 332 271 | 73 sn | 6,8 dk |
| 5 | Calculator | **102 400** | 0,11 /sn | 2 658 169 | 73 sn | 9,4 dk |
| 6 | Computer | **819 200** | 0,11 /sn | 21 265 352 | 73 sn | 12,0 dk |
| 7 | Supercomputer | **6 553 600** | 0,11 /sn | 170 122 819 | 73 sn | 14,5 dk |
| 8 | **Mathematician** | **52 428 800** | 0,11 /sn | 1 360 982 553 | 73 sn | **17,1 dk** |

> **v3 notu (ADR-0086):** bu tablo zincir-only dönemin ölçümüdür. Rung 1 v3 `B = 5.3` + boost +
> sıfırlamalı mücadele ile çalışır; halka açılışları ve süreler değişti. Güncel kalibrasyon
> §7'de ve ADR-0086'dadır.

Blok sütunu, o halkadan **ilk 10 birimin** toplam fiyatıdır: `c_i · (g^10 − 1)/(g − 1)`.

**Fiyat kuralı (tek cümle):** halka 1 saniyede **1 sayı** üretir (`NUMBER_RATE = 1`); her üst halka
altındakinden saniyede **0,11 birim** üretir (`CHAIN_RATE = 0,11`) ve bir öncekinin **8 katı**
eder → birim fiyatı **1,20** ile artar, halka başına `log(8)/log(1,20) = 11,4` birim alınır; yani
**10'lu blok tam olarak bir halkadır** ve geri ödeme `c_i/(p_i·c_{i-1}) = 8/0,11 ≈ 73 sn` olur
(halka 1: **25 sn**).

**Neden zincir 0,11?** Zincir 7 katlı bir integraldir: `N(t) ≈ M·(∏p)·t⁸/8!`. Sekiz halka da
1/sn üretseydi `∏p = 1` olur ve zincir bugünkünün `(1/0,11)⁷ ≈ 5,1e6` katı güçlenirdi; ölçümde
kapı **43 dakikaya** iniyor ve 10. dakikada **1,3e10** parmak oluyor. `CHAIN_RATE = 0,11` iki
saatlik koşuyu koruyan sayıdır.

**"10'lu blok" bir fiyat sistemi değil, bir ritimdir.** Merdiven ×8 sabitken birim büyümesini
**1,4 → 1,20** yapmak halka başına birim sayısını **6,2 → 11,4**'e çıkarır; kapı süresi değişmez
(ölçüldü), böylece tek blok tam bir halkayı satın alır ve kilit eşiği (10 birim) tek bloktur.
Halka 2–8 aynı hızda ürettiği için merdiven onlar için bir *hız* değil, bir *değer* merdivenidir;
halka 1'in 1/sn'si `+1`in gerçek bir birim olmasını sağlar (`S9`). Tam çalışma:
[`brain/research/ring-pricing-2026-10-23.md`](brain/research/ring-pricing-2026-10-23.md) ·
[`brain/research/ad-pricing-and-chain-math-2026-10-23.md`](brain/research/ad-pricing-and-chain-math-2026-10-23.md) §6.

**Tek kaynak:** [`src/game/number/tuning.ts`](src/game/number/tuning.ts). Buradaki sayılar
**ölçümle** kilitlendi (bkz. §7); başka bir yerde tekrar yazılmaz.

- **Alım:** sınırsız, tek havuz (`E2`, `E10`). Birim fiyatı her alımda **×1,20**; blok
  fiyatı AD'nin "Buy 10" formülüyle `c_i · g^b · (g^10 − 1)/(g − 1)`.
- **Kilit:** bir halkadan **10 birim** alınınca sonraki halka açılır (`E11`) — 10 birim **tek
  blok**, yani bloğu tamamlayan oyuncu kilidi kendiliğinden açar; kilit **koşu içinde
  mandallıdır**. Boost alımı veya mücadele girişi zinciri sıfırlayınca kilitler de sıfırlanır,
  yalnız Fingers açık kalır (ADR-0086).
- **`+1`:** gerçekten 1 ekler, hiçbir çarpan uygulanmaz (`S9`). Üst basamaklarda gösterim
  çözünürlüğünün altında kaldığı için ekranda hiçbir şey değişmez — bu **yuvarlama**, yalan değil.

### Mücadele koşuları (ADR-0086/0087, kalibre 2026-10-31)

Sıra zorunludur; yalnız sıradaki mücadeleye girilebilir. Kilit eşiği **önceki hedef**tir
(C1 = 10), hedefler **mutlak** log10 değerleridir ve `bestNumber` ile ölçülür. Ek olarak
**`boostCount >= 4`** gerekir (ADR-0087): 4 boost olmadan C1'e girilemez; boost'lar mücadelede
kalıcı olduğu için kapı C1 sonrası açık kalır. Giriş sayıyı `10`a, zinciri 0'a indirir; boost
sayacı ve tamamlanmış ödüller kalır. Her mücadelede global besleme `×0,2`; fiyat büyümesi
C1–C8 boyunca **1,22**.

| # | Kilit (log10) | Hedef (log10) | Hedef | Koşu |
| --: | --: | --: | :--- | --: |
| C1 | 10 | 10,5 | `1e10.5` | 17,1 dk |
| C2 | 10,5 | 20,1 | `1e20.1` | 7,7 dk |
| C3 | 20,1 | 29,8 | `1e29.8` | 8,0 dk |
| C4 | 29,8 | 39,4 | `1e39.4` | 8,8 dk |
| C5 | 39,4 | 49,1 | `1e49.1` | 9,3 dk |
| C6 | 49,1 | 58,7 | `1e58.7` | 18,8 dk |
| C7 | 58,7 | 68,4 | `1e68.4` | 10,5 dk |
| C8 | 68,4 | 78,0 | `1e78.0` | 14,2 dk |

Intended toplam **181,0 dk** (11 boost, 8/8); ilk mücadele ~32 dk boost farmı + 17,1 dk C1;
final itiş 52,7 dk, boost farmı 9.–114. dk arasında. Boost-only 672,6 dk (3,72×) · base 1031,9 dk
(5,70×). **Boost kapısı ölçümü:** 3 → 184,2 dk (8/8) · **4 → 181,0 dk (8/8)** · 5 → 174,5 dk
(7/8) · 6 → 4/8. C1 0 boostta 36 dk sürerdi; artık **erişilemez**. Challenges-only yolu (289,6 dk)
tasarım gereği kaldırıldı.

---

## 5. Ekonomi formülleri

### 5.1 Maliyet

```
maliyet_i(b)  = c_i · g^b                          c_i = halka taban maliyeti, g = 1,20
blok_i(b, 10) = c_i · g^b · (g^10 − 1)/(g − 1)     AD'nin "Buy 10" formülü
```

`b` = o halkadan **bu koşuda** alınan birim sayısı. Boost/prestij `b`'yi sıfırlar.

### 5.2 Üretim

```
sayı/sn    = (A₁·p₁·B^⌊b₁/10⌋ + Σ_{i≥2} A_i·d_i·B^⌊b_i/10⌋) · R · M^n
halka_i/sn = A_{i+1}·p_{i+1} · F                         (i = 1..6)
halka_8/sn = 0                                            (zincirin tepesi)

B = 5.3 (sabit blok tabanı)   R = mücadele ödül çarpanları (kalıcı)
F = besleme çarpanı           F = 0.2 iken mücadele aktif; açılış/finalde 1
M = 1.8 (boost çarpanı)       n = boostCount (kapı/prestijde 0)
```

`A_i` = halkadaki birim sayısı, `b_i` = bu koşuda alınan birim, `p_i` = taban üretim
(`p_1 = 1`, `p_i = 0,11` için `i ≥ 2`), `d_i = p_i · RING_DIRECT_SHARE` = sayıya **doğrudan**
katkı (`0,11/sn`). Zincir satırındaki `+x/s` okuması bu katkıdır.

**`D1` (ADR-0083/0086):** blok çarpanı ve boost çarpanı **yalnız sayı üretimine** uygulanır
(Fingers tabanı + doğrudan katkı), zincir beslemesine **uygulanmaz**. Aksi hâlde `N ∝ B⁸`
(veya `M^8`) olur ve sistem patlar. Blok çarpanı `B^⌊b_i/10⌋`; 10 alımda bir kademe, koşu
sıfırlanana kadar kalıcı.

### 5.3 Boost — güç kaynağı (ADR-0086)

```
koşul       : son halka (Mathematician) açık ve bu koşuda alınan birim ≥ boostRequirement(n)
requirement : ceil(50 · 1,35^n)                          (kalibre 2026-10-31)
fiyat       : blok_fiyatı(son halka, 10) · 1,5^n          (sayıdan ödenir)
çarpan      : 1,8^n — yalnız sayı üretimine, zincir beslemesine değil
etki        : boostCount += 1; sayı = 10; tüm halkalar 0; kilitler yalnız Fingers açık
kalıcılık   : boostCount mücadele girişinde KALIR; kapı/prestijde 0'a döner
```

Boost **mücadelelerden önce** açılır; açmak için mücadele tamamlamak gerekmez ve boost
mücadele girişinde korunur. Aktif bir mücadele sırasında boost **alınamaz** (koşu ortasında
sıfırlama olmaz). Boost-only yol (hiç mücadele oynamadan `1,79e308`) kasten çok yavaştır:
boost sayı üretimini büyütür ama zincir beslemesini büyütmediği için her sıfırlama zinciri
yeniden kurmayı gerektirir. Hedef yol **boost + mücadele**dir; sabitler 2026-10-31'de
kilitlendi (ADR-0086): 11 boost ile intended **181,0 dk**, boost-only **672,6 dk** (3,72×).

### 5.4 `Birikim` — kapı aşımı verim cezası (`E7`) — **ARŞİV, build'de yok**

```
A = sayı / kapı(1,79e308)
N ≤ kapı  → verim = 1
N > kapı  → verim = 0,9^log10(A)
```

Kapı aşıldıktan sonra beklemek ödülü büyütür, üretimi yavaşlatır: "şimdi mi, biraz daha mı?"
kararı (`E4`). Ceza **yalnız sayı üretimine** uygulanır (`D1` ile aynı gerekçe).

### 5.5 Mini boost (`E12`–`E14`) — **ARŞİV, build'de yok**

```
koşul  : halka 8 (Mathematician) bu koşuda en az 1 kez alınmış
kazanç : (zirve / başlangıç)^0,2        → boostMult *= kazanç (kalıcı, basamak içi)
sıfırla: sayı = başlangıç(10), her halka 1 birim, kilitler AÇIK kalır
Tanım  : VERMEZ
```

**`D3`:** halkalar 0'a değil **1 birime** iner; 0'a inerse zincir ölür ve oyuncu her döngü
8 halkayı yeniden kurmak zorunda kalır (ölçüldü: ~250 alım). **`D4`** (oyuncu politikası):
boost, zirve bir önceki zirveyi geri kazanınca yapılır; "alır almaz boost" döngüyü 2 saniyeye indirir.

### 5.6 Kapı ve prestij — **ARŞİV, build'de yok**

```
kapı      : sayı ≥ 1,79e308  (aynı zamanda JS float tavanı)
Tanım     : log10(1 + A),  A = sayı/kapı      → kapıda A=1 → 0,30 Tanım
prestij   : Tanım kazanılır; sayı başlangıca döner; boostMult sıfırlanır
```

Prestij **tek ödül kapısıdır**; mini boost `Tanım` vermez (`E12`).

---

## 6. `Tanım` yükseltmeleri (prestijin harcama yeri) — **ARŞİV, build'de yok**

Tek kaynak: [`src/game/number/upgrades.ts`](src/game/number/upgrades.ts).

| # | Ad (`id`) | Maks | Maliyet (seviye `l`) | Etki |
| :--- | :--- | --: | :--- | :--- |
| 1 | **Start higher** (`start`) | 6 | `0,5 · 2^l` | başlangıç sayısı `10^(1+l)` → 10 … **1e7** |
| 2 | **Chain output** (`chain`) | 10 | `1 · 1,8^l` | zincir üretimi `×(1 + 0,25·l)` → 1,00 … **3,50** |
| 3 | **Deeper breath** (`boost`) | 10 | `1,5 · 2,2^l` | boost üssü `0,20 + 0,02·l` → 0,20 … **0,40** |
| 4 | **Idle hands** (`autobuy`) | 3 | `2 · 5^l` | otomatik alım: **kapalı / 5 sn / 2 sn / 1 sn** |

**Tasarım ölçütü:** ilk prestij ödülü ≈ **0,30 Tanım** (kapıda A=1 → log10 2); 10× aşımda
≈ **1,04**. Yani ilk yükseltme 1 Tanım'ın altında olmalı ki oyuncu ilk prestijde bir şey alabilsin.

**Autobuy davranışı:** periyotta **en ucuz alınabilir** halkayı alır. Oyuncunun yerine karar
vermez, yalnızca tıklama yükünü alır.

---

## 7. Ölçüm — 1. basamak (`K5`, Set A → A+ → ADR-0086/0087)

> **Kalibre edildi (ADR-0086/0087, 2026-10-31).** Gerçek motor, `dt = 1 s`, sıfırlamalı model:
> intended **181,0 dk** (optimal, 11 boost, 8/8) · 0-greedy 195,8 dk · boost-only **672,6 dk**
> (3,72×) · base **1031,9 dk** (5,70×). Boost kapısı: 3 → 184,2 (8/8) · **4 → 181,0 (8/8)** ·
> 5 → 174,5 (7/8) · 6 → 4/8. Challenges-only (289,6 dk) ADR-0087 sonrası **erişilemez**; tarihsel.
> Mücadele koşuları: C1 17,1 (4 boost; 0 boostta 36 dk) · C2 7,7 · C3 8,0 · C4 8,8 · C5 9,3 ·
> C6 18,8 · C7 10,5 · C8 14,2 dk; ilk mücadele ~32 dk farm + 17,1 dk; final itiş 52,7 dk;
> 11 boost farmı 9.–114. dk. Projeksiyon: 181 × 26,4 ≈ **79,6 sa** (×1,165); 85 saat hedefi için
> eğri **×1,176** (84,8 sa). Aşağıdaki Set A/A+ bölümleri **tarihseldir** ve artık geçerli değildir.

> **Not (ADR-0082):** Aşağıdaki 119 dk'lık koşu boost/prestij dönemine aittir ve **arşivdir**.
> Zincir-only build'in ölçümü `balance.test.ts` içindedir: 60. dk **7,9e15**, 120. dk **4,3e19**,
> **1 440 alım**, halka açılışları 0 · 1,6 · 4,2 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk.

Simülasyon: [`brain/scratchpad/balance-2026-10-23/sim.mjs`](brain/scratchpad/balance-2026-10-23/sim.mjs)
· rapor: [`report.md`](brain/scratchpad/balance-2026-10-23/report.md) · çalıştır: `node sim.mjs --all`.
Zincir kapalı formla entegre edildiği için sonuç `dt`'den bağımsızdır (0,5 / 0,1 / 0,05 sn).

> Aşağıdaki Set A tablosu **0,08/sn · ×1,4** sabitleriyle ölçüldü; A+ revizyonu (bu bölümün
> sonunda) bu sabitleri değiştirdi. Yürürlükteki sayılar A+ paragrafındadır.

| Hedef | İstenen | Ölçülen (Set A, tarihsel) | Durum |
| :--- | :--- | :--- | :--- |
| Kapı | 110–130 dk | **119,8 dk** | ✅ |
| Mini boost | 20–26 | **23** | ✅ |
| Toplam alım | 100–150 | **121** | ✅ |
| Halka açılışları | 8–40 dk | **12,2 … 37,3 dk** | ✅ |
| İlk 10 dk alım | ≥ 6 | **9** | ✅ |
| Boost döngüsü | 3–7 dk | **3,69 dk** (3,67–3,89) | ✅ (alt sınır) |
| Son halka ≥ 90. dk | ≥ 90 dk | **37,2 dk** | ✏️ hedef revize edildi (aşağı bak) |

**4b çelişkisi (§6.2, ölçülmüş — ve çözülmüş):** 23 boost × 3,7 dk = 85 dk; 120 dakikalık koşuda
son halka 90. dakikada açılırsa geriye yalnızca ~8 boost sığar. Ölçüm: halka 8 → 60. dk = 9 boost
ama kapı ulaşılamıyor; 90. dk = 4 boost, kapı yine ulaşılamıyor. Yani "≥ 90 dk" hedefi diğer üç
hedefle **aritmetik olarak birlikte tutamaz**. Çözüm ölçümden geldi: regresyon testi bu hedefi
**"8 halka da 45. dakikadan önce açılır"** olarak kilitledi (gerçek: 37,2 dk).

**Gerçek motor doğrulaması (rapor §11):** sabitler `economy.ts` motoruna (20 TPS) uygulandı ve
aynı politikayla yeniden ölçüldü — `dt = 0,05` → **119,6 dk**, 23 boost, 121 alım, ilk 10 dk 9
alım, halka açılışları 0 · 11,7 · 22,0 · 27,5 · 30,8 · 33,4 · 35,4 · 37,2 dk. Yani **hedef birebir
tutuyor**; naif Euler'in "%17 erken" farkı motorun güncelleme sırasında oluşmuyor. Bu ölçüm
`src/game/number/balance.test.ts` içinde **6 regresyon testi** olarak kilitlendi.

**A+ revizyonu (aynı gün, üçüncü tur):** sabitler yeniden yazıldı — halka 1 `NUMBER_RATE = 1`,
halka 2–8 `CHAIN_RATE = 0,11`, fiyat ×8 (25 → 52 428 800), birim büyümesi `g = 1,20`, 10'lu blok
`BLOCK_SIZE = 10`. Gerçek motor (20 TPS, 2 tık/sn, K5 politikası) yeniden ölçüldü: kapı
**119,0 dk** · **21** boost · **371** birim alımı · ilk 10 dk **42** alım kararı · halka açılışları
**0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · 17,1 dk**. Yukarıdaki Set A satırları ve "4b"
tartışması **0,08/sn · ×1,4** ekonomisine aittir, tarihseldir. Yürürlükteki regresyon bantları
`balance.test.ts`'te: kapı 110–130 dk · 18–24 boost · ilk 10 dk ≥ 6 karar · 8 halka < 45 dk ·
halka başına en az bir blok.

**Halkanın sayıya doğrudan katkısı (2026-10-23, ölçüldü):** `RING_DIRECT_SHARE = 1` ile aynı
motor ve aynı politika yeniden koşuldu — kapı **118,85 dk** · **21** boost · **371** alım ·
halka açılışları **0 · 1,6 · 4,1 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk**. Yani katkı dengeye
**~0,15 dk** maliyetle giriyor (bant 110–130 dk içinde). Katkının `/s` içindeki payı koşu
boyunca ölçüldü: tırmanışta **%1,4–3,6**, boost sonrası ilk saniyede **%52** (halkalar 1 birime
indiği için taban okuma oradadır). Şerh: pay üst sınırda büyüyor — `RING_DIRECT_SHARE = 2` →
kapı 117,9 dk / pay %3–7; `= 4` → 116,7 dk / pay %6–13.

**Belge borcu:** hedef 4b'nin bu revizyonu henüz yazılı karar kaydına (grilling §6.2 / ADR) işlenmedi.
`todo.md` → `K5` bunu "kalan belge borcu" olarak tutuyor; denge tarafında açık bir iş yok.

**Tıklama zorunluluğu (bilinçli):** `c₁ = 25 > başlangıç 10`, yani ilk alım için ~15 tıklama
gerekir. Tıklamasız oyuncu başlayamaz; bu bir hata değil, `S9`/`+1` tasarımının sonucudur.

---

## 8. 1. basamak spec'i (kilitli, ADR-0086)

| Alan | Karar |
| :--- | :--- |
| Zincir | Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician |
| Yön | Aşağıdan yukarı; **Fingers sayıyı üretir**; `+1` = elle Fingers |
| Alım | Sınırsız, birim fiyatı **×1,20** (tüm mücadelelerde **1,22**); 10'lu blok = bir halka |
| Kilit | Bir halkadan 10 birim (= tek blok) → sonraki halka; koşu sıfırlanınca yalnız Fingers açık |
| Blok Çarpanı | `B = 5.3`; her halkada `B^⌊bought/10⌋`; yalnız Fingers tabanı + doğrudan katkı |
| Boost | `1,8^n` üretim çarpanı; `ceil(50 · 1,35^n)` son halka koşulu, fiyat `1,5^n`; alım sayıyı ve zinciri sıfırlar |
| Döngü | **Var** — boost alımı veya mücadele girişi sayıyı `10`a, zinciri 0'a indirir; boost sayacı ve ödüller kalır (ADR-0086) |
| Mücadele | 8 sıfırlamalı koşu; hedefler log10 **10,5 · 20,1 · 29,8 · 39,4 · 49,1 · 58,7 · 68,4 · 78,0**, kilit = önceki hedef (C1 = 10) **+ `boostCount >= 4`** (ADR-0087); sıra zorunlu, her mücadelede global besleme `×0,2`; çıkış sıfır koşuyu korur |
| Kapı | `1,79e308` → prestij: `+1 Tanım`, 2. basamak; boost sayacı burada sıfırlanır |
| Süre | **181,0 dk** (intended, 11 boost, 8/8); ilk mücadele ~32 dk farm + 17,1 dk C1; boost-only 672,6 · base 1031,9 dk. Projeksiyon 79,6 sa (×1,165), 85 saat hedefi ×1,176 |
| Ses | Ticker konuşur (`V4`); tooltip ve sayısal etiket **asla** şaka yapmaz |

---

## 9. Kayıt şeması — v24

[`src/core/save-version.ts`](src/core/save-version.ts): `SAVE_VERSION = 24` (ADR-0086),
`MIN_SUPPORTED_SAVE_VERSION = 20`.

- **P5 — sert temizlik:** v19 ve altı kayıtlar **açılmaz**; oyuncu sıfırdan başlar. Veda ekranı
  yok, arşiv yok (`P4`). Gerekçe: pivot hem temayı hem ekonomiyi değiştirdi; eski kayıt hem
  teknik hem anlam olarak yüklenemez.
- **v21 yalnız gösterim göçü (ADR-0080):** şema değişmedi; v20 kayıtlarındaki `scientific`
  değeri *eski varsayılan* olduğu için bir kez `standard`'a taşınır.
- **v22 zincir-only (ADR-0082):** boost/prestij/yükseltme alanları şemadan düştü.
- **v23 rung 1 v2 (ADR-0083):** `challenges`, `gateReached`, `tanim` eklendi. v22 kayıtları
  açılır; boş mücadele listesi ve `gateReached: false` ile gelir.
- **v24 boost (ADR-0086):** `boostCount` eklendi. v20–v23 kayıtları açılır; `boostCount: 0`
  varsayılanıyla gelir, geçersiz/negatif değer 0'a kırpılır. Mücadele ve boost sıfırması
  şemayı değiştirmez — `boostCount` kalıcı bir sayaçtır, yalnız kapı/prestijde sıfırlanır.
- **Daha yeni kayıt korunur:** `SaveVersionError` — yeni build'in kaydı eski build'de reddedilir,
  sessizce düşürülmez.
- **Şema (v24):** `number`, `bestNumber`, `rings[]` (`a`=miktar, `b`=alım), `unlocked[]`,
  `rung`, `totalBuys`, `taps`, `uselessTaps`, `playTime`, `startedAt`, `lastSeenAt`,
  `settings`, `seenVoice[]`, `latched[]`, `challenges{}`, `boostCount`, `gateReached`, `tanim`.
- **Uçucu alanlar kayda yazılmaz:** `offlineReport`.
- **Depolama:** LZ-String + LocalStorage, 3 slot + otomatik yedek + karantina; Firebase/Firestore
  bulut kayıt isteğe bağlı (anahtarsız oyun tam çalışır).

---

## 10. Çevrimdışı ilerleme (`S6`)

Üretim kapalıyken de sürer, **12 saatte tavan** yapar (`OFFLINE_CAP_SECONDS = 12·3600`).
Simülasyon **1 saniyelik adımlarla** ilerletilir; sonuç
`OfflineReport` (`seconds`, `capped`, `gained`) olarak "welcome back" modalına gider.

Aktif bir mücadele çevrimdışı blokta hedefi aştığı **adımda** tamamlanır ve ödülü derhal
uygulanır; blok bitince tek seferde çözülmez (ADR-0086 §7). Böylece blok sonrası ekranda
"bitti ama ödül yok" durumu oluşmaz.

Gerekçe: 85 saatlik oyunda uyuyan oyuncuyu cezalandırmak düşmanca; ama bir hafta kapatıp gelince
oyunu atlamış olmak oyunu anlamsız kılar.

---

## 11. Kapı sonrası — 2. basamak stub'ı — **ARŞİV, build'de yok**

2. basamak henüz tasarlanmadığı için prestij şu an **`rung`'u ilerletmez**: oyuncu `Tanım`
kazanır, sayı başlangıca döner ve **1. basamağı** `Tanım` yükseltmeleriyle daha hızlı oynar.
Bu davranış kodda **belgelenmiş bir stub**'dır (`economy.ts` → `applyPrestige` yorumu), sessiz
bir eksik değil. 2. basamak yazıldığında basamak geçişi buraya bağlanır.

`G8` sahne motoru **kodda hazır** (`RungScene.vue`: 2.500 ms, tam ekran sönme + basamak adı,
`S3` mandalı ile bir kez, azaltılmış harekette 1.100 ms statik). Ancak `rung` ilerlemediği için
**henüz tetiklenmiyor**; ayrıca `humor = off` kapısı bu bileşene **bağlı değil** (`A4` açık).

---

## 12. Görsel dil referansı (ADR-0085 — "Laboratuvar")

Tam sözleşme: [`brain/context/visual-language.md`](brain/context/visual-language.md).

| Öğe | Kural |
| :--- | :--- |
| Zemin | `#08090c` tuval · `s1/s2/s3` yüzeyler · 1px çizgi · 6–8 px köşe (swirl kaldırıldı) |
| Yüzey | Kabuk: üst çubuk · sol menü (≤ 900 px alt sekme) · ana alan · durum çubuğu. **Gölge, blur, gradyan, neon süs yok**; sağ panel yok |
| Tipografi | **Space Grotesk** (hero 300 + UI 400–500) · **Space Mono** (veri, `tabular-nums`) |
| Basamak rengi | 11 hue, tek OKLCH formülü; kontrast **5,4:1–13,4:1**, komşu hue farkı **25,1°** |
| Renk nerede yaşar | Basamak rengi arayüzün vurgusudur (`--pn-rung`): hero sayı + yalnız eyleme açık/aktif durum |
| Rezerve | Amber `#f59e0b` prestij · Rose `#f43f5e` tehlike · Gri `#33333a` kilitli |
| Basamak geçişi | 2,5 sn sahne (`G8`); 11 × 2,5 sn = 27 sn / 85 saat |
| Mini boost | 400 ms "tek nefes" (`G11`); sahne diliyle karışmaz |
| `+1` | Hiç değişmez (`G10`): aynı yer, aynı boyut, aynı etiket, aynı ses |
| Dizgi | Yapısal (`G9`): taban büyük, notasyon küçük; **auto-fit yasak** |
| Sayı merdiveni | `12` düz tam sayı (1 altı ondalık) · `1.23 K` → `7 T` kısaltma · `1.23e15`+ e-notasyonu (`ADR-0080`) |

---

## 13. Ses referansı

Tam sözleşme: [`brain/context/narrative-voice.md`](brain/context/narrative-voice.md).

- Konuşan **oyunun kendisi**; kurum/karakter/lore yok (`V1`).
- **Sessiz meta** (`V2`): oyun olduğunu bilir, asla söylemez.
- **Gerçek "sen"** (`V3`): yalnız oyun içi veri (tıklama, süre, saat, sekme).
- Kanallar (`V4`): sahne · ticker · başarım · açıklama. **Tooltip ve sayısal etiket asla şaka yapmaz.**
- **Tek ses, çift ritim** (`V5`); **11. basamakta bir kez ton kırılması** (`V6`, `A5`).
- Mizah seviyesi (`A4`): `off` / `measured` (varsayılan) / `full`; `off`'ta açıklama kanalı kalır.
- Tüm oyun metni **İngilizce** (`P3`), doğrudan yazılır — çevrilmez (`A8`: ajan yazar, sahip redakte eder).

---

## 14. Uygulama durumu ve kapılar

| Katman | Dosya | Durum |
| :--- | :--- | :--- |
| Ekonomi | `src/game/number/` (tuning · challenges · economy · rungs) | ✅ Rung 1 v3 — B=5.3 + boost + sıfırlamalı mücadele, 181 dk (ADR-0086) |
| Store | `src/stores/game.ts` (tick, alım, boost, mücadele, prestij, serialize/deserialize) | 🟡 save v24 |
| Ses | `src/game/voice/` + `TickerBar.vue` | 🟡 mücadele/kapı/boost satırları |
| UI | `App.vue` + GoalBar · ChallengePanel · BoostPanel · GateModal + mevcut bileşenler | 🟡 |
| Sahne (`G8`) | `RungScene.vue` | 🟡 kapı anı GateModal ile bağlanacak |
| Altyapı | 20 TPS loop · LZ-String + slot + karantina · Firebase auth/bulut · audio + müzik · arayüz kabuğu | ✅ |
| 2–11. basamak | — | ⛔ tasarlanmadı |

**Doğrulama kapıları:** `npm run typecheck` (vue-tsc, 0 hata) · `npm test` (vitest) ·
`npm run build` (vue-tsc + vite). `npm run verify` = typecheck + test + build.

---

## 15. Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `K5` | 190 dk kalibrasyonu **geçersiz**; ADR-0086 kalibrasyonu **181,0 dk** (2026-10-31) | ✅ kalibre edildi |
| `R1` | **Rung 1 v3** — B=5.3, boost `1,8^n`, 8 mücadele hedefi 10,5–78,0; intended 181 dk | ✅ uygulandı (ADR-0086) |
| `R2` | Boost reset modeli ("boost alınca sayı ve zincir sıfırlansın") | ✅ ADR-0086 ile karara bağlandı |
| `R3` | Boost kapısı — 3: 184,2 (8/8) · **4: 181,0 (8/8)** · 5: 174,5 (7/8) · 6: 4/8; challenges-only kaldırıldı | ✅ ADR-0087 |
| `R5` | `CHALLENGE_BOOST_GATE = 4` + UI "4 boost gerekli" durumu | ✅ uygulandı |
| `R4` | Toplam süre — 85 saat hedefi, eğri ×1,176 (projeksiyon 79,6 sa) | ✅ |
| — | **Denetim** — `npm run verify` + commit | 🟡 sıradaki |
| — | **2. basamak tasarımı** (`E5`: kendi turunda; `OmegaNum` adaptörü + kadran) | ⛔ sıradaki büyük iş |
| `A4` | Mizah yoğunluğu — ticker kapısı var; sahne (`RungScene`) ve başarım kapısı yok | 🟡 |
| `A5` | `LNGN` final sahnesi (ton kırılması, `G8` motoru) | 🟡 en son |
| `A6` | Başarımlar + meydan okumalar — eski içerik silindi, yenisi yazılmadı | 🟡 |
| `A7` | Müzik motoru (`src/core/music/*`) — uyarlama mı yeniden yazım mı | 🟡 |
| `A8` | İngilizce metin sahipliği — ortak yazım kuralı yazıldı (`narrative-voice.md` §10) | 🟡 |
| `G13` | Mobil dizgi (390 px'te uzun notasyon) | 🟡 |
| `G14` | Ticker'ın yeri ve boyu | 🟡 |