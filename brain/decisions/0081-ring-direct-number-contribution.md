# ADR-0081: Halkaların Sayıya Doğrudan Katkısı — `RING_DIRECT_SHARE`

## Durum

**Kabul edildi & uygulandı (2026-10-23)** — proje sahibinin oyun içi geri bildirimi üzerine.

- **Geri bildirim:** *"Bu sayı artım kısmında saniyede K/s gibi şeyler yazıyor ya; halkalar da
  kendinden bir öncekini üretiyor sadece. Bir de satın alınan her halka belli bir miktar K/s
  kısmına da eklese nasıl olur — belli bir miktar?"*
- **Üst kararlar:** [ADR-0079](0079-number-economy-vertical-slice.md) (`E6` zincir yönü, `D1`
  boost kuralı, A+ sabitleri), [ADR-0078](0078-pure-number-visual-language.md) (satır dili).

---

## Bağlam

A+ ekonomisinde sayıyı **yalnız halka 1** üretir: `sayı/sn = A₁ · p₁ · M`. Halka 2–8 yalnızca bir
altındakini besler; etkileri sayıya **zincirin 7 katlı integrali** üzerinden, dakikalar içinde
ulaşır (`N(t) ≈ M·(∏p)·t⁸/8!`). Sonuç: oyuncu Abacus'tan bir blok alır, `/s` okuması **hiç
kımıldamaz**; satın alma ile sayı arasındaki bağ yalnızca zamanla kurulur. Geri bildirim tam
olarak bunu işaret ediyor.

Ölçüm (gerçek motor, K5 politikası): `/s` içinde halka 2–8'in payı **%0**; okuma tek başına
Fingers'ın sayısıdır.

---

## Karar

### 1. Her halka (2–8) sayıya doğrudan yazar

```
d_i     = p_i · RING_DIRECT_SHARE     i ≥ 2    (RING_DIRECT_SHARE = 1 → d_i = 0,11/sn)
sayı/sn = (A₁ · p₁ + Σ_{i≥2} A_i · d_i) · M    M = boostMult · chainMult · verim
```

Yani halka, bir altındakine verdiği miktarı **sayının kendisine de** ekler: "4/s aşağı, +4/s
sayıya". Zincir yönü (`E6`) değişmez; zincir artık tek yol değil, **iki yoldan biri**.

### 2. Halka 1 katkı almaz

