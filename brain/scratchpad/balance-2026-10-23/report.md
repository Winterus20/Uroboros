# Hold That Number — 1. Basamak Denge Raporu

Tarih: 2026-10-23 · Kapsam: **sadece ölçüm** (src/ altında hiçbir dosya değiştirilmedi)
Araçlar: `sim.mjs` (çalışan simülasyon + sabit setleri) · Node 22 + break_eternity.js 2.1.3

---

## 0. Yönetici özeti

| Hedef | İstenen | Ölçülen (Set A) | Durum |
|---|---|---|---|
| 1. Kapı (1,79e308) | 110–130 dk | **119,8 dk** | ✅ |
| 2. Mini boost sayısı | 20–26 | **23** | ✅ |
| 3. Toplam satın alma | 100–150 | **121** | ✅ |
| 4a. Her halka 8–40 dk arasında açılsın | 8–40 | **12,2 … 37,3 dk** | ✅ |
| 4b. Son halka 90. dakikadan önce açılmasın | ≥90 dk | **37,3 dk** | ❌ (yapısal çelişki — §6.2) |
| 5. İlk 10 dk'da en az 6–10 alım | ≥6 | **9** | ✅ |
| 6. Boost döngüleri ~5 ± 2 dk | 3–7 dk | **3,69 dk** (3,67–3,89) | ✅ (alt sınırda) |

23 boost, 121 alım ve 120 dakikalık kapı **birlikte** tutuyor. Tek uyuşmayan madde 4b: 23 boost × 3,7 dk = 85 dk, geriye 35 dk kalıyor — son halka 90. dakikada açılırsa 120 dakikaya en fazla ~8 boost sığar. Bu ölçüldü (§6.2), tahmin değil.

---

## 1. Nasıl çalıştırılır

```powershell
node brain/scratchpad/balance-2026-10-23/sim.mjs        # Set A: sabitler + metrikler + hedef uyumu
node brain/scratchpad/balance-2026-10-23/sim.mjs --all  # + Set B + duyarlılık tabloları
```

Simülasyon 0,5 sn karar çözünürlüğünde çalışır ve zinciri **kapalı form** ile entegre eder (Euler değil — gerekçe §9.1), bu yüzden sonuç dt'den bağımsızdır (0,5 / 0,1 / 0,05 sn → 119,8 / 119,0 / 119,0 dk).

---

## 2. Model

### 2.1 Kilitli kurallar (aynen uygulandı)

- 8 halka, aşağıdan yukarı beslenir: 1 Parmaklar … 8 Matematikçi. Halka n+1, halka n'i üretir.
- Sayı üretimi: `dN/dt = M · A₁ · p₁`; halka üretimi: `dA_i/dt = M · A_{i+1} · p_{i+1}` (i = 1..7); `dA₈/dt = 0`. *(Bu, kilitli metindir; uygulamada halka üretimindeki M kaldırıldı — gerekçe D1.)*
- Alım sınırsız, tek havuz (alım sayıyı düşürür); maliyet `c_i · g^b`, g ∈ [1,3; 1,5].
- Kilit: bir halkadan 10 birim alınınca sonraki halka açılır (7 geçiş).
- Mini boost: 8. halka alınınca açılır; 8 halka ve sayı sıfırlanır (sayı 10'a); `M *= (zirve/10)^0,2`, çarpımsal birikir.
- Prestij: N ≥ 1,79e308 → `Tanım = log10(1+A)`, A = N/kapı; Birikim cezası `0,9^log10(A)` (bu simülasyonun kapsamı dışı — sadece kapı anı ölçülür).

### 2.2 Ölçüm için verdiğim kararlar (hepsi ölçümle gerekçelendirildi)

**D1 — M yalnızca sayıya uygulanır, halka üretimine uygulanmaz.**
`dA_i/dt = A_{i+1}·p_{i+1}`. Gerekçe: M her halkaya uygulandığında N ∝ M⁸ olur; boost kazancı 10^{0,2·log(zirve)} iken üretim 10^{1,6·log(zirve)} büyür. **Ölçüm (M halkalara da uygulanmış hâli):** döngüler 2 sn'ye çöker, koşu 4,7 dakikada 11 boost ile biter — 120 dk/23 boost hedefi imkânsız. M yalnızca sayıya uygulandığında zirve/M oranı döngüden döngüye sabit kalır ve döngü süresi sabitlenir (ölçülen: 3,67–3,89 dk).

**D2 — pᵢ "astronomik" değil, 0,07–0,12 mertebesinde.**
Gerekçe: N ≈ M · ∏p · t⁸/8!. İki saatlik bir koşu için ∏p ≈ 1e-9 gerekir. **Ölçüm:** pᵢ = 10^{4i} (∏p = 1e112) ile kapı **0,2 dakikada** açıldı; ∏p = 1e36 ile döngüler 2 sn'ye indi. "Astronomik" etki zaten zincirin 8. kuvvetinden ve M'den geliyor; p'yi büyütmek ilk döngüyü anında bitiriyor. (Alternatif: 23 boost yerine 3-4 boost hedeflenirse p büyütülebilir — o zaman §6.2'deki çelişki büyür.)

