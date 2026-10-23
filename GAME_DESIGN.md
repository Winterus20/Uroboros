# HOLD THAT NUMBER — Oyun Tasarım Dokümanı (GDD)

> **Sürüm:** 0.40.0 · **Tarih:** 2026-10-23 · **Durum:** 1. basamak oynanabilir; 2–11 tasarlanmadı
> **Bu belge 2026-10-23'te BAŞTAN YAZILDI.** Eski "Kozmik Oburluk / UROBOROS" içeriği
> (kütle ekonomisi, D1–D8 boyutları, Lab, Crisis, Neural, Time Clock, Colony, Singularity,
> başarımlar, meydan okumalar) **tamamen kaldırıldı** — kod da, bu belge de.
>
> **Bağlayıcı kaynaklar:**
> [`brain/research/theme-pivot-grilling-2026-10-23.md`](brain/research/theme-pivot-grilling-2026-10-23.md) (50 karar) ·
> [`brain/context/narrative-voice.md`](brain/context/narrative-voice.md) (ses) ·
> [`brain/context/visual-language.md`](brain/context/visual-language.md) (görsel dil) ·
> ADR-0077 (pivot) · ADR-0078 (görsel dil) · ADR-0079 (sayı ekonomisi dikey dilimi)

---

## 1. Tek cümle

Tek bir sayı var. Oyuncu onu büyütür, 11 basamaklık bir notasyon merdiveninde yukarı taşır ve
merdivenin sonunda (`LNGN`) oyun biter.

**Tür:** sayı odaklı incremental / idle — *Antimatter Dimensions* zinciri + *Cookie Clicker*
prestij döngüsü. **Süre:** tek koşu, ~**85 saat**, kuyruk yok, NG+ yok (`S4`).

---

## 2. Tasarım tezi

1. **Ekranın tek kahramanı sayıdır** (`S1`, ADR-0078 `G1`). Sayı hiçbir basamakta küçülmez;
   onu kutuya koyan kart yoktur.
2. **Cüzdan sayının kendisidir** (`E1`). Alım sayıyı düşürür; eşikler mandallıdır, geri gitmez (`S3`).
3. **Jeneratörler zincirdir** (`E3`, `E6`). Halka *n+1* halka *n*'i üretir; halka 1 sayıyı
   üretir. `+1` zincirin köküne dokunur — 85. saatte de.
4. **Ses = oyunun kendisi** (`V1`), sessiz meta (`V2`), gerçek "sen" (`V3`). Mizah dünyada
   değil, oyun ile oyuncu arasındaki ilişkide.
5. **Görsel dil "Saf Sayı"** (ADR-0078): zemin + 1px hairline + tipografi + basamak rengi.
   Kart, blur, yuvarlak köşe, gölge, neon süs yok.

---

## 3. 11 basamak (notasyon merdiveni)

Süre eğrisi **×1,25** geometrik artış; 1. basamak **2 saat** (`S5`). Toplam **85,14 saat**.

| # | Basamak adı (kod: `rungs.ts`) | Gösterim | Süre | Kümülatif |
| --: | :--- | :--- | ---: | ---: |
| 1 | I thought it was a wall | `1.79e308` | 2,00 sa | 2,00 |
| 2 | The end of the shelf | `1e(9e15)` | 2,50 sa | 4,50 |
| 3 | The tower is done | `10^^1.79e308` | 3,13 sa | 7,63 |
| 4 | The arrows are done | `6 arrows` (ekranda `↑⁶`) | 3,91 sa | 11,54 |
| 5 | It did not write it. It showed it. | `G` | 4,88 sa | 16,42 |
| 6 | We do not know | `TREE(3)` | 6,10 sa | 22,52 |
| 7 | The room | `SSCG(3)` | 7,63 sa | 30,15 |
| 8 | *Untitled* (geçici ad) | `Rayo` | 9,54 sa | 39,69 |
| 9 | The door | `Fish 7` | 11,92 sa | 51,61 |
| 10 | Does it count? | `BIG FOOT` | 14,90 sa | 66,51 |
| 11 | *Last* (geçici ad — final sahnesi `A5`) | `LNGN` | 18,63 sa | **85,14** |

