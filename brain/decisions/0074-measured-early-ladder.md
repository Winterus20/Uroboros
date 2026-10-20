# 0074. Ölçülmüş Erken Merdiven — İlk 10 Dakika Kalabalığının Çözümü

- **Tarih:** 2026-10-20
- **Durum:** Kabul edildi ve uygulandı (P3.3)
- **Tür:** Pacing, Ekonomi, Oyun Tasarımı
- **İlgili Belgeler:** ADR-0023 (altın standart — tempo kararı ADR-0075'e taşındı), ADR-0026 (yumuşak erken merdivenler), ADR-0032 (dekad omurgası), ADR-0072 (boyut kapıları), ADR-0073 (başarım kapılı dallar), P0 Baseline §9 ([pacing-p0-baseline-2026-10.md](../research/pacing-p0-baseline-2026-10.md)), P3 ölçüm raporları ([p3-ladder-experiment](../research/p3-ladder-experiment-2026-10.md), [p3-final-ladder](../scratchpad/p3-final-ladder.md))
- **Süperseeder:** ADR-0072 §2'nin **"eşik = boyutun taban fiyatının 100 katı"** türetme kuralı (değerler ölçümle değişti; ADR-0072'nin diğer maddeleri yürürlüktedir)

---

## 1. Bağlam ve Problem

P0 §9 ölçümü, plan §1'in teşhisini doğruladı ve **daha kötü** gösterdi: ilk 10 dakikada **10 özellik
kapısı** açılıyordu (plan "7'ye yakın" diyordu). Daha önemlisi, çarpıklık sayıda değil
**kümelenmede**ydi:

| Milestone | A tablosunda |
| :--- | ---: |
| `crisis_spawn` (anomali) | 26 s |
| `autobuyers` (Botlar sekmesi) | 190 s |
| `stance_spam` | 194 s |
| `stance_private` | 197.5 s |
| `colony` (Koloni sekmesi) | 201 s |
| `crisis` (Kriz sekmesi) | 207 s |
| `spell_espresso` / `spell_noise` / `spell_sleep` | 209.5 / 215 / 236 s |
| `lab` (Lab sekmesi) | 353.5 s |

D4–D8 boyut açılımları **189 → 205 s** (16 saniyede 18 dekad). Dört yüzey 18 saniye içinde iniyordu;
plan §1'in "sindirme vadisi" (ardışık yatay açılış arası ≥10–15 dk) ölçümle ihlal ediliyordu.

**Teşhisin kaynağı ölçülerek ayrıştırıldı** — üç ayrı etken vardı ve sadece biri eşiklerdi:

