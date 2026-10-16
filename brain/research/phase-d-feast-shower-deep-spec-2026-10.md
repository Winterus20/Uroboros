# FAZ D — Derinleştirme Spesifikasyonu: VS Şöleni (Tek Canvas Partikül + Olay Sahneleri)

**Tarih:** 2026-10-16 · **Durum:** Uygulanıyor · **Kapsam:** YALNIZ Faz D
**Üst belge:** `visual-language-hungry-parlor-implementation-plan-2026-10.md` §7
**Bağlayıcı sözleşme:** `brain/context/visual-language.md` §1/L4 · ADR-0060 §2.1/§2.5

> **Tek cümlelik hedef:** Büyük olaylarda (Süpernova 7×, Kütle Patlaması 777×,
> Hawking, rezonans kombo, ilk Big Crunch, dekad atlama) tek canvas'ta partikül
> kaosu + yüzen kütle sayıları + zemin knock-down; normal satın almalarda ambient
> sakin kalır. İkinci overlay yok (M4); shake containment korunur (ADR-0044);
> köke `filter` yok (M3).

---

## 1. Derin araştırma sentezi (neden bu tasarım)

### 1.1 Vampire Survivors — "tutarlı fidelity + desatüre zeminde neon patlama"
- Sözleşmedeki VS notu: *tüm katmanlar aynı fidelity'de ve aynı yöne bakar;
  tutarlı orta seviye tek parlak kahraman asset'ten güçlüdür; geç oyun dövmesi
  hipnotik overload'dır; okunabilirlik desatüre zeminden gelir.*
- Çıkarım: şölen = **aynı canvas, aynı piksel dili** (yuvarlak kıvılcım + ince
  halka + kalın konturlu yüzen yazı). Yeni render stili YOK — mevcut `JuiceLayer`
  fiziği (halka genişlemesi `0.16 lerp + 2.2`, kıvılcım `0.94 sürtünme + 0.08
  yerçekimi`, metin `vy *= 0.96`) korunur; sahneler yalnız **sayı/renk/katman**
  reçetesidir. Zeminde neonun okunması için olay anında arka plan ~120 ms
  bastırılır (knock-down), sonra geri gelir — VS'deki "zemin kararır, mermiler
  parlar" anının statik-CSS karşılığı.
- Balatro ölçüsü (sözleşme): *skor kademeleri ~83–124 ms arayla; sadece olay
  anındaki patlama okunur.* Çıkarım: **bas → görünür değişim ≤100 ms** (olay
  `pointerdown`/tık anında sahne aynı karede spawn olur); tekrarlayan pulse YOK
  (impulse + decay — mevcut `juice-punch`/`rise-float` disipliniyle aynı).

### 1.2 Cookie Clicker — altın kurabiye kombo kutlaması
- Mevcut oyun zaten CC iskeletinde: `fyp` (7×, 60 sn) + `heart_frenzy` (777×,
  15 sn) + `void` (garanti kombo: 30 sn 7× + 15 sn 777×) + `sponsor` (Hawking:
  anında 2 dk kütle). CC'deki Frenzy+Lucky üst üste binmesi burada
  `isComboActive` (7× + 777×) = **Süper Rezonans**.
