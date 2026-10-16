# ADR-0065: Faz E — Retrofit & QA (Kapanış)

- **Tarih:** 2026-10-16
- **Durum:** Uygulandı ("Aç Kumarhane" pivotunun kapanışı)
- **Kapsam:** `src/style.css` (K-2 `:where()` + `.progress-track-lg`),
  `src/composables/useMotion.ts` (yeni `useMotionReduced`),
  `src/components/CommentTicker.vue` + `src/components/header/MusicControls.vue`
  (tek kaynak kapı), `src/components/CrisisTab.vue` (`progress-fill` tabanı),
  `public/fonts/m6x11.woff2` (silindi)
- **Önceller:** ADR-0060 (pivot) · ADR-0058 (yayılım sözleşmesi + E4 NIT listesi) ·
  ADR-0049/0057/0044 (dil/kart/shake — korunur)
- **Derin spesifikasyon:** `brain/research/phase-e-retrofit-qa-deep-spec-2026-10.md`
- **İnternet araştırması:** `brain/research/phase-e-internet-research-2026-10.md`

---

## 1. Bağlam

Faz E planı (§8): retrofit + WCAG AA + motion denetimi + K-2 çakışması +
`bg-black/NN` + `m6x11` + kapanış. Denetim bulguları:

1. **K-2 gerçek bug:** dist'te `@layer` bildirimi SIFIR → mekanizma düz kaynak
   sırası; `.glass-panel*` (0,1,0) sonda yazıldığı için `bg-*`/`border-*-*`/
   `bg-gradient-*` utility'lerini ezer (~99 noktada ölü aksan).
2. **Gerçek bug:** `.progress-track-lg` tanımsız → `TrendReactor` hype barı 0px.
3. **Gerçek boşluk:** ticker marquee scoped CSS'tedir → OS `prefers-reduced-motion`
   onu öldüremez; JS kapısı da OS'i okumuyordu.
4. Renk sözleşmesi taraması (Header/DimensionRow/DimensionsTab/modals): sapma YOK
   (amber=prestij, cyan=bonus, rose=risk). `bg-black/*` 162/162 translucent →
   değişiklik yok. Sayı yüzeyleri kanon gereği `data-corruption`'a tepkisiz
   (yapılacak iş yok).

## 2. Karar

- **K-2:** `.glass-panel*` + `.panel-hero` seçicileri `:where()` ile sarılır
  (spesifite 0). Sıralama: hover varyantı (0,2,0) > state (`ds-ramp-*`,
  `hero-accent-*`, 0,1,0) > yüzey (0). Tasarlanan aksanlar (rose risk, cyan
  bonus, violet kimlik) ilk kez gerçekten görünür — rezerve renk retrofit'i.
- **E1:** `.progress-track-lg { height: 12px }` (4/6/8/12 ölçeği).
- **E2:** CrisisTab faz barına `progress-fill` tabanı (ADR-0058 NIT kapandı).
- **E3:** `useMotionReduced()` tek kapı (ayar + kök mühür + OS, reaktif);
  CommentTicker + MusicControls buna geçer (ADR-0058 NIT kapandı; OS boşluğu
  kapandı). CrtOverlay/MotifBand/JuiceLayer/ScreenOverlay/knock: denetlendi,
  PASS (değişiklik yok).
- **M7:** `m6x11.woff2` (4KB, sıfır referans) silindi.

## 3. Sonuçlar

- `typecheck` 0 · `test` 314/314 · `build` 0 hata.
- `harness:smoke` log10=90.72/8 shift (denge sabit) · `harness:perf` churn
  6.91/wall 0.84 ms (bant içinde) · `harness:contrast` AA (0 ihlal).
- Davranış değişikliği yok (sayı/denge dokunulmadı); sunum + kapılar.
- Kapanmayan iş (ayrı işkolu): prestige ritüeli (F), ADR-0033 §3 / ADR-0034
  denge soruları, başka işkoluna ait uncommitted dosyalar (dokunulmadı).