**Dağılım:** 1–5 = **16,4 saat (%19)** · 6–11 = **68,7 saat (%81)**. Oynanışın beşte dördü
arka altı basamakta geçtiği için `S7` (5 sistem + 4 kural) zorunludur: her basamakta yeni bir
*motor* değil, yeni bir *kural*.

**Kadran (basamak 5+):** `rank` (ok seviyesi) + `mag ∈ [2.00, 10.00)`. `mag` asla büyümez,
her hücrede döner; hücreler `a ↑ⁿ 2 = a ↑ⁿ⁻¹ a` özdeşliğiyle kusursuz birleşir (`T2`).
Kadran bölgesi 7 çapa × 6 hücre = **42 hücre · 336 mag adımı**; 73,6 saat ÷ 42 ≈ **1 sa 45 dk/hücre**.

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
  blok**, yani bloğu tamamlayan oyuncu kilidi kendiliğinden açar; kilit **mandallı** —
  boost/prestij kapatmaz (`D6`).
- **`+1`:** gerçekten 1 ekler, hiçbir çarpan uygulanmaz (`S9`). Üst basamaklarda gösterim
  çözünürlüğünün altında kaldığı için ekranda hiçbir şey değişmez — bu **yuvarlama**, yalan değil.

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
sayı/sn      = (A₁ · p₁ + Σ_{i≥2} A_i · d_i) · M      M = boostMult · chainMult · verim
halka_i/sn   = A_{i+1} · p_{i+1} · chainMult          (i = 1..6)
halka_8/sn   = 0                                      (zincirin tepesi)
```

`A_i` = halkadaki birim sayısı, `p_i` = halkanın taban üretimi (`p_1 = 1`,
`p_i = 0,11` için `i ≥ 2`), `d_i = p_i · RING_DIRECT_SHARE` = halkanın sayıya **doğrudan**
katkısı (`i ≥ 2`, `RING_DIRECT_SHARE = 1` → `0,11/sn`). `d_i` sayı üretimidir: `M`yi alır.
Zincir satırındaki `+x/s` okuması bu katkıdır.

**`D1` (ölçümün zorunlu kıldığı düzeltme):** boost çarpanı **yalnız sayı üretimine** uygulanır,
halka beslemesine **uygulanmaz**. Her halkaya uygulandığında `N ∝ M⁸` olur ve döngüler 2 saniyeye
çöker (ölçüldü: 4,7 dakikada 11 boost).

### 5.3 `Birikim` — kapı aşımı verim cezası (`E7`)

```
A = sayı / kapı(1,79e308)
N ≤ kapı  → verim = 1
N > kapı  → verim = 0,9^log10(A)
```

Kapı aşıldıktan sonra beklemek ödülü büyütür, üretimi yavaşlatır: "şimdi mi, biraz daha mı?"
kararı (`E4`). Ceza **yalnız sayı üretimine** uygulanır (`D1` ile aynı gerekçe).

### 5.4 Mini boost (`E12`–`E14`)

```
koşul  : halka 8 (Mathematician) bu koşuda en az 1 kez alınmış
kazanç : (zirve / başlangıç)^0,2        → boostMult *= kazanç (kalıcı, basamak içi)
sıfırla: sayı = başlangıç(10), her halka 1 birim, kilitler AÇIK kalır
Tanım  : VERMEZ
```

**`D3`:** halkalar 0'a değil **1 birime** iner; 0'a inerse zincir ölür ve oyuncu her döngü
8 halkayı yeniden kurmak zorunda kalır (ölçüldü: ~250 alım). **`D4`** (oyuncu politikası):
boost, zirve bir önceki zirveyi geri kazanınca yapılır; "alır almaz boost" döngüyü 2 saniyeye indirir.

### 5.5 Kapı ve prestij

```
kapı      : sayı ≥ 1,79e308  (aynı zamanda JS float tavanı)
Tanım     : log10(1 + A),  A = sayı/kapı      → kapıda A=1 → 0,30 Tanım
prestij   : Tanım kazanılır; sayı başlangıca döner; boostMult sıfırlanır
```

Prestij **tek ödül kapısıdır**; mini boost `Tanım` vermez (`E12`).

---

## 6. `Tanım` yükseltmeleri (prestijin harcama yeri)

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

## 7. Ölçüm — 1. basamak (`K5`, Set A → A+)

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

## 8. 1. basamak spec'i (kilitli, `E6`–`E14`)

| Alan | Karar |
| :--- | :--- |
| Zincir | Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician |
| Yön | Aşağıdan yukarı; **Fingers sayıyı üretir**; `+1` = elle Fingers |
| Alım | Sınırsız, birim fiyatı **×1,20**; 10'lu blok = bir halka (AD "Buy 10"), 2 saatte ~370 birim |
| Kilit | Bir halkadan 10 birim (= tek blok) → sonraki halka (mandallı) |
| Döngü | 8. halkada mini boost: tam sıfırlama + `(zirve/10)^0,2` kalıcı çarpan |
| Kapı | `1,79e308` → prestij: sayı `10`, `Tanım = log10(1+A)`, verim `0,9^log10 A` |
| Ses | Ticker konuşur (`V4`); tooltip ve sayısal etiket **asla** şaka yapmaz |

---

## 9. Kayıt şeması — v21

[`src/core/save-version.ts`](src/core/save-version.ts): `SAVE_VERSION = 21`,
`MIN_SUPPORTED_SAVE_VERSION = 20`.

- **P5 — sert temizlik:** v19 ve altı kayıtlar **açılmaz**; oyuncu sıfırdan başlar. Veda ekranı
  yok, arşiv yok (`P4`). Gerekçe: pivot hem temayı hem ekonomiyi değiştirdi; eski kayıt hem
  teknik hem anlam olarak yüklenemez.
- **v21 yalnız gösterim göçü (ADR-0080):** şema değişmedi; v20 kayıtlarındaki `scientific`
  değeri *eski varsayılan* olduğu için bir kez `standard`'a taşınır. Asgari sürüm 20'de kaldı,
  yani v20 kayıtları açılır — sıfırlanmaz.
- **Daha yeni kayıt korunur:** `SaveVersionError` — yeni build'in kaydı eski build'de reddedilir,
  sessizce düşürülmez.
- **Şema:** `number`, `peak`, `bestNumber`, `rings[]` (`a`=miktar, `b`=alım), `unlocked[]`,
  `boostMult`, `boosts`, `rung`, `tanim`, `tanimTotal`, `prestiges`, `totalBuys`, `totalBoosts`,
  `gateReached`, `taps`, `uselessTaps`, `playTime`, `startedAt`, `lastSeenAt`, `upgrades`,
  `settings`, `seenVoice[]`, `latched[]`.
- **Uçucu alanlar kayda yazılmaz:** `autobuyTimer`, `offlineReport`.
- **Depolama:** LZ-String + LocalStorage, 3 slot + otomatik yedek + karantina; Firebase/Firestore
  bulut kayıt isteğe bağlı (anahtarsız oyun tam çalışır).

---

## 10. Çevrimdışı ilerleme (`S6`)

Üretim kapalıyken de sürer, **12 saatte tavan** yapar (`OFFLINE_CAP_SECONDS = 12·3600`).
Simülasyon **1 saniyelik adımlarla** ilerletilir ve autobuy dâhil edilir; sonuç
`OfflineReport` (`seconds`, `capped`, `gained`) olarak "welcome back" modalına gider.

Gerekçe: 85 saatlik oyunda uyuyan oyuncuyu cezalandırmak düşmanca; ama bir hafta kapatıp gelince
oyunu atlamış olmak oyunu anlamsız kılar.

---

## 11. Kapı sonrası — 2. basamak stub'ı

2. basamak henüz tasarlanmadığı için prestij şu an **`rung`'u ilerletmez**: oyuncu `Tanım`
kazanır, sayı başlangıca döner ve **1. basamağı** `Tanım` yükseltmeleriyle daha hızlı oynar.
Bu davranış kodda **belgelenmiş bir stub**'dır (`economy.ts` → `applyPrestige` yorumu), sessiz
bir eksik değil. 2. basamak yazıldığında basamak geçişi buraya bağlanır.

`G8` sahne motoru **kodda hazır** (`RungScene.vue`: 2.500 ms, tam ekran sönme + basamak adı,
`S3` mandalı ile bir kez, azaltılmış harekette 1.100 ms statik). Ancak `rung` ilerlemediği için
**henüz tetiklenmiyor**; ayrıca `humor = off` kapısı bu bileşene **bağlı değil** (`A4` açık).

---

## 12. Görsel dil referansı (ADR-0078 — "Saf Sayı")

Tam sözleşme: [`brain/context/visual-language.md`](brain/context/visual-language.md).

| Öğe | Kural |
| :--- | :--- |
| Zemin | `#060608`; tek istisna `AlgorithmicSwirl` (oyunun tek ortamı, basamak rengini taşır) |
| Yüzey | 1px hairline + tipografi + boşluk. **Kart, blur, yuvarlak köşe, gölge, neon süs yok** |
| Tipografi | **Space Grotesk** (hero 300 + UI 400–500) · **Space Mono** (veri, `tabular-nums`) |
| Basamak rengi | 11 hue, tek OKLCH formülü; kontrast **5,4:1–13,4:1**, komşu hue farkı **25,1°** |
| Renk nerede yaşar | Yalnız hero sayı + swirl. Buton/rozet/çubuk basamak rengi **almaz** |
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
| Ekonomi | `src/game/number/` (tuning · economy · upgrades · rungs) | ✅ |
| Store | `src/stores/game.ts` (tick, autobuy, prestij, serialize/deserialize) | ✅ |
| Ses | `src/game/voice/` + `TickerBar.vue` | ✅ 1. basamak havuzu (110 ticker + 11 sahne) |
| UI | `App.vue` + 10 bileşen (Hero, Tap, Chain, Telemetry, Ticker, Upgrade, Stats, Settings, Offline, RungScene) | ✅ |
| Sahne (`G8`) | `RungScene.vue` | ⚠️ motor hazır; `rung` ilerlemediği için tetiklenmiyor |
| Altyapı | 20 TPS loop · LZ-String + slot + karantina · Firebase auth/bulut · audio + müzik · swirl | ✅ |
| 2–11. basamak | — | ⛔ tasarlanmadı |