**D3 — Boost'ta halkalar 0'a değil 1 birime iner.**
Gerekçe: 0'a inerse zincir ölür (A₁ = 0 → dN/dt = 0) ve oyuncu her döngü 8 halkayı yeniden kurmak zorunda kalır. **Ölçüm:** 0'a inen varyantta döngü başına ≥8 alım → toplam ~250 alım (hedef 100–150'nin 2 katı). 1 birime inen varyantta döngü başına 2 alım → 121 alım.

**D4 — Boost eşiği: "kendini ödeyen zirve" kuralı.**
Oyuncu, bir önceki zirveyi ve o boost'un kazandırdığı çarpanı geri kazanmadan boost yapmaz:
`T_k = P_{k-1} · (P_{k-1}/10)^0,2`. Gerekçe: "halka 8 alınınca hemen boost" kuralıyla zirveler sabit kalır, kazanç sabitlenir, M geometrik büyür ve döngüler 2 sn'ye çöker (**ölçüm:** hemen-boost varyantı → 2 sn döngü, 4,7 dk'da kapı, 11 boost). Kendini-ödeyen kuralda zirve her turda log10'da 1,2× büyür, döngü süresi sabit kalır — hedeflenen ritim budur.

**D5 — İlk boost eşiği = 10 × c₈ (deterministik).**
Gerekçe: "Matematikçi alınır alınmaz boost" kuralında ilk zirve, alımın hangi simülasyon adımına denk geldiğine bağlı kalıyordu; L₁ = 5,7 (dt = 0,5) ile 4,7 (dt = 0,05) arasında oynayıp boost sayısını 23 ↔ 25 yapıyordu. Sabit eşikle dt = 0,5/0,1/0,05 → 119,8/119,0/119,0 dk (kararlı).

**D6 — Kilitler kalıcıdır.** Bir halka açıldıktan sonra boost onu kapatmaz; boost yalnızca birim sayılarını sıfırlar.

**D7 — Entegrasyon kapalı form (kesin).** Zincir doğrusal ve üçgendir; her adımda Taylor açılımıyla tam integral alınır (§9.1). Euler kullanılsaydı aynı sabitler kapıyı ~%17 erken verirdi (**ölçüm:** Euler dt = 0,5 → 105,5 dk; dt = 0,1 → 100,6; dt = 0,02 → 99,7; kapalı form → 119,8).

### 2.3 Oyuncu politikası (tam tanım)

