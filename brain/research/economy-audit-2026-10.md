# UROBOROS — Tam Kapsamlı Ekonomi Denetimi (2026-10-10)

4 paralel subagent ile tarandı: (1) çekirdek üretim/boyutlar, (2) prestige/reset katmanları, (3) tıklama/rastgele olay/buff, (4) challenge/autobuyer/pacing. Kod düzenlenmedi (salt okunur).

---

## 🔴 KRİTİK — Acil Düzeltme (oyun bütünlüğünü kırıyor)

| # | Bulgu | Konum | Etki |
|---|---|---|---|
| K1 | **`update()` üretim zinciri `reactorMassMult` (×8 sweet spot) ve `universalMassMult`'u atlattığı için ekrandaki MPS ≠ gerçek tik üretimi** | getter: `getters-dimensions.ts:680,691` vs tick: `actions-misc.ts:745-758` | ×8 sapma → satın alma pulse'ı, sponsor ödülü, kriz ödülleri şişkin MPS'ten pay alıyor → para basıyor |
| K2 | **Challenge iade/sızıntı: `resetRunState()` challenge giriş/çıkışta da çalışıyor → koşusuz sonsuz SP musluğu** | `actions-crisis.ts:52,67,108` + iade formülü `layers.ts:213` (indirimsiz tam iade) | frenzy_thumb 8 al / 9 iade → +1 SP/çevrim, saniyeler içinde |
| K3 | **Admin panel production'da açık** — `godmode` yazınca açılıyor, `hotkeysEnabled` kontrolünden önce geliyor, env guard yok | `useModals.ts:43-56`, `App.vue:356-358` | her oyuncu cheat paneli (timeWarp 8 saat, forceSingularity…) |
| K4 | **SP kazancı sınırsız, harcama yeri 3.525 SP** — `10^((logM−308)/45)` için clamp yok | `getters-misc.ts:171-180` | 1 derin koşu = tüm nöral ağaç max + milyonlarca SP fazlası |
| K5 | **Duvar saati istismarı** — offline kazanç `Date.now()` farkına güveniyor, sadece üstten clamp | `actions-save.ts:849-854` | sistemi ileri al-yükle = her seferinde taze 24 saat offline kazanç |

## 🔴 OVERPOWERED — Dengeyi Kıranlar

