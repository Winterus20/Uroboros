# Hold That Number

> Tek bir sayı. Onu büyüt, 11 basamaklık notasyon merdiveninde yukarı taşı, `LNGN`'de bitir.

[![version](https://img.shields.io/badge/version-0.40.0-98e500?style=flat-square)](package.json)
[![vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square)](https://vuejs.org/)
[![typescript](https://img.shields.io/badge/TypeScript-5.7_strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)](https://vitejs.dev/)
[![save](https://img.shields.io/badge/kayıt-LZ--String_+_3_slot-0ea5e9?style=flat-square)](#kayıt)
[![license](https://img.shields.io/badge/license-GPL--3.0--or--later-blue?style=flat-square)](LICENSE)

**Tür:** sayı odaklı incremental / idle · **Hedef:** 11 basamak, ~85 saat, tek koşu
**Durum:** 1. basamak oynanabilir; 2–11 tasarım aşamasında ([ADR-0079](brain/decisions/0079-number-economy-vertical-slice.md))

---

## Bu oyun ne?

Ortada tek bir sayı var ve o sayı senin cüzdanın. 8 halkalı bir zincir kurarsın —
**Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician** —
halka *n+1* halka *n*'i besler, halka 1 sayının kendisini üretir. `+1` butonu gerçekten `+1`
ekler; 85. saatte de aynı yerde, aynı boyutta durur.

Döngü: halkaları büyüt → 8. halkada **mini boost** (her şey sıfırlanır, kalıcı çarpan kalır) →
`1.79e308` kapısı → **prestij**: `Tanım` kazan, `Tanım` yükseltmeleriyle daha hızlı başla.

Tasarım referansı: [`GAME_DESIGN.md`](GAME_DESIGN.md) · ses sözleşmesi:
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
| `npm run verify` | `typecheck` + `test` (hızlı kapı) |
| `npm run test:watch` | Vitest izleme modu |

**Kural:** temiz `npm run typecheck` ve `npm test` olmadan hiçbir iş bitmiş sayılmaz.

---

## Kontroller

| Eylem | Tuş |
| :--- | :--- |
| `+1` | `Space` veya `+` |
| Halka satın al (1–8) | `1` … `8` |
| Mini boost | `B` (8. halka alındıysa) |
| Prestij | `P` (kapı açıksa) |
| Ayarlar | `Esc` ile kapat |

---

## Teknoloji yığını

| Alan | Seçim |
| :--- | :--- |
| Framework | **Vue 3** (Composition API, `<script setup lang="ts">`) |
| State | **Pinia 3** |
| Derleyici | **Vite 6** |
| Dil | **TypeScript 5.7** (`strict: true`, `any` yasak) |
| Sayı motoru | **break_eternity.js** — NaN kontrolü küçük harfle: `dec.isNan()` |
| Stil | **Tailwind CSS 3.4** + CSS değişkenleri — "Saf Sayı" (ADR-0078) |
| Tipografi | Space Grotesk (hero + UI) · Space Mono (veri) |
| Kayıt | **LZ-String** + LocalStorage, 3 slot + karantina, şema **v21** |
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
    │   ├── number/    # SAF ekonomi: tuning · economy · upgrades · rungs
    │   └── voice/     # Ses havuzu: types · lines-rung1 · seçim algoritması
    ├── stores/        # Pinia: game.ts (ekonomi), auth.ts (bulut)
    ├── models/        # Tip tanımları
    ├── components/    # HeroNumber, ChainList, TapButton, TickerBar, …
    └── App.vue        # Tek ekran: ticker · sayı · +1 · zincir · dock
```

## Kayıt

- 3 bağımsız slot + otomatik yedek rotasyonu; bozuk kayıt **karantinaya** alınır.
- `SAVE_VERSION = 21`, `MIN_SUPPORTED_SAVE_VERSION = 20`: tema pivotu öncesi (v19 ve altı)
  kayıtlar açılmaz; v20 kayıtları açılır ve bir kez yeni gösterime (ADR-0080) taşınır.
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
