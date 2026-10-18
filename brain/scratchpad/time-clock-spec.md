# TIME CLOCK (Zaman Yayı) — Donmuş Uygulama Sözleşmesi

> **Durum:** Tasarım onaylandı (kullanıcı, 2026-10-17). Bu dosya ajanlar arası **tek doğruluk kaynağıdır**.
> Sözleşmedeki isim/imza/dosya sahipliği dışına çıkma. Çelişki görürsen uygulama, sözleşmeye uy.

---

## 1. Mekanik (tek paragraf)

Ekranın ortasında kocaman bir saat belirir (~26 sn). Oyuncu ibreyi **dairesel çekerek geriye sarar**.
Sarma miktarı gerçek oyun zamanına çevrilir: **kadran 120 saniyelik bir pencereyi temsil eder**.
Oyuncu 80 saniye geri sararsa, kütlesi **gerçekten** 80 saniyelik üretim kadar azalır (zaman yolculuğu).
Yay sertleşir: son çeyrekte aynı miktar gerginlik için çok daha fazla tur gerekir (hiperbolik doyum).
İbre bırakıldığında yay boşalır: **zaman hızı** anlık olarak `peak` değerine fırlar ve üstel olarak 1×'e söner.
Bu süre boyunca **yalnız üretim** katlanır (buff süreleri, lab yaşlanması, bot saatleri normal akar).

**Risk/ödül eğrisi (tasarımın çekirdeği):** bedel geri sarılan saniye ile **doğrusal**, ödül ise
yay enerjisi gibi **kuadratik** büyür. Sonuç: az sarmak **zarar**, iyice germek **büyük kâr**.
Oyuncu "ya iyice ger, ya hiç dokunma" dersini kendi keşfeder.

## 2. Denge sayıları (hepsi `src/game/clock-data.ts`'te tek dosyada)

| Sabit | Değer | Not |
|---|---|---|
| `TIME_CLOCK_SPAN_SECONDS` | `120` | Kadranın geri sarılabilir oyun-zamanı penceresi |
| `TIME_CLOCK_LIFETIME_SECONDS` | `26` | Saatin ekranda kalma süresi |
| `TIME_CLOCK_STIFFNESS_K` | `2.0` | rad — hiperbolik sertlik (bkz. §4) |
| `TIME_CLOCK_MAX_DRAG` | `600` | rad — güvenlik clamp'i (t ≈ 0.9966) |
| `TIME_CLOCK_DECAY_BASE_PER_SEC` | `0.035` | Yay sönümü (gerginlik/sn, düşük gerginlikte) |
| `TIME_CLOCK_PEAK_SPEED_MIN` | `1.5` | × — en zayıf salgı |
| `TIME_CLOCK_PEAK_SPEED_MAX` | `16` | × — tam gergin salgı |
| `TIME_CLOCK_RELEASE_SECONDS_MIN` | `16` | sn |
| `TIME_CLOCK_RELEASE_SECONDS_MAX` | `75` | sn |
| `TIME_CLOCK_RELEASE_DECAY_EXP` | `1.6` | Üstel sönüm şekli |
| `TIME_CLOCK_SPAWN_INTERVAL_MIN` | `180` | sn — **v2 (2026-10-18): 240→180**, mekanik çok nadir görünüyordu |
| `TIME_CLOCK_SPAWN_JITTER` | `60` | sn — **v2: 90→60** |
| `TIME_CLOCK_MIN_TENSION` | `0.05` | Altında salmak anlamsız (net zarar) — UI eşiği sabit değil, `releaseProfitRatio < 1`'den türetilir |
| `TIME_CLOCK_PERFECT_TENSION` | `0.9` | **v2** — bu gerginlikten yukarı salgı KUSURSUZ |
| `TIME_CLOCK_PERFECT_DURATION_MULT` | `1.35` | **v2** — kusursuz salgı süresi çarpanı |
| `TIME_CLOCK_STREAK_BONUS_PER_STEP` | `0.10` | **v2** — kârlı seri adımı başına tepe hız oranı |
| `TIME_CLOCK_STREAK_MAX_STEPS` | `5` | **v2** — seri bonus tavanı (maks +%50) |

