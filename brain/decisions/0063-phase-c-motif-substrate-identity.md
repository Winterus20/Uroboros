# ADR-0063: Faz C — GIC Kimlik Kütüphanesi (Motif Slotları + Bant + Substrat + Kaplamalar)

- **Tarih:** 2026-10-16
- **Durum:** Uygulandı (Faz C kapsamı) — Faz D/E bekliyor
- **Kapsam:** `src/assets/motifs/*.svg` (16), `src/game/motifs.ts`, `src/game/motifs.test.ts`,
  `src/components/MotifBand.vue` (yeni), `ScreenOverlay.vue`, `DimensionsTab.vue`,
  `CrisisTab.vue`, `App.vue`, `src/style.css`
- **Önceller:** ADR-0060 (pivot — bu ADR onun **Faz C** ayağıdır) · ADR-0062 (Faz B mühür/tokenlar) ·
  ADR-0061 (CRT z=40) · ADR-0058 (rezerve renk, motion kapısı) · ADR-0049 (okunaklı Balatro) ·
  ADR-0044 (shake containment)
- **Derin spesifikasyon:** `brain/research/phase-c-motif-substrate-deep-spec-2026-10.md`
- **Bağlayıcı sözleşme:** `brain/context/visual-language.md` §1/§5

---

## 1. Bağlam

Faz B, bozulma mührünü (`data-corruption`) ve şiddet tokenlarını kurdu ama görsel
tüketici yoktu. Plan §6 beş adım öngörüyordu: slot modülü (C1), substrat (C2),
boost bandı (C3), Wrinkler kaplaması (C4), kriz/Planck vinyetleri (C5).

Dış araştırma sentezi (Sakuga Blog + Puella Magi Wiki + CSS-Tricks):
- **GIC:** "dikkatlice bakınca çürüyen sevimli masal" — kâğıt kolaj + stop-motion +
  karışık malzeme; her cadının tek temalı labirenti → burada her FAZ tek motif grubu.
  Tekrar eden motifler: delik, göz, diş, damalı zemin, bant, yırtık kâğıt.
- **CSS tekniği:** damalı şerit `repeating-conic-gradient` ile 1 satırda;
  yırtık kenar `clip-path` çokgen; bant yarı-saydam sıcak şerit — tamamı statik
  (sıfır CPU, WCAG 2.3.1 dostu). Hareket yalnız L3 bandında, tek yavaş sürüklenme.

## 2. Karar

### 2.1 Slot kontratı (C1)
`src/assets/motifs/<ad>.svg` + Vite `?raw`; `MOTIFS` kaydı `{id, name, group, tone, svg, weight}`.
**Motif adı = dosya adı** (test kilitli) → ileride elle çizim birebir değişir.
16 motif (grup başına 4): planck (delik·göz·diş·zincir), cosmic (tekerlek·gül·dama·yırtık),
collapse (bant·karalama·vida·çatlak), nightwatch (ay·yıldız·saat·perde).
Ton disiplini: yalnız `feast/bone/ember` — rezerve durum hue'ları (rose/cyan/amber/purple)
dekorasyonda kullanılmaz. `delik` ağırlığı 2 (tekrar eden korku kökü).

### 2.2 Bant (C3) ve substrat (C2)
`MotifBand.vue` (z=45, `#game-main-content` kardeşi): yüzen anomali VEYA aktif buff
varken iki yan şerit; sette `motifsForCorruption` (K0'da bant yok — steril korunur);
rezonans kombosunda yoğunluk katlanır (8→14 glif + opaklık tabanı 0.45→0.8).
Tek animasyon: 38 sn'lik dikişsiz sürüklenme; `reduced`'da statik, `off`/pilde gizli.
`ScreenOverlay` substratı: K1 yırtık köşeler → K2 damalı şerit → K3 bantlar →
K4 damalı zemin; varlık TS `v-if`, şiddet `--substrate-opacity` tokenından.
(CRT scanline eğrisi 2026-10-16'da kullanıcı geri bildirimiyle yumuşatıldı:
K0 %5 → K4 %21; ayrıntı ADR-0062.)

### 2.3 Kaplamalar (C4/C5)
Wrinkler chipleri: delik-göz ışıması + noktalı "diş" çizgisi (statik, hover dostu).
Planck bariyeri K1+ bant köşeleri; kriz anında (challenge/backfire/meltdown)
`CrisisTab` kolaj çerçevesi (rose risk anlamı korunur — çerçeve dekoratiftir).

## 3. Sonuçlar

- `npm test` 301/301 (7 yeni) · `npm run build` 0 hata · `harness:smoke` baseline
  sabit (log10=90.7, 8 shift — denge dokunulmadı).
- Yeni asset eklemek kod değişikliği gerektirmez (SVG + `motifs.ts` satırı).
- Faz D bu mührü/bandı tüketir (olay şöleni L4); Faz E kontrast turunda sıcak
  palet + yeni katmanlar ölçülür.
