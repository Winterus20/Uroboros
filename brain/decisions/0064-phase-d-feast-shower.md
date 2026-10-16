# ADR-0064: Faz D — VS Şöleni (Tek Canvas Partikül + Olay Sahneleri)

- **Tarih:** 2026-10-16
- **Durum:** Uygulandı (Faz D kapsamı) — Faz E bekliyor
- **Kapsam:** `src/core/particles.ts` (yeni) + `src/core/particles.test.ts` (yeni),
  `src/components/JuiceLayer.vue` (genişletme), `src/stores/game/actions-neural.ts`
  (`clickAnomaly` + `buyNeuralNode`), `src/stores/game/actions-prestige.ts`
  (`singularityReset` + `buySingularityUpgrade`), `src/composables/useCounterHeat.ts`
  (dekad), `src/style.css` (Faz D knock-down bloğu)
- **Önceller:** ADR-0060 (pivot — bu ADR onun **Faz D** ayağıdır) · ADR-0062 (bozulma
  mührü) · ADR-0063 (motif bandı — rezonans yoğunluk disiplini) · ADR-0061 (CRT z=40) ·
  ADR-0058 (rezerve renk, motion kapısı) · ADR-0049 (okunaklı Balatro) · ADR-0044
  (shake containment)
- **Derin spesifikasyon:** `brain/research/phase-d-feast-shower-deep-spec-2026-10.md`
- **İnternet araştırması:** `brain/research/phase-d-internet-research-2026-10.md`
- **Bağlayıcı sözleşme:** `brain/context/visual-language.md` §1/L4

---

## 1. Bağlam

Faz C motif bandı + substratı kurmuştu ama büyük olay anı hâlâ eski disiplindeydi:
her tetikleyici kendi `maxRadius`/rengini doğaçlıyor, shockwave/spark dizilerinde
cap yoktu, zemin knock-down ve suppression penceresi yoktu, YUT dokunuşunda
kıvılcım yoktu. Plan §7 beş sahne + bütçe + knock-down + suppression öngörüyordu.

İnternet araştırması (birincil kaynaklar, webfetch):
- **MDN Optimizing canvas:** tek canvas + statik zemin CSS'te (M4 gerekçesi),
  cap + `shadowBlur` yok + metin tavanlı, DPR ≤2, idle-safe rAF, el fiziği.
- **MDN rAF:** one-shot zincir + arka planda durma (gizli sekmede şölen birikmez).
- **WCAG 2.3.3 + `prefers-reduced-motion`:** etkileşim animasyonu kapatılabilir
  olmalı (essential değilse) → 3-state kapı; yeni kapı icat edilmez.
- **Cookie Clicker Wiki (Golden Cookie):** Frenzy ×7/77 sn ~%40 · Click Frenzy
  ×777/13 sn ~%3 · Lucky anında `min(%15 banka, 15 dk CpS)` · kombo = çarpanların
  üst üste binmesi (en basit: Frenzy + Click Frenzy; Get lucky çakışmaya izin
  verir). Oyundaki `fyp`/`heart_frenzy`/`sponsor`/`void`/`isComboActive` birebir
  eşleşir.
- **CC Wiki (Wrinkler):** %5 emiş, ×1.1 iade kanonu → wrinkler sahnesi kapsam
  dışı bırakıldı (bütçe büyük olaylara saklanır; mimari hazır).

## 2. Karar

### 2.1 Saf modül (`D1`)
`src/core/particles.ts`: sahne reçeteleri (`FEAST_SCENES` — 7 sahne) + bütçe
(`MAX_PARTICLES 60 / MAX_SHOCKWAVES 8 / MAX_SPARKS 220 / SUPPRESSION 400 ms`) +
`shouldSuppressFeast` + `scaleCountForMode` (reduced %35, off 0) +
`clampEmission`. Store/Vue/DOM yok → node'da test edilir (Faz B/C disiplini).

### 2.2 Tek canvas (`D2`)
`JuiceLayer` genişletilir; ikinci overlay YOK (M4). `doomscroll:feast-scene`
dinleyicisi + `triggerFeastScene` (katmanlı halka/kıvılcım/metin, cap'li) +
suppression (büyük→yarı emisyon; **crunch deler**) + knock-down
(`feast-knockdown`, 140/200 ms) + YUT kıvılcımı (tap'te 4 spark) + mevcut
kapılar/anti-spam korunur. Shockwave/spark dizilerine cap eklendi (metin gibi
en eski düşer).

### 2.3 Tetikleyiciler (`D3`)
`clickAnomaly`: sponsor→`hawking` (gerçek miktar `+X g`), kombo→`resonance`
(tür sahnesinin YERİNE), `fyp`→`supernova`, diğer→`mass_burst`.
`singularityReset` (sessiz bot hariç) + iki `break_singularity` yolu → `crunch`
(`+N SP` / `PLANCK DUVARI YIKILDI`). 10'arlı dekad → `decade` (renk/merkez aynı).
`AnomalyOverlay` DEĞİŞMEZ (çift sahne yok — sahne store'dan tek kaynaktan gelir).
Dengeye dokunulmaz (yalnız görsel event).

### 2.4 Knock-down (`D4`)
M3-safe: köke `filter`/`transform` YOK. Yalnız arka plan katmanları
(`.algorithmic-swirl-container` + `.cosmic-vignette` + `.singularity-horizon` —
hepsi fixed KARDEŞ) opaklıkla bastırılır. Sayı/etiket/ramp/tooltip seçicisi YOK.

## 3. Sonuçlar

- `npm test` 314/314 (13 yeni) · `npm run typecheck` 0 · `npm run build` 0 hata.
- `harness:smoke` log10=90.72/8 shift (baseline sabit — denge regresyonu yok).
- `harness:perf` churn 6.69/p95 14.5 ms, wall 0.77 ms (baseline bandında; perf-tick
  canvas/Vue import etmez — değişiklik tick'e etki edemez).
- `harness:contrast` tüm çiftler AA (knock-down geçici sınıftır, paleti değiştirmez).
- Faz E bu katmanı tüketir (kontrast turunda sıcak palet + yeni katman ölçülür).
