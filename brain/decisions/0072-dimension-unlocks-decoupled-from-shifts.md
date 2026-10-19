# 0072. Boyut Açılımları Sıçramadan Koparıldı — Deterministik Kütle Kapıları

- **Tarih:** 2026-10-19
- **Durum:** Kabul edildi ve uygulandı (P2.1)
- **Tür:** Ekonomi, Pacing, Oyun Tasarımı
- **İlgili Belgeler:** ADR-0025 (legacy `dimensionCapFloor`), ADR-0035 ("açılış bir OLAYdır", monotonik tepe nokta), ADR-0051 (maliyet ivmelenmesi), ADR-0071 (Şafak Merdiveni), Plan §4/§6 (`brain/research/pacing-economy-shift-redesign-plan-2026-10.md`), P0 Baseline (`brain/research/pacing-p0-baseline-2026-10.md`)
- **Süperseed eder:** ADR-0033'ün **"D4 1. Akış Sıçramasında açılır"** maddesi (ADR-0033'ün diğer maddeleri — taban 3, D3/D4 yumuşak merdiveni — yürürlükte kalır)

---

## 1. Bağlam ve Problem

Mevcut modelde açık boyut sayısı **sıçrama sayacına** bağlıydı:

```ts
const shiftCap = Math.min(
  8,
  BASE_UNLOCKED_DIMENSIONS + Math.max(state.lifetimePeakShifts ?? 0, state.dimensionShifts)
)
```

Yani her Akış Sıçraması **+1 boyut** açıyordu (D4–D8, toplam 5 sıçrama) ve aynı sıçrama
`shiftPowerMultiplier` ile **güç** de veriyordu. Sıçrama çift rolde olduğu için boyut
açılımı *zamanlanamıyordu*: oyuncunun sıçrama ritmi neyse açılım ritmi de o oluyordu.

**P0 ölçümü (active, seed 1, dt=0.5, 30 dk) bu teşhisi doğruladı:**

| Milestone | Süre |
| :--- | ---: |
| `first_shift` | 40.5 s |
| `d5` (2. sıçrama) | 104.5 s |
| `shift_4` | 268.5 s |
| `bot:dim8` (D8 açılmış) | 506 s |

D4 ilk sıçramada 40.5 s'de, D5 2. sıçramada 104.5 s'de geliyordu; D6–D8 ise
5. sıçramaya kadar (en geç `bot:dim8` = 506 s'de) tamamlanmıştı. Yani D4–D8, ilk
~8 dakikada ve tamamen sıçrama ritmine bağlı olarak açılıyordu. Plan §1/§4'ün
"ilk dakikalarda D4–D8 aynı anda iniyor" tespiti bu tabloyla **ölçülmüş** durumdadır;
açılışlar oyuncunun ritmine bağlı olduğu için deterministic bir merdiven
kurulamıyordu.

---

## 2. Karar

**Boyut açılımı sıçramadan tamamen koparılır ve deterministik kütle eşiklerine bağlanır.**
Sıçrama bu dalgada yalnızca güç çarpanı vermeye devam eder; açılış rolü yoktur.

### 2.1 Açılış kapıları — tek kaynak

`src/game/balance.ts` içinde yeni bir tablo tanımlandı:

```ts
export const DIMENSION_UNLOCK_GATES: ReadonlyArray<{ tier: number; minMatter: string }> = [
  { tier: 4, minMatter: '1e8' },
  { tier: 5, minMatter: '1e11' },
  { tier: 6, minMatter: '1e15' },
  { tier: 7, minMatter: '1e20' },
  { tier: 8, minMatter: '1e26' }
]
```

Türetme kuralı: **eşik = boyutun `BASE_COSTS` taban fiyatının 100 katı.**

| Boyut | Taban fiyat | Açılış eşiği |
| :--- | ---: | ---: |
| D4 | 1e6 | **1e8** |
| D5 | 1e9 | **1e11** |
| D6 | 1e13 | **1e15** |
| D7 | 1e18 | **1e20** |
| D8 | 1e24 | **1e26** |

> **PROVISIONAL:** Bu beş değer P0 ölçümü ile kilitlenecek. Aşağıdaki §6.3 ölçümü,
> mevcut `active` profilde eşiklerin hâlâ birbirine çok yakın düştüğünü gösteriyor;
> tablo P0 turunda yeniden aralıklandırılacaktır. Testler değeri değil **türetme
> kuralını** kilitler (`src/game/balance.test.ts`), böylece P0 kilitlemesi test kırmaz.

### 2.2 Hesap

```ts
export function dimensionGateUnlockCount(lifetimePeakMatter?: Decimal): number
export function resolvedUnlockedDimensionCount(state: {
  dimensionCapFloor: number
  activeChallenge: string | null
  lifetimePeakMatter?: Decimal
}): number
```

```ts
const gateCap = Math.min(
  8,
  BASE_UNLOCKED_DIMENSIONS + dimensionGateUnlockCount(state.lifetimePeakMatter)
)
const base = Math.max(gateCap, state.dimensionCapFloor)
const cap = challengeDimensionCap(state)
return cap === undefined ? base : Math.min(base, cap)
```

- `gateCap` = taban (3) + tepe kütlenin aştığı kapı sayısı (0..5).
- `dimensionCapFloor` (save v12 legacy taban) `max` ile korunur — eski kayıtların
  açık tier sayısı düşmez.
- `challengeDimensionCap` (C7 = 6) `min` ile kirpmaya devam eder.
- **Sıçrama terimi (`dimensionShifts` / `lifetimePeakShifts`) formülden çıkarıldı.**
  İki alan da state'te ve kayıtta **silinmedi** (istatistik + başka tüketiciler:
  `shiftPowerMultiplier`, `SACRIFICE_SHIFT_REQ`, `jumpLog`, çarpan dökümü).