**Doğrulama kapıları:** `npm run typecheck` (vue-tsc, 0 hata) · `npm test` (vitest) ·
`npm run build` (vue-tsc + vite). `npm run verify` = typecheck + test.

---

## 15. Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| `K5` | Denge ölçümü — hedef 4b çelişkisi ve Euler→kapalı form farkı | 🟡 devam ediyor |
| — | **2. basamak tasarımı** (`E5`: kendi turunda; `OmegaNum` adaptörü + kadran) | ⛔ sıradaki büyük iş |
| `A4` | Mizah yoğunluğu — ticker kapısı var; sahne (`RungScene`) ve başarım kapısı yok | 🟡 |
| `A5` | `LNGN` final sahnesi (ton kırılması, `G8` motoru) | 🟡 en son |
| `A6` | Başarımlar + meydan okumalar — eski içerik silindi, yenisi yazılmadı | 🟡 |
| `A7` | Müzik motoru (`src/core/music/*`) — uyarlama mı yeniden yazım mı | 🟡 |
| `A8` | İngilizce metin sahipliği — ortak yazım kuralı yazıldı (`narrative-voice.md` §10) | 🟡 |
| `G13` | Mobil dizgi (390 px'te uzun notasyon) | 🟡 |
| `G14` | Ticker'ın yeri ve boyu | 🟡 |
