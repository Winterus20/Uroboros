# Halka Fiyatlandırması — 8 halkanın tam fiyat çalışması (2026-10-23)

> **Sorun:** 1. basamağın fiyatları bir ızgara aramasından çıkmıştı: `25 · 10^{0,5(i-1)}`,
> yani `79,06 / 790,57 / 7 905,69 / 79 056,94`. Sayılar okunmuyor, kuralı yok ve
> halkalar arasında **geri ödeme süresi** 43 sn'den 32 sn'ye kayıyordu (dip halka %25 daha hızlı ödüyor).
> Bu belge fiyatı **tek bir değişmezden** türetir ve ölçümle doğrular.
> **Durum:** ✅ uygulandı — `src/game/number/tuning.ts` · doğrulama `src/game/number/balance.test.ts`.

---

## 1. Kural (tek cümle)

**Her halka 0,08 birim/sn üretir ve her halka bir öncekinin 3,2 katı eder.**

Bu iki sayının çarpımı tek bir değişmez verir:

```
T_i = c_i / (p_i · c_{i-1}) = 3,2 / 0,08 = 40 saniye      (i = 2..8)
```

**Her halka kendini 40 saniyede öder.** 3,2 keyfî değil: hedef geri ödeme (40 sn) ×
halka üretimi (0,08/sn). Üretim sabit olduğu için merdiven bir **hız** merdiveni değil,
bir **değer** merdivenidir — üstteki halka daha hızlı üretmez, daha değerli olanı üretir.

Ölçülen sapma: **39–40 sn** (yuvarlama payı, ±%2,5).

---

## 2. Fiyat tablosu (uygulanmış ve ölçülmüş)

| # | Halka | Taban maliyet `c_i` | 10 birimlik kilit bedeli | Geri ödeme | İlk açılış | Alım (koşu) |
| --: | :--- | ---: | ---: | ---: | ---: | ---: |
| 1 | **Fingers** | **25** | 1 745 | 313 sn | 0,0 dk | 33 |
| 2 | Notch | **80** | 5 585 | 40 sn | 11,4 dk | 10 |
| 3 | Abacus | **250** | 17 453 | 39 sn | 21,0 dk | 10 |
| 4 | Pencil | **800** | 55 851 | 40 sn | 26,1 dk | 10 |
| 5 | Calculator | **2 500** | 174 534 | 39 sn | 29,3 dk | 10 |
| 6 | Computer | **8 000** | 558 509 | 40 sn | 31,7 dk | 10 |
| 7 | Supercomputer | **25 000** | 1 745 342 | 39 sn | 33,7 dk | 10 |
| 8 | **Mathematician** | **80 000** | 5 585 093 | 40 sn | 35,4 dk | 29 |

Kilit bedeli = `c_i · (1,4^10 − 1)/0,4` = **24,86 · c_i** (10 birim almanın toplam fiyatı).

**Okunuşu:** ilk halka 25'e alınır (oyuncu 10 ile başlar → 15 tık). 10 Fingers 1 745 eder ve
Notch'u açar. Sonra her halka bir öncekinin ~3,2 katıdır; 10 birimlik geçiş bedeli de aynı oranda
büyür. Matematikçi 80 000'e alınır; 10 birimi 5,59 milyon eder — ama o noktada üretim de o
ölçektedir, çünkü **her halka 40 saniyede kendini ödüyor**.

---

## 3. Neden bu kural (türetme)

Halka `i+1`, halka `i`'yi üretir. Bir birim halka `i`'nin **gölge değeri** `c_i`'dir (onun fiyatı).
Yani bir birim halka `i+1`, saniyede `p_{i+1}` birim halka `i` üretir; bu da saniyede
`p_{i+1} · c_i` değerindedir. Geri ödeme:

```
T_i = c_i / (p_i · c_{i-1})
```

Eşit geri ödeme istiyorsak `c_i = T · p_i · c_{i-1}` olmalı — yani **fiyat oranı, üretim oranının
T katı**. `p` sabitse oran sabittir: `3,2`. `p` halkadan halkaya değişirse oran da değişmeli;
ilk sürümde `p` 1,05× büyüyordu ama fiyat oranı sabit tutulmuştu — geri ödemenin 43→32 kaymasının
sebebi buydu. **Çözüm:** `p`'yi sabitlemek. O zaman tek katsayı hem fiyatı hem geri ödemeyi taşır.

---

## 4. Elenen alternatifler (hepsi ölçüldü)

