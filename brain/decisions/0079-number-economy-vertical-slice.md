# ADR-0079: Sayı Ekonomisi Dikey Dilimi — 1. Basamak Uygulaması

## Durum

**Kabul edildi & uygulandı (2026-10-23)** — 1. basamak uçtan uca oynanabilir; eski tema koddan
silindi. Uygulama commit'i: `013c4b2` (`feat(number): sayi ekonomisi dikey dilimi — eski tema
silindi, 1. basamak oynanabilir`).

- **Karar kaynağı:** [`../research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md)
  §2.4 (`E1`–`E6`), §11 (`E7`–`E14`), §3.1 (süre eğrisi) — 50 kararın ekonomiye dokunan kısmı.
- **Üst kararlar:** [ADR-0077](0077-theme-pivot-number-hunter-and-comedic-voice.md) (tema pivotu +
  `P4`/`P5` silme), [ADR-0078](0078-pure-number-visual-language.md) (görsel dil, UI'yi açan kapı).
- **Denge ölçümü:** [`brain/scratchpad/balance-2026-10-23/report.md`](../scratchpad/balance-2026-10-23/report.md)
  (§`D1`–`D7` düzeltmeleri, Set A/B sabitleri). `K5` hâlâ açık — bkz. §9.

---

## Bağlam

ADR-0077 temayı sildi, ADR-0078 görsel sözleşmeyi yeniden yazdı; ama oyunun **ekonomisi** hâlâ
"Kozmik Oburluk"undu: `mass`, D1–D8 boyutları, Çekim Hızı, Ölçek Sıçraması, Galaksi, Lab,
Crisis, Neural, Time Clock, Colony, Singularity, başarımlar, meydan okumalar. `P4` bu içeriğin
**silinmesini** (arşivsiz), `P5` eski kayıtların **açılmamasını** şart koşuyordu.

`E8` uygulama sırasını **dikey dilim** olarak kilitledi: 2–11. basamaklar tasarlanmadan önce
1. basamak uçtan uca çalışacak. Gerekçe (proje sahibi): *"her katman üstünde düşünmek istiyorum
iyice, ona göre diğer katmanları yaparız."*

Bu ADR, o dilimin **uygulanmış** hâlini kaydeder: veri şeması, formüller, silinen kod, verilen
ödünler ve açık kalanlar.

---

## Karar

### 1. Veri şeması (saf, framework'süz)

Tek kaynak [`src/game/number/`](../../src/game/number/); Pinia yok, Vue yok — store ve testler
aynı fonksiyonları kullanır.

| Dosya | İçerik |
| :--- | :--- |
| `tuning.ts` | `NUMBER_TUNING`: kapı, `costGrowth`, `boostExponent`, `efficiencyBase`, `unlockThreshold`, 8 halkanın `baseCost`/`baseRate`'i |
| `economy.ts` | `NumberState`, alım, üretim, verim, boost, prestij, `advance(dt)`, `manualTap` |
| `upgrades.ts` | `Tanım` yükseltmeleri (4) + türetilmiş alanları uygulayan `applyUpgradeLevels` |
| `rungs.ts` | 11 basamak: ad, mikro etiket, ADR-0078 `G5` rengi |

**`NumberState` alanları:**

| Alan | Tip | Anlam |
| :--- | :--- | :--- |
| `number` | `Decimal` | ortadaki sayı (cüzdan = sayı, `E1`) |
| `peak` | `Decimal` | bu koşunun zirvesi — boost girdisi (`E14`); **mandallı** |
| `rings[]` | `{amount, bought}[]` | 8 halka; `bought` maliyet için |
| `unlocked[]` | `boolean[]` | halka kilitleri — **mandallı** (`D6`) |
| `boostMult` | `Decimal` | mini boost'ların biriktirdiği kalıcı çarpan |
| `boosts`, `totalBoosts` | `number` | koşu / hayat boyu boost sayısı |
| `rung` | `number` | basamak 1–11 (dikey dilimde daima 1) |
| `tanim`, `tanimTotal` | `Decimal` | harcanabilir / hayat boyu `Tanım` |
| `prestiges`, `totalBuys` | `number` | sayaçlar |
| `bestNumber` | `Decimal` | hayat boyu rekor |
| `gateReached` | `boolean` | kapı mandalı (sahne bir kez, `S3`) |
| `startNumber`, `chainMult`, `boostExp` | türetilmiş | `start` / `chain` / `boost` yükseltmelerinden |

**Store** (`src/stores/game.ts`) bu durumu genişletir: `taps`, `uselessTaps`, `playTime`,
`startedAt`, `lastSeenAt`, `upgrades`, `settings`, `seenVoice`, `latched` + uçucu
`autobuyTimer`, `offlineReport`.

**Ses durumu** ayrı: `src/game/voice/types.ts` → `VoiceContext` (`V3` veri sınırı; `hour` tek
dış veri). Ayrıntı: [`../context/narrative-voice.md`](../context/narrative-voice.md).

### 2. Ekonomi kuralları (uygulanan)

| Kural | Formül / davranış | Kaynak |
| :--- | :--- | :--- |
| **Zincir yönü** | halka *n+1* → halka *n*; halka 1 → sayı | `E6` |
| **Maliyet** | `c_i · 1,4^b` | `E10` |
| **Kilit** | o halkadan 10 birim → sonraki halka, **kalıcı** | `E11` + `D6` |
| **Sayı üretimi** | `A₁ · p₁ · boostMult · chainMult · verim` | `E6` + `D1` |
| **Halka üretimi** | `A_{i+1} · p_{i+1} · chainMult` (boost **yok**) | `D1` |
| **`Birikim` verimi** | `N ≤ kapı → 1`; değilse `0,9^log10(N/kapı)` | `E7` |
| **Boost kazancı** | `(zirve / başlangıç)^0,2`, çarpımsal birikir | `E14` |
| **Boost sıfırması** | sayı = başlangıç(10); her halka **1 birim**; kilitler açık | `E12` + `D3`/`D6` |
| **Kapı / prestij** | `N ≥ 1,79e308` → `Tanım = log10(1+A)`, `A = N/kapı` | `E7` |
| **`+1`** | gerçekten `+1`; çarpan yok | `S9` |

**Ölçümün zorunlu kıldığı üç düzeltme** (rapor §2.2; bunlar tasarım kararı değil, ölçüm
sonucudur):

- **`D1`** — Boost yalnız **sayı** üretimine uygulanır. Her halkaya uygulanınca `N ∝ M⁸` olur,
  döngü 2 saniyeye çöker (ölçüldü: 4,7 dk'da 11 boost, kapı).
- **`D3`** — Boost'ta halkalar 0'a değil **1 birime** iner. 0'a inince zincir ölür; oyuncu her
  döngü 8 halkayı yeniden kurar (ölçüldü: ~250 alım).
- **`D6`** — Kilitler **mandallıdır**; boost/prestij onları kapatmaz (`S3`'ün halka karşılığı).

### 3. Yükseltme tablosu (`Tanım`)

| `id` | Ad | Maks | Maliyet | Etki (seviye 0 → maks) |
| :--- | :--- | --: | :--- | :--- |
| `start` | Start higher | 6 | `0,5 · 2^l` | başlangıç sayısı `10 → 1e7` |
| `chain` | Chain output | 10 | `1 · 1,8^l` | zincir üretimi `×1,00 → ×3,50` (+%25/seviye) |
| `boost` | Deeper breath | 10 | `1,5 · 2,2^l` | boost üssü `0,20 → 0,40` (+0,02/seviye) |
| `autobuy` | Idle hands | 3 | `2 · 5^l` | otomatik alım: kapalı / 5 sn / 2 sn / 1 sn |

Tasarım ölçütü: ilk prestij ≈ **0,30 Tanım** (kapıda `A=1`), 10× aşımda ≈ **1,04**; yani ilk
yükseltme 0,5 Tanım ile ilk prestijde alınabilir.

### 4. Kayıt: v20 + `P5` sıfırlama

- `SAVE_VERSION = 20`, `MIN_SUPPORTED_SAVE_VERSION = 20` (`src/core/save-version.ts`).
- **v19 ve altı açılmaz.** Veda ekranı yok, migrasyon yok, arşiv yok (`P4` + `P5`). Gerekçe:
  pivot hem temayı hem ekonomiyi değiştirdi; eski kayıt anlam olarak da yüklenemez (kütle ≠ sayı).
- **Daha yeni kayıt reddedilir** (`SaveVersionError`), sessizce düşürülmez.
- **Şema:** kısa anahtarlar (kayıt boyutu) — `rings[] → {a, b}`. Uçucu alanlar (`autobuyTimer`,
  `offlineReport`) yazılmaz. `settings` tümüyle taşınır (`humor`, `notation`, `swirlShaderQuality`…).

### 5. Kapı sonrası — belgelenmiş stub

2. basamak `E5` uyarınca **kendi turunda** tasarlanacak. O zamana kadar prestij:

1. `Tanım` verir (`log10(1+A)`),
2. sayıyı başlangıca döndürür, zinciri `D3` kuralıyla 1 birime indirir,
3. **`rung`'u ilerletmez** — oyuncu 1. basamağı `Tanım` yükseltmeleriyle daha hızlı oynar.

Bu davranış `applyPrestige` içinde **yorumla belgelenmiştir**; sessiz eksik değil, bilinçli
stub'dır. 2. basamak yazıldığında basamak geçişi (ve `G8` sahnesi) buraya bağlanır.

### 6. Silinen kod envanteri (`P4`)

Commit `013c4b2`: **154 dosya silindi · 34 987 satır gitti · 22 dosya eklendi · 1 657 satır geldi.**

| Kategori | Örnekler |
| :--- | :--- |
| **Bileşenler (~30)** | `DimensionsTab`, `DimensionRow`, `LabTab`, `CrisisTab`, `NeuralTreeTab`, `ColonyTab`, `SingularityTab`, `AutobuyersTab`, `ChallengesTab`, `AchievementsTab`, `TimeClockOverlay`, `AnomalyOverlay`, `MotifBand`, `ScreenOverlay`, `JuiceLayer`, `SequentialStrikeLayer`, `HeartBurstLayer`, `SideSnapHands`, `Header`, `TabHero`, `AdminPanel`, `WelcomeBackModal`, `TeachingToast`, `FloatingThumbBar` + `autobuyers/`, `lab/`, `settings/`, `stats/` alt klasörleri |
| **Oyun verisi** | `achievements`, `challenges`, `unlocks`, `pacing`, `balance`, `layers`, `branches`, `corruption`, `clock-data`, `crisis-data`, `lab-data`, `neural-data`, `dimension_identity`, `news` + `news-early/mid/late` (toplam ~1 300 satır metin), `motifs`, `feature-teachings`, `speed-chip`, `autobuyer-data` |
| **Store dilimleri** | `stores/game/` altındaki 17 dosya (`actions-*`, `getters-*`, `state`, `cache`, `guards`, `store-api`) |
| **Çekirdek** | `cosmic-scale`, `particles`, `screen-shake`, `tilt`, `hold`, `celebrate`, `card-physics`, `teaching-display` |
| **Testler (~25)** | `unlocks.test` (1 050 satır), `achievements.test`, `challenges.test`, `balance.test`, `layers`, `branches`, `corruption`, `motifs`, `neural-data`, `clock-data`, store testleri (`time-clock`, `crisis-reactor`, `autobuyers-cockpit`, `save-roundtrip`…), `tests/*.spec.ts` |
| **Varlıklar** | `src/assets/motifs/*.svg` (17 dosya), `public/assets/hands/*` |
| **Stil** | `src/style.css` 1 972 satır → `--pn-*` tokenlarına indirgendi |

**Eklenenler:** `src/game/number/*` (4 modül + test), `src/game/voice/*` (3 modül),
`src/models/number.ts`, yeni bileşenler (`HeroNumber`, `TapButton`, `ChainList`, `TickerBar`,
`TelemetryLine`, `UpgradeList`, `StatsPanel`, `OfflineModal`, `SettingsModal`), yeni `App.vue`,
`index.html` (başlık + Space Grotesk/Space Mono), `style.css`.

### 7. Verilen ödünler

| Ödün | Bedel |
| :--- | :--- |
| **Tek basamak oynanabilir, 10 basamak boş** | `E9`: dikey dilim sahibin "bitti" demesine kadar sürer; ölçülebilir kabul ölçütü yok |
| **`rung` ilerlemiyor** | Prestij şu an "aynı basamağı daha hızlı oyna" demek; tema vaadi (11 basamak) henüz mekanikte yok |
| **`OmegaNum` yok** | 4. basamak (6 ok) gerçek aritmetik gerektirecek; `R5` riski ötelendi, silinmedi |
| **Kadran yok** | `T2` (`rank` + `mag`) 5. basamağa ertelendi; bugün her şey `break_eternity` `Decimal` |
| **Kapalı form yok** | Kod tick başına düz (Euler) ilerletiyor. **Ama ölçüm farkı çürüttü:** gerçek motor 20 TPS'te kapıyı **119,6 dk**'da veriyor (rapor §11), yani hedef tutuyor. Kapalı form artık bir *güvence*, zorunluluk değil (adım büyütülürse gerekir) |
| **Ses envanteri tek basamak** | 1. basamak havuzu ~120 satıra ulaştı (110 ticker + 11 sahne), ama 2–11 **boş** ve genel hedef ~400 satır (`T3`) karşılanmadı |
| **Başarım/meydan okuma yok** | `A6` açık: 86 başarım + 13 meydan okuma eski temayla birlikte silindi, yenisi yazılmadı |
| **Sahne motoru tetiklenmiyor** | `G8` motoru (`RungScene.vue`, 2.500 ms, mandallı) **var** ama `rung` ilerlemediği için hiç oynamıyor; `G11` (400 ms boost nefesi) henüz yok — boost yalnız ses + sayı sıçraması |
| **`humor` kapısı yarım** | `TickerBar` susuyor; sahne/başarım kanalları olmadığı için onların kapısı da yok (`A4`) |

### 8. Doğrulama (uygulama anında)

- `npm run typecheck` (`vue-tsc --noEmit`) → **0 hata**.
- `npm run build` (`vue-tsc && vite build`) → **başarılı** (87 modül).
- `npm test` (vitest) → **50 test** (3 dosya: `math`, `economy`, `cloud-conflict`).

> Ölçüm dalgası (`K5`) bu ADR yazılırken `src/game/number/tuning.ts` ve `economy.test.ts`
> üzerinde çalışıyordu. **Aynı gün yeniden doğrulandı:** `npm run verify` → 0 (typecheck 0 hata +
> **86 test** / 5 dosya: `math`, `economy`, `balance`, `voice`, `cloud-conflict`) ·
> `npm run build` → başarılı. Yukarıdaki "50 test", commit `013c4b2` anının sayısıdır.

---

## Sonuçlar

**Olumlu**

- Proje tek bir sayı etrafında **tutarlı**: kod, tema, ses ve görsel dil aynı yönü gösteriyor.
- Kod tabanı **~35 bin satır** küçüldü; kalan altyapı (kayıt, loop, ses, bulut, swirl) korundu.
- Ekonomi framework'süz ve test edilebilir: `advance(state, dt)` saf fonksiyon.
- Ölçümle kilitlenmiş sabitler tek dosyada (`tuning.ts`) — denge değişince tek yerden döner.

**Olumsuz / maliyet**

- **`R1` korumasız:** 85 saatte ekranda biriken hiçbir şey yok; yoğunluk tamamen ticker metnine
  ve sahne anlarına bağlı (`G7`, `G12` + bu ADR'nin "sahne motoru tetiklenmiyor" ödünü).
- Oyuncu 2 saatin sonunda **1. basamağı tekrar** oynuyor; 2. basamak yazılana kadar tema vaadi
  mekanikte eksik kalıyor.
- Eski oyuncunun 40 saatlik kaydı **silindi** (`P5`) — bilinçli, ama gerçek bir kayıp.

---

## Alternatifler (değerlendirildi, reddedildi)

| Alternatif | Neden reddedildi |
| :--- | :--- |
| Ekonomiyi koruyup yalnız metni değiştirmek | `P1`/`P5`: kütle ekonomisi `TREE(3)` ölçeğinde anlamsız; yarım pivot en kötü sonuç (`R6`) |
| 11 basamağı birden yazmak | `E8`/`E9`: her basamak kendi turunda; 2–11 bugün tasarlanmamış |
| Eski kayıtları migre etmek | `P5`: kütle → sayı dönüşümü anlamlı bir eşleme değil; oyuncuya yalan olurdu |
| 1. basamakta 13 jeneratör (ADR-0077 `K7`) | `E5`: 8 halka yeterli; 13'lük merdiven basamak geçişlerine yayılacak |
| Sabit boost çarpanı (`×1,5` / `×10`) | Ölçüldü: `×1,5` → kapıya 1 717 boost (86 saat); `×10` → 303 boost (909 dk). `(zirve/10)^0,2` → 23 döngü ≈ 2 saat |

---

## Açık maddeler

| # | Konu | Durum / sonraki adım |
| :-- | :--- | :--- |
| `K5` | Denge ölçümü | 🟡 Set A ölçüldü (119,8 dk / 23 boost / 121 alım); hedef 4b ("son halka ≥ 90 dk") diğer hedeflerle **aritmetik olarak çelişiyor** — karar bekliyor |
| 1 | ~~Euler → kapalı form~~ | ✅ **kapandı (ölçümle):** gerçek motor 20 TPS'te 119,6 dk · 23 boost · 121 alım. Kapalı form (rapor §9.2) yalnız adım büyütülürse gerekecek bir güvence |
| 2 | **2. basamak tasarımı** | Sıradaki büyük iş; `OmegaNum` adaptörü + kadran (`T1`, `T2`) burada devreye girer |
| 3 | `G8` / `G11` | `G8` motoru yazıldı (`RungScene.vue`) ama basamak ilerlemediği için tetiklenmiyor ve `humor` kapısı bağlı değil; `G11` boost nefesi yok. `A5` finali `G8` motorunu kullanacak |
| 4 | `A4` mizah kapısı | Sahne/başarım kanalları yazılınca tamamlanır |
| 5 | `A6` başarımlar + meydan okumalar | İçerik sıfırdan yazılacak (eski 86 + 13 silindi) |
| 6 | `A7` müzik motoru | `src/core/music/*` hâlâ eski temanın parça adlarını taşıyor (`synthwave`, `ambient_drone`) — uyarlama/redaksiyon kararı |
| 7 | `A8` İngilizce metin sahipliği | Kural yazıldı ([narrative-voice §10](../context/narrative-voice.md)); hacim tamamlanmadı |
| 8 | `G13` / `G14` | Mobil dizgi ve ticker yerleşimi; UI yazılırken netleşecek |

---

## Takip

- Ekonomi sabitleri: [`src/game/number/tuning.ts`](../../src/game/number/tuning.ts)
- Ekonomi kuralları: [`src/game/number/economy.ts`](../../src/game/number/economy.ts)
- Tasarım anlatısı: [`GAME_DESIGN.md`](../../GAME_DESIGN.md)
- Görev durumu: [`../tasks/in-progress.md`](../tasks/in-progress.md)

---

## Ek — Fiyat revizyonu (2026-10-23, ikinci tur)

İlk uygulamada halka fiyatları bir ızgara aramasından geliyordu (`25 · 10^{0,5(i-1)}` →
`79,06 / 790,57 / 7 905,69 / 79 056,94`). Sayılar okunmuyordu ve **geri ödeme süresi**
halkalar arasında 43 sn'den 32 sn'ye kayıyordu. Fiyat, tek bir değişmezden yeniden türetildi:

```
T_i = c_i / (p_i · c_{i-1}) = 40 sn      →      c_i = 3,2 · c_{i-1},  p_i = 0,08
```

**Karar:** tüm halkalar aynı hızda üretir (`RING_RATE = 0,08`), fiyat oranı sabittir (×3,2),
fiyatlar insan okunur sayılara yuvarlanır: **25 · 80 · 250 · 800 · 2 500 · 8 000 · 25 000 · 80 000**.
Ölçülen geri ödeme bandı **39–40 sn** (±%2,5), koşu **121,9 dk · 23 boost · 122 alım**.

**Açılış:** `c_1 = 25` → oyuncu 10 ile başlar, ilk halka **15 tık** sonra alınır (Cookie Clicker'ın
ilk cursor'ı da 15'tir; `S9`'un "+1 gerçek" kuralı böylece ilk saniyede hissedilir).
Yumuşak alternatif `c_1 = 20` (10 tık, 113,3 dk) ölçüldü ama uygulanmadı — açık madde.

Tam çalışma, elenen adaylar ve ölçüm tablosu:
[`../research/ring-pricing-2026-10-23.md`](../research/ring-pricing-2026-10-23.md).

---

## Ek — A+ revizyonu (2026-10-23, üçüncü tur)

**Bu ek, §2'deki maliyet satırını (`c_i · 1,4^b`), "Ek — Fiyat revizyonu" bölümünün tamamını ve
§9'daki `K5` satırının sayılarını geçersiz kılar.** Yürürlükteki ekonomi aşağıdadır.

### Ne değişti

| | İkinci tur (geçersiz) | **A+ (yürürlükte)** |
| :--- | :--- | :--- |
| Halka 1 üretimi | `0,08`/sn | **`NUMBER_RATE = 1`** sayı/sn |
| Halka 2–8 üretimi | `0,08`/sn | **`CHAIN_RATE = 0,11`** birim/sn (alttaki halkadan) |
| Fiyat merdiveni | 25 · 80 · … · 80 000 (×3,2) | **25 · 200 · 1 600 · 12 800 · 102 400 · 819 200 · 6 553 600 · 52 428 800** (×8, `ladderRatio`) |
| Birim büyümesi `g` | `1,4` | **`1,20`** |
| Halka başına birim | 6,2 | **11,4** (`log(8)/log(1,20)`) |
| Alım ritmi | tek birim | **10'lu blok** (`BLOCK_SIZE = 10`) |
| Blok fiyatı | — | `c · g^bought · (g^10 − 1)/(g − 1)` (AD'nin "Buy 10"ı) |
| Geri ödeme | 40 sn (kural) | **73 sn** (`8/0,11`); halka 1: **25 sn** |
| Kilit | 10 birim | 10 birim = **tek blok** (mandallı, `D6`) |

### Gerekçe

1. **Zincir 7 katlı bir integraldir:** `N(t) ≈ M·(∏p)·t⁸/8!`. Sekiz halka da 1/sn üretseydi
   `∏p = 1` olur ve zincir bugünkünün `(1/0,11)⁷ ≈ 5,1e6` katı güçlenirdi; ölçümde kapı
   **43 dakikaya** iniyor ve 10. dakikada **1,3e10** parmak oluyor. `CHAIN_RATE = 0,11` iki
   saatlik koşuyu koruyan sayıdır.
2. **"10'lu blok" bir fiyat sistemi değil, ritimdir.** Merdiven ×8 sabitken birim büyümesini
   `1,4 → 1,20` yapmak halka başına birim sayısını **6,2 → 11,4**'e çıkarır; kapı süresi
   değişmez (ölçüldü), böylece tek blok tam bir halkayı satın alır.
3. **`unlockThreshold = 10 = BLOCK_SIZE`** olduğu için yeni mekanik yok: bloğu tamamlayan oyuncu
   kilidi kendiliğinden açar; mandal (`D6`) aynen kalır.

### Ölçüm (gerçek motor, 20 TPS, 2 tık/sn, K5 politikası)

- kapı **119,0 dk** · **21** boost · **371** birim alımı · ilk 10 dk **42** alım kararı
- halka açılışları: **0 · 1,6 · 4,2 · 6,8 · 9,4 · 12,0 · 14,5 · 17,1 dk**
- regresyon bantları (`src/game/number/balance.test.ts`): kapı 110–130 dk · 18–24 boost ·
  ilk 10 dk ≥ 6 karar · 8 halka < 45 dk · halka başına en az bir blok (8 × 10 birim)

### AD araştırması (özet)

Antimatter Dimensions'ta üretim **1/sn**'dir ve fiyat "10 alımda kaç kat" diye yazılır
(1. boyut `1e3` … 8. boyut `1e15`; birim çarpanı bunun 10. köküdür). AD bu dikliği *Dimension
Boost* (her boyuta kalıcı ×2, boyut sayıları sıfırlanmaz) ve *Tickspeed* ile dengeler; bizim
boost'umuz ise halka sayılarını **sıfırlar** (`D3`). Bu yüzden AD tablosu birebir alınamaz —
ölçüldü: birebir alındığında oyun 240 dakikada `1e19`'da tıkanıyor, 7. ve 8. halka hiç açılmıyor.
A+ yalnız AD'nin **ritmini** alır (parmak 1/sn, 10'lu blok, ×8 merdiven); üst halkaların frenini
`CHAIN_RATE = 0,11` kurar.

Kaynak: [`../research/ad-pricing-and-chain-math-2026-10-23.md`](../research/ad-pricing-and-chain-math-2026-10-23.md)
§6 · [`../research/ring-pricing-2026-10-23.md`](../research/ring-pricing-2026-10-23.md).

### Açık kalan

- 2. basamak tasarımı (§9) bu ekten etkilenmez; `rung` hâlâ ilerlemiyor.
- `P1` (`c_1 = 25` → 15 tık) **değişmedi**: birim fiyatı 1,20 ile artıyor, ilk parmak yine 25.
