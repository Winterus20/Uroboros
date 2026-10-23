# Mimari Karar Kayıtları (ADR) İndeksi

Bu klasördeki tüm Architecture Decision Record'ların numaraya göre sıralı listesi.
Satır sayısı = klasördeki ADR dosyası sayısı.

## Nasıl kullanılır

- **Yeni ADR:** mevcut en yüksek numara + 1 (şu an en yüksek: **0078**).
- **Dosya adı:** `<numara>-<kısa-slug>.md` (örnek: `0070-cloud-sync-decision-layer-and-etag-conflict-detection.md`).
- **Başlık bloğu:** dosyanın başında `# ADR-<numara>: <başlık>` + `Tarih` + `Durum` satırları bulunmalı.
- **Durum sütunu:** bir karar başka bir kararın maddesini geçersiz kılıyorsa hangi ADR'in neyi iptal ettiği burada yazılır (örnek: ADR-0034 → ADR-0032 §F).
- **Kırık araştırma bağlantıları (2026-10-23):** tema pivotu sonrası eski temanın araştırma ve ölçüm
  dosyaları silindi. Bazı ADR'lerdeki `../research/...` bağlantıları bu yüzden kırıktır; dosyalar git
  geçmişinde durur (`git log --diff-filter=D -- brain/research`). ADR'lerin kendisi silinmez.
- **Numara çakışması notu (2026-10-19):** 0033 numarası iki dosyada birden kullanılıyordu (cloud-sync 2026-10-03 · üç boyutlu başlangıç 2026-10-04). Çakışma cloud-sync dosyasının **0070**'e yeniden numaralandırılmasıyla çözüldü; 0033 artık yalnızca üç boyutlu başlangıç ADR'ine aittir.

