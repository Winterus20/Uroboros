# Aktif Görev (In-Progress)

## ✅ Zaman Yayı (Time Clock) (2026-10-17) — TAMAMLANDI

**Sonuç kaydı:** [`brain/tasks/completed.md`](completed.md) (2026-10-17 girişi) · **ADR:** [`brain/decisions/0068-time-clock-rewind-spring.md`](../decisions/0068-time-clock-rewind-spring.md)
**Doğrulama:** `vue-tsc` 0 hata · `vitest` 27 dosya / 380 test · `npm run build` 0 hata · `harness:smoke` baseline değişmedi (`log10=90.72 shifts=8`)

**Kaynak:** kullanıcı talebi — *"oyunda arada çıkacak bir saat olsun ekranın ortasında kocaman
şekilde biz o saatin okunu geriye doğru saralım, onu sararken de diğer her şey geriye doğru aksın,
sonrasında iyice gerilsin; bu ok bıraktığımızda zaman çok daha hızlı akmaya başlasın, çok daha
hızlı kazanalım yutulan kütleyi"* → *"gerçek fizik gibi bir şey yapacağız"*.

**Sözleşme (donmuş, tek doğruluk kaynağı):** [`brain/scratchpad/time-clock-spec.md`](../scratchpad/time-clock-spec.md)

### Tasarım çekirdeği
- Kadran **120 sn'lik** bir oyun-zamanı penceresi. Geri sarılan saniye, kütleden **birebir** düşer
  (gerçek zaman yolculuğu; taban `matter >= 1`).
- Yay sertleşir: `tension = drag / (drag + K)` — hiperbolik doyum, son çeyrek çok daha fazla tur ister.
- **Bedel doğrusal, ödül kuadratik** (yay enerjisi): `%25` sarma = **net zarar (0.78×)**,
  `%100` sarma = **net kâr (3.60×, 16× tepe hız / 75 sn)**. Oyuncu "ya iyice ger, ya hiç dokunma"yı keşfeder.
- Sönüm: yay kendiliğinden gevşer, gevşedikçe kütle geri gelir — yani durup beklemek istismar değil.
- Salgı yalnız **üretimi** hızlandırır (buff süreleri / lab / bot saatleri normal akar) ki zaman
  hızı mevcut buff'ları yakmasın.

### Dalga (4 paralel subagent + orchestrator)
- [x] Keşif dalgası — 3 paralel subagent: tick/üretim boru hattı, UI/kekatman/ses, kayıt+sıfırlama+kilit gelenekleri
- [x] Sözleşme donduruldu + mekanik kararları kullanıcı onayıyla kapatıldı
- [x] **Ajan A** — `models/clock.ts` + `game/clock-data.ts` + saf testler (`clock-data.test.ts` 26, `tests/time-clock.spec.ts` 15)
- [x] **Ajan B** — store: state/getters/actions + `update()` tick bloğu + üretim faktörü (parite: `matterPerSecond` + breakdown) — 19 test
- [x] **Ajan C** — kayıt v18 + uçucu faz yükleme + `applyResetScope` + `time_clock` kilit basamağı (1e120 / order 1200) — 18 test + regresyon 62/62
- [x] **Ajan D** — `TimeClockOverlay.vue` (repoda ilk rotary/dairesel sürükleme girdisi) + `layer-clock` z-index 55 + 3 ses + `time_warp` sahnesi
- [x] Orkestratör kararı: yaşam boyu istatistikler `TimeClockState` → `PlayerStats` (`clockRewinds`/`clockRewoundSeconds`/`clockBestTension`) — belge/kod çelişkisi kapandı
- [x] Ölü sabit temizliği: `TIME_CLOCK_PITY_SECONDS` kaldırıldı (aralık tavanı 330 < 600 → hiç ateşlenemiyordu)
- [x] Entegrasyon + `npm run build` + `npm test` + `harness:smoke` (baseline değişmedi)
- [x] ADR-0068 + `completed.md` reconciliation + conventional commit

---

## ✅ Geç Oyun Tick Performansı (2026-10-15) — TAMAMLANDI
**Sonuç kaydı:** `brain/tasks/completed.md` (2026-10-15 girişi) · **ADR:** `brain/decisions/0059-late-game-tick-performance.md`
- A/B kanıtı (git stash, 3 koşu): churn mean **~20.5 ms → ~5.9 ms (~3.5×)**, p95 62 → 13.8 ms; wall ~1.35 → ~0.79 ms. İki derlemede durum zinciri birebir (fingerprint + iş yükü sayaçları eşit).
- Kaynaklar: `math.ts` (`__v_skip`), `balance.ts` (kova memosu + kapalı form), `format.ts` (Intl yeniden kullanımı), `cache.ts` (`memoCompletedJoin`), bot yollarında `matterPerSecond` erken okuması kaldırıldı.
- Kalıcı komut: `npm run harness:perf` (churn + wall, deterministik senaryo). v0.38.1.

