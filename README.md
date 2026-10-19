# UROBOROS — The Cosmic Feast

> Bir su damlasındaki moleküler bağı ayırmakla başlayıp Planck duvarını yırtan,
> mikro-karadelik doğuran ve tüm Samanyolu'nu yutan sonsuz kozmik tekillik döngüsü.

[![version](https://img.shields.io/badge/version-0.38.0-7c3aed?style=flat-square)](package.json)
[![vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square)](https://vuejs.org/)
[![typescript](https://img.shields.io/badge/TypeScript-5.7_strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)](https://vitejs.dev/)
[![tests](https://img.shields.io/badge/tests-199_yeşil-22c55e?style=flat-square)](#testler)
[![license](https://img.shields.io/badge/license-GPL--3.0--or--later-blue?style=flat-square)](LICENSE)
[![save](https://img.shields.io/badge/kayıt-LZ--String_+_3_slot-0ea5e9?style=flat-square)](#kayıt-sistemi)

**Tür:** Hibrit çok katmanlı Incremental / Idle
**İlham:** Antimatter Dimensions + Cookie Clicker + Synergism + Trimps
**Ana kaynak:** YUTULAN KÜTLE (g) · **Hedef (Faz 0):** `0 → 1.79e308 g` ve ilk **Kozmik Çöküş**
**Durum:** Faz 0 ✅ · Faz 1 ✅ · Faz 2 ❌ · Faz 3 ❌ (detay: [`brain/tasks/todo.md`](brain/tasks/todo.md))

---

## İçindekiler

- [Bu oyun ne?](#bu-oyun-ne)
- [Öne çıkanlar](#öne-çıkanlar)
- [Nasıl oynanır?](#nasıl-oynanır)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Teknoloji yığını](#teknoloji-yığını)
- [Repo yapısı](#repo-yapısı)
- [Mimari notlar](#mimari-notlar)
- [Kayıt sistemi](#kayıt-sistemi)
- [Firebase kurulumu (isteğe bağlı)](#firebase-kurulumu-isteğe-bağlı)
- [Testler](#testler)
- [Yol haritası](#yol-haritası)
- [Katkı — insan ve ajan düzeni](#katkı--insan-ve-ajan-düzeni)
- [Teşekkür ve ilhamlar](#teşekkür-ve-ilhamlar)
- [Lisans](#lisans)

---

## Bu oyun ne?

UROBOROS'ta masum bir deney ters gider: kuantum filtresi Planck ölçeğinde
uzay-zamanı yırtar. Önce laboratuvar masası, sonra şehir, Dünya, Güneş ve
sonunda Samanyolu'nun tamamı tekilliğin midesine iner.

Oyuncu döngüsü basittir:

1. **YUT** butonuna (veya Space'e) basarak kütle kazan.
2. Kütleyle **D1–D8 boyutlarını** ve **Çekim Hızı'nı (Hz)** büyüt.
3. **Ölçek Sıçraması** ve **Galaksi** ile çarpanları katla.
4. `1.79e308 g`'ye ulaşıp **Kozmik Çöküş** yap, **Tekillik Puanı (SP)** ile kalıcı büyü.

Detaylı tasarım referansı: [`GAME_DESIGN.md`](GAME_DESIGN.md) ·
Canlı durum: [`brain/tasks/todo.md`](brain/tasks/todo.md)

---

## Öne çıkanlar

### Boyut motoru (D1–D8)

| Boyut | Katman | Ölçek |
| :--- | :--- | :--- |
| D1 | Moleküler Bağlar | Nanometre |
| D2 | Elektron Orbitalleri | Pikometre |
| D3 | Nükleer Çekirdek | Femtometre |
| D4 | Kuark & Gluon Çorbası | Attometre |
| 💥 | **Planck Yırtılması** | Mikro-karadelik doğar |
| D5 | Laboratuvar & Şehir | Metre / Kilometre |
| D6 | Gezegenler & Dünya | `~5.97e27 g` |
| D7 | Yıldızlar & Güneş | `~1.98e33 g` |
| D8 | Samanyolu & Karadelikler | `1e45 g+` |

Yeni koşuda D1–D3 açıktır. D4–D8, hayat boyu tepe kütle eşiklerinden açılır
(`1e8 / 1e11 / 1e15 / 1e20 / 1e26 g`; ADR-0072). Ölçek Sıçraması artık boyut açmaz.

### Taktil ve idle sentezi

- **Kozmik Dalgalanmalar:** Süpernova Patlaması (7x), Kütle Patlaması (777x),
  Hawking Işıması (anlık 5 dakikalık kütle), Rezonans komboları (~5439x).
- **Kozmik Parazitler (Wrinklers):** Üretimin %3'ünü emer, 3 tıklamayla
  %120–%165 primle iade eder.
- **Taktiksel duruşlar:** Kuantum Odak (2x pasif), Obur Çekim (4x manuel + %50 anomali),
  Vakum Kalkanı (%15 Hz indirimi).
- **11 otonom bot:** D1–D8 + Hz + Shift + Galaxy. İlk Çöküşten sonra kalıcı lisansa
  geçip **Kozmik Otonomi Kokpiti**'ne dönüşür.
- **Kuantum Laboratuvarı:** 3x3 Akı Matrisi, 8 parçacık, süperiletken hatlar,
  Süperkritik Boşalım ve Relik kurbanı (kalıcı meta-ödüller).
- **Olay Ufku Krizleri:** Kafein enerjisiyle çalışan 4 riskli gece kararı.
- **İçerik merdiveni:** 16 basamaklı unlock merdiveni (1e3 → 1e308),
  9 dekad bandı, 75+ başarım, 8 meydan okuma, 100+ haber bandı iletisi.
- **Haber bandı:** Antimatter Dimensions tarzı sağdan sola akan telemetri,
  tıklanabilir easter egg'ler ve gizli başarımlar.

### Prestij

- **Faz 0 (0 → 1.79e308 g):** İlk büyük koşu. Aktif oyun ~3.5 saatte kapanacak tempoda.
- **Faz 1 (Kozmik Çöküş):** SP kazanımı, Nöral Ağaç, kalıcı dükkân. İlk çöküş net 1 SP verir,
  Planck Duvarı kırıldıktan sonra üstel artar.

---

## Nasıl oynanır?

| Eylem | Tuş / Buton | Sonuç |
| :--- | :--- | :--- |
| Manuel yutma | **YUT!** butonu veya `Space` | Anlık kütle |
| Satın al | Boyut satırındaki `+1 / +10 / Maks` | Üretimi büyüt |
| Hızlan | Çekim Hızı (Hz) butonu | Tüm üretimi hızlandır |
| Sıçra | Ölçek Sıçraması | Alt katmanı sıfırla, çarpanı katla |
| Galaksi | Galaksi butonu | Küresel çarpan |
| Prestij | Kozmik Çöküş (`1.79e308 g`) | Koşuyu sıfırla, SP kazan |

**Kazanma koşulu (Faz 0):** `1.79e308 g`'ye ulaşıp ilk Çöküşü yapmak.
**İpucu:** Erken oyunda Hz'yi ihmal etme; D3/D4 açıldıktan sonra botları
`1e9 g`'de kademeli açmayı unutma.

---

## Hızlı başlangıç

### Gereksinimler

- **Node.js 20+** ve **npm 10+**
- Modern bir tarayıcı (WebGL2 önerilir, WebGL1 de çalışır)

### Kurulum

```powershell
git clone <bu-repo-url>
cd Incremental
npm install
```

### Çalıştırma

```powershell
npm run dev      # geliştirme sunucusu → http://localhost:3000
npm run build    # tip kontrolü (vue-tsc) + üretim derlemesi
npm run preview  # derlenen paketi yerelde önizle
npm test         # birim testleri (vitest)
```

| Komut | Ne yapar |
| :--- | :--- |
| `npm run dev` | Vite geliştirme sunucusu (port 3000, otomatik açılır) |
| `npm run build` | `vue-tsc && vite build` — tip hatası varsa derlemez |
| `npm run preview` | `dist/` çıktısını yerelde sunar |
| `npm test` | `src/game/` saf veri modüllerinin testleri (11 dosya) |

> Yeni klonlayan biri bu 4 komutla 10 dakikadan kısa sürede oyunu ayağa kaldırabilir.
> Çalışmazsa önce Node sürümünü (`node -v`) kontrol et.

---

## Teknoloji yığını

| Alan | Seçim |
| :--- | :--- |
| Framework | **Vue 3** (Composition API, `<script setup lang="ts">`) |
| State | **Pinia 3** |
| Derleyici | **Vite 6** |
| Dil | **TypeScript 5.7** (`strict: true`, `any` yasak) |
| Sayı motoru | **break_eternity.js** (1e308 ötesi için zorunlu) |
| Stil | **Tailwind CSS 3.4** + cam/neon HUD katmanları |
| Kayıt | **LZ-String** + LocalStorage (3 slot + otomatik yedek) |
| Bulut | **Firebase** Auth + Firestore (isteğe bağlı) |
| Ses/müzik | **Web Audio API** — harici dosya yok, tamamı sentez |
| İkon / efekt | **lucide-vue-next**, **canvas-confetti** |
| Test | **Vitest 5** |

### Kritik sayı kuralı

`break_eternity.js`'te NaN kontrolü küçük harfle yazılır:

- Doğru: `dec.isNan()` veya `Number.isNaN(dec.mag)`
- Yanlış: `dec.isNaN()` (böyle bir metot yok)

Bu kural ihlal edilirse karşılaştırmalar NaN'da yanlış `true` döner.
Ayrıntılı vaka: ADR-0031.

---

## Repo yapısı

```
Incremental/
├── AGENTS.md          # Ajan çalışma anayasası (mutlaka oku)
├── GAME_DESIGN.md     # Oyun tasarım dokümanı (GDD, tasarım referansı)
├── brain/             # Yaşayan hafıza: context, tasks, decisions, research
├── src/
│   ├── core/          # Altyapı: math, format, game-loop, save, audio, music
│   ├── game/          # SAF VERİ + saf fonksiyonlar (Pinia'sız, test edilir)
│   ├── stores/        # Pinia: game.ts (ekonomi/prestij), auth.ts (bulut)
│   ├── models/        # Tüm TypeScript tipleri
│   ├── components/    # ~29 Vue bileşeni (sekmeler, overlay, modal)
│   ├── App.vue        # Ana dashboard ve sekme yönetimi
│   └── main.ts        # Vue + Pinia giriş noktası
├── index.html         # Başlık: UROBOROS
└── package.json       # v0.38.0 — scripts: dev / build / preview / test
```

`src/game/` kataloğu:

- `unlocks.ts` — 16 basamaklı dekad merdiveni
- `pacing.ts` — 9 dekad bandı + Dekad Yükselişi
- `achievements.ts` — 75+ başarım + `check(ctx)` koşulları
- `challenges.ts` — 8 kozmik meydan okuma
- `news.ts` — 100+ haber bandı iletisi + easter egg
- `dimension_identity.ts` — D1–D8 ad / ölçek / lore

---

## Mimari notlar

- **`src/game/` neden ayrı?** Bu klasör store'a bağımlı değildir; saf veri ve
  saf fonksiyondur. Ekonomi değişince `npm test` regresyonları store'u
  ellemeden yakalar.
- **Oyun döngüsü:** 20 TPS sabit adımlı accumulator (`src/core/game-loop.ts`).
  Sekme kapalıyken çevrimdışı kazanç ve `WelcomeBackModal` özeti vardır.
- **Kayıt sürümü:** `saveVersion` migration zinciri + gelecek sürüm koruması
  (daha yeni build'in kaydı sessizce düşürülmez, reddedilir).
- **Erişilebilirlik ve pil:** `reduceAnimations` / battery-saver modları,
  modal odak tuzağı, hover + klavye tooltip'leri dahili.

---

## Kayıt sistemi

- **3 bağımsız slot** + her slot için otomatik yedek rotasyonu.
- Bozuk kayıt **karantinaya** alınır; otomatik kayıt kanıtı silmez.
- Büyük import koruması (~500 KB) ve dosya boyutu sınırı (~1 MB) vardır.
- Slot anahtar adları geçmişten kalan legacy isimler olabilir; geriye dönük
  uyumluluk için korunur, elle değiştirme.

---

## Firebase kurulumu (isteğe bağlı)

Oyun **anahtarsız tam çalışır**; `.env` yoksa simülasyon moduna düşer.
Gerçek bulut kayıt için:

1. Örnek env dosyasını `.env` olarak kopyalayıp doldur.
2. `firestore.rules` dosyasındaki kuralları yayınla (`firebase deploy --only firestore:rules`).
3. `.env` dosyasını asla commit etme (`.gitignore`'da olmalı).

> Test modunu açık bırakma: kurallar devre dışı kalır ve tüm oyuncu
> kayıtları herkese açılır. Repodaki `firestore.rules` deny-by-default yazıldı.

---

## Testler

```powershell
npm test    # 11 dosya, 199 test (vitest, node ortamı)
npm run build  # vue-tsc tip kontrolü + vite üretim derlemesi
```

Kural: **temiz `npm run build` olmadan hiçbir iş bitmiş sayılmaz.**
Ekonomi veya kilit değiştiyse ilgili `src/game/*.test.ts` dosyasını güncelle.

---

## Yol haritası

| Faz | Durum |
| :--- | :--- |
| Faz 0 — Kuantumdan Galaksiye (0 → 1.79e308 g) | ✅ Oynanabilir |
| Faz 1 — Kozmik Çöküş / SP / Nöral Ağaç / botlar / krizler | ✅ Oynanabilir |
| Faz 2 — Kolektif Gece Nöbeti (Corruptions / Talismans) | ❌ Tasarım aşamasında |
| Faz 3 — Evrensel Doomscroll (Automator / Celestials) | ❌ Henüz yok |

Sıradaki büyük işler `brain/tasks/todo.md` dosyasındadır.
Denge kararları ADR-0032 / ADR-0033 / ADR-0034 ile sabitlenmiştir.

---

## Katkı — insan ve ajan düzeni

Bu repo [`AGENTS.md`](AGENTS.md) ve [`brain/`](brain/) ile yönetilir.

1. Başlamadan önce `brain/context/project-brief.md` ve
   `brain/context/tech-context.md` dosyalarını oku.
2. Sıradaki işi `brain/tasks/todo.md` dosyasından alıp
   `brain/tasks/in-progress.md` dosyasına taşı.
3. Yeni kütüphane veya mimari değişiklikte `brain/decisions/` altına ADR aç.
4. Bitince `brain/tasks/completed.md` dosyasına tarih + sürüm + doğrulama ekle.
5. Commit mesajlarında Conventional Commits kullan (`feat:`, `fix:`, `refactor:`).

Kod standardı: eksiksiz ve çalışan gövdeler, `TODO` / yer tutucu yok,
cerrahi düzenleme, Windows'ta çift tırnaklı komutlar, `any` yasak.

---

## Teşekkür ve ilhamlar

- **Antimatter Dimensions** — D1–D8 boyut matematiği, tickspeed, haber bandı fikri.
- **Cookie Clicker** — taktil anomaliler, kombo hissi, mini-oyun ruhu.
- **Synergism** — Corruptions / otonom koloni vizyonu.
- **Trimps** — taktiksel duruş (stance) sistemi.
- **break_eternity.js** — sonsuz sayı motoru.
- **Vue / Vite / Pinia / Tailwind** — hızlı ve sade altyapı.

---

## Lisans

Copyright (C) 2026 Yigit Emre Gulen

Bu program özgür yazılımdır: Free Software Foundation tarafından yayımlanan
**GNU General Public License** sürüm 3 (veya isteğe bağlı olarak daha sonraki
sürümler) koşulları altında yeniden dağıtabilir ve değiştirebilirsin.

Bu program faydalı olması umuduyla dağıtılır, ancak **HİÇBİR GARANTİ** vermez.
Ayrıntılar için [`LICENSE`](LICENSE) dosyasına bak.

Pratik sonucu: bu oyunu çatallayıp değiştiren herkes, türev çalışmayı da
aynı lisansla ve kaynak koduyla birlikte paylaşmak zorundadır (copyleft).