| # | Başlık | Tarih | Durum | Dosya |
| :-- | :-- | :-- | :-- | :-- |
| 0001 | Vue 3, Vite ve Pinia Seçimi | 2026-09-30 | Kabul Edildi (Accepted) | [0001-vue3-vite-pinia.md](0001-vue3-vite-pinia.md) |
| 0002 | Büyük Sayı Motoru Olarak break_eternity.js Seçimi | 2026-09-30 | Kabul Edildi (Accepted) | [0002-break-eternity-number-engine.md](0002-break-eternity-number-engine.md) |
| 0003 | Accumulator Pattern ile Sabit Adımlı Game Loop ve Çevrimdışı Simülasyon | 2026-09-30 | Kabul Edildi (Accepted) | [0003-accumulator-gameloop.md](0003-accumulator-gameloop.md) |
| 0004 | Prosedürel Müzik Motoru v2 — Convolution Reverb + Glue Compressor + Swing | 2026-09-30 | Kabul edildi | [0004-music-engine-v2.md](0004-music-engine-v2.md) |
| 0005 | Reels Pro: Akış Motoru & Algoritma Devrimi (Milestones, Sacrifice, Upgrades & Refresh) | 2026-10-01 | Kabul Edildi (Accepted) | [0005-reels-pro-milestones-sacrifice-upgrades.md](0005-reels-pro-milestones-sacrifice-upgrades.md) |
| 0006 | Hibrit Çözüm: Algoritmik Ayna Sinerjisi & Kolektif Trend Eşikleri | 2026-10-01 | Kabul Edildi (Accepted) | [0006-hybrid-mirror-synergy-and-collective-milestones.md](0006-hybrid-mirror-synergy-and-collective-milestones.md) |
| 0007 | Anti-Slop UI Yönü & "Obsidian Dock" Erişilebilirlik Turu | 2026-10-01 | Kabul edildi | [0007-anti-slop-ui-and-accessibility-pass.md](0007-anti-slop-ui-and-accessibility-pass.md) |
| 0008 | Nöral İzleme Kolonisi & Toplu Uyku (Synergism: Ant Colony & Sacrifice) | 2026-10-01 | Kabul edildi | [0008-neural-colony-power-nap.md](0008-neural-colony-power-nap.md) |
| 0009 | Özellik Merdiveni (Progressive Feature Unlock) | 2026-10-01 | Kabul edildi | [0009-feature-unlock-ladder.md](0009-feature-unlock-ladder.md) |
| 0010 | Algoritma Stüdyosu: Hibrit Viral Matris & Trend Reaktörü | 2026-10-01 | Kabul edildi | [0010-hybrid-algorithm-studio-viral-matrix.md](0010-hybrid-algorithm-studio-viral-matrix.md) |
| 0011 | First Singularity Prestige Pacing Recalibration | 2026-10-01 | Accepted | [0011-prestige-pacing-recalibration.md](0011-prestige-pacing-recalibration.md) |
| 0012 | Nöral Ağaç: Düz SP Dükkânından Öncüllü Yetenek Ağacına (Cookie Clicker: Heavenly Upgrade Tree) | 2026-10-01 | Kabul edildi (uygulama aşamasında) | [0012-neural-tree.md](0012-neural-tree.md) |
| 0013 | Singularity Autobuyer, Break Singularity ve Faz 2 Kilometre Taşı | 2026-10-01 | Accepted | [0013-singularity-autobuyer-break.md](0013-singularity-autobuyer-break.md) |
| 0014 | Kapsamlı QoL Turu (P0 + P1) — Çevrimdışı Yakalama, Onay Diyaloğu, Satın Alma Modları | 2026-10-01 | Kabul edildi | [0014-qol-pass-p0-p1.md](0014-qol-pass-p0-p1.md) |
| 0015 | Gece Kriz Meydan Okumaları — Faz 3 (Kurallar + Denge) | 2026-10-02 | - | [0015-night-crisis-challenges.md](0015-night-crisis-challenges.md) |
| 0016 | Balatro Tarzı Hibrit Görsel Mimari ve Gece Ekran Dokuları | - | - | [0016-balatro-hybrid-visual-system.md](0016-balatro-hybrid-visual-system.md) |
| 0017 | Economy Rebalancing, Dimension Shift Scaling and Progression Wall Fix | 2026-10-02 | Accepted | [0017-economy-rebalancing-and-progression-wall-fix.md](0017-economy-rebalancing-and-progression-wall-fix.md) |
| 0018 | Gece Krizleri Hibrit Görsel ve Ses Sistemi | - | - | [0018-hybrid-night-crisis-visual-and-audio-system.md](0018-hybrid-night-crisis-visual-and-audio-system.md) |
| 0019 | Hibrit Rapor ve Gece Telemetrisi Mimarisi (Stats Tab Evolution) | 2026-10-02 | Kabul Edildi / Uygulandı (v0.21.0) | [0019-hybrid-stats-and-telemetry-system.md](0019-hybrid-stats-and-telemetry-system.md) |
| 0020 | Tick / Satın Alma / UI Performans Optimizasyonu | 2026-10-02 | Kabul edildi, uygulandı | [0020-performance-optimization-tick-buy-max-ui.md](0020-performance-optimization-tick-buy-max-ui.md) |
| 0021 | İlk Prestij 210dk Denge Paketi | 2026-10-02 | Uygulandı | [0021-first-prestige-210min-rebalance.md](0021-first-prestige-210min-rebalance.md) |
| 0022 | Anomaly Asset Yenileme — Void Reel, Ağırlıklı RNG, Halka Zamanlayıcı | 2026-10-02 | Kabul edildi, uygulandı (v0.22.1 adayı) | [0022-anomaly-asset-refresh-void.md](0022-anomaly-asset-refresh-void.md) |
| 0023 | İlk prestij 3–4 saat (harness doğrulaması) | 2026-10-02 | Uygulandı | [0023-first-prestige-3-4h-harness-validated.md](0023-first-prestige-3-4h-harness-validated.md) |
| 0024 | Yeni ilk koşu ekonomi merdiveni | 2026-10-02 | Uygulandı | [0024-new-game-economy-ladder.md](0024-new-game-economy-ladder.md) |
| 0025 | Boyut unfolding (2+shift) ve tier kimliği (L2b) | 2026-10-02 | Uygulandı | [0025-dimensions-unfolding-tier-identity.md](0025-dimensions-unfolding-tier-identity.md) |
| 0026 | Erken boyut maliyet merdiveni | 2026-10-02 | Uygulandı | [0026-early-dimension-cost-ladder.md](0026-early-dimension-cost-ladder.md) |
| 0027 | 2 boyut başlangıcı (D1+D2 unfolding) | 2026-10-02 | Uygulandı — açılış tabanı 2→3 olarak ADR-0033 ile kısmen geri alındı | [0027-two-dimension-start-unfolding.md](0027-two-dimension-start-unfolding.md) |
| 0028 | En İyi Sistem Ayarları Mimarisi ve Çoklu Kayıt Slotları (v0.22.0) | 2026-10-03 | Kabul Edildi (Accepted) & Canlı Doğrulandı | [0028-best-in-class-settings-and-multi-slot-save-system.md](0028-best-in-class-settings-and-multi-slot-save-system.md) |
| 0029 | Misafir Modu, Google & E-posta Girişi ve Akıllı Bulut Yedekleme (Cloud Save) Mimarisi | 2026-10-03 | Kabul Edildi (Accepted) & Uygulandı | [0029-guest-mode-google-auth-and-cloud-save-system.md](0029-guest-mode-google-auth-and-cloud-save-system.md) |
| 0030 | Firestore Güvenlik Kuralları ve Bulut Yazma Korumaları | 2026-10-03 | Kabul Edildi (Accepted) & Uygulandı | [0030-firestore-security-rules-and-cloud-write-guards.md](0030-firestore-security-rules-and-cloud-write-guards.md) |
| 0031 | Butunluk, Performans ve Erisilebilirlik Duzeltme Turu | 2026-10-03 | Kabul Edildi (Accepted) & Uygulandı | [0031-integrity-performance-and-accessibility-fix-pass.md](0031-integrity-performance-and-accessibility-fix-pass.md) |
| 0032 | 1e308'e Kadar İçerik Merdiveni, Dekad Primleri ve Meydan Okuma Zorluk Eğrisi | 2026-10-04 | Kabul edildi ve uygulandı (v0.27.0) — §F (SP/koşu) ADR-0034 ile geçersiz kılındı | [0032-decade-pacing-ladder-and-bounties.md](0032-decade-pacing-ladder-and-bounties.md) |
| 0033 | Üç Boyutlu Başlangıç, D3/D4 Yumuşak Maliyet Merdiveni ve Erken Sıçrama Gevşetmesi | 2026-10-04 | Kabul edildi ve uygulandı (v0.27.1) — ADR-0027'yi kısmen geri alır | [0033-three-dimension-start-and-early-ladder.md](0033-three-dimension-start-and-early-ladder.md) |
| 0034 | SP Artık Yalnızca Şafakta Kazanılır — Dekad Primi Koşu İçi Yükselişe Dönüştü | 2026-10-05 | Kabul edildi ve uygulandı — ADR-0032 §F'yi geçersiz kılar | [0034-sp-only-at-dawn-decade-surge-run-buff.md](0034-sp-only-at-dawn-decade-surge-run-buff.md) |
| 0035 | Açılış Bir Olaydır, Kapı Değil (Kalıcı Açılış Kaydı) | 2026-10-06 | Kabul edildi | [0035-permanent-unlock-record-lifetime-dopamine.md](0035-permanent-unlock-record-lifetime-dopamine.md) |
| 0036 | Reels UI/UX, Taktil Ergonomi ve Tematik İyileştirme Mimarisi | 2026-10-04 | Kabul Edildi (Implemented) | [0036-reels-ui-ux-ergonomics-and-thematic-polish.md](0036-reels-ui-ux-ergonomics-and-thematic-polish.md) |
| 0037 | Kullanıcı İlerlemelerinin Küresel Sıfırlanması (Global Save Wipe & Minimum Version Enforcement) | 2026-10-04 | Kabul Edildi (Implemented) | [0037-global-save-wipe-and-minimum-version-enforcement.md](0037-global-save-wipe-and-minimum-version-enforcement.md) |
| 0038 | Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering) | - | Kabul Edildi & Uygulandı (v0.28.0) | [0038-balatro-sequential-triggering-reels-strike.md](0038-balatro-sequential-triggering-reels-strike.md) |
| 0039 | Tematik Dönüşüm — Doomscroll'dan UROBOROS'a Geçiş | 2026-10-04 | Kabul Edildi (Accepted) | [0039-thematic-pivot-to-uroboros.md](0039-thematic-pivot-to-uroboros.md) |
| 0040 | Modern Minimalist Kuantum-Kozmik HUD & Anti-Slop UI/UX Dönüşümü | 2026-10-06 | Kabul Edildi (Accepted) | [0040-modern-minimalist-hud-anti-slop-ui.md](0040-modern-minimalist-hud-anti-slop-ui.md) |
| 0041 | Mobil Ekran Kaydırmada Yanlış Dokunma İzolasyonu ve Jest Hassasiyeti Kalibrasyonu | 2026-10-06 | Kabul Edildi (Accepted) | [0041-mobile-touch-scroll-rejection-and-gesture-sensitivity.md](0041-mobile-touch-scroll-rejection-and-gesture-sensitivity.md) |
| 0042 | Mobil Yatay Jest ile Alt Menü/Sekme Gezinimi (Horizontal Swipe Tab Navigation) | 2026-10-06 | Kabul Edildi (Accepted) | [0042-mobile-horizontal-swipe-tab-navigation.md](0042-mobile-horizontal-swipe-tab-navigation.md) |
| 0043 | Sekmeler Arası Yön Duyarlı Slide-Fade Geçiş Animasyonu (Directional Tab Transition) | 2026-10-06 | Kabul Edildi (Accepted) | [0043-directional-tab-slide-fade-transitions.md](0043-directional-tab-slide-fade-transitions.md) |
| 0044 | Sarsıntı (Screen Shake) Sırasında Sabit Arayüz İzolasyonu ve CSS Containing Block Çözümü | 2026-10-06 | Kabul Edildi (Accepted) | [0044-screen-shake-containing-block-and-fixed-ui-isolation.md](0044-screen-shake-containing-block-and-fixed-ui-isolation.md) |
| 0045 | Antimatter Dimensions Tarzı Kozmik Haber Bandı (News Ticker) ve İronik/Mizahi Mesaj Motoru | 2026-10-06 | Kabul Edildi (Accepted) | [0045-antimatter-dimensions-cosmic-news-ticker.md](0045-antimatter-dimensions-cosmic-news-ticker.md) |
| 0046 | Ölçek Sıçraması ve Kozmik Galaksiler Matematiksel & Terminolojik Düzenlemesi | 2026-10-06 | Kabul edildi ve uygulandı (v0.30.1) | [0046-scale-shifts-and-cosmic-galaxies-refinement.md](0046-scale-shifts-and-cosmic-galaxies-refinement.md) |
| 0047 | Kuantum Parçacık Reaktörü, Akı Matrisi & Kozmik Relikler (Lab Hibrit Reformu) | 2026-10-06 | Kabul edildi | [0047-quantum-flux-reactor-and-cosmic-relics.md](0047-quantum-flux-reactor-and-cosmic-relics.md) |
| 0048 | Olay Ufku Kararsızlık Reaktörü ve Hibrit Kriz Sistemi (Crisis 2.0) | - | Kabul Edildi (Accepted) — Uygulamaya Alındı | [0048-event-horizon-instability-reactor-crisis-2.md](0048-event-horizon-instability-reactor-crisis-2.md) |
| 0049 | Okunaklı Balatro Tasarım Dili | 2026-10-08 | Kabul Edildi (Accepted) | [0049-legible-balatro-design-language.md](0049-legible-balatro-design-language.md) |
| 0050 | Lab Rebalance (P0 + P1) | 2026-10-08 | Kabul edildi (implementasyon ana ajanda) | [0050-lab-rebalance.md](0050-lab-rebalance.md) |
| 0051 | Kademeli Maliyet İvmelenmesi (Progressive Cost Acceleration) | 2026-10-10 | Kabul edildi | [0051-progressive-cost-acceleration.md](0051-progressive-cost-acceleration.md) |
| 0052 | Ölçek Sıçrama Motoru (Scale Layer Engine) | 2026-10-10 | Kabul edildi, uygulandı | [0052-scale-layer-engine.md](0052-scale-layer-engine.md) |
| 0053 | Test Harness Konsolidasyonu (Tek Kapı) | 2026-10-10 | Uygulandı | [0053-test-harness-consolidation.md](0053-test-harness-consolidation.md) |
| 0054 | Azalan Getirili Yumuşak Tavan — Çarpanların Üstel Patlamasının Sınırlandırılması | 2026-10-10 | Kabul edildi ve uygulandı (v0.39.0) | [0054-diminishing-returns-soft-cap.md](0054-diminishing-returns-soft-cap.md) |
| 0055 | Faz 0 Kapsamlı Stabilizasyon, Tematik Uyum ve Mimari İyileştirme | 2026-10-14 | Kabul edildi ve uygulandı (v0.39.0) | [0055-phase0-comprehensive-stabilization.md](0055-phase0-comprehensive-stabilization.md) |
| 0056 | Planck Duvarı Sert Kilit (Hard-Cap) ve Break Singularity Ritüeli | 2026-10-14 | Kabul edildi ve uygulandı (v0.39.0) | [0056-break-singularity-hard-cap-and-progression.md](0056-break-singularity-hard-cap-and-progression.md) |
| 0057 | Balatro Sütun 3 — Taktil Kart Fiziği (Spring Damping & Push Dynamics) | 2026-10-15 | Kabul edildi ve uygulandı | [0057-balatro-column3-card-physics.md](0057-balatro-column3-card-physics.md) |
| 0058 | Görsel Dil Yayılımı — Tüm Proje (Rezerve Renk, 3-State Ramp, Metin→Görsel, Motion Kapısı) | 2026-10-15 | Kabul edildi ve uygulandı | [0058-visual-language-adoption.md](0058-visual-language-adoption.md) |
| 0059 | Geç Oyun Tick Performansı — Reaktivite Muafiyeti, Memoizasyon ve Deterministik Perf Bench | 2026-10-15 | Kabul edildi ve uygulandı (v0.38.1) | [0059-late-game-tick-performance.md](0059-late-game-tick-performance.md) |
| 0060 | Görsel Dil — GIC Kimlik Katmanı ve Faz-temelli Bozulma ("Aç Kumarhane") | 2026-10-16 | Kabul edildi (tasarım onaylı) — uygulama bekliyor | [0060-gic-phase-corruption-visual-pivot.md](0060-gic-phase-corruption-visual-pivot.md) |
| 0061 | Faz A — Sıcak Zemin ("Aç Kumarhane") ve Statik CRT Katmanı | 2026-10-16 | Uygulandı (Faz A kapsamı) — CRT ayağı ADR-0069 ile iptal edildi | [0061-phase-a-warm-ground-and-static-crt.md](0061-phase-a-warm-ground-and-static-crt.md) |
| 0062 | Faz B — Bozulma Altyapısı (K0–K4 Türetme + `data-corruption` Mührü + CRT Şiddet Eğrisi) | 2026-10-16 | Uygulandı (Faz B kapsamı) — CRT ayağı ADR-0069 ile iptal edildi | [0062-phase-b-corruption-infrastructure.md](0062-phase-b-corruption-infrastructure.md) |
| 0063 | Faz C — GIC Kimlik Kütüphanesi (Motif Slotları + Bant + Substrat + Kaplamalar) | 2026-10-16 | Uygulandı (Faz C kapsamı) | [0063-phase-c-motif-substrate-identity.md](0063-phase-c-motif-substrate-identity.md) |
| 0064 | Faz D — VS Şöleni (Tek Canvas Partikül + Olay Sahneleri) | 2026-10-16 | Uygulandı (Faz D kapsamı) | [0064-phase-d-feast-shower.md](0064-phase-d-feast-shower.md) |
| 0065 | Faz E — Retrofit & QA (Kapanış) | 2026-10-16 | Uygulandı ("Aç Kumarhane" pivotunun kapanışı) | [0065-phase-e-retrofit-qa.md](0065-phase-e-retrofit-qa.md) |
| 0066 | "Aç Kumarhane" Tipografi Pivotu — m6x11plus Display + Caveat El Yazısı | 2026-10-16 | Kabul edildi ve uygulandı | [0066-hungry-parlor-typography-pivot.md](0066-hungry-parlor-typography-pivot.md) |
| 0067 | Tipografi 2. Dalga — UI Fontları: Space Grotesk (sans) + Space Mono (mono) | 2026-10-16 | Kabul edildi ve uygulandı | [0067-ui-font-wave-space-grotesk-spacemono.md](0067-ui-font-wave-space-grotesk-spacemono.md) |
| 0068 | Zaman Yayı (Time Clock) — Geri Sarma / Salgı Mekaniği | 2026-10-17 | Kabul edildi ve uygulandı | [0068-time-clock-rewind-spring.md](0068-time-clock-rewind-spring.md) |
| 0069 | CRT Katmanının Kaldırılması (visual-language §3 L1 iptali) | 2026-10-18 | Kabul edildi (kullanıcı kararı) — ADR-0061/0062'nin CRT ayağını iptal eder | [0069-crt-layer-removal.md](0069-crt-layer-removal.md) |
| 0070 | Bulut Kaydetme Karar Katmanının Yeniden Tasarımı — Referans Tabanlı Çakışma Tespiti ve Saat Bağımsız Yazma Koruması | 2026-10-03 | Kabul Edildi (Accepted) & Uygulandı — ADR-0029/ADR-0030'un bulut katmanını yeniden kurar | [0070-cloud-sync-decision-layer-and-etag-conflict-detection.md](0070-cloud-sync-decision-layer-and-etag-conflict-detection.md) |
| 0071 | Şafak Merdiveni — Kırılma Öncesi SP Kazanımı `1` → `1 + singularities` | 2026-10-19 | Kabul edildi & uygulandı — ADR-0034'ün SP kaynağını değiştirmez, yalnız kazanım büyüklüğünü düzeltir | [0071-sp-dawn-ladder-prelude.md](0071-sp-dawn-ladder-prelude.md) |
| 0072 | Boyut Açılımlarının Sıçramadan Koparılması (Deterministik Kütle Kapıları) | 2026-10-19 | Kabul edildi & uygulandı — ADR-0033'ün "D4 1. sıçramada" maddesini geçersiz kılar | [0072-dimension-unlocks-decoupled-from-shifts.md](0072-dimension-unlocks-decoupled-from-shifts.md) |
| 0073 | Başarım Kapısı — Omurga/Opsiyonel Dal Ayrımı ve Aile Kademe Çarpanı | 2026-10-19 | Kabul edildi & uygulanıyor (P3) — ADR-0026/0032'nin dekad omurgasını korur, opsiyonel dalları başarım ailesine bağlar | [0073-achievement-gated-branch-spine-hybrid.md](0073-achievement-gated-branch-spine-hybrid.md) |
| 0074 | Ölçülmüş Erken Merdiven — İlk 10 Dakika Kalabalığının Çözümü | 2026-10-20 | Kabul edildi & uygulandı (P3.3) — ADR-0072'nin "eşik = taban fiyatı × 100" kuralını geçersiz kılar | [0074-measured-early-ladder.md](0074-measured-early-ladder.md) |
| 0075 | Tempo Bandının Yeniden Tanımlanması ve P1'in Ölçümle Reddi | 2026-10-20 | Kabul edildi (kullanıcı onayı bekliyor) — ADR-0023'ün 150–300 dk bandını ölçülen 8–11 saat bandıyla değiştirir | [0075-tempo-band-revision-and-p1-rejection.md](0075-tempo-band-revision-and-p1-rejection.md) |
| 0076 | Satın Alma Tabanlı Boyut Açılışı ve D8 Çağı Ölçek Sıçraması | 2026-10-20 | Kabul edildi & uygulandı (kullanıcı kararı) — ADR-0072'nin kütle kapısı açılışını ve sıçrama tier rampasını geçersiz kılar | [0076-purchase-based-dimension-unlocks-and-d8-scale-shift.md](0076-purchase-based-dimension-unlocks-and-d8-scale-shift.md) |
| 0077 | Tema Pivotu — "Kozmik Oburluk" → `Hold That Number` (oyunun kendi sesi) | 2026-10-23 | **Kabul edildi** — grilling oturumunda kısmen değiştirildi/iptal edildi; bağlayıcı kayıt: [`research/theme-pivot-grilling-2026-10-23.md`](../research/theme-pivot-grilling-2026-10-23.md). 11 basamak, ~85 saat, kadran 5+ | [0077-theme-pivot-number-hunter-and-comedic-voice.md](0077-theme-pivot-number-hunter-and-comedic-voice.md) |
| 0078 | Görsel Dil — "Saf Sayı" (Pure Number) | 2026-10-23 | **Kabul edildi** — ADR-0060'ın K0–K5 merdivenini ve ADR-0066'nın `m6x11plus`/Caveat tipografisini iptal eder; ADR-0067'yi genişletir (Space Grotesk = hero). Sözleşme baştan yazıldı | [0078-pure-number-visual-language.md](0078-pure-number-visual-language.md) |
