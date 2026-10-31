# Aktif Görev (In-Progress)

> Güncel model: [ADR-0086](../decisions/0086-run-reset-and-boost.md) + [ADR-0087](../decisions/0087-challenge-boost-gate.md)
> — 1. basamak **boost + sıfırlamalı mücadele döngüsü**, kalibre edildi (2026-10-31). Boost güç
> kaynağıdır ve mücadelelerden önce açılır; boost alımı veya mücadele girişi sayıyı (`10`) ve
> zinciri (yalnız Fingers açık) sıfırlar, boost sayacı ile tamamlanmış mücadele ödülleri kalır.
> Boost sayacı yalnız kapı/prestijde sıfırlanır. `B = 5.3`, hedefler log10 10,5–78,0, intended
> **181,0 dk**. Mücadeleler **`boostCount >= 4`** ister (ADR-0087); C1 0 boostta erişilemez.
> Eski 190 dk kalibrasyonu geçersiz.
> Eski dalgaların ayrıntılı kayıtları: zincir-only (ADR-0082), rung 1 v2 (ADR-0083) ve ölçüm
> turu (2026-10-27) → [`completed.md`](completed.md); v1 planı (4+6 sıfırlama, 120 dk) →
> [`rung-1-plan-2026-10-27.md`](../research/rung-1-plan-2026-10-27.md) — sayıları ADR-0086/0087 ile geçersiz.

## 🟢 Şu an aktif — Boost kapısı: kod uygulandı, his testi (ADR-0087, 2026-10-31)

Karar, belgeler ve `src` uygulaması tamam; sırada sahip his testi:

| İş | Kapsam | Durum |
| :-- | :--- | :--- |
| ADR-0087 + dokümanlar | 4-boost kapısı, ölçümler, README/GDD/AGENTS/context/tasks | ✅ |
| Kod | `CHALLENGE_BOOST_GATE = 4`, `ChallengeRow.enterable`, UI "Requires 4 boosts", kapı fixture'ları | ✅ uygulandı (balance-run: denge testleri bitiyor) |
| Rung 1 his testi | Sahip oyun içi: ilk mücadele ~32 dk farm + 17,1 dk C1 | 🟡 |

**Boost kapısı ölçümü (gerçek motor, `dt = 1 s`):** 3 → 184,2 dk (8/8) · **4 → 181,0 dk (8/8,
11 boost)** · 5 → 174,5 dk (7/8) · 6 → 4/8. C1 4 boostta 17,1 dk; 0 boostta 36 dk (artık
erişilemez). Challenges-only yolu tasarım gereği kalktı.

## ✅ Son kapanan — Rung 1 v3 uygulaması + kalibrasyon (2026-10-31)

**Durum:** T1–T4 tamam; `B = 5.3`, `BOOST_MULT = 1.8`, mücadele hedefleri log10 10,5–78,0,
save v24, intended 181,0 dk (11 boost). Final `npm run verify` 230/230, build OK; commit edildi.
Kayıt: ADR-0086/0087 · `completed.md` [2026-10-31].

**Kalibrasyon (gerçek motor, `dt = 1 s`):** intended **181,0 dk** (optimal, 11 boost, 8/8) ·
0-greedy 195,8 dk · boost-only 672,6 dk (3,72×) · base 1031,9 dk (5,70×). Mücadele koşuları:
C1 17,1 · C2 7,7 · C3 8,0 · C4 8,8 · C5 9,3 · C6 18,8 · C7 10,5 · C8 14,2 dk; final itiş
52,7 dk; 11 boost farmı 9.–114. dk. Projeksiyon: 181 × 26,4 ≈ **79,6 sa** (×1,165); 85 saat
hedefi için eğri **×1,176** (84,8 sa).

## ✅ Önceki — "Laboratuvar" arayüz yeniden tasarımı (2026-10-31)

**Durum:** Uygulama tamam, `npm run verify` yeşil. Kayıt: [ADR-0085](../decisions/0085-laboratuvar-ui-shell.md) ·
`completed.md` [2026-10-31].

## ✅ Önceki — Rung 1 v2 uygulaması (2026-10-28) — ADR-0086 ile geçersiz

**Durum:** Uygulama tamamdı; tek koşu modeli ADR-0086 ile değişti. Kayıt: ADR-0083 ·
`completed.md` [2026-10-28].

- ~~**190 dk tek koşu**, `B = 5.5`, 8 sıfırlamasız mücadele, C8 ×2, save v23.~~
- ~~**Kalibrasyon:** 188,8 dk (Max All) / 189,1 dk (idle); final 9,2 / 9,4 dk; mücadeleler 21–22 dk.~~
- **İnceleme probları (2026-10-31):** `brain/scratchpad/rung1-review/` (mücadele giriş politikası,
  akıllı oyun) — yalnız ölçüm; ADR-0086 kararının girdisi.

## 🟡 Sahip kararı bekleyen maddeler

| Konu | Durum |
| :--- | :--- |
| `R2` Boost reset modeli | ✅ kapandı — ADR-0086 |
| `R3` Boost kapısı | ✅ ADR-0087 — 4: 181,0 (8/8); 3: 184,2 (8/8); 5: 7/8 |
| `R4` Toplam süre | ✅ 85 saat hedefi, eğri ×1,176 |
| `R5` Boost kapısı kodu | ✅ uygulandı — `CHALLENGE_BOOST_GATE = 4`, `isChallengeUnlocked`, `ChallengeRow.enterable`, `BoostPanel` / `ChallengePanel` / `HeroNumber` |
| Rung 1 his testi | 🟡 sahip oyun içi denemesi |
