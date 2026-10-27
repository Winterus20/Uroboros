# AGENTS.md — HOLD THAT NUMBER Otonom Geliştirici Direktifleri

Bu belge, **Hold That Number** projesinde çalışacak tüm yapay zeka kodlama asistanları için bağlayıcı operasyonel çalışma anayasasıdır. Bu repoda görev alan her agent buradaki kurallara istisnasız uymakla yükümlüdür.

---

## 1. Proje Özeti ve Temel Vizyon
- **Proje Adı:** Hold That Number
- **Konu:** Tek bir sayı. Oyuncu onu büyütür, 11 basamaklı bir notasyon merdiveninde yukarı taşır ve merdivenin sonunda (`LNGN`) oyun biter.
- **Tür:** Sayı odaklı incremental / idle oyunu (*Antimatter Dimensions* zinciri + *Cookie Clicker* prestij döngüsü).
- **Temel Felsefe:** "Sessiz meta." Oyun kendisinin oyun olduğunu bilir, **asla söylemez**; mizah dünyada değil, oyun ile oyuncu arasındaki ilişkidedir. Ekranın tek kahramanı sayıdır.
- **Sütunlar:**
  1. **Zincir:** 8 halka (Fingers → Notch → Abacus → Pencil → Calculator → Computer → Supercomputer → Mathematician). Halka *n+1* halka *n*'i üretir; halka 1 sayıyı üretir. `+1` zincirin köküdür.
  2. **Tek havuz:** Cüzdan sayının kendisidir. Alım sayıyı düşürür (AD / Cookie Clicker modeli); eşikler mandallıdır, geri gitmez.
  3. **Döngü:** 8. halkada mini boost (tam sıfırlama + zirveye bağlı kalıcı çarpan) → kapı (`1,79e308`) → prestij (`Tanım`).
  4. **Ses:** Sahne · ticker · başarım · açıklama. Tooltip ve sayısal etiket **asla** şaka yapmaz.
- **Hedef:** 11 basamak, ~85 saat, tek koşu. `LNGN` oyunun sonudur; kuyruk yoktur.
- **Bağlayıcı kaynaklar:** [`brain/research/theme-pivot-grilling-2026-10-23.md`](brain/research/theme-pivot-grilling-2026-10-23.md) (kararlar) · [`brain/context/visual-language.md`](brain/context/visual-language.md) (görsel sözleşme) · [`brain/context/narrative-voice.md`](brain/context/narrative-voice.md) (ses sözleşmesi) · [`GAME_DESIGN.md`](GAME_DESIGN.md).

---

## 2. Teknoloji Yığını ve Katı Teknik Kısıtlamalar

| Alan | Teknoloji | Notlar & Katı Kurallar |
| :--- | :--- | :--- |
| **Framework** | **Vue 3** | Composition API (`<script setup lang="ts">`), Pinia 3.x |
| **Paketleyici** | **Vite 6** | Hızlı derleme, katı TypeScript kontrolleri |
| **Dil** | **TypeScript 5.7+** | `strict: true`. Kesinlikle `any` tipi kullanılmamalı. |
| **Sayı Motoru** | **`break_eternity.js`** | **ÖNEMLİ:** `isNaN` yerine küçük harfle **`isNan()`** — `dec.isNan() \|\| Number.isNaN(dec.mag)`. Tip tanımı `plus/minus/times` ister; `add/sub/mul` runtime'da var ama tipte yok. |
| **Stil** | **Tailwind CSS 3.4** + CSS değişkenleri | "Saf Sayı" (ADR-0078): kart/blur/yuvarlak köşe/gölge YOK; 1px hairline + tipografi + boşluk |
| **Tipografi** | **Space Grotesk** (hero+UI) · **Space Mono** (veri) | `tabular-nums` zorunlu; hero asla `font-bold` (300 sabit) |
| **Kayıt Sistemi** | **LZ-String + LocalStorage** | `SAVE_VERSION = 22`, `MIN_SUPPORTED_SAVE_VERSION = 20`; slot + karantina + bulut (Firestore) |
| **Ses** | **Web Audio API** | Harici ses dosyası yok; osilatör sentezi |

---

## 3. Yaşayan Hafıza Bankası Protokolü (`brain/`)

Her agent çalışmaya başlamadan önce ve işi bitirdiğinde repo içindeki **[`brain/`](brain/)** klasörüyle senkronize olmak **ZORUNDADIR**:

1. **İşe Başlarken (Context Hydration):**
   - [`brain/context/project-brief.md`](brain/context/project-brief.md) ve [`brain/context/tech-context.md`](brain/context/tech-context.md) dosyalarını oku.
   - **Görsel/stil işlerinde ek olarak [`brain/context/visual-language.md`](brain/context/visual-language.md) sözleşmesini oku** ("Saf Sayı", ADR-0078).
   - **Metin/ses işlerinde [`brain/context/narrative-voice.md`](brain/context/narrative-voice.md) sözleşmesini oku.**
   - [`brain/tasks/todo.md`](brain/tasks/todo.md) üzerindeki sıradaki görevi incele ve [`brain/tasks/in-progress.md`](brain/tasks/in-progress.md) dosyasına taşı.