## ✅ Görsel Dil Yayılımı — Tüm Proje (2026-10-15) — TAMAMLANDI
**Sözleşme (tek gerçek):** `brain/research/visual-language-adoption-spec-2026-10.md`
**Sonuç kaydı:** `brain/tasks/completed.md` (2026-10-15 girişi) · **ADR:** `brain/decisions/0058-visual-language-adoption.md`

### Dalgalar
- [x] Dalga 1 — Denetim (4 paralel subagent: buton census, renk census, glif/oran/v-tip census, hareket/juice census)
- [x] Dalga 2 — Uygulama (5 paralel subagent, dosya sahipliği bölüşülmüş; paylaşılan dosyalar orchestrator'da)
- [x] Dalga 3 — QA denetimi (bağımsız subagent) + fix dalgası → FINAL QA VERDICT: PASS
- [x] Dalga 4 — `npm test` (263/263) + `npm run build` (0 hata) + `harness:smoke` (log10=90.72, 8 shift), ADR-0058, brain reconciliation, conventional commit

**Aktif dalga: "Aç Kumarhane" faz-temelli görsel dil pivotu** (sözleşme:
`brain/context/visual-language.md`, ADR-0060).

- [x] **Planlama** — fazlı uygulama planı yazıldı ve onaylandı:
      `brain/research/visual-language-hungry-parlor-implementation-plan-2026-10.md`
      (kod denetimi, bozulma sinyalleri, K0–K5 merdiveni, faz-üstü mimari kararlar M1–M7,
      Faz A–E adım+kabul kriterleri, doğrulama protokolü, riskler, açık kararlar O1–O6).
- [x] **Faz A — Zemin & CRT** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0061-phase-a-warm-ground-and-static-crt.md`](../decisions/0061-phase-a-warm-ground-and-static-crt.md) ·
      Derin spec: [`phase-a-ground-crt-deep-spec-2026-10.md`](../research/phase-a-ground-crt-deep-spec-2026-10.md).
      Dalga: orchestrator (`style.css` / `App.vue` / `index.html` / `tailwind.config.js` / `CrtOverlay.vue`) +
      Subagent A (9 hardcoded zemin hex'i) + bağımsız QA subagent (**PASS-with-notes**, 13/13 iddia doğrulandı).
      Kanıt: typecheck 0 hata · test 263/263 · build 0 hata · `harness:contrast` tüm çiftler ≥ AA · `harness:perf` CSS-bağımsız.
      Kalan iki not Faz E'ye işlendi (K-2 `glass-panel` + `bg-*` çakışması; `m6x11` kararı).
- [x] **Faz B — Bozulma altyapısı** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0062-phase-b-corruption-infrastructure.md`](../decisions/0062-phase-b-corruption-infrastructure.md) ·
      Derin spec: [`phase-b-corruption-deep-spec-2026-10.md`](../research/phase-b-corruption-deep-spec-2026-10.md).
      Çıktı: `corruption.ts` (türetme + meta + stamp/parse) + 11 test +
      store `corruptionLevel` getter (yeni state yok) + App kök mührü +
      `[data-corruption]` şiddet eğrisi (meta ile birebir).
      Kanıt: test 294/294 · build 0 hata · `harness:smoke` log10=90.72/8 shift (baseline sabit).
      Kilitli kararlar: O1 (K4 gate'i) + O3 (CRT eğrisi K0 %10/K1 %35/K2 %45) kapandı.
- [x] **Faz C — GIC kimlik kütüphanesi** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0063-phase-c-motif-substrate-identity.md`](../decisions/0063-phase-c-motif-substrate-identity.md) ·
      Derin spec: [`phase-c-motif-substrate-deep-spec-2026-10.md`](../research/phase-c-motif-substrate-deep-spec-2026-10.md).
      Çıktı: 16 SVG + `motifs.ts`/`motifs.test.ts` (7 test) + `MotifBand.vue` (z=45) +
      substrat (ScreenOverlay) + Wrinkler/Planck/Kriz kaplamaları + kolaj CSS bloğu.
      Kanıt: test 301/301 · build 0 hata · `harness:smoke` log10=90.7/8 shift (baseline sabit).
- [x] **Faz D — VS şöleni** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0064-phase-d-feast-shower.md`](../decisions/0064-phase-d-feast-shower.md) ·
      Derin spec: [`phase-d-feast-shower-deep-spec-2026-10.md`](../research/phase-d-feast-shower-deep-spec-2026-10.md) ·
      İnternet araştırması: [`phase-d-internet-research-2026-10.md`](../research/phase-d-internet-research-2026-10.md).
      Çıktı: `particles.ts` (7 sahne + bütçe 60/8/220 + suppression 400 ms) + 13 test +
      `JuiceLayer` genişletmesi (tek canvas, `feast-scene` olayı, knock-down, YUT kıvılcımı) +
      tetikleyici kablosu (anomali/çöküş/dekad) + Faz D CSS bloğu.
      Kanıt: typecheck 0 · test 314/314 · build 0 hata · `harness:smoke` log10=90.72/8 shift
      (baseline sabit) · `harness:perf` churn 6.69/wall 0.77 ms (bant içinde) ·
      `harness:contrast` AA.
