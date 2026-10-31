# Aktif Görev (In-Progress)

> Güncel model: [ADR-0086](../decisions/0086-run-reset-and-boost.md) — 1. basamak **boost +
> sıfırlamalı mücadele döngüsü**, kalibre edildi (2026-10-31). Boost güç kaynağıdır ve
> mücadelelerden önce açılır; boost alımı veya mücadele girişi sayıyı (`10`) ve zinciri (yalnız
> Fingers açık) sıfırlar, boost sayacı ile tamamlanmış mücadele ödülleri kalır. Boost sayacı
> yalnız kapı/prestijde sıfırlanır. `B = 5.3`, hedefler log10 10,5–78,0, intended **181,0 dk**;
> eski 190 dk kalibrasyonu geçersiz.
> Eski dalgaların ayrıntılı kayıtları: zincir-only (ADR-0082), rung 1 v2 (ADR-0083) ve ölçüm
> turu (2026-10-27) → [`completed.md`](completed.md); v1 planı (4+6 sıfırlama, 120 dk) →
> [`rung-1-plan-2026-10-27.md`](../research/rung-1-plan-2026-10-27.md) — sayıları ADR-0086 ile geçersiz.

## 🟢 Şu an aktif — Rung 1 v3 final denetimi (2026-10-31)

Uygulama ve kalibrasyon tamamlandı; final kapı geçildi ve commit edildi:

| İş | Kapsam | Durum |
| :-- | :--- | :--- |
| T1 | Ekonomi çekirdeği: boost, sıfırlamalı mücadele, `bestNumber` kilidi, save v24 | ✅ |
| T2 | UI: BoostPanel, giriş/çıkış onayları, basamak 2 için dürüst durum | ✅ |
| T3 | Kalibrasyon: boost-only / challenges-only / boost + challenges | ✅ 181,0 dk |
| T4 | Ses + belgeler: boost/mücadele satırları, ADR-0086 yayılımı | ✅ |
| — | Final `npm run verify` + Conventional Commit | ✅ 230/230 · build OK |

**Kalibrasyon (gerçek motor, `dt = 1 s`):** intended **181,0 dk** (optimal, 11 boost) · 0-greedy
195,8 dk · challenges-only 289,6 dk (1,60×) · boost-only 672,6 dk (3,72×) · base 1031,9 dk (5,70×).
Mücadele koşuları: C1 17,1 · C2 7,7 · C3 8,0 · C4 8,8 · C5 9,3 · C6 18,8 · C7 10,5 · C8 14,2 dk;
final itiş 52,7 dk; 11 boost farmı 9.–114. dk. Projeksiyon: 181 × 26,4 ≈ **79,6 sa** (×1,165);
85 saat hedefi için eğri **×1,176** (84,8 sa).

**T4 doğrulaması:** `npx vitest run src/game/voice/voice.test.ts` → **29/29 geçti** (2026-10-31).

## ✅ Son kapanan — Rung 1 v3 uygulaması + kalibrasyon (2026-10-31)

**Durum:** T1–T4 tamam; `B = 5.3`, `BOOST_MULT = 1.8`, mücadele hedefleri log10 10,5–78,0,
save v24, intended 181,0 dk. Kayıt: ADR-0086 · `completed.md` [2026-10-31].

## ✅ Önceki — "Laboratuvar" arayüz yeniden tasarımı (2026-10-31)

**Durum:** Uygulama tamam, `npm run verify` yeşil, commit edilmedi (sahip karar verecek).
Kayıt: [ADR-0085](../decisions/0085-laboratuvar-ui-shell.md) · `completed.md` [2026-10-31].

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
| `R3` Üç yolun dengesi | ✅ kalibre — challenges-only 1,60×, boost-only 3,72× |
| `R4` Toplam süre | ✅ 85 saat hedefi, eğri ×1,176 |
| Rung 1 his testi | 🟡 sahip oyun içi denemesi |