- CC kutlama dili: kombo anında büyük sayı + perde ışıması + ses katmanı
  (`playCombo` zaten var). Faz D bunu canvas'a taşır: rezonans = iki sahnenin
  **üst üste katmanı** (mor halka + cyan halka + feast çekirdek), yoğunluk
  ~2× (MotifBand'deki 8→14 glif kararıyla aynı doz mantığı).
- Hawking (`sponsor`) CC'deki "Lucky anında kasaya giren" andır: ince ışıma +
  kıvılcım hüzmesi + **gerçek kazanılan miktarla** yüzen sayı (`+XeYY g`).

### 1.3 Canvas bütçe disiplini (teemo.dev juice standardı + mevcut kod)
- Mevcut `JuiceLayer` zaten doğru iskelet: sabit cap (`tilt 120 / balanced 60 /
  calm 30`), taşınca `shift()` (en eski düşer), idle-safe rAF (spawn ile başlar,
  boşalınca kapanır), DPR ≤2, motion 4-kapısı, shake anti-spam (soft 600 ms /
  medium 400 ms / hard 200 ms + hard-yükseltme istisnası).
- Eksikler (bu faz kapatır): (a) shockwave/spark dizilerinde **cap yok**
  (metin cap'li, diğerleri sınırsız — spam'de büyür); (b) olay sahnesi reçetesi
  yok (her tetikleyici kendi `maxRadius`/renk doğaçlaması yapıyor); (c) zemin
  knock-down yok; (d) suppression penceresi yok (art arda büyük sahnede kare
  sessizleşmez); (e) yutma dokunuşunda kıvılcım yok (yalnız metin).
- Karar: fizik/bütçe/sahne tablosu **saf modüle** çıkar (`src/core/particles.ts`,
  store/Vue/DOM yok → Vitest `node` ortamında test edilir). `JuiceLayer` yalnız
  tüketici (canvas + rAF + kapılar). Bu, Faz B (`corruption.ts`) ve Faz C
  (`motifs.ts`) ile aynı mimari disiplindir.

---

## 2. Donmuş API (`src/core/particles.ts`)

```ts
export type FeastSceneId =
  | 'supernova' | 'mass_burst' | 'hawking' | 'resonance'
  | 'crunch' | 'decade' | 'yut'
export type FeastShakeLevel = 'soft' | 'medium' | 'hard' | null
export interface FeastShockSpec { color: string; maxRadius: number; count: number }
export interface FeastSceneSpec {
  id: FeastSceneId
  sparks: number            // toplam kıvılcım emisyonu (cap öncesi)
  shocks: FeastShockSpec[]  // halka katmanları (sırayla)
  texts: number             // yüzen yazı emisyonu (cap öncesi)
  shake: FeastShakeLevel
  knockMs: number           // zemin knock-down süresi (0 = yok)
  suppressionMs: number     // bu sahnenin koyduğu suppression penceresi
  big: boolean              // yüzen yazı `big` bayrağı (boyut/dağılım)
}
export const FEAST_SCENES: Record<FeastSceneId, FeastSceneSpec>
export const PARTICLE_BUDGET = {
  MAX_PARTICLES: 60, MAX_SHOCKWAVES: 8, MAX_SPARKS: 220,
  SUPPRESSION_WINDOW_MS: 400, KNOCK_DOWN_MS: 140,
} as const
export function feastScene(id: FeastSceneId): FeastSceneSpec
export function isBigScene(id: FeastSceneId): boolean  // suppression koyanlar
export function shouldSuppressFeast(nowMs: number, lastBigAtMs: number, windowMs?: number): boolean
export function scaleCountForMode(count: number, mode: 'full' | 'reduced' | 'off'): number
export function clampEmission(want: number, live: number, max: number): number
```

### 2.1 Sahne tablosu (reçeteler — renkler mevcut anomali diliyle birebir)

| Sahne | Tetik | Kıvılcım | Halka | Yazı | Shake | Knock | Suppr. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `supernova` | `fyp` buff (7×) | 40 mor | 2× mor (`#a855f7`, 200) + beyaz çekirdek | 2 (`7× SÜPERNOVA`) | medium | 140 ms | 400 ms |
| `mass_burst` | `heart_frenzy` (777×) | 64 cyan | 2× cyan (`#22d3ee`, 230) + beyaz | 2 (`777× KÜTLE`) | hard | 140 ms | 400 ms |
| `hawking` | `sponsor` (anında kütle) | 28 cyan-açık | 1× (`#67e8f9`, 180) | 1 (`+<miktar> g`) | soft | 0 | 0 |
| `resonance` | kombo (7×+777×) | 96 (mor+cyan+feast) | 4× (mor 220 + cyan 230 + feast 260 + beyaz) | 3 (büyük) | hard | 140 ms | 400 ms |
| `crunch` | Big Crunch (imza) | 110 (amber+feast+beyaz) | 4× (amber 260 + feast 300 + mor + beyaz) | 3 (büyük, `+N SP`) | hard | 200 ms | 600 ms |
| `decade` | 10'arlı dekad (1e10…) | 24 amber | 1× (`#fbbf24`, 220) | 1 | medium | 0 | 0 |
| `yut` | her manuel YUT | 4 (nötr) | — | — (metin mevcut `tap` yoluyla) | null | 0 | 0 |

- `crunch` **suppression'ı deler** (imza sahnesi her zaman tam oynar; günde-bir hissi).
- `resonance` = `supernova` + `mass_burst` katmanı + feast çekirdek (yoğunluk ~2×).
- Renkler rezerve durum dilini EZMEZ: mor = katman/anomali, cyan = bonus,
  amber = prestij/milestone, feast (`#ff3355`) = olay enerjisi (sözleşme §2).
  Hepsi canvas-içi; sayı/etiket/ramp/tooltip seçicisi yok (kanon).

### 2.2 Bütçe/suppression/motion kuralları
- Cap'ler: metin 60 (mevcut), halka 8 (YENİ), kıvılcım 220 (YENİ). Taşmada en
  eski düşer (`shift`), atma YOK (karede takılma olmaz).
- Suppression (~400 ms): büyük sahne (`supernova/mass_burst/resonance/crunch`)
  sonrası pencerede gelen BÜYÜK sahne yarı emisyona iner (sayı/ışın kuyruğa
  alınır → kare sessizleşir). `crunch` hariç (hep tam). Küçük sahneler
  (`hawking/decade/yut`) suppression'dan etkilenmez.
- Motion: `full` → tam emisyon; `reduced` → `ceil(n*0.35)`, halka ≤1, shake yok,
  knock yok; `off`/pil → sıfır emisyon (mevcut `shouldReduceMotion` kapısı).
  `calm` juice modu → metin cap 30 + halka/kıvılcım bastırma (mevcut kural korunur).
- Performans: sahne spawn'ı O(emisyon), kare başı O(canlı); tahsis döngü-dışı;
  rAF idle-safe (değişmedi); DPR ≤2 (değişmedi); `offsetWidth` zorlaması YOK.

---

## 3. Dosya bazlı iş listesi

| Dosya | Değişiklik |
| :--- | :--- |
| `src/core/particles.ts` (YENİ) | §2 API + tablo + bütçe/suppression/motion yardımcıları (saf, `any` yok) |
| `src/core/particles.test.ts` (YENİ) | 12 test: tablo bütünlüğü, cap/suppression/motion ölçekleri, shake/knock disiplini, rezonans>tekil, crunch deler, kanon (sayı/ramp seçicisi yok — modül DOM'suz) |
| `src/components/JuiceLayer.vue` | Tek canvas genişletmesi: `doomscroll:feast-scene` dinleyicisi + `triggerFeastScene` (katmanlı halka/kıvılcım/metin, cap'li) + shockwave/spark cap'leri + suppression (400 ms, crunch-bypass) + knock-down sınıfı (`feast-knockdown`, 140/200 ms) + YUT kıvılcımı (`tap`'te 4 spark) + mevcut kapılar/anti-spam korunur |
| `src/stores/game/actions-neural.ts` | `clickAnomaly` sonuna sahne çağrısı: kombo→`resonance`, `fyp`→`supernova`, `heart_frenzy`→`mass_burst`, `sponsor`→`hawking` (miktar metniyle) — mevcut ses/konfeti AKIŞINA eklenir, davranış değişmez |
| `src/stores/game/actions-prestige.ts` | `singularityReset` + `buySingularityUpgrade(break_singularity)` + `buyNeuralNode(break_singularity)` imza sahnesi (`crunch`, `+N SP`; ilk crunch metni aynı — dengeye dokunulmaz) |
| `src/composables/useCounterHeat.ts` | 10'arlı dekad fişeği `shockwave` → `feast-scene: decade` (renk/merkez aynı; shake/cooldown aynı) |
| `src/components/AnomalyOverlay.vue` | DEĞİŞMEZ (tıklama zaten shake/shockwave/tap yayıyor; sahne store'dan tek kaynaktan gelir — çift sahne yok) |
| `src/style.css` | Faz D bloğu: `.feast-knockdown` (M3-safe: köke filter YOK; yalnız `.algorithmic-swirl-container` + `.cosmic-vignette` + `.singularity-horizon` opaklık/desatürasyon, 120–200 ms, transition) + motion/pil/forced-colors kapıları |

### 3.1 Tetikleyici → sahne eşleşmesi (tek kaynak)

```
clickAnomaly('fyp')          → feast-scene { supernova, x/y: anomali konumu, text: '7× SÜPERNOVA' }
clickAnomaly('heart_frenzy') → feast-scene { mass_burst, text: '777× KÜTLE PATLAMASI' }
clickAnomaly('sponsor')      → feast-scene { hawking, text: '+<format(instantReward)> g' }
isComboActive (tıklama sonu) → feast-scene { resonance } (tür sahnesinin YERİNE — ikisi birden değil)
singularityReset()            → feast-scene { crunch, merkez, text: '+<gain> SP' }
break_singularity alımı       → feast-scene { crunch, merkez } (mevcut shake/konfetiyle aynı anda)
decade % 10 === 0             → feast-scene { decade } (mevcut shake-4000ms cooldown + ses korunur)
her YUT (tap)                 → 4 kıvılcım (JuiceLayer içi, yeni event YOK)
```

Koordinat: tıklama varsa tıklama noktası; store-tetikliyse (crunch/decade)
ekran merkezi (`innerWidth/2, innerHeight*0.4`). `window` yoksa (harness/node)
sessiz yut (`typeof window === 'undefined'` koruması — mevcut pattern).

---

## 4. Kabul kriterleri

- [ ] Büyük olayda şölen okunur (katmanlı halka + kıvılcım + yüzen sayı + shake + knock-down); normal satın almada ambient sakin (yalnız YUT kıvılcımı + mevcut metin).
- [ ] Emission cap + havuz tavanı testli (metin 60 / halka 8 / kıvılcım 220); `harness:perf` churn/wall regresyonu yok.
- [ ] `reduced`/`off`/`batterySaver`/`calm` modlarında şölen sadeleşir/gizlenir (mevcut kapılar; yeni kapı YOK).
- [ ] Mobilde shake sırasında dock/parmak çubuğu titremez (ADR-0044: `#game-main-content` hedefi + kardeş canvas; knock-down köke filter koymaz).
- [ ] Denge regresyonu yok (`harness:smoke` baseline sabit — sahneler yalnız görsel event'tir).

## 5. Doğrulama

`npm run typecheck` (0) + `npm test` (301 + 12 yeni) + `npm run build` (0) +
`npm run harness:smoke` (log10=90.7±, 8 shift) + `npm run harness:perf`
(churn/wall baseline) + görsel tur (full/reduced/off + pil + mobil).