2. **Kritik Kararlar Alındığında (ADR):** Yeni kütüphane, temel mimari değişikliği veya yeni ekonomi kuralı → [`brain/decisions/`](brain/decisions/) altına ADR aç.
3. **Görev Tamamlandığında (Reconciliation):** Yapılan işi [`brain/tasks/completed.md`](brain/tasks/completed.md) dosyasına tarih, sürüm ve diff özetleriyle işle.

---

## 4. Repo Dizin Haritası

```
Incremental/
├── AGENTS.md                  # Bu direktif belgesi
├── GAME_DESIGN.md             # Oyun mekanikleri, ekonomi formülleri, 11 basamak
├── package.json               # Bağımlılıklar ve npm scriptleri
├── vite.config.ts             # Vite konfigürasyonu (@/ alias)
├── tsconfig.json              # TypeScript katı kuralları
├── brain/                     # AI Living Memory Bank (Hafıza Merkezi)
│   ├── context/               # Mimari standartlar, görsel dil, ses sözleşmesi
│   ├── tasks/                 # Todo, in-progress, completed takibi
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── research/              # Tasarım oturumları ve matematik analizleri
│   └── scratchpad/            # Anlık ölçüm/karalama alanı
└── src/
    ├── main.ts                # Uygulama giriş noktası (Vue + Pinia)
    ├── App.vue                # Tek ekran: ticker · hero sayı · +1 · zincir · dock
    ├── style.css              # "Saf Sayı" tokenları (renk, tipografi, hareket kapısı)
    ├── core/
    │   ├── math.ts            # break_eternity Decimal sarmalayıcısı ve sabitler
    │   ├── format.ts          # Notasyon biçimleri + hero dizgi parçaları
    │   ├── save.ts            # LZ-String, slotlar, karantina, import/export
    │   ├── save-version.ts    # SAVE_VERSION (v22) ve asgari sürüm
    │   ├── game-loop.ts       # 20 TPS sabit adımlı döngü + çevrimdışı devir
    │   ├── audio.ts           # Ses cephesi (efekt + müzik köprüsü)
    │   ├── music/             # Prosedürel müzik motoru
    │   └── auth/              # Firebase Auth + Firestore bulut kayıt
    ├── game/
    │   ├── number/            # SAF ekonomi: tuning · economy · rungs
    │   └── voice/             # Ses havuzu: types · lines-rung1 · seçim algoritması
    ├── stores/
    │   ├── game.ts            # Merkezi Pinia store (state, getters, actions)
    │   └── auth.ts            # Oturum + bulut senkronizasyonu
    ├── models/                # Tip tanımları (number, save, settings, auth)
    └── components/            # HeroNumber, ChainList, TapButton, TickerBar, …
```

---

## 5. Agent Kodlama Kuralları ve Standartları

- **Sıfır Tembellik (Zero Laziness):** `// TODO`, `// existing code`, `/* rest of code */` gibi geçiştirici ifadeler KESİNLİKLE YASAKTIR. Dosyalar eksiksiz, çalışan gövdelerle güncellenmelidir.
- **Cerrahi Düzenleme:** Dosyaları gereksiz yere baştan yazmak yerine en az 2-3 satır bağlam içeren hassas hedeflemeler yapılmalıdır.
- **Doğrulama Zorunluluğu:** Kod değişikliğinden sonra `npm run typecheck`, `npm run test` ve `npm run build` çalıştırılarak kanıtlanmalıdır. `npm run verify` = `typecheck` + `test` (hızlı kapı); **yayın kapısı ayrıca `npm run build`**.
- **Otomatik Commit Refleksi:** Her büyük değişiklikte, doğrulama geçtikten hemen sonra anlamlı bir Conventional Commit (`feat:`, `fix:`, `refactor:`) oluşturulmalı ve push edilmelidir.
- **Windows Uyumluluğu:** Terminal komutlarında tek tırnak yerine çift tırnak veya PowerShell escape kuralları kullanılmalıdır.
- **Görsel işlerde:** `brain/context/visual-language.md` dışına çıkılmaz; sapma gerekiyorsa önce o belge değişir.
- **Metin işlerinde:** `brain/context/narrative-voice.md` dışına çıkılmaz; ünlem, mekanik yalanı ve oyuncuyu küçümseme yasaktır.

---

## 6. Sık Kullanılan CLI Komutları

```powershell
# Geliştirme sunucusu (Port: 3000)
npm run dev

# TypeScript kontrolü + Production derlemesi
npm run build

# Testler (vitest)
npm run test

# Hızlı kapı: typecheck + test (yayın için ayrıca npm run build)
npm run verify
```