> **Uygulama notu (2026-10-17):** Sözleşmedeki `TIME_CLOCK_PITY_SECONDS` (600 sn) **kaldırıldı**.
> Doğuş aralığı tavanı 330 sn < 600 sn olduğu için sabit hiçbir zaman ateşlenemiyordu (ölü kod) ve
> hiçbir mantık onu okumuyordu. Doğuş ritmi deterministik: her 240–330 sn'de bir saat gelir.

**Beklenen sonuç tablosu** (testte kilitlenecek, bkz. §10):
**DÜZELTİLDİ (2026-10-17):** Aşağıdaki tablo ilk yazımda eski sabitlerle (peak 14× / süre 70 sn)
hesaplanmıştı; §2 sabitleri 16× / 75 sn'ye çekilince **§4 formülleri tek doğruluk kaynağıdır**.
Tablo formüllerden yeniden türetildi (Ajan A doğrulaması: `src/game/clock-data.test.ts` bu satırları kilitler).

| Gerginlik | Peak hız | Süre | Enerji (+sn) | Bedel (sn) | Net | Oran |
|---|---|---|---|---|---|---|
| 0.25 | 3.31× | 30.8 sn | +27.4 | 30 | −2.6 | **0.91× (zarar)** |
| 0.50 | 6.63× | 45.5 sn | +98.5 | 60 | +38.5 | 1.64× |
| 0.80 | 11.9× | 63.2 sn | +264 | 96 | +168 | 2.75× |
| 1.00 | 16.0× | 75.0 sn | +432.7 | 120 | +312.7 | 3.61× |