1. Her 0,5 sn'de bir karar.
2. **Tırmanış (ilk boost'a kadar):** Açık halkalar arasında en derin olandan, o halkadan 10 birim alınana kadar al. (10 birim → sonraki halka açılır.) Bu, ilk döngüyü üretir: 7 kilit × 10 birim.
3. **Döngü modu (boost sonrası):** Döngü başına **en fazla 2 alım**:
   - önce 1 Parmaklar (zinciri canlandırmak için — A₁ = 0 iken üretim sıfırdır),
   - sonra uygun olduğunda 1 Matematikçi (boost anahtarı).
   Fazlası bilinçli olarak yapılmaz: her alım N'i düşürür, boost getirisi ise zirvenin logaritmasıyla (0,2 katsayı) büyür; zirveyi yükseltmeyen alım getiriyi azaltır.
4. **Boost:** Matematikçi bu döngüde alındıysa ve N ≥ T_k ise boost yap.
5. **Prestij:** N ≥ 1,79e308 → koşu biter (burada ölçüm durur).
6. **Elle +1:** aktif oyuncu varsayımı 2 tıklama/sn (Set A). Set B tıklamasız oyuncu içindir.

---

## 3. Sabitler — Set A (birincil)

`c_i = 25 · 10^{0,5(i-1)}` (≈ ×3,16 her halka), `p_i = 0,071 · 1,050^{(i-1)}`, `g = 1,4`.

| # | Halka | Taban maliyet cᵢ | Üretim pᵢ | İlk açılış |
|---|---|---|---|---|
| 1 | Parmaklar | **25** | **0,071** | 0,1 dk |
| 2 | Çentik | **79** | **0,074** | 12,2 dk |
| 3 | Abaküs | **250** | **0,078** | 22,2 dk |
| 4 | Kalem | **790** | **0,082** | 27,6 dk |
| 5 | Hesap Makinesi | **2 500** | **0,086** | 31,0 dk |
| 6 | Bilgisayar | **7 900** | **0,090** | 33,5 dk |
| 7 | Süperbilgisayar | **25 000** | **0,095** | 35,5 dk |
| 8 | Matematikçi | **79 000** | **0,100** | 37,3 dk |

| Parametre | Değer |
|---|---|
| g (fiyat çarpanı) | **1,4** |
| Kilit eşiği | 10 birim |
| Boost kazancı | `(zirve/10)^0,2`, çarpımsal |
| Boost sıfırlaması | N = 10, her halka 1 birim |
| İlk boost eşiği | 10 × c₈ = 790 000 |
| Sonraki boost eşiği | `P_{k-1} · (P_{k-1}/10)^0,2` |
| Döngü alım bütçesi | 2 |

---

## 4. Ölçülen metrikler (Set A, 2 tıklama/sn, dt = 0,5)

| Metrik | Değer |
|---|---|
| Kapı (1,79e308) | **119,8 dk** |
| Mini boost sayısı | **23** |
| Toplam satın alma | **121** (tırmanış 80 + döngüler 41) |
| Halka başına alım | 32 · 10 · 10 · 10 · 10 · 10 · 10 · 29 |
| İlk 10 dk alım | **9** |
| Halka açılışları (dk) | 0,1 · 12,2 · 22,2 · 27,6 · 31,0 · 33,5 · 35,5 · 37,3 |
| İlk döngü (tırmanış) | **38,3 dk** |
| Sonraki döngüler | ort **3,69 dk** (min 3,67 / max 3,89), 22 döngü |
| Zirve log10 (tur 1 → 23) | 5,9 → 272,7 |
| Son M | 1e321,1 |
| Prestij anı | son boost'tan 0,5 sn sonra (N tek adımda 1e319) |

---

## 5. Döngü tablosu (Set A)

| Tur | Başlangıç (dk) | Süre (dk) | Zirve log10 | Kazanç | Alım |
|---|---|---|---|---|---|
| 1 | 38,3 | 38,27 | 5,9 | 9,59 | 77 |
| 2 | 42,2 | 3,90 | 6,9 | 15,1 | 2 |
| 3 | 46,1 | 3,89 | 8,1 | 26,0 | 2 |
| 4 | 49,9 | 3,83 | 9,5 | 50,0 | 2 |
| 5 | 53,6 | 3,68 | 11,2 | 110 | 2 |
| 6 | 57,3 | 3,67 | 13,2 | 281 | 2 |
| 8 | 64,6 | 3,67 | 18,6 | 3,35e3 | 2 |
| 10 | 71,9 | 3,67 | 26,4 | 1,19e5 | 2 |
| 12 | 79,3 | 3,67 | 37,6 | 2,05e7 | 2 |
| 14 | 86,6 | 3,67 | 53,6 | 3,38e10 | 2 |
| 16 | 94,0 | 3,68 | 76,8 | 1,46e15 | 2 |
| 18 | 101,3 | 3,68 | 110,2 | 6,85e21 | 2 |
| 20 | 108,7 | 3,68 | 158,2 | 2,78e31 | 2 |
| 22 | 116,1 | 3,68 | 227,4 | 1,9e45 | 2 |
| 23 | 119,7 | 3,68 | 272,7 | 2,16e54 | 2 |

Zirve her turda log10'da 1,2× büyür (L_{k+1} = 1,2·L_k − 0,2). Döngü süresinin sabit kalması tasarımın kendisinden gelir: boost kazancı 10^{0,2·L} iken zirve 10^{1,2·L} olur; zirve/M oranı sabit kaldığı için süre de sabit kalır.

---

## 6. Hedef uyumu

### 6.1 Uyanlar
1, 2, 3, 4a, 5, 6 numaralı hedefler sağlanıyor (§0 tablosu). 6 numaralı hedef (5 ± 2 dk) **3,69 dk** ile aralığın alt ucunda; nedeni §6.3'teki süre bütçesi.

### 6.2 Uymayan tek madde: "son halka 90. dakikadan önce açılmasın"

Bu madde diğer üç maddeyle aritmetik olarak çelişiyor:

- Koşu 120 dk, boost döngüsü 3–7 dk (hedef 6), boost sayısı 20–26 (hedef 2).
- 23 boost × 5 dk = **115 dk**. Geriye 5 dk kalır — ilk tırmanış (7 kilit) için imkânsız.
- En iyimser hâliyle: 23 × 3 dk = 69 dk → son halka en geç **51. dakikada** açılmalı.
- Ölçüm (Set A, halka 8 yapay olarak geciktirildi):

| Senaryo | Boost | Kapı | Döngü |
|---|---|---|---|
| Gecikme yok (Set A) | **23** | **119,8 dk** | 3,7 dk |
| Halka 8 ≥ 60 dk | 9 | ulaşılamadı (>240 dk) | 20,5 dk |
| Halka 8 ≥ 90 dk | **4** | ulaşılamadı (>240 dk) | 41,6 dk |

Yani "son halka ≥ 90 dk" korunursa ne 20–26 boost ne de 120 dk kapı mümkün. **Öneri:** ya bu madde "son halka 30–40. dakikada açılsın" olarak düzeltilsin (Set A bunu yapıyor), ya da boost hedefi 8–10'a ve kapı hedefi ~150 dk'ya çekilsin.

### 6.3 Döngü süresi neden 3,7 dk (5 değil)
120 dk − 38,3 dk (tırmanış) = 81,7 dk; 81,7 / 22 döngü = **3,71 dk**. 5 dakikalık döngüler için ya tırmanış ~5 dk olmalı (o zaman 8–40 dk açılış yayılımı imkânsız) ya da kapı ~150 dk'ya çıkmalı. 3,69 dk, "5 ± 2" aralığının içinde ama alt ucunda.

---

## 7. Duyarlılık (Set A)

| Varyant | Kapı | Boost | Alım | İlk 10 dk | Döngü |
|---|---|---|---|---|---|
| Referans | 119,8 dk | 23 | 121 | 9 | 221 s |
| dt = 0,1 | 119,0 dk | 23 | 121 | 9 | 219 s |
| dt = 0,05 | 119,0 dk | 23 | 121 | 9 | 218 s |
| Döngü bütçesi 3 alım | 116,9 dk | 23 | **143** | 9 | 213 s |
| Tıklama 0/sn | **kilitlenir** | 0 | 0 | 0 | — |
| Tıklama 5/sn | 111,1 dk | 23 | 121 | 17 | 222 s |
| g = 1,32 | 113,0 dk | 23 | 123 | 13 | 221 s |
| g = 1,48 | 128,6 dk | 23 | 120 | 8 | 221 s |

Tıklama oranı erken oyunun en güçlü kaldıracı (Set B ile ölçüldü):

| Tıklama | Kapı | Halka 2 açılışı | İlk 10 dk alım |
|---|---|---|---|
| 0/sn | 119,8 dk | 15,1 dk | 8 |
| 2/sn | 106,0 dk | 2,8 dk | 27 |
| 5/sn | 103,5 dk | 1,3 dk | 36 |

Yani +1 butonunun gücü, ilk 40 dakikanın tamamını belirliyor. Tasarım kararı burada verilmeli: ya tıklama başlangıç için bir kıvılcım (Set A: c₁ = 25, ilk alım için 15 tıklama), ya da tıklamasız da yürüyen bir başlangıç (Set B: c₁ = 6).

Okuma:
- Sonuç dt'ye duyarsız (kapalı form entegrasyon).
- g tek başına kapıyı ±8 dk kaydırıyor; g ∈ [1,32; 1,48] aralığında kapı 110–130 içinde kalıyor → fiyat çarpanı için güvenli bant.
- Döngü bütçesi 3'e çıkarsa alım 143'e fırlıyor (üst sınıra yakın) ama kapı 117 dk'ya iniyor. 2'de kalınması önerilir.
- **Tıklama 0/sn ile Set A kilitlenir**: c₁ = 25 > başlangıç N = 10. İlk alım için 15 tıklama gerekir. Bu, +1 butonunun varlığıyla uyumlu (Cookie Clicker başlangıcı) ama tasarımda açıkça yazılmalı. Tıklamasız oyun isteniyorsa **Set B** kullanılmalı.

---

## 8. Yedek set — B (tıklamasız çalışır)

`c_i = 6 · 5,3^{(i-1)}`, `p_i = 0,080 · 1,062^{(i-1)}`, `g = 1,4`, tıklama 0/sn.

| # | Halka | cᵢ | pᵢ | İlk açılış |
|---|---|---|---|---|
| 1 | Parmaklar | **6** | **0,080** | 0,0 dk |
| 2 | Çentik | **28** | **0,084** | 15,1 dk |
| 3 | Abaküs | **136** | **0,090** | 21,4 dk |
| 4 | Kalem | **650** | **0,096** | 25,3 dk |
| 5 | Hesap Makinesi | **3 100** | **0,102** | 28,3 dk |
| 6 | Bilgisayar | **15 000** | **0,108** | 30,9 dk |
| 7 | Süperbilgisayar | **71 000** | **0,116** | 33,1 dk |
| 8 | Matematikçi | **340 000** | **0,123** | 35,2 dk |

Ölçüm: kapı **119,8 dk** · **23** boost · **121** alım · ilk 10 dk **8** alım · döngüler 3,78 dk (3,75–4,00) · ilk döngü 36,4 dk · son M = 1e361,9.
Fark: c₁ = 6 ≤ başlangıç N = 10 olduğu için oyun tıklamadan da başlar. Buna karşılık tıklayan oyuncuda erken oyun çok hızlanır — ölçüm: 2 tıklama/sn ile halka 2 **2,8 dk**'da açılır, kapı **106,0 dk**'ya iner, ilk 10 dk'daki alım 8 → 27 olur.

**Seçim önerisi:** oyunda +1 butonu varsa ve oyuncunun ilk dakikada tıklaması bekleniyorsa **A**; "aç ve git" başlangıcı isteniyorsa **B**.

---

## 9. Uygulama notları (kod yazarken)

1. **Zincir sert (stiff) bir sistem.** Naif Euler ile 0,5 sn adım, kapıyı %17 kaydırıyor (ölçüldü: 105,5 vs 119,8 dk); 0,05 sn'de fark %14'e iniyor. Gerçek motor 20 TPS'te 119,6 dk verdi (§11) — yani motorun güncelleme sırası bu naif tekrardan farklı ve hedefi tutuyor. Yine de adım büyütülür veya tick sırası değişirse aşağıdaki kapalı form en güvenli seçenek.
2. **Kapalı form adımı** (dt sabit; q_i = p_{i+1}; N ve A aynı anda güncellenir):
   ```
   A_i(t+dt) = Σ_{k=0..7-i} (∏_{j=i..i+k-1} q_j) · dt^k/k! · A_{i+k}
   N(t+dt)  = N + M·p₁· Σ_{k=1..8} (∏_{j=1..k-1} q_j) · dt^k/k! · A_{k-1}
   ```
   Katsayılar dt sabit olduğu için bir kez hesaplanır; adım başına ~36 Decimal çarpımı.
   Doğrulama: p = 0,1 (8 halka), 600 sn → kapalı form 4,79300e10; Euler dt = 0,005 → 4,79192e10 (dt→0 limiti ile uyumlu).
3. **M çarpanı yalnızca sayıya uygulanmalı** (D1). Halkalara da uygulanırsa N ∝ M⁸ olur ve döngüler saniyeye çöker.
4. **Boost'ta halkalar 1 birime inmeli** (D3); 0'a inerse zincir ölür ve oyuncu her döngü 8 halkayı yeniden kurmak zorunda kalır (~250 alım).
5. **İlk boost eşiği sabit olmalı** (10 × c₈), aksi hâlde boost sayısı kare hızına göre 23 ↔ 25 arasında oynar (D5).
6. **c₁ > başlangıç N** (Set A): oyun tıklamadan başlamaz. Bu bilinçli; ama "AFK başlangıç" isteniyorsa Set B.
7. **Prestij eşiği** 1,79e308; Set A'da son boost'tan 0,5 sn sonra aşılıyor — yani son boost fiilen "boşa" gidiyor, oyuncu bir sonraki karede prestij eder. İstenirse "kapıya 1 dekad kala boost kilitlenir" kuralı eklenebilir (bu, boost sayısını 22'ye düşürür).

---

## 10. Doğrulama

- Simülasyon `sim.mjs` içinde; `node sim.mjs --all` tüm sayıları yeniden üretir.
- Entegratör bağımsız olarak Euler'in dt→0 limitine karşı doğrulandı (§9.2).
- Tüm metrikler simülasyon çıktısından alınmıştır; raporda elle hesaplanmış hiçbir sayı yoktur (aritmetik çelişki analizi §6.2 hariç — o da ölçümle desteklendi).

---

## 11. Motor doğrulaması (üst ajan, 2026-10-23)

Raporun sabitleri GERÇEK oyun motoruna (`src/game/number/economy.ts`, 20 TPS) uygulandı ve
aynı politikayla yeniden ölçüldü (`engine-check.ts`, esbuild ile paketlenip node'da koşuldu):

| dt | Kapı | Boost | Alım | İlk 10 dk alım | Halka açılışları (dk) |
| --: | --: | --: | --: | --: | :--- |
| 0,05 (20 TPS) | **119,6 dk** | 23 | 121 | 9 | 0 · 11,7 · 22,0 · 27,5 · 30,8 · 33,4 · 35,4 · 37,2 |
| 0,10 | 119,8 dk | 23 | 121 | 9 | aynı |
| 0,50 | 119,8 dk | 23 | 122 | 9 | aynı |

Yani Euler entegrasyonu (20 TPS) bu sabitlerle hedefi birebir tutuyor; ek düzeltme gerekmedi.
Bu ölçüm `src/game/number/balance.test.ts` içinde **regresyon testi** olarak kilitlendi
(6 test: kapı 110–130 dk, 20–26 boost, 100–150 alım, ilk 10 dk ≥6 alım, tüm halkalar <45 dk).

Koda geçen üç yapısal düzeltme: D1 (boost yalnız sayı üretimine), D3 (boost sonrası halkalar
1 birim), D6 (kilitler mandallı).