1. **Tıklama idle'ı eziyor:** tepe yığın ≈ 2.808.000× (duruş 4 × frenzy 300 × başarım ×6 × nöral ×7.8 × kombo ×5 × planck ×10). Boşluk tuşu key-repeat ile ~25-40 CPS bedava oto-tıklayıcı, throttle yok. → tıklama/sn limiti veya frenzy 300→100.
2. **Per-tier çarpanların ×8 zincir etkisi:** her katman çarpanı D8→D1 zincirinde ~8 kez uygulanıyor. eye_drops ×1024/tier → ≈10^24; tam nöral paket (apex_doomscroll sadece 20 SP'ye ×10 üretim!) ≈ 5×10^43. ADR-0054 tavanı sadece tickspeed/kova/sıçramada var — eye_drops, relik, nöralProd tavansız.
3. **Toplu Uyku (Power Nap) tavansız kalıcı çarpan:** 30 nap → ×2.2e7 kalıcı, üst sınır yok.
4. **Önbellek Silme bedava:** D1'i sıfırlamadan D8 çarpanı kuruluyor; D1=1e200 → ×45.000 sıfır maliyet.
5. **C7 ödülü üsteller tabanlı:** shiftPower 2.2 → 50 sıçramada ~290× (diğer tüm challenge ödülleri 1.15-2×).
6. **Anomali ekonomisi:** crisis_spawn kapısı 1e3 = koşunun 14.5. saniyesi; ×7 buff 60 sn sürerken yeni spawn maks 40 sn → koşu boyunca neredeyse kalıcı ×7. Forced "altın" anomali void oranını 5%→20%'ye çıkarıp 2 kart limitini 4'e bypass ediyor (20 sn CD ile farm).
7. **Parazitler her yoldan +EV:** iade tabanı 1.05 (max 4.5×), vent 1.75×, ikilem 2.0× — hepsi emilenin üstü. UI "%120" diyor, kod %105.
8. **Buff süresi uzatma tavansız:** anomali tıklaması `remaining += 60/15/30` cap'siz → dakikalarca 7×/300× kilitlenir.
9. **Satın alma pulse'ı:** her alım 0.45 sn üretim + zincir bonusu; K1 ile birleşince sweet spot'ta spam alım net kârlı.
10. **Relik üçlü sınırsız ölçek:** 2^(n−4) kütle, 1+0.5(n−2) SP, hücre başına per-tier bonus — kapı sadece 4 egzotik yeniden keşif.
11. **Lab matrix prestijde sıfırlanmıyor** (~10^7 çarpan kalıcı) + reaktör ısısı/momentumu da sıfırlanmıyor → yeni koşu ×40 ile başlayabilir.
12. **Challenge kısıtları AFK ile geçilebilir:** C2/C5 sadece satın almada cezalandırıyor, C8 doom offline'da donuyor, C3 AFK'yi ödüllendiriyor. Botları kapat → sekmeyi kapat → challenge biter.
13. **Offline, online idle'dan 2.295× hızlı** (K5 ile zincir oluşturuyor).

## ⚠️ PROBLEMATIC — Bozuk / Yanlış / Eksik

1. **Challenge hedef metni 8 yerde hardcoded `1.79e308`** ama gerçek hedefler 1e40…1e1000 (`ChallengesTab.vue:99,169,246`, `SingularityTab.vue:69,178`, `SingularityButton.vue:27,87`).
2. **Anomali kart etiketleri yanlış:** "777×" gerçekte 300×, void "Hawking Işıması" olarak etiketlenmiş, sponsor "Kozmik Dalgalanma". Crit eşiği `gte(500)` ama frenzy 300 → "777× HİSTERİ" etiketi asla tetiklenmez (ölü kod).
3. **UI-kod uyuşmazlıkları:** cps_sync (%2/%1.5/%8 metin vs %1/%1/%5 kod), caffeine_drip (%5 metin vs %3 kod), guilt_immunity (%50 vs %25/seviye), küme "%2 maliyet indirimi" metni — kodda maliyet indirimi yok (etki aslında tickspeed adım çarpanı), parazit "%120" vs %105.
4. **İçerik boşluğu: 1e160 → 1e308 arası 148 dekad = koşunun ~%30-48'i hiç yeni özellik yok** (ölçülmüş: son 96 dakika boş). Tersine 29 saniye içinde 5 özellik patlıyor; ilk prestige'de 11 bot + challenges sekmesi aynı anda açılıyor.
5. **`resonance_boost` (5× boyut) ölü buff** — hiçbir getter okumuyor.
6. **Espresso buff'ı kayıt/yüklemede güçleniyor:** runtime 20sn×2, deserialize 30sn×3.
7. **`unlockAutobuyer` feature gate'i kontrol etmiyor** — 1e9 kapısından önce alınabilir.
8. **Bot hız ağacında ölü aralık:** 0.5s interval / 14.83× hız = 0.034s < 0.05s tick → 10× sonrası no-op; UI yine de "0.03 sn" gösteriyor.
9. **Süre madalyaları uygulanmış ama sekmede "eklenecek" yazıyor**; eşikler (11.25 dk/challenge ort.) pratikte alınamaz.
10. **C7 (1e500) / C8 (1e1000) ulaşılabilirliği kanıtlanmamış** — repo'da 308 üstü ölçüm yok.
11. **C2 + herhangi bir autobuyer ≈ sıfır üretim** (3 sn duraklama döngüsü, 60 sn ramp asla verim sağlayamıyor).
12. **ADR-0054 tavanları ilk koşuda erişilemez** (500 kova≈1e1410, 500 tickspeed≈1e605, 20. sıçrama≈1e399) → güvenlik yedeği kavis korumuyor.
13. "Süper Rezonans" başarımı ödül vermiyor; break_singularity vaadi kodda yok; `buySingularityUpgrade` ölü kod; doküman/ivme yorumları kaymış (0.02 vs 0.011).
14. Time telemetrisi yanlış: run timer shift/galaxy'de de sıfırlanıyor.
15. Satın alma yolları tek darboğazdan geçiyor ama `buyMaxDimension` kova-kova döngü (2800×8 iterasyon/maxAll).

## ✅ İYİ OLANLAR (korunacak)

- Maliyet eğrisi D1-D8: geometrik + yumuşak erken merdiven + ADR-0054 geç ivmesi; tüm tier'lar 18-100 kova aralığında tutarlı 1e308 duvarına oturuyor; süreklilik testli.
- Reset kapsamı tek şablonda (shift ⊂ galaxy ⊂ singularity), monotonluk testli.
- Milestone çarpanları toplam yerine yer değiştiriyor (32^8 felaketi yok).
- Autobuyer kaçak yok: 20 TPS'te bot başına tick başına maks 1 alım.
- SP eğrisi değer bazlı testli (1 / 83 / 102 SP); başarım SP'ye bilerek uygulanmıyor.
- Tavanlı iyi mekanikler: momentum ≤5, anomali hızı ≤2.5, buff uzatma (time_dilation) 120s, C5 enflasyon 1e12, lab tohum ×64, koloni lojistik freni, nap kapısı 1.8^count.
- Challenge retry/time-medal farming yok; save whitelist'i sağlam; NaN güvenli log10; kilitsiz özellik geri kilitlenmiyor.
- Combo sönümü kilitli çarpanla sert sıfır; void pity 25; offline kademeli merdiven tasarımı iyi.

## 🎯 Öncelikli Aksiyon Sırası

1. K1 üretim-paritesi bug'ı (tüm şişkin ödül matematiği buna dayanıyor)
2. K2 SP sızıntısı + K3 admin paneli + K5 duvar saati
3. K4 SP softcap + per-tier ×8 zincir tavanı (eye_drops/nöral/relik)
4. Tıklama throttle + frenzy 300→100 + anomali süre tavanı + crisis_spawn kapısı 1e3→1e6
5. Parazit iade 1.05→1.00, C7 shiftPower 2.2→1.95, C2×autobuyer düzeltmesi
6. Pacing: 1e195/1e235/1e275'e 3 özellik basamağı, ön yükleme selini seyreltme, prestige içeriği damlatma
7. UI-metin hizalaması (challenge hedefleri, anomali etiketleri, nöral açıklamalar)