- [x] **Faz E — Retrofit & QA** — ✅ **TAMAMLANDI (2026-10-16)**. ADR:
      [`0065-phase-e-retrofit-qa.md`](../decisions/0065-phase-e-retrofit-qa.md) ·
      Derin spec: [`phase-e-retrofit-qa-deep-spec-2026-10.md`](../research/phase-e-retrofit-qa-deep-spec-2026-10.md) ·
      İnternet araştırması: [`phase-e-internet-research-2026-10.md`](../research/phase-e-internet-research-2026-10.md).
      Çıktı: K-2 `:where()` + `progress-track-lg` + `useMotionReduced` tek kapı
      (CommentTicker/MusicControls) + CrisisTab tabanı + `m6x11` silme.
      Kanıt: typecheck 0 · test 314/314 · build 0 hata · `harness:smoke` log10=90.72/8 shift
      (baseline sabit) · `harness:perf` churn 6.91/wall 0.84 ms · `harness:contrast` AA.
- [x] **Tipografi Pivotu — "Aç Kumarhane" fontları** — ✅ **TAMAMLANDI (2026-10-16)**.
      ADR: [`0066-hungry-parlor-typography-pivot.md`](../decisions/0066-hungry-parlor-typography-pivot.md) ·
      Rapor: [`typography-pivot-hungry-parlor-2026-10.md`](../research/typography-pivot-hungry-parlor-2026-10.md).
      Çıktı: `public/fonts/m6x11plus.ttf` + `ATTRIBUTION.md` + `@font-face`/preload;
      `display`=m6x11plus (CounterDisplay 36/54/72 + JuiceLayer canvas 18/36, bold yok);
      YENİ `hand`=Caveat + K3 `.collage-scrawl` (ScreenOverlay el yazısı annotasyonlar);
      sans/mono korunur; Chakra Petch sıfır referans.
      Kanıt: test 314/314 · build 0 · contrast AA · smoke log10=90.72/8 shift · dist artifact ✓
      (Playwright/Termux kurulamadı → ekran görüntülü görsel onay KULLANICIDA).
- [x] **Tipografi 2. Dalga — UI fontları (Space Grotesk + Space Mono)** — ✅ **TAMAMLANDI (2026-10-16)**.
      ADR: [`0067-ui-font-wave-space-grotesk-spacemono.md`](../decisions/0067-ui-font-wave-space-grotesk-spacemono.md).
      Tetik: kullanıcı "menüler/tüm yazılar aynı" dedi; 13 aday fonttools TR-doğrulama,
      yön "en stilistik + görsel dil" → sans Space Grotesk + mono Space Mono (ayna aile).
      Çıktı: token swap (`tailwind.config` sans/mono/display-fallback) + `index.html`
      Google Fonts linki + hardcoded yığın hizası (`style.css` body/section-label/hint
      → Space Grotesk; dim-glyph/stat-box/ds-badge/btn-primary/balatro-chip/sticker +
      `tooltip.ts` + `JuiceLayer` fallback → Space Mono).
      Kanıt: test exit 0 (314/314) · build 0 · contrast AA · smoke 90.7/8 shift ·
      dist `.font-sans/.font-mono` ✓ · Inter/JetBrains referansı 0 · latin-ext ✓.

**"Aç Kumarhane" pivotu (Faz A–E + Tipografi) KAPANDI.** Sıradaki adaylar (ayrı işler):
F — Prestige ritüeli · ADR-0033 §3 / ADR-0034 denge soruları.

**Sıradaki adım:** Yok — aktif dalga kapalı (tipografi 1. + 2. dalga tamam). Kullanıcıdan
beklenen: m6x11plus sayaç / Space Grotesk-Space Mono menü / Caveat K3 notlarının
**görsel onayı** (bu ortamda tarayıcı doğrulaması yapılamadı).

**Beklemede (kullanıcı onayı gerektiren adaylar):**
- F — Prestige ritüeli (iki ekran kuralı, sıfırlama anı) — ayrı iş olarak bekliyor.
- Denge kararı: ADR-0033 §3 (koşu süresi bandı) ve ADR-0034 (ilk şafak SP açlığı) açık soruları sürüyor.
