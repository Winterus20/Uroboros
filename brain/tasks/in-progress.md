# Aktif Görev (In-Progress)

## ADR-0054 Yumuşak Tavan (2026-10-10, kod tamam, kapanış bekliyor)
- Hedef: full-buff aktif oyuncunun reset tutarak 1 saatte `1e6.840.000`'a ulaşmasını sınırlandırmak.
- Sebep: tickspeed/per-10 çarpanları `taban^alım` ile süresiz büyüyor + D8→D1 zinciri her çarpanı 8x uyguluyor.
- Uygulandı: `src/game/balance.ts` — `diminishingPurchaseCount(raw, threshold, gain)`
  (eşik altı ham değer, üstü `threshold + log2(fazlalık+1) × gain`).
- Kancalar: `tickspeedMultiplier` (500/20), per-10 (500/20), sıçrama gücü (20/1);
  `getDimensionBreakdown` aynı yardımcı ile parite korundu.
- Ölçüm (hold modu): `1e6.840.000` → **`1e1.490`**; 15. dk 1477 → 60. dk 1490 (denge oturdu).
- Doğrulama: typecheck 0 hata, test 257/257, build 1781 modül, harness:smoke 6/6.
- Bekleyen: `brain/tasks/completed.md` kaydı + conventional commit (`v0.39.0`).

## ADR-0052 Ölçek Sıçrama Motoru (2026-10-10, devam ediyor)
- Hedef: shift/galaxy/singularity tek motor + katman kayıt defteri (`src/game/layers.ts`),
  çarpan döküm hatları, `jumpLog`, ölü hold silme, v17 (göç yok).
- Tamamlanan: layers.ts, types, game.ts motor + sarmalayıcılar + dökümler + serialize,
  layers.test.ts (5), scale-jumps.test.ts (10) — yeni testler 15/15 yeşil.
- Bekleyen: tam süit + build (arka planda), harness parite koşusu, completed + commit.
