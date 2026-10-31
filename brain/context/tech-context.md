# Tech Context & Constraints (Teknoloji Bağlamı)

## 1. Teknoloji Yığını
- **Frontend Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Paketleyici (Bundler):** Vite 6.x
- **Tip Sistemi:** TypeScript 5.7+ (Strict mode, noImplicitAny, `any` yasak)
- **State Yönetimi:** Pinia 3.x
- **Büyük Sayı Kütüphanesi:** `break_eternity.js` (1e308 ötesi; tetrasyon `10^^1e308`'e kadar)
- **Stil & Tasarım:** Tailwind CSS 3.4 + CSS değişkenleri — **"Laboratuvar"** (ADR-0085; önceki "Saf Sayı" ADR-0078)
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
- **Döngü (ADR-0086):** boost alımı ve mücadele girişi sayıyı `10`a, halkaları 0'a, kilitleri
  yalnız Fingers'a indirir. `boostCount` ve tamamlanmış mücadele ödülleri kalır; `boostCount`
  yalnız kapı/prestijde sıfırlanır. Mücadele kilidi `bestNumber` ile ölçülür; aksi hâlde
  sıfırlanmış koşu (sayı 10) oyuncuyu kilitler. Her mücadele zincir beslemesini `×0,2` yapar;
  boost çarpanı yalnız sayı üretimine uygulanır.
- **Kalibrasyon (ADR-0086, 2026-10-31):** `BLOCK_MULT = 5.3`, `BOOST_MULT = 1.8`,
  `BOOST_BASE_REQUIREMENT = 50`, `BOOST_REQUIREMENT_GROWTH = 1.35`, `BOOST_PRICE_GROWTH = 1.5`,
  `CHALLENGE_FEED_MULT = 0.2`, mücadele fiyat büyümesi `1.22`. Hedefler log10: 10,5 · 20,1 ·
  29,8 · 39,4 · 49,1 · 58,7 · 68,4 · 78,0 (kilit = önceki hedef, C1 = 10). Ölçüm: intended
  **181,0 dk** (11 boost) · 0-greedy 195,8 · challenges-only 289,6 (1,60×) · boost-only 672,6
  (3,72×) · base 1031,9 (5,70×). Projeksiyon: 181 × 26,4 ≈ **79,6 sa** (×1,165); 85 saat hedefi
  için eğri **×1,176** (84,8 sa).

## 3. Kayıt, Bulut, Ses ve Test Altyapısı
- **Kayıt:** LZ-String + LocalStorage; 3 slot + otomatik yedek + bozuk kayıt karantinası;
  import/export boyut koruması.
- **Şema sürümü:** `SAVE_VERSION = 24`, `MIN_SUPPORTED_SAVE_VERSION = 20` (P5: v19 ve altı
  kayıtlar açılmaz; v20/v21/v22/v23 açılır. v21 notasyonu bir kez `standard`'a taşınır — ADR-0080;
  v23 `challenges`, `gateReached`, `tanim` alanlarını ekler — ADR-0083; v24 `boostCount` ekler —
  ADR-0086). Daha yeni bir build'in kaydı `SaveVersionError` ile reddedilir.
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
  - `npm run verify` — typecheck + test + build (tam kapı).
  - `npm run build` — `vue-tsc && vite build` (yayın kapısı).
  - Eski `harness:*` script'leri **kaldırıldı** (dosyaları yok); denge ölçümü artık
    `node brain/scratchpad/balance-2026-10-23/sim.mjs --all` ile yapılır.
- Detaylı görev durumu için `brain/tasks/todo.md` ve `in-progress.md` dosyalarına bakılır.
