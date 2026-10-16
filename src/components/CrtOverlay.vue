<script setup lang="ts">
/**
 * CrtOverlay — Statik CRT tüp dokusu (Faz A "Aç Kumarhane").
 *
 * TASARIM KARARI (A-K4 / A-K6):
 * - Animasyon YOKTUR (flicker/pulse dahil). Tekrarlayan flaş, WCAG 2.3.1
 *   (10° görüş açısında saniyede >3 flaş) ihlalidir; ayrıca statik gradyan
 *   bir kez boyanıp yalnızca composite edilir → ihmal edilebilir maliyet.
 * - Bileşen hiç JS/props/store okumaz: görünürlük kapıları tamamen CSS'te.
 *   `crtEffect` ayarı ve motion modu zaten kök `crt-off` sınıfına derleniyor
 *   (bkz. composables/useNavigation.ts → syncEffectClasses).
 *
 * KATMAN (A-K5): `.layer-crt` = z-index 40 → içerik (10) ve kozmik vinyetin (30)
 * üstünde; juice (60), toast (70) ve modallerin (80) ALTINDA kalır. Böylece
 * okunabilirlik ve VS/parçacık parlaklığı korunur.
 *
 * NOT: Kök elemanda transform/filter/backdrop-filter KULLANILMAZ — aksi halde
 * ADR-0044 (containing-block tuzağı) ihlal edilir.
 */
</script>

<template>
  <div
    class="layer-crt crt-layer pointer-events-none fixed inset-0 w-screen h-screen max-w-full max-h-full overflow-hidden select-none"
    aria-hidden="true"
  >
    <div class="crt-scanlines absolute inset-0"></div>
    <div class="crt-vignette absolute inset-0"></div>
    <div class="crt-glow absolute inset-0"></div>
  </div>
</template>
