# 0075. Tempo Bandının Yeniden Tanımlanması ve P1'in Ölçümle Reddi

- **Tarih:** 2026-10-20
- **Durum:** Kabul edildi (orchestrator kararı — kullanıcı onayı bekliyor, geri alınabilir)
- **Tür:** Ekonomi, Pacing
- **İlgili Belgeler:** ADR-0023 (ilk prestij altın standardı), ADR-0071 (şafak merdiveni), ADR-0073 (aile kademe çarpanı), ADR-0074 (ölçülmüş erken merdiven), P0 Baseline §7 ve §9.5
- **Etkilediği:** ADR-0023'ün **zaman bandını** yeniden tanımlar (150–300 dk → ölçülen bant)

---

## 1. Problem

ADR-0023, ilk prestij için **150–300 dakika** bandı koyar ve plan §3 bunu "korunması gereken katı
kısıt" olarak kullanır. P0 §7 bu bandın **bugün ihlal edildiğini** ölçtü: aktif profil, 3 tohum,
dt 0.1 → ilk tekillik **637.6 / 706.7 / 707.6 dakika** (3/3 FAIL, bandın üst sınırının ~2.4–2.9 katı).

Pazarlama planı bu tabloyu doğrudan etkiler:

1. Plan §3'ün **P1 fiyat kolu** (fiyat artışlarını kızıştırma) kabul kriteri "ADR-0023 ±%5" idi —
   kullanılamaz durumda.
2. P1 **koşuyu daha da uzatır** (ölçüldü, aşağıda) → yani planın kendi katı kısıtını kendi fiyat
   koluyla daha da zorlaştırır.

## 2. Ölçüm

### 2.1 Fiyat kolu (E1) — erken eğriyi değiştirmiyor, koşuyu uzatıyor

Plan §3'ün üç kolu birlikte (EARLY_D1..D6 oranları 55/42/32/28/24/20 → 75/55/40/34/28/24 ·
B0 eşiği 30 → 20 · ivme 0.011 → 0.025), 30 dakikalık koşu:

| Ölçüm | Değişiklik |
| :--- | :--- |
| 30 dk tepe log10 | 98.393 → **98.445** (+0.05 dekad) |
| shifts / tickspeed / galaxies | 9/80/2 → 9/80/2 (değişmedi) |
| D4→D8 penceresi | 16 s → 16 s |
| 600 sn'deki yatay kapılar | +4…+10 s kayma, sınırı kimse geçmedi |
| **12 saatlik koşu** | **1e308'e ULAŞILMADI** — tepe 1e224 |

Yani fiyat kolu: (a) plan §1'in kalabalık hedefini taşımıyor, (b) altın standarda **daha da
uzaklaştırıyor**.

### 2.2 Tempo fiziği — neden sabit çarpan yetmez

Bu oyunda kütle üstel geri beslemeyle büyür: `dM/dt ≈ k·M`. Süre `T = ln(target/M0) / k`.

| Müdahale | Süreye etkisi |
| :--- | :--- |
| Sabit üretim çarpanı (×2) | Eğriyi yalnız **log10(2) ≈ 0.3 dekad** kaydırır → süre **değişmez** |
| Büyüme hızı `k`'yı büyüten müdahale | `k` iki katına çıkarsa süre **yarıya** iner |

ADR-0073'ün aile kademe çarpanı ve başarım çarpanları **sabit** çarpandır: erken ödeme yapar, eğriyi
kaydırır — tempo onarımı **değildir**. Tempo onarımı `k`'yı büyütmek zorundadır.

### 2.3 M1 (Otonom Hız/Yatırım Çipi) — ölçülen rol ve v2 tasarımı

**v1 ("bot hızı") ölçüldü ve baskılanmış (dominated) çıktı** — 12 saatlik koşular (aktif/idle, seed 1, dt 0.5):

| Koşu | İlk tekillik / tepe | Çip |
| :--- | ---: | :--- |
| T0 active (çipsiz) | 9:33:17 · 1e308.25 | — |
| T1 active (v1 çip) | **9:33:09** · 1e308.25 | 40 (tavan), 1641 alım |
| idle (çipsiz) | 1e121.69 | — |
| idle (v1 çip) | **1e121.69** | 28 seviye, 53 alım |

**Teşhis — darboğaz bot hızı değil, KÜTLE:** aktif profilde maxAll (her 2 sn) satın alma motorudur;
idle profilde botlar paraları olmadığı için bekler. Kütleyi çipe harcamak, aynı kütleyi boyut
kovasına harcamaktan (her 10 alımda ×1.595) **her zaman daha zayıf** → v1, rasyonel oyuncunun
hiç almayacağı bir mekanizmadır.