- NaN/geçersiz `lifetimePeakMatter` güvenli tarafta 0 kapı sayılır
  (`isNan() || Number.isNaN(mag)`); sonuç taban 3'e düşer.

---

## 3. Neden YENİ Kayıt Alanı Yok

Plan §4 taslağı "yeni monotonik tepe alanı (`lifetimePeakUnlockedDims`) + save-version
migrasyonu" öneriyordu. Bu ADR onu **bilerek uygulamadı**:

1. **`lifetimePeakMatter` zaten monotoniktir ve kayıtlıdır** (ADR-0035). Kütle bir kez
   1e8'i geçtiyse alan asla geri inmez; sıçrama/küme/şafak resetleri onu düşürmez.
2. Dolayısıyla "hangi kapılar açıldı" bilgisi **türetilebilir**; onu ikinci kez
   saklamak iki doğruluk kaynağı (`lifetimePeakMatter` vs `lifetimePeakUnlockedDims`)
   üretir ve ikisinin ayrışması sessiz hata olur.
3. `save-version.ts` **değişmedi**: yeni alan yok, migrasyon yok, eski kayıtlar aynı
   şema ile yüklenir. Eski kayıtlarda tepe zaten `max(kayıtlı tepe, stats.highestMatter,
   matter)` olarak restore edildiği için açılımlar ilk yüklemede geri kazanılır.

**Sonuç:** ADR-0035'in "açılış bir OLAYdır, kapı değildir" ilkesi aynen korunur;
yalnızca olayın **kaynağı** sıçramadan kütleye taşınır.

---

## 4. Süperseed ve Korunanlar

**Süperseed:** ADR-0033'ün "1. Akış Sıçraması artık D4'ü açar (`min(8, 3 + shifts)`)"
maddesi geçersizdir. D4 artık kütle 1e8'e ulaşınca açılır.

**Korunanlar:**

- `BASE_UNLOCKED_DIMENSIONS = 3` (D1+D2+D3 baştan açık) — ADR-0033 §A korunur.
- `dimensionCapFloor` (save v12 legacy taban) ve `formatDiscoverSeenCap` varsayılanları.
- `challengeDimensionCap` (C7) kirpması.
- ADR-0026 / ADR-0033 yumuşak maliyet merdivenleri (`dimensionCostForBucket`).
- Sıçrama gücü (`shiftPowerMultiplier`), tekillik, SP ekonomisi — bu dalgada dokunulmadı.

---

## 5. Bu Dalgada Bilerek ERTELENENLER

Plan §6 açık kararlarına bağlı olduğu için aşağıdakiler **kapsam dışıdır**:

1. **Sıçrama = D8 sonrası hız çarpanı.** "Her sıçrama tüm üretime ve/veya Çekim
   Hızına kalıcı koşu-içi çarpan ekler" rolü ayrı dalga (plan §4/§6-2). Bugünkü
   `shiftPowerMultiplier` davranışı aynen duruyor.
2. **Sıçrama UI silüeti.** "D8 açılana dek sıçrama butonu silüette bekler" (plan §4)
   ayrı UI dalgası. `DimensionsTab.vue` sıçrama kartı bugünkü gibi görünür.
3. **Sıçrama gereksiniminin üstel kızışması.** `shiftRequirement` formülü değiştirilmedi
   (plan §6-1/§6-2).
