# Hold That Number

> Tek bir sayı. Onu büyüt, 11 basamaklık notasyon merdiveninde yukarı taşı, `LNGN`'de bitir.

[![version](https://img.shields.io/badge/version-0.40.0-98e500?style=flat-square)](package.json)
[![vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square)](https://vuejs.org/)
[![typescript](https://img.shields.io/badge/TypeScript-5.7_strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)](https://vitejs.dev/)
[![save](https://img.shields.io/badge/kayıt-LZ--String_+_3_slot-0ea5e9?style=flat-square)](#kayıt)
[![license](https://img.shields.io/badge/license-GPL--3.0--or--later-blue?style=flat-square)](LICENSE)

**Tür:** sayı odaklı incremental / idle · **Hedef:** 11 basamak, toplam ~85 saat
(projeksiyon 79,6 sa; 85 saat hedefi için basamak eğrisi ×1,176)
**Durum:** Rung 1 v3 — boost + sıfırlamalı 8 mücadele, `B = 5.3`, hedef **181 dk**, kapı
`1.79e308`, kayıt şeması v24 ([ADR-0086](brain/decisions/0086-run-reset-and-boost.md));
kalibre edildi ve uygulandı (2026-10-31), 2–11 tasarım aşamasında

---

## Bu oyun ne?

Ortada tek bir sayı var ve o sayı senin cüzdanın. 8 halkalı bir zincir kurarsın —
**Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician** —
halka *n+1* halka *n*'i besler, halka 1 sayının kendisini üretir. `+1` butonu gerçekten `+1`
ekler; `1.79e308` kapısında da aynı yerde, aynı boyutta durur.

Her halka 10 alımda bir Blok Çarpanı basamağı kazanır (`B^⌊bought/10⌋`, `B = 5.3`); `Max All`
bütçenin yettiği en derin halkadan başlayarak alır.

Döngü AD tarzıdır. **Boost** güç kaynağıdır: son halka koşulunu tutturunca açılır, sayıdan
ödenir ve kapıya kadar süren bir üretim çarpanı verir. Boost alımı veya bir **mücadeleye giriş** sayıyı
`10`a, zinciri sıfıra indirir; boost sayacı, tamamlanan mücadeleler ve ödülleri kalır.
8 mücadele mutlak hedefli ve sıralıdır (log10 hedefleri 10,5 · 20,1 · 29,8 · 39,4 · 49,1 ·
58,7 · 68,4 · 78,0; kilit önceki hedef **ve en az 4 boost** — ADR-0087). 4 boost olmadan C1'e
girilemez; boost'lar mücadelede kalıcı olduğu için kapı C1 sonrası açık kalır. Her mücadele
zincir beslemesini `×0,2` yapar. Boost sayacı yalnız kapıdaki **prestijde** sıfırlanır:
`+1 Tanım`. 2. basamak bu build'de yok.

İlk mücadele ~32 dk boost farmı + 17,1 dk C1'dir (C1 0 boostta 36 dk sürerdi; artık erişilemez).
Kalibrasyon (2026-10-31, gerçek motor, `dt = 1 s`): intended **181,0 dk** (11 boost, 8/8);
boost-only 672,6 dk; base 1031,9 dk. Boost kapısı ölçümü: 3 → 184,2 dk (8/8) · **4 → 181,0 dk
(8/8)** · 5 → 174,5 dk (7/8) · 6 → 4/8. Challenges-only yolu (289,6 dk) tasarım gereği kalktı.
181 × 26,4 ≈ **79,6 sa**; 85 saat hedefi için basamak çarpanı **×1,176**.

Tasarım referansı: [`GAME_DESIGN.md`](GAME_DESIGN.md) · plan v2:
[`rung-1-plan-2026-10-27.md`](brain/research/rung-1-plan-2026-10-27.md) · eski 190 dk
kalibrasyonu (ADR-0086 ile geçersiz): [`rung-1-190-calibration-2026-10-27.md`](brain/research/rung-1-190-calibration-2026-10-27.md) ·
karar: [ADR-0086](brain/decisions/0086-run-reset-and-boost.md) · ses sözleşmesi:
[`brain/context/narrative-voice.md`](brain/context/narrative-voice.md) · görsel dil:
[`brain/context/visual-language.md`](brain/context/visual-language.md).

---

## Hızlı başlangıç

**Gereksinimler:** Node.js 20+ · npm 10+ · modern tarayıcı.

```powershell
npm install
npm run dev      # geliştirme sunucusu → http://localhost:3000
```

## npm scriptleri

| Komut | Ne yapar |
| :--- | :--- |
| `npm run dev` | Vite geliştirme sunucusu (port 3000) |
| `npm run typecheck` | `vue-tsc --noEmit` — tip hatası varsa döker |
| `npm test` | `vitest run` — birim testleri |
| `npm run build` | `vue-tsc && vite build` — üretim derlemesi |
| `npm run preview` | `dist/` çıktısını yerelde sunar |
| `npm run verify` | `typecheck` + `test` + `build` (tam kapı) |
| `npm run test:watch` | Vitest izleme modu |

**Kural:** temiz `npm run typecheck` ve `npm test` olmadan hiçbir iş bitmiş sayılmaz.

---

## Kontroller

| Eylem | Girdi |
| :--- | :--- |
| `+1` | `Space` veya `+` |
| Halka satın al (1–8) | `1` … `8` |
| `Max All` | Zincir listesindeki düğme — en derin halkadan geriye, bütçe yettikçe |
| Boost al | Zincir sayfasındaki `Boost` — onay ister, sayı ve zincir sıfırlanır |
| Mücadeleye gir | Challenges satırındaki `Enter` — onay ister, sayı ve zincir sıfırlanır |
| Mücadeleden çık | GoalBar'daki `Exit` — sıfırlanmış koşu korunur |
| Prestij | `1.79e308` kapı modalındaki `Prestige` — boost sayacı sıfırlanır |
| Ayarlar | `Esc` ile kapat |

Klavye kısayolları ayarlardan kapatılabilir (`hotkeysEnabled`). `Max All`, mücadele `Enter`/`Exit`
ve kapı `Prestige` eylemlerinin kısayolu yoktur; düğmeyle çalışır.

---

## Teknoloji yığını

| Alan | Seçim |
| :--- | :--- |
| Framework | **Vue 3** (Composition API, `<script setup lang="ts">`) |
| State | **Pinia 3** |
| Derleyici | **Vite 6** |
| Dil | **TypeScript 5.7** (`strict: true`, `any` yasak) |
| Sayı motoru | **break_eternity.js** — NaN kontrolü küçük harfle: `dec.isNan()` |
| Stil | **Tailwind CSS 3.4** + CSS değişkenleri — "Laboratuvar" (ADR-0085) |
| Tipografi | Space Grotesk (hero + UI) · Space Mono (veri) |
| Kayıt | **LZ-String** + LocalStorage, 3 slot + karantina, şema **v24** (asgari **v20**) |
| Bulut | **Firebase** Auth + Firestore (isteğe bağlı; anahtarsız oyun tam çalışır) |
| Ses | **Web Audio API** — harici dosya yok, tamamı sentez |
| Test | **Vitest** |

---

## Repo yapısı

```
Incremental/
├── AGENTS.md          # Ajan çalışma anayasası
├── GAME_DESIGN.md     # Ekonomi formülleri + 11 basamak + 1. basamak spec'i
├── brain/             # Yaşayan hafıza: context, tasks, decisions, research
└── src/
    ├── core/          # math, format, game-loop (20 TPS), save, audio, music, auth
    ├── game/
    │   ├── number/    # SAF ekonomi: tuning · economy · rungs · challenges
    │   └── voice/     # Ses havuzu: types · lines-rung1 · seçim algoritması
    ├── stores/        # Pinia: game.ts (ekonomi), auth.ts (bulut)
    ├── models/        # Tip tanımları
    ├── components/    # HeroNumber, ChainList, TapButton, TickerBar,
    │                  # GoalBar, ChallengePanel, GateModal, …
    └── App.vue        # Kabuk: üst çubuk (çipler · hedef) · sol menü · sayfa · durum çubuğu (ticker)
```

## Kayıt

- 3 bağımsız slot + otomatik yedek rotasyonu; bozuk kayıt **karantinaya** alınır.
- `SAVE_VERSION = 24`, `MIN_SUPPORTED_SAVE_VERSION = 20`: tema pivotu öncesi (v19 ve altı)
  kayıtlar açılmaz; v20/v21 kayıtları açılır ve bir kez yeni gösterime (ADR-0080) taşınır.
- v22 (ADR-0082) boost/prestij alanlarını şemadan düşürdü; v23 (ADR-0083) `challenges`,
  `gateReached` ve `tanim` alanlarını geri getirdi; v24 (ADR-0086) `boostCount` ekler.
  v20–v23 kayıtları açılır, eksik alanlar varsayılanla gelir (`boostCount: 0`).
- Daha yeni bir build'in kaydı reddedilir (`SaveVersionError`), sessizce düşürülmez.
- Çevrimdışı üretim **12 saatte** tavan yapar.

---

## Katkı — insan ve ajan düzeni

Bu repo [`AGENTS.md`](AGENTS.md) ve [`brain/`](brain/) ile yönetilir.

1. Başlamadan önce `brain/context/` (brief · tech · ses · görsel) oku.
2. Sıradaki işi `brain/tasks/todo.md`'den al, `in-progress.md`'ye taşı.
3. Mimari/ekonomi kararında `brain/decisions/` altına ADR aç.
4. Bitince `brain/tasks/completed.md`'ye tarih + doğrulama ekle; Conventional Commits kullan.

---

## Lisans

Copyright (C) 2026 Yigit Emre Gulen — **GNU GPL v3 veya sonrası** ([`LICENSE`](LICENSE)).
Çatallayıp değiştiren herkes türev çalışmayı aynı lisansla ve kaynak koduyla paylaşır (copyleft).