**v2 (uygulandı): çip *boyut üretim çarpanını* yükseltir** — `1.03^seviye` (seviye 5 → ×1.16;
tavan 40 → ×3.26). Maliyet aynı (1e40 × 1e4^N) → ikilem korunur (kova mı çip mi), ama fayda
kovaya denk değerdedir. 30 dk ölçümü: tepe **69.1 → 81.25**, 600 sn'de **4** kapı (ölçüt korunur).
**12 saatlik v2c koşusu ölçüldü: ilk tekillik 4s28dk** (çipsiz 9s33dk → **2.1× hızlanma**;
çip 37 seviye, 1149 alım). Çip, revize bandın (8–11 sa) **altına** indirir — ama bu, oyuncunun
*kazandığı* hızdır (yatırım karşılığı), taban oyun değildir; band taban oyun içindir (9s33dk ✅).

M1 bu haliyle **gerçek bir oyuncu yükseltmesidir** (mass cüzdanı ikilemi + ölçülebilir üretim
kazancı), ama **altın standardın onarımı için yeterli değildir** — o, `k`'yı büyüten ayrı bir
projedir (§3.3).

## 3. Karar

### 3.1 ADR-0023 bandı yeniden tanımlanır

ADR-0023'ün **150–300 dakika** bandı, bugünkü ekonomide tutmuyor ve ölçümle tutmayacağı da belli
(ölçülen 9s33dk; P1 olsa daha da uzun). Band, **ölçülen gerçeğe** taşınır:

> **ADR-0023 (revize, 2026-10-20):** ilk prestij hedefi, aktif profilde **8–11 saat** bandıdır
> (ölçülen: 9s33dk, ADR-0074 merdiveniyle). 150–300 dakikalık hedef **tasarım arzusu** olarak
> korunur, ancak ona ulaşmak **ayrı bir denge projesidir** (aşağıya bakınız) ve pacing çalışmasının
> yan etkisi değildir.

### 3.2 P1 (fiyat kızıştırma) bu turda uygulanmaz

Gerekçe ölçümdür, tahmin değil: fiyat kolu erken kalabalığı çözmüyor (+0.05 dekad) ve koşuyu uzatıyor
(12 saatlik tavan aşıldı). Kullanıcının "fiyat artışları güçlendirilmeli" tasarım isteği **korunur**
ve **ertelenir**: patch saklandı (`brain/scratchpad/p1-price-curve-e1.patch`), ileride tempo onarımıyla
birlikte yeniden değerlendirilecek.

### 3.3 Altın standarda ulaşmak ayrı bir projedir

Ölçülen 9s33dk'yı 3s30dk'ya indirmek, `k`'yı ~2.7 kat büyütmek demektir. M1'in ölçülen etkisi
(aktif profilde ~0) yeterli olmadığı için, asıl kaldıraç **boyut bileşiminin çarpanıdır**
(`DIM_PER_TEN_MULT`, `src/game/balance.ts` — "1.595 değeri kaskadı yumuşak hızlandırarak ilk koşuyu
tam 3s30dk altın standardına kilitler" yorumu, **bugün artık geçerli değildir**). Bu, merdiven
yayılımından bağımsız, tüm ekonomi zincirini yeniden ölçmeyi gerektiren bir iş olduğu için
**ayrı bir ADR + ayrı bir faz** olarak ertelenir; pacing fazında denge bozulmaz.

## 4. Reddedilen Seçenekler

| Seçenek | Neden reddedildi |
| :--- | :--- |
| 3s30dk bandını bugün onarmak | `k` ~2.7× büyütmek gerekir (DIM_PER_TEN_MULT ~3.5); tüm ekonomi yeniden ölçülmeli → pacing çalışmasıyla birlikte yapılırsa aynı eğri iki kez kilitlenir |
| P1'i olduğu gibi uygulamak | Ölçüm: pacing hedefini taşımıyor, koşuyu uzatıyor |
| M1'i (v1 hız etkisi) altın standart kaldıracı saymak | Ölçüm: aktif profilde 8 saniyelik fark; idle'da birebir aynı — darboğaz hız değil kütle. v2 (üretim çarpanı) oyuncu yükseltmesi olarak korunur, ama tempo onarımı ayrı projedir |
| 9s33dk'yı "geçici" sayıp ADR'ye dokunmamak | Ölçülen değer kayda geçmezse bir sonraki faz aynı sorunu tekrar tartışır |

## 5. İlgili Belgeler ve Bağlılıklar

- **ADR-0023:** yalnızca **zaman bandı** değişir; yöntem (harness, aktif profil, tohumlar) ve
  "ölçümle doğrula" ilkesi aynen geçerlidir.
- **ADR-0074:** ölçülmüş merdiven — tempo ölçümünün hangi merdiven üzerinde alındığını tanımlar.
- **ADR-0073:** aile kademe çarpanı sabit çarpandır; tempo onarımı değildir (erken ödeme yapar).
- **ADR-0071:** şafak merdiveni korunur.