| Etken | Ölçülen katkı (600 sn'deki kapı sayısı) |
| :--- | ---: |
| Fiyat eğrisi (plan §3'ün kolları) | **0** |
| Başarım kapıları (ADR-0073 dal kapısı) | **−4** |
| Boyut eşiği yoğunluğu | **−1…−2** |

---

## 2. Yöntem — Ölçüm Dizisi (E1…E6)

Varsayım kurulmadı; her aday **30 dakikalık gerçek koşuyla** ölçüldü (harness, active/seed 1/dt 0.5):

| Aday | Boyut eşikleri | 30 dk tepe log10 | 600 sn'de kapı | 30 dk'ta küme/max |
| :--- | :--- | ---: | ---: | :--- |
| **A** (eski) | 1e8/1e11/1e15/1e20/1e26 | **1e98.4** | 10 | 2 / var |
| **E1** = A + fiyat kolları | A | **1e98.4** | 6* | 2 / var |
| **E2** | 1e8/1e25/1e50/1e75/1e100 | 1e40.5 | **4** | 0 / yok |
| **E3** | 1e8/1e18/1e32/1e50/1e75 | 1e68.2 | 5 | 0 / yok |
| **E4** | 1e8/1e20/1e35/1e55/1e85 | 1e54.0 | 5 | 0 / yok |
| **E5** | 1e8/1e14/1e24/1e40/1e65 | **1e81.8** | 5 | 1 / var |

\* E1'deki 6, fiyatın değil ADR-0073'ün dal kapısının etkisidir (Kriz sekmesi artık 10 anomali
istediği için ~810 s'de açılıyor; ölçülen anomali aralığı 65–95 s, taban 40 s → 10. anomali
~785–790 s).

**İki alt sonuç (karar verici):**

1. **Fiyat eğrisi kalabalığı çözmüyor.** E1'de 30 dk tepesi 98.393 → 98.445 (**+0.05 dekad**);
   D4→D8 penceresi 16 s'de kaldı; yatay kapılar yalnız +4…+10 s kaydı, 600 s sınırını kimse geçmedi.
   Plan §3'ün "fiyatları kızıştır" kolu §1'in hedefini **taşımıyor** → P1'in kabul kriteri ölçümle
   sınırlandı (bkz. ADR-0075).
2. **Yayılımın bedeli ölçülebilir.** E2 kümelenmeyi tam çözdü (4 kapı) ama 30 dk tepesini
   1e98 → 1e40 düşürdü ve küme/max_mode'u 30 dk'nın dışına attı. **E5**, aynı 600 sn sayısıyla
   (5) çok daha küçük tempo bedeli taşır (1e81.8) ve küme + max_mode'u korur → **E5 seçildi.**

---

## 3. Karar — Ölçülmüş Merdiven

### 3.1 Boyut kapıları (`src/game/balance.ts` → `DIMENSION_UNLOCK_GATES`)

| Boyut | Eşik | Ölçülen açılış |
| :--- | :---: | ---: |
| D4 | 1e8 | 186 s |
| D5 | 1e14 | 195 s |
| D6 | 1e24 | 231.5 s |
| D7 | 1e40 | 353 s |
| D8 | 1e65 | 1377 s |

### 3.2 Yatay kapılar (`src/game/unlocks.ts` → `FEATURE_UNLOCKS`)

| Özellik | Eşik | Ölçülen açılış | Not |
| :--- | :---: | ---: | :--- |
| `crisis_spawn` | 1e3 | 26 s | izinli anomali |
| `autobuyers` | **1e12** | 189 s | plan §1 (1e9 → 1e12+); maliyeti ~0 (eğri dik) |
| `stance_spam` | **1e20** | 207 s | 195 s kümesinden çıkarıldı |
| `stance_private` | **1e32** | 260 s | aynı |
| `crisis` | 1e28 | 810.5 s | **dal kapısı** (2 kriz-ailesi başarımı) |
| `spell_espresso` | 1e34 | 810.5 s | dal kapısı (3 başarım) |
| `colony` | **1e66** | 1417.5 s | dal kapısı (2 otomasyon başarımı) + eşik |
| `spell_noise` / `spell_sleep` | 1e42 / 1e52 | — | dal kapısı (4/5 başarım) |
| `lab` | **1e70** | ~1927 s | D8 1e65 ile aynı-tik çakışmasını önler |
| `seed_nucleon` / `seed_gluon` / `seed_graviton` | 1e80 / 1e100 / 1e125 | — | dal kapıları (lab ailesi) |

**Yerleşim kuralı (yeni ve kalıcı):** her yatay kapı, bir boyut kapısının **arasında** bir dekada
oturur; böylece hiçbir yüzey bir boyut açılışıyla **aynı saniyede** açılmaz.

### 3.3 Kabul ölçütleri ve sonuçları (ölçülen)

| # | Ölçüt | Ölçülen | Sonuç |
| :-- | :--- | :--- | :--- |
| 1 | 600 sn'de açılan özellik ≤ 5 | **4** | ✅ |
| 2 | Aynı saniyede boyut+özellik çakışması = 0 | **0** | ✅ |
| 3 | D4 → D8 penceresi ≥ 60 s | **1191 s** | ✅ |
| 4 | İlk küme ≤ 1500 s · max_mode ≤ 1800 s | **1448.5 s** · **1702 s** | ✅ |
| 5 | 12 saatlik koşuda tepe ≥ 1e250 | **1e308.25** (ilk tekillik 9s33dk) | ✅ |
| 6 | Yüzeyler arası ≥ 8 dk (480 s) | 621.5 s · 607 s · ~510 s | ✅ |

### 3.4 Ölçüt 6'nın zorlayıcı yanı — neden koloni 1e66

Sabit çapalar `autobuyers` (189 s) ve `crisis` (810.5 s, dal kapısı) arasında **621.5 s** vardır.
Dört yüzeyin her ardışık çifti ≥480 s olacaksa, Botlar ile Kriz arasına **tek** yüzey sığar ve
penceresi 669 s ile 330.5 s arasında olmalıdır → 669 > 330.5, yani **hiçbir koloni eşiği oraya
yerleşemez**. Koloni ancak D8'in (1e65) hemen ardına, ~1e66 bandına çekildiğinde dört yüzey de
8 dk'lık aralığa oturur (ölçülen 1417.5 s). Bu, ölçüt 1'i de 5'ten **4'e** indirdi.


> **Not — P3.3 ölçüm raporunun §8(b) önerisinden sapma:** Rapor, yatay eşiklerin "olduğu gibi
> bırakılmasını" öneriyordu (gerekçe: kaydırma 600 sn sayısını düşürmüyor, yalnız +2.5…+16 s
> yeniden aralıklandırıyor). Bu ölçüm **bu tablo üzerinde** alındı; bu ADR'nin uyguladığı
> yerleşimde (`autobuyers` 1e12 · `stance_spam` 1e20 · `stance_private` 1e32 · `colony` 1e66 ·
> `lab` 1e70) **ölçüt 1 5'ten 4'e** iner ve **ölçüt 6 (yüzeyler arası ≥8 dk)** sağlanır —
> yani sapma ölçümle doğrulanmış, raporun kendi §11 önerisinin (koloni ~1e63 bandına çekilmesi)
> yönünde uygulanmıştır. Sapmanın maliyeti yoktur: 12 saatlik koşu 9s33dk (çipsiz) ile aynıdır.

---

## 4. Reddedilen Seçenekler

| Seçenek | Neden reddedildi |
| :--- | :--- |
| A (mevcut tablo) | 600 sn'de 10 kapı; ölçüt 1–6'nın hiçbiri geçmiyor |
| B (plan metni: yalnız autobuyers 1e12) | Ölçüldü: 600 sn sayısı değişmiyor (eğri 1e9→1e56'yı 74 s'ye sıkıştırıyor) |
| C′ (sentetik 1e68+ kapılar) | Kontratı birebir tutar ama otomasyon 13+ dk gecikir, casual/idle'de 30 dk'da bile açılmaz; ayrıca `unlockAutobuyer()` feature kapısını kontrol **etmediği** için harness ölçemiyor (ölçüm körlüğü) |
| E2/E3/E4 (orta/yayılmış tablolar) | 600 sn sayısını düşürmüyor (5) ve tempo bedeli E5'in 2–3 katı (tepe 1e40–1e68) |
| Fiyat eğrisiyle çözüm (plan §3) | Ölçüldü: erken eğriyi hiç değiştirmiyor, koşuyu uzatıyor (ADR-0075) |

---

## 5. Bağlılıklar

- **ADR-0032 (dekad omurgası):** korunur — merdiven yine dekad eşiklerinden gelir; yalnız
  değerler ve yatay kapıların konumu ölçümle değişti.
- **ADR-0026 (yumuşak erken merdivenler):** korunur; erken maliyet oranları değişmedi.
- **ADR-0073 (dal kapıları):** korunur; bu ADR merdiveni *sayısal* tabloyu, ADR-0073 *mekanizmayı*
  tanımlar. Birlikte etkisi: 600 sn'deki kapı sayısı 10 → 4.
- **ADR-0072:** yalnızca "eşik = taban fiyatı × 100" türetme kuralı geçersiz kılındı; taban fiyat
  tablosu ve boyut açılış mekanizması aynen durur.
- **ADR-0023 (tempo):** bu ADR tempo bandına **değinmez**; ölçülen 9s33dk sonucu ve bandın
  yeniden tanımlanması → **ADR-0075**.

---

## 6. Kaynak Ölçümler

- `brain/scratchpad/harness/out/p3-final-ladder.json` (30 dk) · `orch-final-12h.json` (12 saat, çipsiz)
  · `orch-colony166.json` (koloni 1e66 varyantı, 30 dk) · `orch-chips-12h.json` (çip açık, 12 saat)
- `brain/scratchpad/p3-final-ladder.md` (P3.3 raporu) · `brain/research/p3-ladder-experiment-2026-10.md`
  (E1…E6 analizi) · `brain/research/pacing-p0-baseline-2026-10.md` §9 (deney dizisi)
