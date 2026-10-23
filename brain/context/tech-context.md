# Tech Context & Constraints (Teknoloji Bağlamı)

## 1. Teknoloji Yığını
- **Frontend Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Paketleyici (Bundler):** Vite 6.x
- **Tip Sistemi:** TypeScript 5.7+ (Strict mode, noImplicitAny, `any` yasak)
- **State Yönetimi:** Pinia 3.x
- **Büyük Sayı Kütüphanesi:** `break_eternity.js` (1e308 ötesi; tetrasyon `10^^1e308`'e kadar)
- **Stil & Tasarım:** Tailwind CSS 3.4 + CSS değişkenleri — **"Saf Sayı"** (ADR-0078)
- **Tipografi:** Space Grotesk (hero + UI) · Space Mono (veri); `tabular-nums` zorunlu
- **İkon Seti:** `lucide-vue-next`
- **Sıkıştırma:** `lz-string` (v1.5)
- **Kutlama / Parçacık:** `canvas-confetti`

## 2. Kritik Teknik Kısıtlar ve İpuçları
- `break_eternity.js` içinde `isNaN` metodu küçük 'n' ile `isNan()` şeklindedir. Sayı kontrolü
  yaparken daima `dec.isNan() || Number.isNaN(dec.mag)` kullanılmalıdır. Tip tanımı
  `plus/minus/times` ister; `add/sub/mul` runtime'da var ama tipte yok.
- **Oyun döngüsü 20 TPS** sabit adımlı accumulator (`src/core/game-loop.ts`, 50 ms adım,
  kare başına azami 20 tick); 1 sn üzeri duraklamalar çevrimdışı simülasyona devredilir.
- Vue bileşenleri içinde doğrudan `window.AudioContext` çağrılmadan önce kullanıcı etkileşimi
  beklenmelidir (`resume()` koruması).
- Windows ortamında komut çalıştırırken tek tırnak (`'`) yerine çift tırnak (`"`) kullanılmalıdır.
- **Görsel işlerde** `brain/context/visual-language.md` dışına çıkılmaz; **metin işlerinde**
  `brain/context/narrative-voice.md` dışına çıkılmaz.

## 3. Kayıt, Bulut, Ses ve Test Altyapısı
- **Kayıt:** LZ-String + LocalStorage; 3 slot + otomatik yedek + bozuk kayıt karantinası;
  import/export boyut koruması.
- **Şema sürümü:** `SAVE_VERSION = 21`, `MIN_SUPPORTED_SAVE_VERSION = 20` (P5: v19 ve altı
  kayıtlar açılmaz; v20 açılır, notasyonu bir kez `standard`'a taşınır — ADR-0080). Daha yeni
  bir build'in kaydı `SaveVersionError` ile reddedilir.
- **Cloud Save:** Firebase Auth + Firestore; misafir ve Google ile giriş desteklenir; anahtarsız
  oyun tam çalışır. Çakışma `CloudConflictModal` ile çözülür.
- **Ses/Müzik:** Web Audio API — harici ses dosyası yok, tamamı sentez (`src/core/audio.ts`,
  `src/core/music/`).
- **Birim Testleri:** Vitest (node ortamı). Kapsam: saf ekonomi (`src/game/number/*.test.ts`),
  çekirdek (`src/core/*.test.ts`), auth/çakışma (`src/core/auth/*.test.ts`);
  `src/test/setup.ts` her testte Pinia'yı sıfırlar.
- **Test kapıları:**
  - `npm run typecheck` — `vue-tsc --noEmit`, 0 hata beklenir.
  - `npm test` — `vitest run`.
  - `npm run verify` — typecheck + test (hızlı kapı).
  - `npm run build` — `vue-tsc && vite build` (yayın kapısı).
  - Eski `harness:*` script'leri **kaldırıldı** (dosyaları yok); denge ölçümü artık
    `node brain/scratchpad/balance-2026-10-23/sim.mjs --all` ile yapılır.
- Detaylı görev durumu için `brain/tasks/todo.md` ve `in-progress.md` dosyalarına bakılır.