4. **Açılış kutlaması ve teaser metni.** `celebrateFormatUnlock` çağrısı hâlâ
   `performScaleJump` içindedir; sıçrama artık tavanı değiştirmediği için normal akışta
   tetiklenmez. `DimensionsTab.vue` "N. Akış Sıçraması ile açılır" metni/çubuğu da
   sıçramaya bakar. İkisi de ayrı UI dalgasında kütle kapısına bağlanacak (izleme: §6).

---

## 6. Sonuçlar (Trade-off'lar)

### 6.1 Açılış kaynağı tekilleşti

Boyut açılımını artık yalnızca kütle belirler; oyuncunun sıçrama ritmi (bot/manuel)
açılım ritmini bozamaz. Deterministik omurga kuralıyla uyumludur.

### 6.2 Yan etki: sıçrama gereksinimi artık daha erken tier'a düşüyor

`shiftRequirement` (bu dalgada kodu değişmedi) hedef tier'ı
`min(BASE + shifts, unlocked)` ile kirpiyor. `unlocked` artık kütle kapılarından
geldiği için **D4 açılmadan önce** sıçrama D3'ü hedefliyor. Ölçümde ilk sıçrama
40.5 s'de (değişmedi), 4. sıçrama ise 268.5 s → **132.5 s**'ye indi. Bu, plan §4'ün
"D8 öncesi sıçrama yok" hedefinin bu dalgada **karşılanmadığı** anlamına gelir;
sıçrama yeniden görevlendirmesi ayrı dalganın işidir. Softlock riski yoktur
(gereksinim her zaman açık bir tier'ı hedefler).

### 6.3 Ölçüm: eşikler hâlâ kümeleniyor (P0 bulgusu)

Değişiklik sonrası `npm run harness:smoke` (active, seed 1, 30 dk):

| Boyut | Açılış anı (yeni, ölçüldü) | Açılış anı (baseline) |
| :--- | ---: | ---: |
| D4 | 185.5 s | 40.5 s (1. sıçrama, ölçüldü) |
| D5 | 191.0 s | 104.5 s (2. sıçrama, ölçüldü) |
| D6 | 197.0 s | sıçrama 3 (P0'da ayrı ölçülmedi) |
| D7 | 204.5 s | sıçrama 4 (P0'da ayrı ölçülmedi) |
| D8 | 217.0 s | sıçrama 5, en geç 506 s (`bot:dim8`) |

D4→D8 arası **yalnızca ~32 saniye**. Sebep: bu bantta ekonomi saniyede ~0.5 dekad
büyüyor; 100× taban (2 dekad) ≈ 3.5 s'ye denk geliyor. Yani "sıçramadan koparma"
hedefi gerçekleşti, ancak **"açılışları zamana yayma" hedefi bu geçici değerlerle
gerçekleşmedi**. Eşiklerin P0 turunda dekad bazında çok daha geniş aralıklandırılması
(veya zaman-tabanlı bir ikinci kısıt) gerekir. Bu ADR'in uyguladığı mekanizma bunu
destekler; yalnızca tablo değerleri değişecektir.

### 6.4 Bozulma merdiveni (corruption) girdisi

`corruptionLevel` `unlockedDimensionsCount` üzerinden beslenmeye devam eder; girdi
kaynağı artık kütledir. Merdiven yapısı değişmedi (K1: D5 → 1e11, K2: D6 → 1e15),
ancak **zamanlaması** sıçrama ritminden kütle eğrisine taşındı. ADR-0060/0062'nin
"monotonik sinyal" sözleşmesi bozulmadı.

---

## 7. Doğrulama

Gerçek komut çıktıları (son tur: `npm run verify` → **exit 0**, üç adım da yeşil):

- `npm run typecheck` → **exit 0**, çıktı yok (`vue-tsc --noEmit`).
- `npm test` → **28 dosya / 410 test geçti**, exit 0.
  - Yeni `src/game/balance.test.ts`: 11 test (her eşikte sınır davranışı, monotonluk,
    `dimensionCapFloor` tabanı, C7 kırpması, NaN güvenliği, taban-fiyat türetme kuralı).
  - `src/stores/balance.test.ts`: 2 yeni store testi (sıçrama tek başına açmaz; tepe
    kütle açar ve koşu resetinde geri kilitlenmez).
- `npm run harness:smoke` → exit 0, tüm assert'ler PASS:

```text
[active seed=1 dt=0.5] NOT REACHED (cap) | log10=97.62 shifts=9 gal=1 tickspeed=79 bots=11 wall=3.0s
[PASS] 30 dk aktif oyunda log10 >= 60 (bulunan: 97.6)
[PASS] en az 5 shift (bulunan: 9)
[PASS] tickspeed alimi yapildi (ekonomi donmedi)
```

Baseline (P0): `log10=90.72 shifts=8 gal=1`. Yeni: `log10=97.62 shifts=9 gal=1`.
log10 **60'ın altına düşmedi**; açılış kaynağı değiştiği için shift sayısı 8 → 9
(§6.2'deki tier hedefi gevşemesi). Beklenen sapma; assert'ler geçiyor.

---

## 8. Uygulama Özeti

| Dosya | Değişiklik |
| :--- | :--- |
| `src/game/balance.ts` | `DIMENSION_UNLOCK_GATES` + `dimensionGateUnlockCount()` eklendi; `resolvedUnlockedDimensionCount` imzasından sıçrama alanları çıkarıldı, `lifetimePeakMatter` eklendi. `BASE_UNLOCKED_DIMENSIONS` yorumu ADR-0072'ye bağlandı. |
| `src/game/balance.test.ts` | **Yeni dosya** — kapı sınırları, monotonluk, legacy taban, C7 kırpması, NaN güvenliği. |
| `src/stores/balance.test.ts` | 2 yeni ADR-0072 testi; `shiftRequirement` testinin D8 kaynağı yorumu düzeltildi (artık `dimensionCapFloor`). |
| `src/stores/game/cache.ts` | `dimMultCacheKey` `peakShifts` → `peakMatter` (tier pasifi açılışla değiştiği için anahtar doğru kalır). |
| `src/stores/game/getters-dimensions.ts` | Cache anahtarı `lifetimePeakMatter.toString()` ile besleniyor. |
| `src/stores/game/actions-save.ts` | Legacy (< v12) göç çağrısı `lifetimePeakMatter` alanıyla güncellendi (o noktada asıl tepe henüz restore edilmediği için `matter` geçici tepe). |
| `src/game/corruption.ts` | Yalnızca yorumlar: girdi kaynağı `lifetimePeakMatter` tabanlı kapılar (davranış değişmedi). |
| `src/stores/game/getters-misc.ts` | Yalnızca yorum: `corruptionLevel` girdisi ADR-0072 kaynağına bağlandı. |

**Dokunulmayanlar:** `save-version.ts` (migrasyon yok), `src/models/save.ts` (yeni alan yok),
`shiftPowerMultiplier`, tekillik/SP. `shiftRequirement` için bkz. aşağıdaki Ek.
---

## Ek — Sıçrama Gereksinimi Hedef Tier'ı (2026-10-19, aynı gün)

`shiftRequirement` hedef tier'ı seçerken iki ayrı kalıntı taşıyordu; ayrım netleştirildi:

1. **Erken dal (`shifts < 6`) — DEĞİŞMEDİ.** `tier = min(8, BASE_UNLOCKED_DIMENSIONS + shifts)`
   ifadesi "her sıçrama +1 boyut açar" varsayımı **değil**, bir **zorluk rampasıdır**: sıçramalar
   kademeli olarak daha yüksek boyut ister. Kilit açma artık kütle kapılarından geldiği için,
   zaten var olan `tier = min(tier, unlocked)` kırpması bu rampayı gerçek açık sayıya bağlar.
   Rampa **korunmuştur** — kaldırılması sıçramayı aşırı zorlaştırıyordu (ölçüm: smoke zirve
   `log10` 99.8 → 88.4, shift 9 → 8).

2. **Geç dal (`shifts >= 6`) — DÜZELTİLDİ.** Eskiden `tier: 8` sabitti; bu, "6+ sıçrama ⇒ D8
   açıktır" varsayımına dayanıyordu ve ADR-0072'den sonra **yanlış** olabilir: D8 henüz kilitliyken
   sıçrama, var olmayan D8 miktarını ister ve oyuncu sıçrama yapamaz hâle gelirdi. Artık
   `tier = unlocked` kullanılır: D8 açıkken değer yine 8'e eşitlenir (davranış korunur), kilitliyken
   erişilebilir en yüksek boyuta düşer.

**Yan düzeltme:** `DimensionsTab.vue` içindeki `isShiftUnlock` (ve "Boyut Aç" / "Yeni Format!"
metinleri) kaldırıldı — sıçrama artık boyut açmadığı için ölü ve yanıltıcıydı; buton yalnız boost
etiketini gösterir.

**Ölçülen etki (`harness:smoke` kapısı):** zirve `log10` 99.85 → **98.4** · shift 9 → 9 ·
tickspeed 81 → 80. Fark yalnızca geç dal düzeltmesinden gelir ve kabul edilmiştir.