| Aday | Kapı | Boost | Alım | Geri ödeme (sn) | Neden elendi |
| :--- | --: | --: | --: | :--- | :--- |
| Eski ızgara (`25·10^{0,5i}`) | 120,0 dk | 23 | 122 | 42/40/38/37/35/33/32 | Okunmaz sayılar; geri ödeme kayıyor |
| Düz ödeme + `p` gradyanı (1,05×) | 127,1 dk | 23 | 122 | 40/40/40/40/40/40/40 | Fiyatlar 146 000'e çıkıyor, kapı 127'ye kayıyor |
| `1-2-5` merdiveni | 118,9 dk | 23 | 122 | 40/43/37/39/33/35/30 | Geri ödeme ±%15 dalgalanıyor |
| `p = 10^{4i}` (astronomik) | **0,2 dk** | — | — | — | Kapı anında açılıyor (rapor §2.2) |
| **Düz `p` + 3,2 oranı** | **121,9 dk** | **23** | **122** | **39–40** | — (seçilen) |

---

## 5. Açılış kararı (`c_1`) — tıklama sayısını belirleyen tek sayı

`c_1` merdivenin tamamını ve dolayısıyla koşu süresini belirler. Ölçüm (2 tık/sn):

| `c_1` | Merdiven (×3,2) | Kapı | Boost | İlk alım | Gerekli tık | Son halka |
| --: | :--- | --: | --: | --: | --: | --: |
| 6 | 6 … 19 200 | 88,6 dk | 24 | 0,5 sn | 0 | 16,6 dk |
| 10 | 10 … 32 000 | 98,7 dk | 24 | 0,5 sn | 0 | 21,9 dk |
| 15 | 15 … 48 000 | 105,8 dk | 23 | 2,5 sn | 5 | 27,5 dk |
| 20 | 20 … 64 000 | 113,3 dk | 23 | 5,0 sn | 10 | 32,6 dk |
| **25** | **25 … 80 000** | **120,2 dk** | **23** | **7,5 sn** | **15** | **37,3 dk** |

**Seçilen: `c_1 = 25`.** Gerekçe:

1. **Hedef süre:** 110–130 dk bandının tam ortası (2 saat sözü). `c_1 ≤ 15` bandın altına düşüyor.
2. **Janra eşitliği:** Cookie Clicker'ın ilk cursor'ı 15 kurabiye, oyuncu 0 ile başlar → **15 tık**.
   Bizde de tam **15 tık**. `+1` butonu dekor değil, zincirin kökü (`S9`).
3. **İlk dakika:** ilk alım 7,5 sn'de geliyor; ilk 10 dakikada 9 alım yapılıyor (hedef ≥6).

> **Yumuşak açılış isteyen için hazır alternatif:** `c_1 = 20` → 10 tık, 113,3 dk, 23 boost,
> son halka 32,6 dk. Tek satır değişiklik (`tuning.ts`) + `balance.test.ts` alt sınırı.

---

## 6. Doğrulama (gerçek motor, 20 TPS, 2 tık/sn)

| Metrik | Hedef | Ölçülen |
| :--- | ---: | ---: |
| Kapı (`1,79e308`) | 110–130 dk | **121,9 dk** |
| Mini boost | 20–26 | **23** |
| Satın alma | 100–150 | **122** |
| İlk 10 dk alım | ≥6 | **9** |
| Halka açılışları | <45 dk | 0 · 11,4 · 21,0 · 26,1 · 29,3 · 31,7 · 33,7 · **35,4** |
| Geri ödeme bandı | ≤±10% | **39–40 sn** (±%2,5) |
| Son boost çarpanı | — | `M ≈ 1e321,5` |

`src/game/number/balance.test.ts` bu tabloyu regresyon olarak kilitler.

---

## 7. Değişen dosyalar

| Dosya | Ne |
| :--- | :--- |
| `src/game/number/tuning.ts` | `RING_RATE = 0,08` sabiti; 8 halkanın `baseCost`'u 25/80/250/800/2 500/8 000/25 000/80 000 |
| `src/game/number/economy.test.ts` | Sabit `0,071` yerine `NUMBER_TUNING.rings[0].baseRate` |
| `src/game/number/balance.test.ts` | Değişmedi — yeni sabitlerle de geçiyor (kapı 121,9) |
| `GAME_DESIGN.md` §4 | Tablo + fiyat kuralı |
| `brain/decisions/0079-…` | Fiyat revizyonu eki |

---

## 8. Açık nokta

`c_1 = 20` alternatifi ölçülmüş ve hazır ama **uygulanmadı**; proje sahibi "daha yumuşak açılış"
derse tek satırla geçilir. Karar `brain/tasks/todo.md` içinde açık madde olarak duruyor.