`d_1 = 0`. Fingers zaten sayının kendisidir; ona ikinci bir katkı eklemek "1 parmak = 1 sayı/sn"
cümlesini (`S9`'un "+1 gerçek" dayanağı) bozardı.

### 3. Boost kuralı (`D1`) korunur — katkı sayı üretimidir

`d_i` `M`yi **alır**, zincir beslemesi (`ringGainPerSecond`) almaz. `D1`'in cümlesi aynen
geçerli: "boost yalnız **sayı** üretimine uygulanır." Katkı sayı üretimidir.

### 4. Arayüz: satırda ikinci okuma

Zincir satırı `miktar · x/s` okumasını korur (bir altındakine besleme) ve **`+x/s`** ekler
(sayıya doğrudan katkı, `--pn-text-faint` tonunda). `/s` telemetrisi ikisinin toplamıdır.
Fingers satırında `+` yoktur (katkı 0) ve satır artık **toplam `/s`yi değil kendi payını**
gösterir (`ringGainPerSecond(state, 0)`).

### 5. Tek sabit, tek yer

`RING_DIRECT_SHARE` (`src/game/number/tuning.ts`). `0` → özellik kapanır (eski davranış).

---

## Ölçüm (gerçek motor, 20 TPS, 2 tık/sn, K5 politikası)

`src/game/number/balance.test.ts` ile aynı politika, `RING_DIRECT_SHARE` taranarak:

| `RING_DIRECT_SHARE` | Kapı | Boost | Alım | `/s` içindeki pay (tırmanış) |
| --: | --: | --: | --: | :--- |
| `0` (taban, ADR-0079) | **119,0 dk** | 21 | 371 | %0 |
| **`1` (seçilen)** | **118,85 dk** | 21 | 371 | **%1,4 – 3,6** |
| `2` | 117,94 dk | 21 | 371 | %3,1 – 7,0 |
| `4` | 116,72 dk | 21 | 371 | %6,3 – 13,3 |

Halka açılışları (`RING_DIRECT_SHARE = 1`): **0 · 1,6 · 4,1 · 6,8 · 9,3 · 11,9 · 14,5 · 17,0 dk**
(taban: 0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · 17,1). İlk 10 dk **42** alım kararı — değişmedi.

Katkının payı koşu boyunca sabit değil: tırmanışta küçük, **boost sonrası ilk saniyede büyük**
(halkalar 1 birime indiği için taban okuma oradadır; ölçülen **%52**). Döngünün açılışı bu yüzden
belirgin biçimde hızlanır — ölçüm bunu 0,15 dakikaya mal ediyor.

---

## Alternatifler (değerlendirildi)

| Alternatif | Neden reddedildi |
| :--- | :--- |
| Yalnız arayüzde "zincir ne zaman sayıya ulaşır" göstergesi | Mekanik değişmez; geri bildirimin özü "satın alma sayıya dokunsun" |
| Katkıyı `8^i` ile ölçeklemek (her halka eşit pay) | Ölçüldü: 60. dakikada katkı Fingers'ın **28 katı** oluyor — zincir ikinci plana düşer |
| Katkıyı boost'suz bırakmak | `boostMult` 1e10+ olduğunda katkı görünmez olur; `D1` zaten "sayı üretimi" diyor |
| Halka 1'e de katkı vermek | "1 parmak = 1 sayı/sn" (`S9`) bozulur; ilk alımın anlamı zaten `+1/s` |
| `RING_DIRECT_SHARE = 4` | Daha görünür ama halka başına maliyet 2,3 dk; zincirin ağırlığı azalır |

---

## Sonuçlar

**Olumlu**

- Satın alınan her halka `/s` okumasına **anında** dokunur; geri bildirim kapandı.
- Denge neredeyse bedava: kapı 119,0 → **118,85 dk** (bant 110–130), boost/alım sayıları sabit.
- Tek sabitle geri alınabilir (`RING_DIRECT_SHARE = 0`).

**Olumsuz / maliyet**

- Zincirin "tek kaynak" sadeliği gitti: `sayı/sn` artık iki terimli.
- `ringGainPerSecond(state, 0)` anlamı değişti (toplam değil, Fingers'ın payı) — çağıran tek yer
  store; testte pinlendi.
- `D1` testi yeniden yazıldı: eski hâli "halka 2 varken `numberPerSecond = 0`" diyordu; yeni hâli
  beslemenin boost almadığını, katkının aldığını ayrı ayrı doğrular.

---

## Açık maddeler

| # | Konu | Durum |
| :-- | :--- | :--- |
| 1 | Katkı payının geç oyunda (`/s` 1e10+) görünürlüğü | 🟡 Yapısal: satın alma başına artış `/s`nin 4+ mertebe altında kalır. Görünürlük ancak çarpımsal bir terimle (ör. "her halka zinciri %x hızlandırır") çözülür — ayrı tasarım turu |
| 2 | `RING_DIRECT_SHARE` değerinin oynanışla seçilmesi | 🟡 Bugün `1`; tablo yukarıda, karar sahibinde |

---

## Takip

- Sabit: [`src/game/number/tuning.ts`](../../src/game/number/tuning.ts) (`RING_DIRECT_SHARE`)
- Motor: [`src/game/number/economy.ts`](../../src/game/number/economy.ts) (`ringDirectRate`,
  `directNumberPerSecond`, `ringNumberRate`, `numberPerSecond`)
- Arayüz: [`src/components/ChainList.vue`](../../src/components/ChainList.vue)
- Ölçüm artefaktları: [`../scratchpad/direct-rate-probe/`](../scratchpad/direct-rate-probe/)
