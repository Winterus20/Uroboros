# AGENTS.md — UROBOROS (The Cosmic Feast) Otonom Geliştirici Direktifleri

Bu belge, **UROBOROS (The Cosmic Feast)** projesinde çalışacak tüm yapay zeka kodlama asistanları (Antigravity, Cursor, Claude Code, Codex vb.) için bağlayıcı operasyonel çalışma anayasasıdır. Bu repoda görev alan her agent buradaki kurallara istisnasız uymakla yükümlüdür.

---

## 1. Proje Özeti ve Temel Vizyon
- **Proje Adı:** UROBOROS (The Cosmic Feast)
- **Konu & Lore:** Bir su damlasındaki moleküler bağları ayrıştırmakla başlayıp, Planck duvarını yırtarak mikro-karadelik oluşturan ve tüm Samanyolu Galaksisi'ni yutan sonsuz bir kuantum-kozmik tekillik döngüsü.
- **Tür:** Yeni Nesil Hibrit Çok Katmanlı Incremental / Idle Oyunu (*Antimatter Dimensions* + *Tasty Planet* + *Cookie Clicker* sentezi).
- **Temel Felsefe:** "Taktil oburluk, kuantum inişi, mikro-karadelik doğuşu, kozmik dalgalanmalar ve evrensel kütle açlığı."
- **Sütunlar:** 
  1. *Antimatter Dimensions:* D1-D8 Boyutları (Moleküler Bağlardan Samanyolu Galaksisi'ne), Çekim Hızı (Hz), Otomatik Çekim Botları (Autobuyers).
  2. *Cookie Clicker:* Taktil doyum, rastgele Kozmik Dalgalanmalar (Süpernova Patlaması 7x, Kütle Patlaması 777x, Hawking Işıması), Kozmik Parazitler (Wrinklers: kütle emer, %120 primle patlar).
  3. *Synergism:* Planck Baskı Matrisi (Corruptions), Otonom Çekim Botları (Ant Colony / Toplu Çöküş).
  4. *Trimps:* Taktiksel duruş (Kuantum Odak, Obur Çekim, Vakum Kalkanı).
- **Hedef:** Faz 0 ($0 \to 1.79 \times 10^{308}\text{ g}$ arasındaki ilk büyük koşu ve Kozmik Çöküş).

---

## 2. Teknoloji Yığını ve Katı Teknik Kısıtlamalar

| Alan | Teknoloji | Notlar & Katı Kurallar |
| :--- | :--- | :--- |
| **Framework** | **Vue 3** | Composition API (`<script setup lang="ts">`), Pinia 3.x |
| **Paketleyici** | **Vite 6** | Hızlı derleme, katı TypeScript kontrolleri |
| **Dil** | **TypeScript 5.7+** | `strict: true`. Kesinlikle `any` tipi kullanılmamalı, tam tip güvenliği sağlanmalıdır. |
| **Sayı Motoru** | **`break_eternity.js`** | **ÖNEMLİ KURAL:** Kütüphanede `isNaN` yerine küçük harfle **`isNan()`** metodu mevcuttur! Sayı kontrollerinde `dec.isNan() \|\| Number.isNaN(dec.mag)` kullanılmalıdır. |
| **Stil** | **Tailwind CSS 3.4** | Cyberpunk/Dark Sci-Fi teması (`bg-dark-950`, `quantum-blue`, neon vurgular). |
| **Kayıt Sistemi** | **LZ-String + LocalStorage** | State string serileştirmesi, Base64 sıkıştırma. |
| **Ses** | **Web Audio API** | Harici ses dosyası indirilmez; synthesiser osilatörleri kullanılır. |

---

## 3. Yaşayan Hafıza Bankası Protokolü (`brain/`)

Her agent çalışmaya başlamadan önce ve işi bitirdiğinde repo içindeki **[`brain/`](file:///c:/Users/Yigit/Documents/Incremental/brain/)** klasörüyle senkronize olmak **ZORUNDADIR**:

1. **İşe Başlarken (Context Hydration):**
   - [`brain/context/project-brief.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/context/project-brief.md) ve [`brain/context/tech-context.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/context/tech-context.md) dosyalarını oku.
   - **Görsel/stil işlerinde ek olarak [`brain/context/visual-language.md`](brain/context/visual-language.md) sözleşmesini oku** (Aç Kumarhane sentezi + faz-temelli bozulma; ADR-0060).
   - [`brain/tasks/todo.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/todo.md) üzerindeki sıradaki görevi incele ve [`brain/tasks/in-progress.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/in-progress.md) dosyasına taşı.
2. **Kritik Kararlar Alındığında (ADR):**
   - Yeni bir kütüphane eklendiğinde veya temel mimari değiştiğinde [`brain/decisions/`](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/) altına yeni bir ADR dosyası aç.
3. **Görev Tamamlandığında (Reconciliation):**
   - Yapılan işi [`brain/tasks/completed.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/completed.md) dosyasına tarih, sürüm ve diff özetleriyle işle.

---

## 4. Repo Dizin Haritası

```
Incremental/
├── AGENTS.md                  # Bu direktif belgesi
├── GAME_DESIGN.md             # Oyun mekanikleri, katman formülleri ve GDD
├── package.json               # Bağımlılıklar ve npm scriptleri
├── vite.config.ts             # Vite konfigürasyonu (@/ alias)
├── tsconfig.json              # TypeScript katı kuralları
├── brain/                     # AI Living Memory Bank (Hafıza Merkezi)
│   ├── context/               # Mimari standartlar ve bağlam
│   ├── tasks/                 # Todo, in-progress, completed takibi
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── research/              # Matematik ve oyun tasarımı analizleri
│   └── scratchpad/            # Anlık düşünce ve karalama alanı
└── src/
    ├── main.ts                # Uygulama giriş noktası (Vue + Pinia)
    ├── App.vue                # Ana dashboard, navigasyon ve modal yönetimi
    ├── style.css              # Tailwind katmanları ve özel cam efektleri
    ├── core/
    │   ├── math.ts            # break_eternity Decimal sarmalayıcısı ve sabitler
    │   ├── format.ts          # 4 farklı sayı notasyonu (Scientific, Standard, Eng, Log)
    │   ├── audio.ts           # Web Audio API osilatör synthesizer motoru
    │   ├── music-engine.ts    # Prosedürel müzik motoru (Web Audio, harici ses dosyası yok)
    │   ├── music/             # Müzik motoru alt modülleri
    │   ├── auth/              # Firebase Auth yardımcıları
    │   ├── tooltip.ts         # Tooltip konumlandırma yardımcıları
    │   ├── cosmic-scale.ts    # Kozmik ölçek / katman eşikleri
    │   ├── hold.ts            # Basılı tutma (press-and-hold) yardımcıları
    │   ├── focus-trap.ts      # Modal odak tuzağı
    │   ├── tilt.ts            # Kart eğilme (tilt) efekti
    │   ├── save.ts            # LZ-String sıkıştırma, LocalStorage ve Import/Export
    │   ├── save-version.ts    # Kayıt sürümleme ve migrasyon
    │   └── game-loop.ts       # 20 TPS Accumulator pattern sabit adımlı döngü
    ├── game/                  # Frameworksüz saf oyun verisi (Vitest kapsamı)
    │   ├── unlocks.ts         # Kilitsiz içerik ve eşik mantığı
    │   ├── pacing.ts          # Oyun temposu / denge eğrileri
    │   ├── news.ts            # Haber bandı veritabanı ve easter egg'ler
    │   ├── challenges.ts      # Meydan okuma tanımları
    │   ├── achievements.ts    # Başarım tanımları
    │   └── dimension_identity.ts # Boyut kimlikleri (D1-D8 ad/ölçek/lore)
    ├── stores/
    │   └── game.ts            # Merkezi Pinia veri deposu (State, Getters, Actions)
    ├── models/
    │   └── types.ts           # Tüm TypeScript tip ve arayüz tanımları
    └── components/            # ~29 Vue bileşeni (sekmeler, overlay'ler, modallar)
        ├── Header.vue         # Üst sayaç, Tickspeed, Max All ve hızlı butonlar
        ├── DimensionRow.vue   # Tekil boyut satırı, çarpan rozeti ve alım butonları
        ├── DimensionsTab.vue  # Boyutlar sekmesi, Shift/Boost ve Galaksi kartları
        ├── CommentTicker.vue  # Haber bandı (src/game/news.ts tüketir)
        ├── LabTab.vue / ColonyTab.vue / CrisisTab.vue # Faz 1+ oyun sekmeleri
        ├── StatsTab.vue       # Süre, tıklama, üretim istatistikleri
        └── SettingsModal.vue  # Notasyon, ses, save yönetimi ve Hard Reset
```

---

## 5. Agent Kodlama Kuralları ve Standartları

- **Sıfır Tembellik (Zero Laziness):** Kod bloklarında `// TODO`, `// existing code`, `/* rest of code */` gibi geçiştirici ifadeler KESİNLİKLE YASAKTIR. Dosyalar eksiksiz, çalışan gövdelerle güncellenmelidir.
- **Cerrahi Düzenleme:** Dosyaları gereksiz yere baştan yazmak yerine en az 2-3 satır bağlam içeren hassas hedeflemeler yapılmalıdır.
- **Doğrulama Zorunluluğu (Build & Verification):** Kod değişikliği yapıldıktan sonra `npm run build` (`vue-tsc && vite build`) komutu çalıştırılarak tip hatası (TS error) veya derleme hatası olmadığı **kanıtlanmalıdır**.
- **Otomatik Commit Refleksi (Auto-Commit on Milestones):** Her büyük değişiklikte (yeni mekanik, kritik refaktör, kriz/katman entegrasyonu, mimari faz tamamlanması vb.), testler ve derleme (`npm run build`) doğrulandıktan hemen sonra kullanıcı hatırlatması beklenmeksizin otonom olarak anlamlı bir Conventional Commit (`feat:`, `fix:`, `refactor:`) oluşturulmalı ve push edilmelidir.
- **Windows Uyumluluğu:** Terminal komutlarında tek tırnak (`'`) yerine her zaman çift tırnak (`"`) veya powershell escape kuralları kullanılmalıdır.

---

## 6. Sık Kullanılan CLI Komutları

```powershell
# Geliştirme sunucusunu başlatma (Port: 3000)
npm run dev

# TypeScript kontrolü ve Production derlemesi
npm run build

# Derlenen production paketini önizleme
npm run preview
```