**Başabaş noktası ≈ `tension 0.345`.** Altı net zarar, üstü net kâr; oran monoton artar
(küçük gerginlikte 0'a iner, patlama/istismar yok). UI'daki "ZAYIF SALGI — NET ZARAR" uyarısı
`releaseProfitRatio(tension) < 1` koşuluna bağlanmalıdır (sabit eşik yazma).

### 2.1 v2 uzantısı (2026-10-18 — kullanıcı isteğiyle iyileştirme turu)

1. **Kusursuz Salgı:** `tension >= 0.9` salgılar `speedDuration = releaseDuration(t) × 1.35`
   alır; altın konfeti/şok dalgası + `playClockPerfect()` fanfarı + `stats.clockPerfectReleases`.
   `TimeClockState`'e YENİ alan: `speedDuration` (salgının GERÇEK süresi). Kusursuz bonusu
   `durationFromPeakSpeed` ters çözümüyle geri getirilemez; §6.4 tick artık `speedDuration`
   okur (alan 0 ise eski ters çözüm yedeği). Önizleme getter'ı da bonusu gösterir.
2. **Seri (Streak):** `isProfitableRelease(t) (oran ≥ 1)` salgılar seriyi +1 büyütür,
   zayıf salgı 0'a indirir. Tepe hız `streakPeakBonus(streak)` ile çarpılır:
   `1 + min(streak−1, 5) × 0.10` (ilk kârlı salgı nötr, tavan +%50).
   İstatistikler: `stats.clockStreak` (güncel) + `stats.clockBestStreak` (rekor).
3. **UI v2:** kadran üzerinde altın KUSURSUZ bölge yayı (son %10 dilim), SERİ / KUSURSUZ /
   SONUM çipleri, ≥ %97 gerginlikte kozmetik tremble (`.clock-dial-strain`, motion gate'li),
   klavye ile sarma (Sol/Aşağı ok = 0.35 rad).
4. **UI v2.1 — görsel dil hizalaması (sözleşme: brain/context/visual-language.md):**
   altın TEK TON `#f59e0b`e normalleştirildi (`#fbbf24` ihlali düzeltildi; konfeti, şok
   dalgası, bölge yayı ve CSS glow'lar dahil); hero gerginlik sayacı `font-display`
   (m6x11plus, 36/54 ızgara, sentetik bold yok) oldu; sarma bilgi paneline FAZ KAPILI GIC
   kolaj dokunuşları eklendi (tape köşeleri + `collage-scrawl` el yazısı notu —
   `--substrate-opacity` K0'da 0, okunabilirlik kanonu korunur).

## 3. Fazlar

```
idle ──spawn──▶ winding ──release──▶ released ──süre biter──▶ idle
                   │                     ▲
                   └──timeout (26 sn)────┘   (yay kendiliğinden boşalır)
```

- `idle`: saat yok, `speed = 1`.
- `winding`: saat ekranda. `remainingTime` iner. Oyuncu çevirdikçe `drag` artar, kütle erir.
  Süre biterse **otomatik `released`** (ceza yok, ama o gerginliğin karşılığı kadar ödül).
- `released`: `speed` peak'ten 1×'e söner, `speedRemaining` iner. Bitince `idle`.

---

## 4. Saf matematik (`src/game/clock-data.ts`) — DOSYA SAHİBİ: AJAN A

**Saf modül.** Store/audio/DOM import etmez. Yalnız `src/models/clock.ts` tiplerini import eder.

```ts
export function tensionFromDrag(drag: number): number
// t = drag / (drag + K);  drag<=0 → 0; sonuç [0, MAX_DRAG/(MAX_DRAG+K)] ≈ 0.9966

export function dragFromTension(tension: number): number
// ters fonksiyon: drag = K * t / (1 - t);  t>=1 → MAX_DRAG ile clamp

export function rewoundSecondsForTension(tension: number): number
// tension * TIME_CLOCK_SPAN_SECONDS

export function applyTensionDecay(tension: number, deltaSeconds: number): number
// t' = t - DECAY_BASE_PER_SEC * (0.5 + 0.5 * t) * dt,  min 0 (yay fiziksel sönüm, gerginken hızlı söner)

export function releasePeakSpeed(tension: number): number
// MIN + (MAX - MIN) * tension ** 1.5

export function releaseDuration(tension: number): number
// MIN + (MAX - MIN) * tension

export function releaseSpeedAt(peakSpeed: number, elapsed: number, duration: number): number
// τ = clamp(elapsed / duration, 0, 1);  return 1 + (peakSpeed - 1) * (1 - τ) ** DECAY_EXP

export function releaseEnergySeconds(peakSpeed: number, duration: number): number
// analitik integral: (peakSpeed - 1) * duration / (DECAY_EXP + 1)   → "kaç saniyelik normal üretim bedava"

export function releaseProfitRatio(tension: number): number
// releaseEnergySeconds(...) / rewoundSecondsForTension(tension)   (0 → 0)

export function createIdleTimeClock(): TimeClockState   // state.ts + layers.ts ortak varsayılan
export function nextClockInterval(): number            // MIN + Math.random() * JITTER
```

> `nextClockInterval()` rastgelelik içerdiği için **saf değil** kabul edilir ama yan etkisizdir.

## 5. Tipler — DOSYA SAHİBİ: AJAN A

`src/models/clock.ts` (yeni):

```ts
export type TimeClockPhase = 'idle' | 'winding' | 'released'

export interface TimeClockState {
  phase: TimeClockPhase
  active: boolean          // saat ekranda mı
  drag: number             // rad — birikmiş çevirme miktarı (tek doğruluk kaynağı)
  remainingTime: number    // sn — winding fazında ekranda kalan süre
  speed: number            // × — aktif zaman hızı çarpanı (idle'da 1)
  speedRemaining: number   // sn — released fazında kalan süre
  peakSpeed: number        // released başlangıç hızı (UI/özet için)
  totalRewoundSeconds: number  // hayat boyu geri sarılan saniye (istatistik)
  releases: number             // kaç kez salındı
  bestTension: number          // en iyi gerginlik (istatistik)
}
```

`src/models/types.ts` içine ekle (mevcut re-export bloğunun yanına):
```ts
export type { TimeClockPhase, TimeClockState } from './clock'
```

## 6. Store — DOSYA SAHİBİ: AJAN B

### 6.1 `src/stores/game/state.ts`
`buildInitialState()` içine (anomali bloğunun yakınına):
```ts
timeClock: createIdleTimeClock(),
clockTimer: 0,
nextClockInterval: TIME_CLOCK_SPAWN_INTERVAL_MIN,
```

### 6.2 `src/stores/game/getters-clock.ts` (YENİ) — `export const clockGetters = { ... }`
```ts
timeClockTension: number            // tensionFromDrag(this.timeClock.drag)
timeClockRewoundSeconds: number     // rewoundSecondsForTension(tension)
timeClockProductionMult: Decimal    // new Decimal(this.timeClock.speed)  (idle'da 1)
timeClockIsWinding: boolean         // phase === 'winding'
timeClockIsReleasing: boolean       // phase === 'released'
timeClockHandAngleDeg: number       // -(rewound / SPAN) * 360 * 1.5   → tam gerginlikte -540°
timeClockPreviewPeakSpeed: number   // releasePeakSpeed(tension)  (winding fazında tahmin)
timeClockPreviewDuration: number    // releaseDuration(tension)
```

### 6.3 `src/stores/game/actions-clock.ts` (YENİ) — `export const clockActions = { ... }`
```ts
spawnTimeClock(): boolean
// phase !== 'idle' veya active ise false. Aksi halde: phase='winding', active=true,
// remainingTime = LIFETIME, drag = 0, speed = 1, speedRemaining = 0, clockTimer = 0,
// nextClockInterval = nextClockInterval(). sounds.playClockSpawn(). return true

windTimeClock(dragDeltaRadians: number): void
// Yalnız phase === 'winding' iken. Guard: !Number.isFinite || <= 0 → return.
//  - prevRewound = timeClockRewoundSeconds
//  - timeClock.drag = min(TIME_CLOCK_MAX_DRAG, drag + delta)
//  - nextRewound = yeni tension'dan hesaplanan rewoundSeconds
//  - deltaRewound = nextRewound - prevRewound              (geri sarma = pozitif = kütle kaybı)
//  - matterFloor = max(1, floorBaseline * 0.5)             (floorBaseline = spawn anındaki matter)
//  - drain = mps * deltaRewound  (mps = this.matterPerSecond, bugünkü gerçek değer)
//  - matter -= drain; matter < floor ise matter = floor (taban korunur)
//  - stats.totalMatterProduced AZALTILMAZ, highestMatter AZALTILMAZ (monotonist kalır)

releaseTimeClock(): boolean
// Yalnız phase === 'winding'. tension = timeClockTension.
// tension < TIME_CLOCK_MIN_TENSION ise yine salınır (ödül ~1×, zarar oyuncunun).
//  - peakSpeed = releasePeakSpeed(tension), speedRemaining = releaseDuration(tension)
//  - phase = 'released', active = false, drag = 0, speed = peakSpeed
//  - totalRewoundSeconds += rewound(prev), releases++, bestTension = max(...)
//  - sounds.playClockRelease(tension). return true

resetTimeClock(): void   // timeClock = createIdleTimeClock(), clockTimer = 0
```

**Floor kuralı:** `winding` başlarken `clockMatterFloor` alanı **YOK**; taban her tick
`max(1, matter_şu_an_taban)` yerine basitçe `matter`'ın o anki değerinin altına inmesini engelleyen
tek kural: `matter >= 1` (oyun 10 ile başlar, 1 taban yeterli ve şaşırtmaz). **Kesinleştirildi:**
`matter = Decimal.max(matter, 1)`. Ekstra alan ekleme, sözleşmeyi şişirme.

### 6.4 `src/stores/game/actions-misc.ts` — `update()` entegrasyonu
`update()` içine, mevcut "Aktif Buff Sürelerini Azalt" bloğunun **hemen ardına** yeni bir blok:

```ts
// Zaman Yayı (Time Clock): doğuş → geri sarma → salgı
if (!this.offlineSimActive && this.isFeatureUnlocked('time_clock')) {
  if (this.timeClock.phase === 'idle') {
    this.clockTimer += deltaSeconds
    if (this.clockTimer >= this.nextClockInterval) this.spawnTimeClock()
  } else if (this.timeClock.phase === 'winding') {
    this.timeClock.remainingTime -= deltaSeconds
    // Sönüm: yay kendiliğinden gevşer → zaman ileri akar → kütle geri gelir
    const prev = this.timeClockRewoundSeconds
    this.timeClock.drag = dragFromTension(applyTensionDecay(this.timeClockTension, deltaSeconds))
    const nextRewound = this.timeClockRewoundSeconds
    const deltaRewound = nextRewound - prev
    if (deltaRewound !== 0) {
      this.matter = Decimal.max(this.matter.minus(this.matterPerSecond.times(deltaRewound)), 1)
    }
    if (this.timeClock.remainingTime <= 0) this.releaseTimeClock()
  } else if (this.timeClock.phase === 'released') {
    this.timeClock.speedRemaining -= deltaSeconds
    const elapsed = releaseDurationForState - this.timeClock.speedRemaining  // sözleşme: aşağıya bak
    this.timeClock.speed = releaseSpeedAt(this.timeClock.peakSpeed, elapsed, releaseDurationForState)
    if (this.timeClock.speedRemaining <= 0) {
      this.timeClock.phase = 'idle'
      this.timeClock.speed = 1
      this.timeClock.speedRemaining = 0
    }
  }
} else if (this.timeClock.speed !== 1) {
  this.timeClock.speed = 1   // özellik kilitli / offline: güvenlik sıfırlaması
}
```
> `releaseDurationForState` hesabı için `released` fazına girerken `speedRemaining` zaten
> `releaseDuration(tension)` olarak kuruluyor; elapsed = `releaseDuration(tension) - speedRemaining`
> değerini yeniden üretmek için `peakSpeed`'ten ters çöz: `releaseDuration`'ı `peakSpeed` ile
> ifade eden saf yardımcı ekle → `durationFromPeakSpeed(peakSpeed: number): number` (AJAN A ekler,
> §4'e dahildir: `MIN + (MAX-MIN) * ((peakSpeed-MIN)/(MAX-MIN)) ** (1/1.5)`).

**Üretim faktörü:** `actions-misc.ts` D1→matter bloğunda (`this.productionBuffMultiplier` çarpımının
olduğu satır) `.times(this.timeClockProductionMult)` ekle. Başka hiçbir yere ekleme — D2→D1 zincirine
**kasten** dokunulmaz (katlanarak patlar).

### 6.5 `src/stores/game/getters-dimensions.ts` — parite zorunlu
`matterPerSecond` (≈ satır 677-706) ve `matterProductionBreakdown` (≈ satır 714-736) içine de
`timeClockProductionMult` faktörünü ekle. Parite testi: `src/stores/scale-jumps.test.ts:124-130`.

### 6.6 `src/stores/game.ts`
`clockGetters`'ı getters'a, `clockActions`'ı actions'a spread et. Yeni export gerekmez.

### 6.7 `src/stores/game/store-api.ts`
Yeni getter ve action imzalarını `StoreApi`'ye ekle (imzalar §6.2/§6.3 ile birebir).

## 7. Kayıt / Sıfırlama / Kilit — DOSYA SAHİBİ: AJAN C

### 7.1 `src/core/save-version.ts`
`SAVE_VERSION` 17 → **18**. `MIN_SUPPORTED_SAVE_VERSION` **güncellenmez** (17 kalır).

### 7.2 `src/models/save.ts`
```ts
/** Zaman Yayı (Time Clock) kalıcı sayaçları (v18). Canlı faz kaydedilmez (uçucu). */
timeClock?: { drag?: number; totalRewoundSeconds?: number; releases?: number; bestTension?: number }
```

### 7.3 `src/stores/game/actions-save.ts`
- `serialize()`: `timeClock: { drag, totalRewoundSeconds, releases, bestTension }` ekle.
- `deserialize()`: savunmacı oku (`clampSavedNumber` ile): `drag` [0, TIME_CLOCK_MAX_DRAG],
  sayaçlar ≥ 0; `bestTension` [0, 1]. **Faz her zaman `idle`'a döner** (`active=false`, `speed=1`,
  `remainingTime=0`, `speedRemaining=0`) — `floatingAnomalies = []` ile aynı uçucu muamele.
  Yükleme sonunda `this.clockTimer = 0`, `this.nextClockInterval = TIME_CLOCK_SPAWN_INTERVAL_MIN`.

### 7.4 `src/game/layers.ts`
- `ScaleJumpHost` arayüzüne: `timeClock: TimeClockState`, `clockTimer: number`.
- `applyResetScope()` içindeki `if (scope.clearRunFx)` bloğuna:
  `host.timeClock = createIdleTimeClock()`, `host.clockTimer = 0`.
- `src/game/layers.test.ts` `makeHost()` fabrikasına iki alanı ekle + `clearRunFx` sonrası
  `expect(host.timeClock.phase).toBe('idle')` benzeri bir doğrulama.

### 7.5 `src/game/unlocks.ts`
`FEATURE_UNLOCKS` dizisine, `order` **artış sırasını bozmayacak** biçimde ekle:
```ts
{
  id: 'time_clock',
  name: 'Zaman Yayı (Time Clock)',
  hint: '1e120 g Kütle biriktir',
  req: { kind: 'dopamine', amount: decadeGate(120) },
  order: 1200
}
```
(Komşu kayıtlar 1e100 → 1000 ve 1e125 → 1250 mertebesindeyse araya tam oturur; değilse en yakın
boşluğa yerleştir ve raporda belirt.)

## 8. UI + Ses + Efektler — DOSYA SAHİBİ: AJAN D

### 8.1 `src/components/TimeClockOverlay.vue` (YENİ)
- Kök: `fixed inset-0` + **yeni** `.layer-clock` (z-index 55), `pointer-events-none`.
  Yalnızca saat gövdesi `pointer-events-auto`. `#game-main-content` **içine koyma** (ADR-0044:
  screen-shake transform'u `position: fixed` çocukları tuzağa düşürür).
- Ortada: SVG kadran — dış halka, 12 çentik, akrep, merkez göbeği. Boyut `min(70vmin, 520px)`.
- **Dairesel sürükleme (rotary input, repoda ilk kez):**
  - `pointerdown` → `el.setPointerCapture(e.pointerId)`, merkeze göre açıyı kaydet.
  - `pointermove` → `atan2` ile yeni açı; **unwrap** (delta'yı (-π, π] aralığına indir); `sum += delta`.
  - `sum > 0` (saat yönü tersi/K.CCW ayrımı) → `store.windTimeClock(delta)` ile besle.
    Sözleşme: **saat yönünün tersine** çevirme geri sarma sayılır ve **pozitif** delta üretir.
  - `pointerup` / `pointercancel` / `lostpointercapture` → `store.releaseTimeClock()`.
  - Dokunmada `touch-action: none` (kök stil) şart, yoksa sayfa kayar.
- Bilgi paneli: `GERGİNLİK %62` (çubuk), `GERİ SARILAN 74 sn`, `TAHMİN 6.4× / 47 sn`,
  ve altında kırmızı uyarı: gerginlik `< 0.3` iken "ZAYIF SALGI — NET ZARAR".
- `winding` sırasında `remainingTime` halkası (AnomalyOverlay'deki `dasharray/dashoffset` matematiği).
- `released` fazında: tam ekran flash yok (motion gate), akrep ileriye hızla döner
  (`animation-duration` = `speedRemaining`, CSS custom property ile), ortada dev `×{{ speed.toFixed(1) }}` sayacı.
- **Motion gate:** `useMotionReduced()` true ise konfeti/shake yok, **ama mekanik girdisi asla kilitlenmez**.
- Space/Escape **bağlama** (Header.vue Space'i sahipleniyor). `Enter` ile salma destekle.
- Emit edilecek global olaylar (mevcut desen): `doomscroll:feast-scene` (`scene: 'time_warp'`),
  `doomscroll:shake`, `doomscroll:shockwave`, `doomscroll:tap`.

### 8.2 `src/style.css`
`.layer-clock { z-index: 55; }` token'ını z-index merdiveni yorumunun yanına ekle + saat için
gerekli keyframe'ler (`clock-spin-release`, `clock-ring-pulse`), `prefers-reduced-motion` ve
`.battery-saver` muafiyetleri (mevcut desenler gibi).

### 8.3 `src/App.vue`
`<TimeClockOverlay />`'ı `src/App.vue:197` `<CrtOverlay />` ile `:200` `<AchievementToast />`
**arasına** koy (katman sırası: CRT 40 → motif 45 → anomali 50 → **saat 55** → juice 60 → toast 70 → modal 80).
`gameLoop` zaten `:129`'da başlıyor, dokunma.

### 8.4 `src/core/audio/effects.ts` — 3 yeni public metod (mevcut osilatör desenleriyle)
```ts
playClockSpawn(): void      // düşük→yüksek "saat kuruldu" toll'u
playClockWind(intensity01: number): void   // iç throttle'lı tıkırtı/kurma sesi (playTallyTick deseni)
playClockRelease(tension01: number): void  // aşağı→yukarı süpürme + çan (playUpgrade deseni)
```
Kurallar: `this.getContext()`, `this.safeVolume()`, `this.registerCleanup(osc, gain)`.
Store bu üç metodu çağırır (`spawnTimeClock` / `releaseTimeClock`) — imzalar yukarıdaki gibidir.

### 8.5 `src/core/particles.ts`
`FeastSceneId` union'ına `'time_warp'` ekle + `FEAST_SCENES.time_warp` kaydı
(`supernova` ile `crunch` arası yoğunluk, `shake: 'hard'`, ringleri mavi-mor).
`FEAST_SCENE_IDS` (varsa) listesini de güncelle; `src/core/particles.test.ts`'teki
sabit liste varsa oraya da ekle.

## 9. Dokümantasyon — ORKESTRATÖR (ben)
`brain/decisions/0068-*.md` ADR + `brain/tasks/in-progress.md` → `completed.md` geçişi. Ajanlar dokunmaz.

## 10. Testler
- **Ajan A:** `src/game/clock-data.test.ts` — §2 tablosundaki 4 satırı (`releaseProfitRatio`
  t=0.25 < 1, t=1.0 > 3), doyum monotonluğu, `tensionFromDrag(dragFromTension(t)) ≈ t`,
  `applyTensionDecay` alt sınır 0, `releaseSpeedAt` uçları (0 → peak, duration → 1).
- **Ajan A:** `tests/time-clock.spec.ts` — saf sözleşme spec'i (store import etmez):
  sabitlerin varlığı + ödül/bedel oranı bandı + "tam gerginlik `TIME_CLOCK_SPAN_SECONDS`
  saniyeden fazla enerji üretir" iddiası.
- **Ajan B:** `src/stores/time-clock.test.ts` — spawn → wind (kütle düşer, orantılı) →
  release (speed > 1) → söner (idle) → tam gerginlikte net kazanç pozitif;
  `offlineSimActive` iken saat doğmaz; `resetRunState` sonrası saat idle.
- **Ajan C:** `src/stores/__tests__/save-roundtrip.test.ts`'e timeClock alanının round-trip'i.
- **Ajan D:** `src/core/particles.test.ts` güncellemesi (varsa).

## 11. Yerleşik kurallar (hepsi geçerli)
- `any` yok, `strict: true`. Decimal NaN kontrolü `dec.isNan() || Number.isNaN(dec.mag)`.
- Mevcut dosyalarda `edit` (min 2-3 satır bağlam), yeni dosyalarda `write`.
- `// TODO`, `/* rest of code */` yasak — dosyalar eksiksiz.
- Windows: komutlarda çift tırnak.
- **Kendi kapsamın dışındaki dosyaya dokunma.** Derleme hatası görürsen ve hata başka ajanın
  kapsamındaysa, düzeltmeye çalışma; raporunda `BLOCKED BY <dosya>` diye bildir.
