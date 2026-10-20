import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * Vitest — iki katmanlı test harness'in hızlı katmanı.
 *
 * Kapsama:
 * - `src/**` — birim + store testleri (`*.test.ts`), DOM'suz `node` ortamı.
 * - `tests/**` — ADR sözleşme spec'leri (`*.spec.ts`, örn. lab-rebalance).
 *   Eskiden include dışıydı; `src/game/lab-rebalance.test.ts` shimiyle
 *   dolambaçlı koşuyordu. Shim silindi, spec tek kaynaktır.
 * - `src/test/setup.ts` her testten önce Pinia'yı sıfırlar (izolasyon).
 */
export default defineConfig({
  // Mirror the app alias so future tests can use '@/...' like the source does.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, 'dist/**', 'brain/**'],
    setupFiles: ['src/test/setup.ts'],
    // Store duman testi (smoke.test.ts) binlerce tick sürer; varsayılan
    // 5 sn yetmez. Yavaşlık = bulgu değil, simülasyon maliyetidir.
    //
    // 60 sn -> 120 sn: temiz koşuda bu test 44.5 sn sürüyor, yani bütçenin
    // yalnızca 1.35 katı pay vardı. Paralel vitest + derleme gibi herhangi bir
    // CPU yükü altında 60 sn aşılıp test "kırık" görünüyordu (timeout —
    // assertion'a ulaşılmıyor). Ölçüldü: tek koşu 44.5 sn, 2 paralel 52.5 sn,
    // 2 paralel + 8 işlemci yükü 88.7 sn. Bütçe artık 2.7× pay veriyor.
    // (Ayrıca: paralel vitest koşuları aynı node_modules/.vite/vitest/<hash>/results.json
    // dosyasını yazıyor — paralel koşu bir yarış koşulu, teşhis aracı olarak kullanılmamalı.)
    testTimeout: 120_000,
    // Data-only suite: no DOM, no globals, explicit imports from 'vitest'.
    globals: false
  }
})
