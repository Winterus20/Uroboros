# FAZ E — Derinleştirme Spesifikasyonu: Retrofit & QA (kapanış)

**Tarih:** 2026-10-16 · **Durum:** Uygulanıyor · **Kapsam:** YALNIZ Faz E
**Üst belge:** `visual-language-hungry-parlor-implementation-plan-2026-10.md` §8
**Bağlayıcı sözleşme:** `brain/context/visual-language.md` · ADR-0060
**İnternet araştırması:** `phase-e-internet-research-2026-10.md`
**Öncül NIT listesi:** ADR-0058 §4 (E4)

> **Tek cümlelik hedef:** Yeni dilin tüm yüzeylere yayıldığının doğrulanması +
> WCAG AA turu + motion kapısı denetimi + devralınan NIT'lerin kapatılması.
> **Davranış değişikliği YOK** (denge/sayı dokunulmaz); yalnız sunum + kapılar.

---

## 1. Donmuş iş listesi (denetim bulgularıyla)

| # | İş | Dosya | Bulgusu |
| :--- | :--- | :--- | :--- |
| E0 | `.glass-panel*` + `.panel-hero` seçicilerini `:where()` ile sarmak (K-2) | `src/style.css` | dist'te `@layer` yok → mekanizma düz kaynak sırası; `:where()` spesifiteyi 0'lar, utility'ler kazanır, state sınıfları yine kazanır (araştırma §3) |
| E1 | `.progress-track-lg` tanımı (12px) | `src/style.css` | Tek kullanıcı `TrendReactor:133`; tanımsız → hype barı 0px (görünmez) — gerçek bug |
| E2 | Faz barına `progress-fill` tabanı | `CrisisTab.vue:248` | NIT: `:class="phaseConfig.barColor"` → `:class="['progress-fill', phaseConfig.barColor]"` |
| E3 | Tek kaynak motion kapısı | `useMotion.ts` (YENİ `useMotionReduced`) + `CommentTicker.vue` + `MusicControls.vue` | Çift okuma (reaktif + kök mühür) teke iner; OS `prefers-reduced-motion` reaktif kapsama girer (ticker marquee scoped CSS olduğu için global media query onu öldüremezdi — gerçek boşluk) |
| E4 | `m6x11.woff2` silme | `public/fonts/m6x11.woff2` | 4KB, sıfır referans (M7 kararı: sil) |
| E5 | `bg-black/*` verdict: DEĞİŞİKLİK YOK | — | 162 kullanımın TAMAMI opaklık modifiyeli (translucent) → sıcak zeminde kompoze olur, zaten sıcak kayar |
| E6 | Renk sözleşmesi taraması | Header/DimensionRow/DimensionsTab/modals | Amber hep prestij/milestone, cyan bonus, rose risk — sapma YOK (verdict) |
| E7 | `data-corruption` farkındalığı | — | Tüketiciler tam (CRT/MotifBand/ScreenOverlay); sayı yüzeyleri kanon gereği tepkisiz — yapılacak iş YOK (verdict) |

**Kapsam dışı (bilinçli):** `App.vue` + `GameplaySettings` + save/state dosyalarındaki
başka işkoluna ait uncommitted değişikliklere DOKUNULMAZ; `SideSnapHands.vue` /
`public/assets/` (başka işkolu) denetlenmez.

## 2. Kabul kriterleri

- [ ] WCAG AA: `harness:contrast` ihlal = 0 (metin ≥4.5:1; odak/UI ≥3:1 göz doğrulaması).
- [ ] Tüm yeni katmanlar (CrtOverlay/MotifBand/JuiceLayer/ScreenOverlay/feast-knock)
  tek motion kapısından geçiyor (E3 denetim matrisi §3).
- [ ] `harness:smoke` baseline (log10=90.72, 8 shift) sabit — denge regresyonu yok.
- [ ] K-2: ölü `bg-*`/`border-*` kalmadı (mekanizma testiyle: aksan utility'leri uygulanır).
- [ ] E4 NIT'leri kapalı (ilgili satırlar + bu spec).

## 3. Doğrulama

`typecheck` (0) + `test` (314 + yeni yok — sunum işi) + `build` (0) +
`harness:smoke` + `harness:perf` + `harness:contrast` + completed.md + commit.

## 4. Motion kapısı denetim matrisi (E3)

| Katman | Kapı | Hüküm |
| :--- | :--- | :--- |
| `CrtOverlay` | JS YOK; CSS: `crt-off` + `battery-saver` + OS media + forced-colors | PASS (değişiklik yok) |
| `MotifBand` | TS: `motionMode off` + pil → görünmez; CSS: `motion-off`/pil gizle, `reduced` statik, OS gizle | PASS |
| `JuiceLayer` + feast | `shouldReduceMotion` (OS+mode+legacy+pil) + feast reduced %35 + calm bastırma + idle-safe rAF | PASS |
| `ScreenOverlay` flash | pil + `isMotionReduced` (OS-only boşluk: 220ms tek impuls — vestibüler eşik altı, kabul) | PASS-notla |
| `CommentTicker` | E3 ile `useMotionReduced` (OS boşluğu kapanır) | FIX |
| `MusicControls` | E3 ile `useMotionReduced` (OS boşluğu kapanır) | FIX |
| `feast-knockdown` | JS: yalnız full+pilsiz eklenir; CSS: OS/forced-colors nötrler | PASS |
